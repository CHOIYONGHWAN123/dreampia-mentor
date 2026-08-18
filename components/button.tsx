import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = useThemeColor({}, 'primary');
  const onPrimary = useThemeColor({}, 'onPrimary');
  const danger = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

  const palette: Record<ButtonVariant, { background: string; foreground: string; borderColor?: string }> = {
    primary: { background: primary, foreground: onPrimary },
    secondary: { background: surface, foreground: text, borderColor: border },
    ghost: { background: 'transparent', foreground: primary },
    destructive: { background: dangerMuted, foreground: danger },
  };
  const { background, foreground, borderColor } = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizes[size],
        {
          backgroundColor: background,
          borderColor: borderColor,
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          boxShadow: variant === 'primary' && !isDisabled ? Shadows.raised : undefined,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <ThemedText style={[styles.label, textSizes[size], { color: foreground }]}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

const sizes: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
  md: { paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.lg },
};

const textSizes: Record<ButtonSize, { fontSize: number }> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
