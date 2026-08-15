import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// 강사 섭외 초대 푸시 알림 수신용 Expo 푸시 토큰을 발급받아 mentor_devices에 저장한다.
// 웹에는 이 기능을 적용하지 않는다 (Expo의 네이티브 푸시 토큰 발급 대상이 아님).
export async function registerForPushNotificationsAsync(mentorId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { error } = await supabase
    .from('mentor_devices')
    .upsert(
      { mentor_id: mentorId, expo_push_token: expoPushToken, platform: Platform.OS },
      { onConflict: 'expo_push_token' }
    );
  if (error) {
    console.error('mentor_devices upsert failed', error);
  }
}
