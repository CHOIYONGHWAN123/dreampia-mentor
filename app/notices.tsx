import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { markAnnouncementsSeenNow } from '@/lib/mentor-todos';
import { fetchNotices, type NoticeItem } from '@/lib/notices';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function NoticesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tint = useThemeColor({}, 'tint');

  const load = useCallback(async () => {
    const { items: data, error } = await fetchNotices();
    setItems(data);
    setLoadError(error);
    // 목록을 열람하면 그 시점까지의 공지(전체 + 행사별)는 모두 확인한 것으로 본다.
    markAnnouncementsSeenNow();
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
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={loadError ? <ThemedText style={styles.error}>{loadError}</ThemedText> : null}
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyText}>등록된 공지사항이 없습니다.</ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({ pathname: '/notice-detail', params: { id: item.id, kind: item.kind } })
            }>
            {item.kind === 'event' && item.eventName && (
              <ThemedText style={[styles.eventBadge, { color: tint }]} numberOfLines={1}>
                {item.eventName}
              </ThemedText>
            )}
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.date}>{formatDate(item.createdAt)}</ThemedText>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#687076' },
  error: { color: '#c0392b', marginBottom: 8 },
  item: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  eventBadge: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: '#687076' },
});
