import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// 앱스토어(Google Play/App Store) 심사 및 정책 요구사항용 계정/데이터 삭제 안내 페이지.
// 로그인 없이 접근 가능해야 하므로 _layout.tsx의 Stack.Protected 가드 밖에 등록되어 있다.
export default function AccountDeletionScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">계정 및 데이터 삭제</ThemedText>
        <ThemedText style={styles.body}>
          드림피아 멘토 앱 계정 삭제를 원하시면 아래 이메일로 삭제를 요청해주세요.{'\n'}
          가입 시 사용하신 이메일 주소를 함께 알려주시면 확인 후 영업일 기준 5일 이내에
          처리해드립니다.
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.email}>
          dreampia94@gmail.com
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          삭제되는 항목
        </ThemedText>
        <ThemedText style={styles.body}>
          이름, 전화번호, 주소, 주민번호, 계좌번호, 본인인증 정보, 등록하신 프로그램/서류
          등 계정에 연결된 개인정보 전체가 삭제됩니다.
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          보관되는 항목
        </ThemedText>
        <ThemedText style={styles.body}>
          이미 진행되었거나 정산이 완료된 강의 기록은 관련 법령(전자상거래법, 세법 등)에 따라
          일정 기간 별도로 보관될 수 있습니다.
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
  sectionTitle: {
    marginTop: 8,
  },
});
