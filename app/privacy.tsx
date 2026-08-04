import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HtmlContent } from '@/components/html-content';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// App Store 심사/외부 공개용 개인정보처리방침 페이지. 로그인 없이 접근 가능해야 하므로
// _layout.tsx의 Stack.Protected 가드 밖에 등록되어 있다. 회원가입 화면(terms 테이블)과
// 같은 데이터를 그대로 보여줘서 내용이 항상 최신 약관과 일치하도록 한다.
export default function PrivacyPolicyScreen() {
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('terms')
      .select('privacy_policy')
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError('개인정보처리방침을 불러오지 못했습니다.');
        } else {
          setContentHtml(data?.privacy_policy ?? null);
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          개인정보처리방침
        </ThemedText>
        {loading && <ActivityIndicator />}
        {!loading && error && <ThemedText>{error}</ThemedText>}
        {!loading && !error && !contentHtml && (
          <ThemedText>등록된 개인정보처리방침이 없습니다.</ThemedText>
        )}
        {!loading && !error && contentHtml && <HtmlContent contentHtml={contentHtml} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
});
