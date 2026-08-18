import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

// 로그인/회원가입 등 인증 화면이 공유하는 쉘. 브랜드 컬러가 은은하게 번지는 그라데이션
// 배경 위에 로고 + 타이틀을 얹고, 나머지 폼/카드/푸터는 children으로 받아 화면마다 구성한다.
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const textMuted = useThemeColor({}, 'textMuted');

  return (
    <LinearGradient
      colors={[colorScheme === 'dark' ? primary + '30' : primary + '22', background]}
      locations={[0, 0.55]}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Image
              source={require('@/assets/images/dreampia_logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText style={[styles.subtitle, { color: textMuted }]}>{subtitle}</ThemedText>
            )}
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  logo: {
    width: 56,
    height: 56,
    alignSelf: 'center',
    borderRadius: 14,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: -Spacing.md,
    fontSize: 14,
  },
});
