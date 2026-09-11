import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { fetchMissingCriminalRecordRows } from '@/lib/mentor-todos';
import type { Database } from '@/types/supabase';

type DetailRow = Database['public']['Views']['mentor_event_row_detail']['Row'];

const days = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) ${time}`;
}

export default function CriminalRecordTodoScreen() {
  const router = useRouter();
  // 관리자가 "회보서 조회 요청" 알림을 보낼 때 data.url에 eventId를 쿼리파라미터로 실어
  // 이 화면으로 딥링크한다 — 해당 행사 건을 목록 맨 위로 올리고 강조 표시한다.
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const warning = useThemeColor({}, 'warning');
  const warningMuted = useThemeColor({}, 'warningMuted');

  const load = useCallback(async () => {
    const data = await fetchMissingCriminalRecordRows();
    setRows(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // 알림으로 지목된 행사 건을 맨 위로 올린다(그 외 순서는 기존 정렬 유지).
  const sortedRows = useMemo(() => {
    if (!eventId) return rows;
    const matched = rows.filter((r) => r.event_id === eventId);
    const rest = rows.filter((r) => r.event_id !== eventId);
    return [...matched, ...rest];
  }, [rows, eventId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sortedRows}
        keyExtractor={(row, i) => row.event_row_id ?? String(i)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <ThemedText style={styles.headerHint}>
            강의 시작 전까지 회보서(범죄경력조회 회보서)를 등록해주세요.
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyText}>등록할 회보서가 없습니다.</ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => {
          const isHighlighted = !!eventId && item.event_id === eventId;
          return (
            <TouchableOpacity
              style={[
                styles.item,
                isHighlighted && { borderColor: warning, backgroundColor: warningMuted, borderWidth: 1.5 },
              ]}
              onPress={() =>
                router.push({ pathname: '/lecture-schedule-detail', params: { id: item.event_row_id ?? '' } })
              }>
              {isHighlighted && <ThemedText style={[styles.badge, { color: warning }]}>회보서 등록 요청</ThemedText>}
              <ThemedText type="defaultSemiBold">{item.institution_name ?? '-'}</ThemedText>
              {item.event_name && <ThemedText style={styles.sub}>{item.event_name}</ThemedText>}
              <ThemedText style={styles.sub}>{formatDateTime(item.start_time)}</ThemedText>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  headerHint: { fontSize: 13, color: '#687076', marginBottom: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#687076' },
  item: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  badge: { fontSize: 12, fontWeight: '700' },
  sub: { fontSize: 13, color: '#687076' },
});
