import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { Button } from '@/components/button';
import { HtmlContent } from '@/components/html-content';
import {
  IdentityVerificationModal,
  isIdentityVerificationEnabled,
  type IdentityVerificationResult,
} from '@/components/identity-verification-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';

type VerifiedIdentity = { name: string; phone: string; ci: string | null };

type Terms = {
  id: string;
  service_terms: string;
  privacy_policy: string;
};

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const primary = useThemeColor({}, 'primary');
  const onPrimary = useThemeColor({}, 'onPrimary');
  const border = useThemeColor({}, 'border');

  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.7}>
      <ThemedView
        style={[
          styles.checkbox,
          { borderColor: checked ? primary : border },
          checked && { backgroundColor: primary },
        ]}>
        {checked && <ThemedText style={[styles.checkboxMark, { color: onPrimary }]}>✓</ThemedText>}
      </ThemedView>
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const textMuted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');

  const [verified, setVerified] = useState<VerifiedIdentity | null>(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
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

  const handleVerifyResult = (result: IdentityVerificationResult) => {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setVerified({ name: result.name, phone: result.phone, ci: result.ci });
  };

  const handleSubmit = async () => {
    let name: string;
    let phone: string;
    let identityVerificationCi: string | null;

    if (isIdentityVerificationEnabled) {
      if (!verified) {
        setError('본인인증을 진행해주세요.');
        return;
      }
      name = verified.name;
      phone = verified.phone;
      identityVerificationCi = verified.ci;
    } else {
      if (!manualName.trim() || !manualPhone.trim()) {
        setError('이름과 전화번호를 입력해주세요.');
        return;
      }
      name = manualName.trim();
      phone = manualPhone.trim();
      identityVerificationCi = null;
    }

    if (!email.trim() || !password) {
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
        name,
        phone,
        termsVersionId: terms.id,
        identityVerificationCi,
      });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthScreen title="멘토 회원가입" subtitle="진로 수업 강사 전용">
        <ThemedView style={[styles.card, { backgroundColor: card, boxShadow: Shadows.raised }]}>
          {isIdentityVerificationEnabled ? (
            <ThemedView style={styles.field}>
              <ThemedText style={[styles.label, { color: textMuted }]}>본인인증</ThemedText>
              {verified ? (
                <ThemedView style={[styles.verifiedBox, { borderColor: border }]}>
                  <ThemedView>
                    <ThemedText type="defaultSemiBold">{verified.name}</ThemedText>
                    <ThemedText style={[styles.verifiedPhone, { color: textMuted }]}>
                      {verified.phone}
                    </ThemedText>
                  </ThemedView>
                  <TouchableOpacity onPress={() => setVerifyModalVisible(true)}>
                    <ThemedText type="link">다시 인증하기</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ) : (
                <Button
                  title="본인인증하기"
                  variant="secondary"
                  onPress={() => setVerifyModalVisible(true)}
                />
              )}
            </ThemedView>
          ) : (
            <>
              <AuthTextField
                label="이름"
                value={manualName}
                onChangeText={setManualName}
                placeholder="홍길동"
                autoComplete="name"
              />
              <AuthTextField
                label="전화번호"
                value={manualPhone}
                onChangeText={setManualPhone}
                placeholder="010-0000-0000"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </>
          )}
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

          {error && <ThemedText style={[styles.error, { color: danger }]}>{error}</ThemedText>}

          <Button title="회원가입" onPress={handleSubmit} loading={submitting} style={styles.button} />
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText>이미 계정이 있으신가요?</ThemedText>
          <Link href="/login">
            <ThemedText type="link">로그인</ThemedText>
          </Link>
        </ThemedView>
      </AuthScreen>

      <Modal visible={modalField !== null} animationType="slide" onRequestClose={() => setModalField(null)}>
        <SafeAreaView style={styles.modalSafeArea}>
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

      <IdentityVerificationModal
        visible={verifyModalVisible}
        onClose={() => setVerifyModalVisible(false)}
        onResult={handleVerifyResult}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs + 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  verifiedPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  termsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    backgroundColor: 'transparent',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm - 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 13,
    lineHeight: 15,
  },
  checkboxLabel: {
    fontSize: 13,
    flexShrink: 1,
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
    gap: Spacing.xs + 2,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg - 4,
    paddingVertical: Spacing.sm + 4,
  },
  modalContent: {
    padding: Spacing.lg - 4,
  },
});
