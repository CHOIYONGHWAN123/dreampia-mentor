import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextField } from '@/components/auth-text-field';
import { HtmlContent } from '@/components/html-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

type Terms = {
  id: string;
  service_terms: string;
  privacy_policy: string;
};

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
      </ThemedView>
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreedService, setAgreedService] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [terms, setTerms] = useState<Terms | null>(null);
  const [modalField, setModalField] = useState<'service_terms' | 'privacy_policy' | null>(null);

  useEffect(() => {
    supabase
      .from('terms')
      .select('id, service_terms, privacy_policy')
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setTerms(data));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreedService || !agreedPrivacy) {
      setError('이용약관과 개인정보처리방침에 동의해주세요.');
      return;
    }
    if (!terms) {
      setError('약관 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        termsVersionId: terms.id,
      });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입에 실패했습니다.');
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
            멘토 회원가입
          </ThemedText>

          <ThemedView style={styles.form}>
            <AuthTextField label="이름" value={name} onChangeText={setName} placeholder="홍길동" />
            <AuthTextField
              label="연락처"
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              keyboardType="phone-pad"
            />
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
              placeholder="6자 이상"
              secureTextEntry
              autoComplete="new-password"
            />
            <AuthTextField
              label="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 재입력"
              secureTextEntry
              autoComplete="new-password"
            />

            <ThemedView style={styles.termsContainer}>
              <ThemedView style={styles.termsRow}>
                <Checkbox
                  checked={agreedService}
                  onPress={() => setAgreedService((v) => !v)}
                  label="[필수] 서비스 이용약관 동의"
                />
                <TouchableOpacity onPress={() => setModalField('service_terms')}>
                  <ThemedText type="link">보기</ThemedText>
                </TouchableOpacity>
              </ThemedView>
              <ThemedView style={styles.termsRow}>
                <Checkbox
                  checked={agreedPrivacy}
                  onPress={() => setAgreedPrivacy((v) => !v)}
                  label="[필수] 개인정보처리방침 동의"
                />
                <TouchableOpacity onPress={() => setModalField('privacy_policy')}>
                  <ThemedText type="link">보기</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}>
              <ThemedText style={styles.buttonText}>
                {submitting ? '가입 처리 중...' : '회원가입'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.footer}>
            <ThemedText>이미 계정이 있으신가요?</ThemedText>
            <Link href="/login">
              <ThemedText type="link">로그인</ThemedText>
            </Link>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalField !== null} animationType="slide" onRequestClose={() => setModalField(null)}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="subtitle">
              {modalField === 'service_terms' ? '서비스 이용약관' : '개인정보처리방침'}
            </ThemedText>
            <TouchableOpacity onPress={() => setModalField(null)}>
              <ThemedText type="link">닫기</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {terms && modalField && <HtmlContent contentHtml={terms[modalField] || '내용이 없습니다.'} />}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  termsContainer: {
    gap: 8,
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 15,
  },
  checkboxLabel: {
    fontSize: 13,
    flexShrink: 1,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalContent: {
    padding: 20,
  },
});
