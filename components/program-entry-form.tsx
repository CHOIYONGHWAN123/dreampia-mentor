import { StyleSheet, TouchableOpacity } from 'react-native';

import { LevelFileInputs } from '@/components/level-file-inputs';
import { MentorSearchSelect } from '@/components/mentor-search-select';
import { ProgramUnitPicker, type ProgramOption, type UnitOption } from '@/components/program-unit-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ProgramEntryState } from '@/lib/mentor-profile-types';

// 프로그램(occupation_programs) 1건 선택 → 교급(다중) → 교급별 유닛/PPT를 입력받는 단위.
export function ProgramEntryForm({
  entry,
  programs,
  units,
  excludedUnitIds,
  selfId,
  onChange,
  onRemove,
}: {
  entry: ProgramEntryState;
  programs: ProgramOption[];
  units: UnitOption[];
  excludedUnitIds: Set<string>;
  selfId: string;
  onChange: (next: ProgramEntryState) => void;
  onRemove?: () => void;
}) {
  const toggleSelfPayer = (field: 'lectureFeePayerId' | 'materialFeePayerId') => {
    const nameField = field === 'lectureFeePayerId' ? 'lectureFeePayerName' : 'materialFeePayerName';
    const isSelf = entry[field] === selfId;
    onChange({ ...entry, [field]: isSelf ? '' : selfId, [nameField]: isSelf ? '' : '본인' });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerLabel}>프로그램</ThemedText>
        {onRemove && (
          <TouchableOpacity onPress={onRemove}>
            <ThemedText style={styles.removeText}>이 프로그램 제거</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      <ProgramUnitPicker
        programs={programs}
        units={units}
        excludedUnitIds={excludedUnitIds}
        value={entry.selection}
        onChange={(selection) =>
          onChange({
            ...entry,
            selection,
            pptFiles: {},
            profileFiles: {},
            existingPptFileUrls: {},
            existingProfileFileUrls: {},
          })
        }
      />

      <LevelFileInputs
        levels={entry.selection.levels}
        pptFiles={entry.pptFiles}
        profileFiles={entry.profileFiles}
        existingPptFileUrls={entry.existingPptFileUrls}
        existingProfileFileUrls={entry.existingProfileFileUrls}
        onPptChange={(level, file) => onChange({ ...entry, pptFiles: { ...entry.pptFiles, [level]: file } })}
        onProfileChange={(level, file) =>
          onChange({ ...entry, profileFiles: { ...entry.profileFiles, [level]: file } })
        }
      />

      <ThemedView style={styles.payerRow}>
        <ThemedView style={styles.payerCol}>
          <ThemedView style={styles.payerLabelRow}>
            <ThemedText style={styles.payerLabel}>강사료 입금자</ThemedText>
            <TouchableOpacity onPress={() => toggleSelfPayer('lectureFeePayerId')}>
              <ThemedText
                style={[
                  styles.selfToggle,
                  entry.lectureFeePayerId === selfId && styles.selfToggleActive,
                ]}>
                본인
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <MentorSearchSelect
            value={entry.lectureFeePayerId === selfId ? '' : entry.lectureFeePayerId}
            displayName={entry.lectureFeePayerName}
            onChange={(id, name) =>
              onChange({ ...entry, lectureFeePayerId: id, lectureFeePayerName: name })
            }
            placeholder="강사료 입금자 선택"
            disabled={entry.lectureFeePayerId === selfId}
          />
        </ThemedView>
        <ThemedView style={styles.payerCol}>
          <ThemedView style={styles.payerLabelRow}>
            <ThemedText style={styles.payerLabel}>재료비 입금자</ThemedText>
            <TouchableOpacity onPress={() => toggleSelfPayer('materialFeePayerId')}>
              <ThemedText
                style={[
                  styles.selfToggle,
                  entry.materialFeePayerId === selfId && styles.selfToggleActive,
                ]}>
                본인
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <MentorSearchSelect
            value={entry.materialFeePayerId === selfId ? '' : entry.materialFeePayerId}
            displayName={entry.materialFeePayerName}
            onChange={(id, name) =>
              onChange({ ...entry, materialFeePayerId: id, materialFeePayerName: name })
            }
            placeholder="재료비 입금자 선택"
            disabled={entry.materialFeePayerId === selfId}
          />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  removeText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  payerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerCol: {
    flex: 1,
    gap: 4,
  },
  payerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payerLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  selfToggle: {
    fontSize: 11,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  selfToggleActive: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#333',
  },
});
