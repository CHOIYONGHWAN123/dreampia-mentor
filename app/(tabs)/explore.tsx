import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';

export default function MyPageScreen() {
  const { session, mentor, signOut } = useAuth();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol size={200} color="#808080" name="person.fill" style={styles.headerImage} />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">마이페이지</ThemedText>
      </ThemedView>

      <ThemedView style={styles.infoContainer}>
        <ThemedText type="defaultSemiBold">{mentor?.name ?? '멘토'}</ThemedText>
        <ThemedText>{session?.user.email}</ThemedText>
        {mentor && (
          <ThemedText style={mentor.is_authenticated ? styles.approved : styles.pending}>
            {mentor.is_authenticated ? '승인된 계정입니다' : '관리자 승인 대기 중입니다'}
          </ThemedText>
        )}
      </ThemedView>

      <ThemedText type="link" onPress={signOut}>
        로그아웃
      </ThemedText>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -50,
    left: 55,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  infoContainer: {
    gap: 4,
    marginBottom: 16,
  },
  approved: {
    color: '#2e7d32',
  },
  pending: {
    color: '#c77700',
  },
});
