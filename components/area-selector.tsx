import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export const AREA_OPTIONS = ['부산', '김해', '울산', '창원'] as const;

export function AreaSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (areas: string[]) => void;
}) {
  const toggle = (area: string) => {
    onChange(value.includes(area) ? value.filter((a) => a !== area) : [...value, area]);
  };

  return (
    <ThemedView style={styles.row}>
      {AREA_OPTIONS.map((area) => {
        const checked = value.includes(area);
        return (
          <TouchableOpacity
            key={area}
            onPress={() => toggle(area)}
            style={[styles.chip, checked && styles.chipChecked]}>
            <ThemedText style={[styles.chipText, checked && styles.chipTextChecked]}>
              {area}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  chipText: {
    fontSize: 13,
  },
  chipTextChecked: {
    color: '#fff',
    fontWeight: '600',
  },
});
