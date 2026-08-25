import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { MultiFilePicker } from '@/components/multi-file-picker';
import { ProgramEntryForm } from '@/components/program-entry-form';
import type { UnitOption } from '@/components/program-unit-picker';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createProgramEntry, type FieldSectionState } from '@/lib/mentor-profile-types';

// "분야 추가" 버튼으로 늘어나는 한 섹션: 분야 → 직종 선택 후, 그 직종에 속한 프로그램을
// "프로그램 추가" 버튼으로 여러 개 등록할 수 있다.
export function FieldSectionForm({
  section,
  fields,
  occupations,
  programs,
  units,
  globalExcludedUnitIds,
  selfId,
  onChange,
  onRemove,
}: {
  section: FieldSectionState;
  fields: { id: string; name: string }[];
  occupations: { id: string; name: string; field_id: string | null }[];
  programs: { id: string; name: string; occupation_id: string | null }[];
  units: UnitOption[];
  globalExcludedUnitIds: Set<string>;
  selfId: string;
  onChange: (next: FieldSectionState) => void;
  onRemove?: () => void;
}) {
  const filteredOccupations = useMemo(
    () => occupations.filter((o) => !section.fieldId || o.field_id === section.fieldId),
    [occupations, section.fieldId]
  );

  const filteredPrograms = useMemo(
    () => programs.filter((p) => p.occupation_id === section.occupationId),
    [programs, section.occupationId]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerLabel}>분야 섹션</ThemedText>
        {onRemove && (
          <TouchableOpacity onPress={onRemove}>
            <ThemedText style={styles.removeText}>이 분야 제거</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      <ThemedView style={styles.row}>
        <ThemedView style={styles.col}>
          <ThemedText style={styles.label}>분야</ThemedText>
          <SelectField
            title="분야 선택"
            value={section.fieldId}
            options={fields.map((f) => ({ id: f.id, label: f.name }))}
            onChange={(fieldId) =>
              onChange({
                ...section,
                fieldId,
                occupationId: '',
                programEntries: [createProgramEntry()],
              })
            }
            placeholder="분야 선택"
          />
        </ThemedView>
        <ThemedView style={styles.col}>
          <ThemedText style={styles.label}>직종</ThemedText>
          <SelectField
            title="직종 선택"
            value={section.occupationId}
            options={filteredOccupations.map((o) => ({ id: o.id, label: o.name }))}
            onChange={(occupationId) =>
              onChange({ ...section, occupationId, programEntries: [createProgramEntry()] })
            }
            placeholder="직종 선택"
            disabled={!section.fieldId}
          />
        </ThemedView>
      </ThemedView>

      {section.occupationId && (
        <ThemedView style={styles.certificateSection}>
          <ThemedText style={styles.label}>자격증</ThemedText>
          <MultiFilePicker
            files={section.certificateFiles}
            existingFileUrls={section.existingCertificateFileUrls}
            onChangeFiles={(certificateFiles) => onChange({ ...section, certificateFiles })}
            onChangeExistingFileUrls={(existingCertificateFileUrls) =>
              onChange({ ...section, existingCertificateFileUrls })
            }
            bucket="certificate"
            mimeTypes={['image/*', 'application/pdf']}
          />
        </ThemedView>
      )}

      {section.occupationId && (
        <ThemedView style={styles.entries}>
          {section.programEntries.map((entry) => (
            <ProgramEntryForm
              key={entry.key}
              entry={entry}
              programs={filteredPrograms}
              units={units}
              excludedUnitIds={globalExcludedUnitIds}
              selfId={selfId}
              onChange={(next) =>
                onChange({
                  ...section,
                  programEntries: section.programEntries.map((e) => (e.key === next.key ? next : e)),
                })
              }
              onRemove={
                section.programEntries.length > 1
                  ? () =>
                      onChange({
                        ...section,
                        programEntries: section.programEntries.filter((e) => e.key !== entry.key),
                      })
                  : undefined
              }
            />
          ))}
          <TouchableOpacity
            onPress={() =>
              onChange({ ...section, programEntries: [...section.programEntries, createProgramEntry()] })
            }>
            <ThemedText type="link" style={styles.addText}>
              + 프로그램 추가
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
  },
  certificateSection: {
    gap: 4,
  },
  entries: {
    gap: 8,
  },
  addText: {
    fontSize: 13,
  },
});
