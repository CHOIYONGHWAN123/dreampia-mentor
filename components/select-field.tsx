import { useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type SelectOption = { id: string; label: string };

// 분야/직종/프로그램/은행 선택처럼, 목록에서 하나를 고르는 공용 모달 선택기.
export function SelectField({
  title,
  value,
  options,
  onChange,
  placeholder = '선택',
  disabled = false,
}: {
  title: string;
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        disabled={disabled}
        onPress={() => setOpen(true)}>
        <ThemedText style={selected ? undefined : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </ThemedText>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <ThemedText type="link">닫기</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}>
                <ThemedText style={item.id === value ? styles.selectedLabel : undefined}>
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<ThemedText style={styles.empty}>선택지가 없습니다.</ThemedText>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  placeholder: {
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
  selectedLabel: {
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.5,
  },
});
