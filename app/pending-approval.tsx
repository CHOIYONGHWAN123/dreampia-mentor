import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

export default function PendingApprovalScreen() {
  const { mentor, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          승인 대기 중입니다
        </ThemedText>
        <ThemedText style={styles.description}>
          {mentor?.name ?? '멘토'}님의 가입 신청이 접수되었습니다.{'\n'}
          강사료 정산 계좌와 서류 확인을 위해 추가 정보 입력이 필요합니다.{'\n'}
          입력을 완료해야 승인이 진행됩니다.
        </ThemedText>

        <Link href="/profile-setup" asChild>
          <TouchableOpacity style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>추가 정보 입력하기</ThemedText>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity style={styles.button} onPress={signOut}>
          <ThemedText style={styles.buttonText}>로그아웃</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
});
