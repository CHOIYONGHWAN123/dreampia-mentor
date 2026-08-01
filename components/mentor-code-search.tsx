import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';

// 이름 검색은 개인정보 노출/동명이인 문제가 있어, 소속 강사는 5자리 고유 코드로
// 정확히 일치하는 1건만 찾는다(find_mentor_by_unique_code RPC).
export function MentorCodeSearch({
  value,
  displayName,
  onChange,
  placeholder = '멘토 코드 입력 (5자리)',
}: {
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
}) {
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#ccc', dark: '#3a3d3e' }, 'icon');
  const placeholderColor = useThemeColor({}, 'icon');

  const handleSearch = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('find_mentor_by_unique_code', {
      p_code: trimmed,
    });
    setSearching(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const found = data?.[0];
    if (!found) {
      setError('해당 코드의 멘토를 찾을 수 없습니다.');
      return;
    }
    onChange(found.id, found.name);
    setCode('');
  };

  const handleClear = () => {
    onChange('', '');
    setCode('');
    setError(null);
  };

  if (value) {
    return (
      <ThemedView style={[styles.field, { borderColor }]}>
        <ThemedText>{displayName || '선택됨'}</ThemedText>
        <TouchableOpacity onPress={handleClear} hitSlop={8}>
          <ThemedText style={styles.clear}>✕</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.row}>
        <TextInput
          style={[styles.input, { color, borderColor }]}
          placeholderTextColor={placeholderColor}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchButton, (!code.trim() || searching) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!code.trim() || searching}>
          <ThemedText style={styles.searchButtonText}>{searching ? '확인 중...' : '확인'}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    letterSpacing: 1,
  },
  searchButton: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clear: {
    opacity: 0.5,
  },
  error: {
    color: '#d32f2f',
    fontSize: 12,
  },
});
