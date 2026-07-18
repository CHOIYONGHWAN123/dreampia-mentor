import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextField } from '@/components/auth-text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type MentorOption = { id: string; name: string };

export function MentorSearchSelect({
  value,
  displayName,
  onChange,
  placeholder = '멘토 검색',
  disabled = false,
}: {
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MentorOption[]>([]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      supabase
        .rpc('search_mentors', { q: search })
        .then(({ data }: { data: MentorOption[] | null }) => setResults(data ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, open]);

  const handleSelect = (mentor: MentorOption) => {
    onChange(mentor.id, mentor.name);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('', '');
  };

  if (disabled) {
    return (
      <ThemedView style={styles.disabledField}>
        <ThemedText style={styles.disabledText}>본인</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => {
          setOpen(true);
          setResults([]);
        }}>
        <ThemedText style={value ? undefined : styles.placeholder}>
          {value ? displayName || '선택됨' : placeholder}
        </ThemedText>
        {value !== '' && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <ThemedText style={styles.clear}>✕</ThemedText>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">멘토 검색</ThemedText>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <ThemedText type="link">닫기</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <ThemedView style={styles.searchContainer}>
            <AuthTextField
              label="이름 검색"
              value={search}
              onChangeText={setSearch}
              placeholder="이름을 입력하세요"
              autoFocus
            />
          </ThemedView>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultRow} onPress={() => handleSelect(item)}>
                <ThemedText>{item.name}</ThemedText>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <ThemedText style={styles.empty}>검색 결과가 없습니다.</ThemedText>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabledField: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    opacity: 0.6,
  },
  disabledText: {
    fontSize: 16,
  },
  placeholder: {
    opacity: 0.5,
  },
  clear: {
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.5,
  },
});
