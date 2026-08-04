import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { session, isLoading, mentor, isMentorLoading, isPasswordRecovery } = useAuth();
  const isReady = !isLoading && (!session || !isMentorLoading);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const isApprovedMentor = !!session && !isPasswordRecovery && mentor?.is_authenticated === true;
  const isPendingMentor = !!session && !isPasswordRecovery && !isApprovedMentor;

  return (
    <Stack>
      <Stack.Protected guard={!!session && isPasswordRecovery}>
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isApprovedMentor}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="invitations" options={{ title: '강의요청' }} />
        <Stack.Screen name="lecture-schedule" options={{ title: '강의 일정' }} />
        <Stack.Screen name="lecture-schedule-detail" options={{ title: '강의 상세' }} />
        <Stack.Screen name="lecture-settlement" options={{ title: '강의 정산' }} />
        <Stack.Screen name="profile-edit" options={{ title: '회원정보 수정' }} />
      </Stack.Protected>
      <Stack.Protected guard={isPendingMentor}>
        <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ title: '추가 정보 입력' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="privacy" options={{ title: '개인정보처리방침' }} />
      <Stack.Screen name="support" options={{ title: '고객 지원' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
