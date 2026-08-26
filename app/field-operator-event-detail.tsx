import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type EventDetail = Database['public']['Functions']['get_field_operator_event_detail']['Returns'][number];
type EventRow = Database['public']['Functions']['get_field_operator_event_rows']['Returns'][number];

const days = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}

function formatTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export default function FieldOperatorEventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const [detailRes, rowsRes] = await Promise.all([
      supabase.rpc('get_field_operator_event_detail', { p_event_id: eventId }),
      supabase.rpc('get_field_operator_event_rows', { p_event_id: eventId }),
    ]);

    if (detailRes.error) {
      setLoadError(detailRes.error.message);
      setLoading(false);
      return;
    }
    if (rowsRes.error) {
      setLoadError(rowsRes.error.message);
      setLoading(false);
      return;
    }

    setDetail(detailRes.data?.[0] ?? null);
    setRows(rowsRes.data ?? []);
    setLoadError(null);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

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
          <ThemedText style={styles.errorText}>
            {loadError ?? '이 행사의 현장운영자로 배정된 정보를 찾을 수 없습니다.'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{detail.name ?? '-'}</ThemedText>
          <Field label="학교/기관명" value={detail.institution_name ?? '-'} />
          <Field
            label="지역"
            value={[detail.institution_region1, detail.institution_region2].filter(Boolean).join(' ') || '-'}
          />
          <Field label="주소" value={detail.institution_address ?? '-'} />
          <Field label="프로그램" value={detail.program_name ?? '-'} />
          <Field label="대상 학년" value={detail.target_grade ?? '-'} />
          <Field label="행사 시작" value={formatDateTime(detail.event_start_at)} />
          <Field label="행사 종료" value={formatDateTime(detail.event_end_at)} />
          <Field label="요청 일자" value={detail.requested_dates?.map((d) => formatDate(d)).join(', ') || '-'} />
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">담당자 정보</ThemedText>
          <Field label="담당자명" value={detail.contact_name ?? '-'} />
          <Field label="담당자 연락처" value={detail.contact_phone ?? '-'} />
          <Field label="담당자 이메일" value={detail.contact_email ?? '-'} />
          <Field label="선생님 성함" value={detail.teacher_name ?? '-'} />
          <Field label="행정실/관리자 연락처" value={detail.admin_contact ?? '-'} />
          <Field label="단체 채팅방 링크" value={detail.group_chat_link ?? '-'} />
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">현장 안내</ThemedText>
          <Field label="노트북/Wi-Fi" value={detail.laptop_wifi_note ?? '-'} />
          <Field label="실내화" value={detail.indoor_shoes_note ?? '-'} />
          <Field label="주차" value={detail.parking_note ?? '-'} />
          <Field label="엘리베이터" value={detail.has_elevator ?? '-'} />
          <Field label="강사 대기실" value={detail.instructor_waiting_room ?? '-'} />
          <Field label="학생 이동 여부" value={detail.student_rotation ?? '-'} />
          <Field label="신원조회 방식" value={detail.crime_check_method ?? '-'} />
          <Field label="신원조회 정보" value={detail.crime_check_info ?? '-'} />
          <Field label="신원조회 상태" value={detail.crime_check_status ?? '-'} />
          <Field label="학교 요청사항" value={detail.school_request_note ?? '-'} />
          <Field label="준비사항" value={detail.prep_note ?? '-'} />
          <Field label="공지사항" value={detail.notice ?? '-'} />
          <Field label="비고" value={detail.remarks ?? '-'} />
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">교시별 강사 배정 ({rows.length}개)</ThemedText>
          {rows.length === 0 && <ThemedText style={styles.emptyText}>배정된 교시가 없습니다.</ThemedText>}
          {rows.map((row) => (
            <ThemedView key={row.event_row_id} style={styles.rowCard}>
              <Field label="시간" value={`${formatTime(row.start_time)} ~ ${formatTime(row.end_time)}`} />
              <Field label="강사명" value={row.mentor_name ?? '미배정'} />
              <Field label="연락처" value={row.mentor_phone ?? '-'} />
              <Field label="프로그램" value={row.unit_title ?? row.program_name ?? '-'} />
              <Field label="직업군" value={row.occupation_name ?? '-'} />
              <Field label="대상" value={row.target ?? '-'} />
              <Field label="강의실" value={row.classroom ?? '-'} />
              <Field label="대기실" value={row.instructor_waiting_room ?? '-'} />
              <Field label="인원수" value={row.headcount?.toString() ?? '-'} />
              <Field label="차시별 인원수" value={row.session_headcount?.toString() ?? '-'} />
              <Field label="행사준비" value={row.preparing ? '완료' : '미완료'} />
              <Field label="출석" value={row.attendance ? '완료' : '미완료'} />
              <Field label="비고" value={row.remarks ?? '-'} />
            </ThemedView>
          ))}
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
  rowCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  field: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    width: 130,
    fontSize: 13,
    color: '#687076',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#687076',
  },
});
