import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { HtmlContent } from '@/components/html-content';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">회사 소개</ThemedText>
      </ThemedView>
      <ThemedView style={styles.contentContainer}>
        {loading && <ActivityIndicator />}
        {!loading && error && <ThemedText>{error}</ThemedText>}
        {!loading && !error && !contentHtml && (
          <ThemedText>등록된 회사 소개가 없습니다.</ThemedText>
        )}
        {!loading && !error && contentHtml && <HtmlContent contentHtml={contentHtml} />}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentContainer: {
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
