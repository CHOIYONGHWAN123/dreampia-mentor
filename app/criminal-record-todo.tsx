import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        data={rows}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({ pathname: '/lecture-schedule-detail', params: { id: item.event_row_id ?? '' } })
            }>
            <ThemedText type="defaultSemiBold">{item.institution_name ?? '-'}</ThemedText>
            <ThemedText style={styles.sub}>{formatDateTime(item.start_time)}</ThemedText>
          </TouchableOpacity>
        )}
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
  sub: { fontSize: 13, color: '#687076' },
});
