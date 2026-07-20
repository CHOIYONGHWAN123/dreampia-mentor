import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LectureScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          강의 상세
        </ThemedText>
        <ThemedText style={styles.description}>
          상세 페이지는 준비 중입니다. 곧 제공될 예정입니다.
        </ThemedText>
        {id && <ThemedText style={styles.idText}>일정 번호: {id}</ThemedText>}
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    color: '#687076',
  },
  idText: {
    fontSize: 12,
    color: '#687076',
  },
});
