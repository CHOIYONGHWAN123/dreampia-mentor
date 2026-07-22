import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilePicker } from '@/components/file-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { uploadFile, type PickedFile } from '@/lib/upload-file';
import type { Database } from '@/types/supabase';

type DetailRow = Database['public']['Views']['mentor_event_row_detail']['Row'];
type EventPhoto = Database['public']['Tables']['event_photos']['Row'];

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

function materialCostText(detail: DetailRow) {
  if (detail.prep_by === '강사') return formatFee(detail.mentor_material_cost);
  if (detail.prep_by === '드림피아') return formatFee(detail.dreampia_material_cost);
  if (detail.prep_by === '모두가능') {
    return `강사 준비 시 ${formatFee(detail.mentor_material_cost)} / 드림피아 준비 시 ${formatFee(detail.dreampia_material_cost)}`;
  }
  return '-';
}

export default function LectureScheduleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [payerNames, setPayerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingCriminal, setUploadingCriminal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [detailRes, photosRes] = await Promise.all([
      supabase.from('mentor_event_row_detail').select('*').eq('event_row_id', id).maybeSingle(),
      supabase.from('event_photos').select('*').eq('event_rows_id', id).order('created_at'),
    ]);

    if (detailRes.error) {
      setLoadError(detailRes.error.message);
      setLoading(false);
      return;
    }
    setDetail(detailRes.data);
    setPhotos(photosRes.data ?? []);

    const payerIds = [detailRes.data?.lecture_fee_payer_id, detailRes.data?.material_fee_payer_id].filter(
      (v): v is string => !!v
    );
    if (payerIds.length > 0) {
      const { data: names } = await supabase.rpc('get_mentor_names', { ids: [...new Set(payerIds)] });
      const map: Record<string, string> = {};
      for (const n of names ?? []) map[n.id] = n.name;
      setPayerNames(map);
    }

    setLoadError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canTogglePreparing = useMemo(
    () => !!detail && hoursUntil(detail.start_time) <= 4,
    [detail]
  );
  const canToggleAttendance = useMemo(
    () => !!detail && hoursUntil(detail.start_time) <= 1,
    [detail]
  );

  const togglePreparing = async () => {
    if (!detail || !id) return;
    const next = !detail.preparing;
    setDetail({ ...detail, preparing: next });
    const { error } = await supabase.from('event_rows').update({ preparing: next }).eq('id', id);
    if (error) {
      setDetail((d) => (d ? { ...d, preparing: !next } : d));
      setActionError(error.message);
    }
  };

  const toggleAttendance = async () => {
    if (!detail || !id) return;
    const next = !detail.attendance;
    setDetail({ ...detail, attendance: next });
    const { error } = await supabase.from('event_rows').update({ attendance: next }).eq('id', id);
    if (error) {
      setDetail((d) => (d ? { ...d, attendance: !next } : d));
      setActionError(error.message);
    }
  };

  const handleCriminalFile = async (file: PickedFile | null) => {
    if (!file || !id) return;
    setActionError(null);
    setUploadingCriminal(true);
    try {
      const url = await uploadFile('criminal-background-check', id, file);
      const { error } = await supabase
        .from('event_rows')
        .update({ criminal_background_check: url })
        .eq('id', id);
      if (error) throw new Error(error.message);
      setDetail((d) => (d ? { ...d, criminal_background_check: url } : d));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '회보서 업로드에 실패했습니다.');
    } finally {
      setUploadingCriminal(false);
    }
  };

  const handlePhotoFile = async (file: PickedFile | null) => {
    if (!file || !id) return;
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
    const { error } = await supabase.from('event_photos').delete().eq('id', photoId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const confirmCancel = () => {
    Alert.alert('강의를 취소하시겠습니까?', '취소하면 되돌릴 수 없고, 나의 강의 일정에서 삭제됩니다.', [
      { text: '아니오', style: 'cancel' },
      { text: '취소하기', style: 'destructive', onPress: doCancel },
    ]);
  };

  const doCancel = async () => {
    if (!id) return;
    setActionError(null);
    setCancelling(true);
    const { error } = await supabase.rpc('cancel_event_row_assignment', { p_event_row_id: id });
    setCancelling(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    router.back();
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
        {actionError && <ThemedText style={styles.errorText}>{actionError}</ThemedText>}

        <ThemedView style={styles.card}>
          <Field label="행사 구분" value={detail.campaign_name ?? '-'} />
          <Field label="학교/기관명" value={detail.institution_name ?? '-'} />
          <Field label="주소" value={detail.institution_address ?? '-'} />
          <Field label="노트북/Wi-Fi" value={detail.laptop_wifi_note ?? '-'} />
          <Field label="실내화 위치" value={detail.indoor_shoes_note ?? '-'} />
          <Field label="주차/엘리베이터" value={detail.parking_note ?? '-'} />
          <Field label="학생변경 여부" value={detail.student_rotation ?? '-'} />
          <Field label="공지사항" value={detail.notice ?? '-'} />
          <Field label="메모" value={detail.memo ?? '-'} />
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
          <Field label="1인당 재료비" value={materialCostText(detail)} />
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
            <FilePicker
              file={null}
              onChange={handleCriminalFile}
              mimeTypes={['application/pdf', 'image/*']}
            />
            {uploadingCriminal && <ActivityIndicator />}
          </View>

          <View style={styles.uploadSection}>
            <ThemedText type="defaultSemiBold">사진 ({photos.length}/2)</ThemedText>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoRow}>
                <ThemedText style={styles.photoName} numberOfLines={1}>
                  {photo.url.split('/').pop()}
                </ThemedText>
                <TouchableOpacity onPress={() => deletePhoto(photo.id)}>
                  <ThemedText style={styles.removeText}>삭제</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 2 && (
              <FilePicker file={null} onChange={handlePhotoFile} mimeTypes={['image/*']} />
            )}
            {uploadingPhoto && <ActivityIndicator />}
          </View>
        </ThemedView>

        <TouchableOpacity
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          disabled={cancelling}
          onPress={confirmCancel}>
          {cancelling ? (
            <ActivityIndicator color="#c0392b" />
          ) : (
            <ThemedText style={styles.cancelButtonText}>강의 취소</ThemedText>
          )}
        </TouchableOpacity>
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
  cancelButton: {
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#c0392b',
    fontWeight: '600',
  },
});
