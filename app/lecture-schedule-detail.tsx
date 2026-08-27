import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilePicker } from '@/components/file-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { getMentorMaterialCost } from '@/lib/material-cost';
import { supabase } from '@/lib/supabase';
import { uploadFile, uploadPrivateFile, type PickedFile } from '@/lib/upload-file';
import type { Database } from '@/types/supabase';

type DetailRow = Database['public']['Views']['mentor_event_row_detail']['Row'];
type SubMentorDetailRow = Database['public']['Functions']['get_sub_mentor_event_row_detail']['Returns'][number];
type AnyDetailRow = DetailRow | SubMentorDetailRow;
type EventPhoto = Database['public']['Tables']['event_photos']['Row'];
type EventScheduleEntry = { label: string | null; start_time: string | null; end_time: string | null };
type NoticeFile = { id: string; url: string };

const days = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function formatFee(fee: number | null) {
  if (fee === null) return '-';
  return `${fee.toLocaleString('ko-KR')}원`;
}

function hoursUntil(iso: string | null) {
  if (!iso) return Infinity;
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function formatPeriodTime(time: string | null) {
  return time ? time.slice(0, 5) : '-';
}

// 학교 전체 교시 시간표(event_schedules, 행사 등록 폼의 "교시" 항목). 이 강사 본인의
// 강의 시간과는 별개로, 그 날 행사 전체가 어떻게 나뉘어 있는지 보여준다.
function formatEventSchedules(schedules: unknown): string {
  if (!Array.isArray(schedules) || schedules.length === 0) return '-';
  return (schedules as EventScheduleEntry[])
    .map((s) => `${s.label ?? '-'} ${formatPeriodTime(s.start_time)}~${formatPeriodTime(s.end_time)}`)
    .join('\n');
}

// 드림피아 원가(dreampia_material_cost)는 강사에게 노출하지 않는다 — 드림피아 준비분은
// 항상 0원으로 표시한다. 강사 준비분도 본인이 실제 재료비 입금자일 때만 실제 금액을 보여준다
// (lib/material-cost.ts의 getMentorMaterialCost와 동일한 원칙 — 정산 화면과 일치시킨다).
function materialCostText(detail: AnyDetailRow, mentorId?: string) {
  const myShare = formatFee(getMentorMaterialCost(detail, mentorId));
  if (detail.prep_by === '강사') return myShare;
  if (detail.prep_by === '드림피아') return formatFee(0);
  if (detail.prep_by === '모두가능') {
    return `강사 준비 시 ${myShare} / 드림피아 준비 시 ${formatFee(0)}`;
  }
  return '-';
}

export default function LectureScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const mentorId = session?.user.id;

  const [detail, setDetail] = useState<AnyDetailRow | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [noticeFiles, setNoticeFiles] = useState<NoticeFile[]>([]);
  const [payerNames, setPayerNames] = useState<Record<string, string>>({});
  const [fieldOperator, setFieldOperator] = useState<{ mentor_name: string; mentor_phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingCriminal, setUploadingCriminal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // 소속강사 일정은 본인 것이 아니라 mentor_event_row_detail(본인 전용 뷰)에는 잡히지 않는다.
  // 먼저 본인 뷰로 시도하고, 없으면 소속대표용 RPC로 재조회한다. 소속강사 일정은 읽기 전용이다.
  const isOwn = !!detail && !!mentorId && detail.mentor_id === mentorId;

  const load = useCallback(async () => {
    if (!id) return;
    const ownRes = await supabase.from('mentor_event_row_detail').select('*').eq('event_row_id', id).maybeSingle();

    if (ownRes.error) {
      setLoadError(ownRes.error.message);
      setLoading(false);
      return;
    }

    let resolvedDetail: AnyDetailRow | null = ownRes.data;
    if (!resolvedDetail) {
      const subRes = await supabase.rpc('get_sub_mentor_event_row_detail', { p_event_row_id: id });
      if (subRes.error) {
        setLoadError(subRes.error.message);
        setLoading(false);
        return;
      }
      resolvedDetail = subRes.data?.[0] ?? null;
    }

    setDetail(resolvedDetail);

    const photosRes = await supabase.from('event_photos').select('*').eq('event_rows_id', id).order('created_at');
    setPhotos(photosRes.data ?? []);

    if (resolvedDetail?.event_id) {
      const noticeFilesRes = await supabase
        .from('event_notice_files')
        .select('id, url')
        .eq('event_id', resolvedDetail.event_id)
        .order('created_at');
      setNoticeFiles(noticeFilesRes.data ?? []);
    } else {
      setNoticeFiles([]);
    }

    const payerIds = [resolvedDetail?.lecture_fee_payer_id, resolvedDetail?.material_fee_payer_id].filter(
      (v): v is string => !!v
    );
    if (payerIds.length > 0) {
      const { data: names } = await supabase.rpc('get_mentor_names', { ids: [...new Set(payerIds)] });
      const map: Record<string, string> = {};
      for (const n of names ?? []) map[n.id] = n.name;
      setPayerNames(map);
    }

    // 소속강사 일정(읽기 전용)은 RPC 인가 조건(auth.uid() = my.mentor_id)을 못 만족해 항상
    // 빈 배열이 와서 "배정 없음"으로 오인될 수 있으므로, 본인 일정일 때만 조회한다.
    if (resolvedDetail?.mentor_id === mentorId) {
      const fieldOperatorRes = await supabase.rpc('get_field_operator_contact', { p_event_row_id: id });
      setFieldOperator(fieldOperatorRes.data?.[0] ?? null);
    } else {
      setFieldOperator(null);
    }

    setLoadError(null);
    setLoading(false);
  }, [id, mentorId]);

  useEffect(() => {
    load();
  }, [load]);

  const canTogglePreparing = useMemo(
    () => isOwn && !!detail && hoursUntil(detail.start_time) <= 4,
    [isOwn, detail]
  );
  const canToggleAttendance = useMemo(
    () => isOwn && !!detail && hoursUntil(detail.start_time) <= 1,
    [isOwn, detail]
  );

  const togglePreparing = async () => {
    if (!isOwn || !detail || !id) return;
    const next = !detail.preparing;
    setDetail({ ...detail, preparing: next });
    const { error } = await supabase.from('event_rows').update({ preparing: next }).eq('id', id);
    if (error) {
      setDetail((d) => (d ? { ...d, preparing: !next } : d));
      setActionError(error.message);
    }
  };

  const toggleAttendance = async () => {
    if (!isOwn || !detail || !id) return;
    const next = !detail.attendance;
    setDetail({ ...detail, attendance: next });
    const { error } = await supabase.from('event_rows').update({ attendance: next }).eq('id', id);
    if (error) {
      setDetail((d) => (d ? { ...d, attendance: !next } : d));
      setActionError(error.message);
    }
  };

  const handleCriminalFile = async (file: PickedFile | null) => {
    if (!isOwn || !file || !id) return;
    setActionError(null);
    setUploadingCriminal(true);
    try {
      const path = await uploadPrivateFile('criminal-background-check', id, file);
      const { error } = await supabase
        .from('event_rows')
        .update({ criminal_background_check: path })
        .eq('id', id);
      if (error) throw new Error(error.message);
      setDetail((d) => (d ? { ...d, criminal_background_check: path } : d));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '회보서 업로드에 실패했습니다.');
    } finally {
      setUploadingCriminal(false);
    }
  };

  const handlePhotoFile = async (file: PickedFile | null) => {
    if (!isOwn || !file || !id) return;
    setActionError(null);
    setUploadingPhoto(true);
    try {
      const url = await uploadFile('event-photos', id, file);
      const { data, error } = await supabase
        .from('event_photos')
        .insert({ event_rows_id: id, url })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setPhotos((prev) => [...prev, data]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!isOwn) return;
    const { error } = await supabase.from('event_photos').delete().eq('id', photoId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{loadError ?? '일정을 찾을 수 없습니다.'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {!isOwn && (
          <ThemedView style={styles.readOnlyBanner}>
            <ThemedText style={styles.readOnlyText}>
              {detail.mentor_name ?? '소속강사'}님의 일정입니다 (읽기 전용)
            </ThemedText>
          </ThemedView>
        )}
        {actionError && <ThemedText style={styles.errorText}>{actionError}</ThemedText>}

        <ThemedView style={styles.card}>
          <Field label="행사명" value={detail.event_name ?? '-'} />
          <Field label="행사구분" value={detail.event_category_name ?? '-'} />
          <Field label="학교/기관명" value={detail.institution_name ?? '-'} />
          <Field label="주소" value={detail.institution_address ?? '-'} />
          <Field label="대상학년" value={detail.target_grade ?? '-'} />
          <Field label="교시" value={formatEventSchedules(detail.event_schedules)} />
          <LinkField label="학교 배치도" url={detail.floor_map_url} />
          <Field label="엘리베이터 유무" value={detail.has_elevator ?? '-'} />
          <Field label="주차 및 엘리베이터" value={detail.parking_note ?? '-'} />
          <Field label="노트북/Wi-Fi" value={detail.laptop_wifi_note ?? '-'} />
          <Field label="실내화 위치" value={detail.indoor_shoes_note ?? '-'} />
          <Field label="범죄경력 진행방식" value={detail.crime_check_method ?? '-'} />
          <Field label="범죄경력회보서" value={detail.crime_check_info ?? '-'} />
          <Field label="학생변경 여부" value={detail.student_rotation ?? '-'} />
          <Field label="공지사항" value={detail.notice ?? '-'} />
          {noticeFiles.length > 0 && (
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>공지사항 첨부파일</ThemedText>
              <View style={styles.fieldValue}>
                {noticeFiles.map((file, i) => (
                  <TouchableOpacity key={file.id} onPress={() => Linking.openURL(file.url)}>
                    <ThemedText style={styles.linkText} numberOfLines={1}>
                      첨부파일 {i + 1}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <Field label="학교요청사항(행사 전체)" value={detail.school_request_note ?? '-'} />
        </ThemedView>

        <ThemedView style={styles.card}>
          <Field label="강의 시작" value={formatDateTime(detail.start_time)} />
          <Field label="강의 종료" value={formatDateTime(detail.end_time)} />
          <Field label="대상" value={detail.target ?? '-'} />
          <Field label="요청 직업군" value={detail.occupation_name ?? '-'} />
          <Field label="프로그램" value={detail.program_name ?? '-'} />
          <Field label="강사명" value={detail.mentor_name ?? '-'} />
          <Field label="연락처" value={detail.mentor_phone ?? '-'} />
          <Field label="강의실" value={detail.classroom ?? '-'} />
          <Field label="대기실" value={detail.instructor_waiting_room ?? '-'} />
          {isOwn && (
            <>
              <Field label="현장운영자" value={fieldOperator?.mentor_name ?? '현장운영자 배정 없음'} />
              {fieldOperator && <Field label="현장운영자 연락처" value={fieldOperator.mentor_phone} />}
            </>
          )}

          {isOwn ? (
            <>
              <Checkbox
                label="행사준비"
                checked={!!detail.preparing}
                disabled={!canTogglePreparing}
                disabledHint="행사 시작 4시간 전부터 체크할 수 있습니다."
                onToggle={togglePreparing}
              />
              <Checkbox
                label="출석"
                checked={!!detail.attendance}
                disabled={!canToggleAttendance}
                disabledHint="행사 시작 1시간 전부터 체크할 수 있습니다."
                onToggle={toggleAttendance}
              />
            </>
          ) : (
            <>
              <Field label="행사준비" value={detail.preparing ? '완료' : '미완료'} />
              <Field label="출석" value={detail.attendance ? '완료' : '미완료'} />
            </>
          )}

          <Field label="준비물 준비" value={detail.prep_by ?? '-'} />
          <Field label="인원수" value={detail.headcount?.toString() ?? '-'} />
          <Field label="차시별 인원수" value={detail.session_headcount?.toString() ?? '-'} />
          <Field label="강의료" value={formatFee(detail.lecture_fee)} />
          <Field label="세후 강의료" value={formatFee(detail.lecture_fee_after_tax)} />
          <Field
            label="강의료 입금자명"
            value={
              detail.lecture_fee_payer_id ? payerNames[detail.lecture_fee_payer_id] ?? '-' : '-'
            }
          />
          <Field label="1인당 재료비" value={materialCostText(detail, mentorId)} />
          <Field
            label="재료비 입금자명"
            value={
              detail.material_fee_payer_id ? payerNames[detail.material_fee_payer_id] ?? '-' : '-'
            }
          />

          <View style={styles.uploadSection}>
            <ThemedText type="defaultSemiBold">회보서</ThemedText>
            <ThemedText style={styles.statusText}>
              {detail.criminal_background_check ? '✓ 등록됨' : '미등록'}
            </ThemedText>
            {isOwn && (
              <>
                <FilePicker
                  file={null}
                  onChange={handleCriminalFile}
                  mimeTypes={['application/pdf', 'image/*']}
                />
                {uploadingCriminal && <ActivityIndicator />}
              </>
            )}
          </View>

          <View style={styles.uploadSection}>
            <ThemedText type="defaultSemiBold">사진 ({photos.length}/2)</ThemedText>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoRow}>
                <ThemedText style={styles.photoName} numberOfLines={1}>
                  {photo.url.split('/').pop()}
                </ThemedText>
                {isOwn && (
                  <TouchableOpacity onPress={() => deletePhoto(photo.id)}>
                    <ThemedText style={styles.removeText}>삭제</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isOwn && photos.length < 2 && (
              <FilePicker file={null} onChange={handlePhotoFile} mimeTypes={['image/*']} />
            )}
            {uploadingPhoto && <ActivityIndicator />}
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

function LinkField({ label, url }: { label: string; url: string | null }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {url ? (
        <TouchableOpacity style={styles.fieldValue} onPress={() => Linking.openURL(url)}>
          <ThemedText style={styles.linkText}>파일 보기</ThemedText>
        </TouchableOpacity>
      ) : (
        <ThemedText style={styles.fieldValue}>-</ThemedText>
      )}
    </View>
  );
}

function Checkbox({
  label,
  checked,
  disabled,
  disabledHint,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  disabledHint: string;
  onToggle: () => void;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.checkboxColumn}>
        <TouchableOpacity
          style={styles.checkboxRow}
          disabled={disabled}
          onPress={onToggle}
          hitSlop={8}>
          <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
            {checked && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
          </View>
          <ThemedText style={disabled ? styles.checkboxLabelDisabled : undefined}>
            {checked ? '완료' : '미완료'}
          </ThemedText>
        </TouchableOpacity>
        {disabled && <ThemedText style={styles.disabledHint}>{disabledHint}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#c0392b',
  },
  readOnlyBanner: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 10,
  },
  readOnlyText: {
    fontSize: 13,
    color: '#8d6e00',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  field: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    width: 110,
    fontSize: 13,
    color: '#687076',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    color: '#0a7ea4',
    textDecorationLine: 'underline',
  },
  checkboxColumn: {
    flex: 1,
    gap: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxLabelDisabled: {
    opacity: 0.5,
  },
  disabledHint: {
    fontSize: 11,
    color: '#9e9e9e',
  },
  uploadSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  statusText: {
    fontSize: 13,
    color: '#687076',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoName: {
    flex: 1,
    fontSize: 13,
  },
  removeText: {
    fontSize: 12,
    color: '#d32f2f',
  },
});
