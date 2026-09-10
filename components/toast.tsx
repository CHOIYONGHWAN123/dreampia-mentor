import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastType = 'success' | 'error';
type ToastState = { id: number; message: string; type: ToastType };

const VISIBLE_DURATION: Record<ToastType, number> = {
  success: 2200,
  error: 3200,
};

const ToastContext = createContext<{ showToast: (message: string, type?: ToastType) => void } | null>(
  null
);

// 강의요청 확정처럼 중요한 결과는 여전히 Alert(모달)로 막고, 체크박스 토글·업로드·삭제처럼
// 자주 일어나는 가벼운 처리 결과는 이 토스트로 화면 하단에 잠깐 띄웠다 자동으로 지운다.
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const id = Date.now();
      setToast({ id, message, type });
      opacity.stopAnimation();
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setToast((current) => (current?.id === id ? null : current));
        });
      }, VISIBLE_DURATION[type]);
    },
    [opacity]
  );

  const palette =
    toast?.type === 'error'
      ? { bg: Colors[scheme].dangerMuted, fg: Colors[scheme].danger }
      : { bg: Colors[scheme].successMuted, fg: Colors[scheme].success };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            {
              bottom: insets.bottom + Spacing.lg,
              opacity,
              backgroundColor: palette.bg,
              boxShadow: Shadows.raised,
            },
          ]}>
          <Text style={[styles.text, { color: palette.fg }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다.');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
