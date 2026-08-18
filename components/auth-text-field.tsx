import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AuthTextField({
  label,
  error,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const color = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surface');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const placeholderColor = useThemeColor({}, 'textMuted');

  // 기본 상태는 테두리 없이 채움색만으로 입력창을 표시하고, 포커스/에러일 때만 색 있는
  // 테두리가 나타나게 해서 상자 안에 상자가 겹쳐 보이는 느낌을 없앤다.
  const borderColor = error ? danger : focused ? primary : 'transparent';

  return (
    <ThemedView style={styles.container}>
      {label && <ThemedText style={[styles.label, { color: placeholderColor }]}>{label}</ThemedText>}
      <TextInput
        style={[styles.input, { color, backgroundColor: surface, borderColor }]}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error && <ThemedText style={[styles.error, { color: danger }]}>{error}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
  },
});
