import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type MentorOption = { id: string; name: string };

// search_mentors가 본인 + 소속강사만 반환하도록 제한되어 있어(20260816010000 마이그레이션),
// 대상이 많지 않으므로 검색 입력 없이 목록을 바로 보여준다.
export function MentorSearchSelect({
  value,
  displayName,
  onChange,
  placeholder = '선택',
  disabled = false,
}: {
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MentorOption[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .rpc('search_mentors', { q: '' })
      .then(({ data }: { data: MentorOption[] | null }) => setResults(data ?? []));
  }, [open]);

  const handleSelect = (mentor: MentorOption) => {
    onChange(mentor.id, mentor.name);
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
            <ThemedText type="subtitle">본인/소속강사 선택</ThemedText>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <ThemedText type="link">닫기</ThemedText>
            </TouchableOpacity>
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
              <ThemedText style={styles.empty}>선택할 수 있는 소속강사가 없습니다.</ThemedText>
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
