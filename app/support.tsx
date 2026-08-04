import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// App Store 심사/외부 공개용 지원 페이지. 로그인 없이 접근 가능해야 하므로
// _layout.tsx의 Stack.Protected 가드 밖에 등록되어 있다.
export default function SupportScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">고객 지원</ThemedText>
        <ThemedText style={styles.body}>
          드림피아 멘토 앱 이용 중 문의사항이 있으시면 아래 이메일로 연락해 주세요.
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.email}>
          dreampia94@gmail.com
        </ThemedText>
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
    padding: 20,
    gap: 12,
  },
  body: {
    lineHeight: 22,
  },
  email: {
    fontSize: 17,
  },
});
