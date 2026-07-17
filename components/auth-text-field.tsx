import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AuthTextField({
  label,
  error,
  ...rest
}: TextInputProps & { label: string; error?: string }) {
  const color = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#ccc', dark: '#3a3d3e' }, 'icon');
  const placeholderColor = useThemeColor({}, 'icon');

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { color, borderColor }]}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#d32f2f',
    fontSize: 12,
  },
});
