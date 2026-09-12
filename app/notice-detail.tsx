import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';

type NoticeDetail = {
  title: string;
  content: string;
  created_at: string;
  eventName: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function NoticeDetailScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const isEvent = kind === 'event';
  const [item, setItem] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    if (!id) return;

    async function load() {
      if (isEvent) {
        const { data, error } = await supabase
          .from('event_notices')
          .select('event_id, title, content, created_at')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          setLoadError(error.message);
        } else if (data) {
          const { data: event } = await supabase.from('events').select('name').eq('id', data.event_id).maybeSingle();
          setItem({
            title: data.title,
            content: data.content,
            created_at: data.created_at,
            eventName: event?.name ?? null,
          });
        }
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .select('title, content, created_at')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          setLoadError(error.message);
        } else if (data) {
          setItem({ ...data, eventName: null });
        }
      }
      setLoading(false);
    }

    load();
  }, [id, isEvent]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{loadError ?? '공지사항을 찾을 수 없습니다.'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {item.eventName && (
          <ThemedText style={[styles.eventBadge, { color: tint }]}>{item.eventName}</ThemedText>
        )}
        <ThemedText type="title" style={styles.title}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.date}>{formatDate(item.created_at)}</ThemedText>
        <ThemedText style={styles.body}>{item.content}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#c0392b' },
  eventBadge: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 22 },
  date: { fontSize: 12, color: '#687076', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});
