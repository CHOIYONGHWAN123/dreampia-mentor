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
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </ThemedText>
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
  button: {
    marginTop: 16,
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
