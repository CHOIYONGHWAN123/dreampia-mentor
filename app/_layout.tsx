import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
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

// 포그라운드에서도 알림 배너/사운드를 그대로 보여준다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootNavigator() {
  const { session, isLoading, mentor, isMentorLoading, isPasswordRecovery } = useAuth();
  const isReady = !isLoading && (!session || !isMentorLoading);
  const router = useRouter();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // 강사 섭외 초대 푸시 알림을 탭하면 강의요청 화면으로 이동한다.
  // 앱이 완전히 꺼진 상태에서 알림 탭으로 켜진 경우(getLastNotificationResponseAsync)와,
  // 앱이 이미 떠 있는 상태에서 알림을 탭한 경우(addNotificationResponseReceivedListener) 둘 다 처리한다.
  useEffect(() => {
    const navigateFromResponse = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };

    Notifications.getLastNotificationResponseAsync().then(navigateFromResponse);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      navigateFromResponse(response)
    );
    return () => subscription.remove();
  }, [router]);

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
