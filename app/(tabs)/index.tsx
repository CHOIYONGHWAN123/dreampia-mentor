import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HtmlContent } from '@/components/html-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const card = useThemeColor({}, 'card');
  const danger = useThemeColor({}, 'danger');
  const textMuted = useThemeColor({}, 'textMuted');
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCompanyInfo() {
      const { data, error: fetchError } = await supabase
        .from('company_info')
        .select('content_html')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError) {
        setError('회사 소개를 불러오지 못했습니다.');
      } else {
        setContentHtml(data?.content_html ?? null);
      }
      setLoading(false);
    }

    fetchCompanyInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">회사 소개</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: card, boxShadow: Shadows.card }]}>
          {loading && <ActivityIndicator />}
          {!loading && error && <ThemedText style={{ color: danger }}>{error}</ThemedText>}
          {!loading && !error && !contentHtml && (
            <ThemedText style={{ color: textMuted }}>등록된 회사 소개가 없습니다.</ThemedText>
          )}
          {!loading && !error && contentHtml && <HtmlContent contentHtml={contentHtml} />}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
});
