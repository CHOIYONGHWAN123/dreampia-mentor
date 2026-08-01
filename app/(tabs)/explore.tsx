import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

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
        <ThemedView style={styles.nameRow}>
          <ThemedText type="defaultSemiBold">{mentor?.name ?? '멘토'}</ThemedText>
          {mentor?.mentor_unique_code && (
            <ThemedView style={styles.codeBadge}>
              <ThemedText style={styles.codeText}>{mentor.mentor_unique_code}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
        <ThemedText>{session?.user.email}</ThemedText>
        {mentor && (
          <ThemedText style={mentor.is_authenticated ? styles.approved : styles.pending}>
            {mentor.is_authenticated ? '승인된 계정입니다' : '관리자 승인 대기 중입니다'}
          </ThemedText>
        )}
      </ThemedView>

      <Link href="/invitations" asChild>
        <TouchableOpacity style={styles.menuItem}>
          <ThemedText type="defaultSemiBold">강의요청</ThemedText>
          <IconSymbol name="chevron.right" size={18} color="#687076" />
        </TouchableOpacity>
      </Link>

      <Link href="/lecture-schedule" asChild>
        <TouchableOpacity style={styles.menuItem}>
          <ThemedText type="defaultSemiBold">강의 일정</ThemedText>
          <IconSymbol name="chevron.right" size={18} color="#687076" />
        </TouchableOpacity>
      </Link>

      <Link href="/lecture-settlement" asChild>
        <TouchableOpacity style={styles.menuItem}>
          <ThemedText type="defaultSemiBold">강의 정산</ThemedText>
          <IconSymbol name="chevron.right" size={18} color="#687076" />
        </TouchableOpacity>
      </Link>

      <Link href="/profile-edit" asChild>
        <TouchableOpacity style={styles.menuItem}>
          <ThemedText type="defaultSemiBold">회원정보 수정</ThemedText>
          <IconSymbol name="chevron.right" size={18} color="#687076" />
        </TouchableOpacity>
      </Link>

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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
    letterSpacing: 1,
  },
  approved: {
    color: '#2e7d32',
  },
  pending: {
    color: '#c77700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e2e2',
    marginBottom: 16,
  },
});
