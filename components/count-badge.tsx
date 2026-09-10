import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

// 마이페이지 "할 일" 목록에 붙는 미확인/미완료 건수 배지. 0이면 아무것도 렌더링하지 않는다.
export function CountBadge({ count }: { count: number }) {
  const danger = useThemeColor({}, 'danger');
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: danger }]}>
      <ThemedText style={styles.text}>{count > 99 ? '99+' : count}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
