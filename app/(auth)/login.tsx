import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const danger = useThemeColor({}, 'danger');
  const card = useThemeColor({}, 'card');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title="멘토 로그인" subtitle="진로 수업 강사 전용">
      <ThemedView style={[styles.card, { backgroundColor: card, boxShadow: Shadows.raised }]}>
        <AuthTextField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="mentor@example.com"
          keyboardType="email-address"
          autoComplete="email"
        />
        <AuthTextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          autoComplete="password"
        />
        {error && <ThemedText style={[styles.error, { color: danger }]}>{error}</ThemedText>}

        <Button title="로그인" onPress={handleSubmit} loading={submitting} style={styles.button} />
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText>아직 계정이 없으신가요?</ThemedText>
        <Link href="/signup">
          <ThemedText type="link">회원가입</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <Link href="/find-id">
          <ThemedText type="link">아이디 찾기</ThemedText>
        </Link>
        <ThemedText>|</ThemedText>
        <Link href="/find-password">
          <ThemedText type="link">비밀번호 찾기</ThemedText>
        </Link>
      </ThemedView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
});
