import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextField } from '@/components/auth-text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type FindIdResponse = { ok: boolean; message?: string; error?: string; email?: string };

const RESEND_COOLDOWN_SECONDS = 60;

export default function FindIdScreen() {
  const [step, setStep] = useState<'input' | 'verify' | 'result'>('input');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const requestCode = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('이름과 전화번호를 입력해주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<FindIdResponse>(
        'mentor-find-id',
        { body: { action: 'request', name: name.trim(), phone: phone.trim() } }
      );
      if (invokeError) throw invokeError;
      if (!data?.ok) {
        setError(data?.error ?? '요청에 실패했습니다.');
        return;
      }
      setStep('verify');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setError('인증번호를 입력해주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<FindIdResponse>(
        'mentor-find-id',
        { body: { action: 'verify', name: name.trim(), phone: phone.trim(), code: code.trim() } }
      );
      if (invokeError) throw invokeError;
      if (!data?.ok || !data.email) {
        setError(data?.error ?? '인증에 실패했습니다.');
        return;
      }
      setMaskedEmail(data.email);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            아이디 찾기
          </ThemedText>

          {step === 'input' && (
            <ThemedView style={styles.form}>
              <ThemedText style={styles.description}>
                가입 시 등록한 이름과 전화번호를 입력하시면, 등록된 이메일로 인증번호를
                보내드립니다.
              </ThemedText>
              <AuthTextField label="이름" value={name} onChangeText={setName} placeholder="홍길동" />
              <AuthTextField
                label="전화번호"
                value={phone}
                onChangeText={setPhone}
                placeholder="010-1234-5678"
                keyboardType="phone-pad"
              />
              {error && <ThemedText style={styles.error}>{error}</ThemedText>}

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={requestCode}
                disabled={submitting}>
                <ThemedText style={styles.buttonText}>
                  {submitting ? '요청 중...' : '인증번호 받기'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {step === 'verify' && (
            <ThemedView style={styles.form}>
              <ThemedText style={styles.description}>
                입력하신 정보와 일치하는 계정이 있다면 이메일로 인증번호가 발송됩니다.
                받으신 인증번호를 입력해주세요.
              </ThemedText>
              <AuthTextField
                label="인증번호"
                value={code}
                onChangeText={setCode}
                placeholder="인증번호 입력"
                keyboardType="number-pad"
                maxLength={10}
              />
              {error && <ThemedText style={styles.error}>{error}</ThemedText>}

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={verifyCode}
                disabled={submitting}>
                <ThemedText style={styles.buttonText}>
                  {submitting ? '확인 중...' : '확인'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={requestCode}
                disabled={resendCooldown > 0 || submitting}>
                <ThemedText type="link" style={resendCooldown > 0 && styles.linkDisabled}>
                  {resendCooldown > 0 ? `인증번호 재전송 (${resendCooldown}초)` : '인증번호 재전송'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {step === 'result' && (
            <ThemedView style={styles.form}>
              <ThemedText style={styles.description}>가입하신 이메일입니다.</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.resultEmail}>
                {maskedEmail}
              </ThemedText>

              <Link href="/login" asChild>
                <TouchableOpacity style={styles.button}>
                  <ThemedText style={styles.buttonText}>로그인하러 가기</ThemedText>
                </TouchableOpacity>
              </Link>
            </ThemedView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  title: {
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#d32f2f',
    fontSize: 13,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  resultEmail: {
    fontSize: 20,
    textAlign: 'center',
  },
});
