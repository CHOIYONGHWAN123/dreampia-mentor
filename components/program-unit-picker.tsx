import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export interface ProgramLevelSelection {
  schoolLevel: string;
  unitId: string;
}

export interface ProgramSelectionValue {
  occupationProgramId: string;
  levels: ProgramLevelSelection[];
}

export interface ProgramOption {
  id: string;
  name: string;
}

export interface UnitOption {
  id: string;
  title: string;
  occupation_programs_id: string | null;
  school_level: string | null;
}

// 분야 → 직종까지 선택된 상태에서, 프로그램 → 교급(다중선택) → 교급별 유닛을 고르는 공용 피커.
export function ProgramUnitPicker({
  programs,
  units,
  excludedUnitIds,
  value,
  onChange,
}: {
  programs: ProgramOption[];
  units: UnitOption[];
  excludedUnitIds?: Set<string>;
  value: ProgramSelectionValue;
  onChange: (value: ProgramSelectionValue) => void;
}) {
  const unitsForProgram = useMemo(
    () => units.filter((u) => u.occupation_programs_id === value.occupationProgramId),
    [units, value.occupationProgramId]
  );

  const levelToUnits = useMemo(() => {
    const map = new Map<string, UnitOption[]>();
    for (const unit of unitsForProgram) {
      const level = unit.school_level;
      if (!level) continue;
      const arr = map.get(level) ?? [];
      arr.push(unit);
      map.set(level, arr);
    }
    return map;
  }, [unitsForProgram]);

  const availableLevels = useMemo(() => [...levelToUnits.keys()], [levelToUnits]);

  // 교급 개념이 없는 프로그램(예: 현장운영자)은 유닛에 school_level이 없다. 이 경우 교급
  // 선택 단계를 건너뛰고 유닛을 곧바로 선택된 것으로 취급한다.
  const unleveledUnits = useMemo(
    () => unitsForProgram.filter((u) => !u.school_level && !excludedUnitIds?.has(u.id)),
    [unitsForProgram, excludedUnitIds]
  );

  const handleProgramChange = (occupationProgramId: string) => {
    const newUnleveled = units.filter(
      (u) => u.occupation_programs_id === occupationProgramId && !u.school_level && !excludedUnitIds?.has(u.id)
    );
    onChange({
      occupationProgramId,
      levels: newUnleveled.map((u) => ({ schoolLevel: u.title, unitId: u.id })),
    });
  };

  const toggleLevel = (level: string) => {
    const exists = value.levels.some((l) => l.schoolLevel === level);
    if (exists) {
      onChange({ ...value, levels: value.levels.filter((l) => l.schoolLevel !== level) });
      return;
    }
    const candidates = (levelToUnits.get(level) ?? []).filter((u) => !excludedUnitIds?.has(u.id));
    onChange({
      ...value,
      levels: [...value.levels, { schoolLevel: level, unitId: candidates[0]?.id ?? '' }],
    });
  };

  const changeUnitForLevel = (level: string, unitId: string) => {
    onChange({
      ...value,
      levels: value.levels.map((l) => (l.schoolLevel === level ? { ...l, unitId } : l)),
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SelectField
        title="프로그램 선택"
        value={value.occupationProgramId}
        options={programs.map((p) => ({ id: p.id, label: p.name }))}
        onChange={handleProgramChange}
        placeholder="프로그램 선택"
      />

      {value.occupationProgramId && unleveledUnits.length === 0 && (
        <ThemedView style={styles.chipRow}>
          {availableLevels.length > 0 ? (
            availableLevels.map((level) => {
              const checked = value.levels.some((l) => l.schoolLevel === level);
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => toggleLevel(level)}
                  style={[styles.chip, checked && styles.chipChecked]}>
                  <ThemedText style={[styles.chipText, checked && styles.chipTextChecked]}>
                    {level}
                  </ThemedText>
                </TouchableOpacity>
              );
            })
          ) : (
            <ThemedText style={styles.emptyText}>등록된 프로그램 유닛이 없습니다.</ThemedText>
          )}
        </ThemedView>
      )}

      {value.levels
        .filter((levelSelection) => levelToUnits.has(levelSelection.schoolLevel))
        .map((levelSelection) => {
          const candidates = (levelToUnits.get(levelSelection.schoolLevel) ?? []).filter(
            (u) => !excludedUnitIds?.has(u.id) || u.id === levelSelection.unitId
          );
          return (
            <ThemedView key={levelSelection.schoolLevel} style={styles.levelRow}>
              <ThemedText style={styles.levelLabel}>{levelSelection.schoolLevel}</ThemedText>
              <ThemedView style={styles.levelSelect}>
                <SelectField
                  title={`${levelSelection.schoolLevel} 유닛 선택`}
                  value={levelSelection.unitId}
                  options={candidates.map((u) => ({ id: u.id, label: u.title }))}
                  onChange={(unitId) => changeUnitForLevel(levelSelection.schoolLevel, unitId)}
                  placeholder="유닛 선택"
                />
              </ThemedView>
            </ThemedView>
          );
        })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  chipText: {
    fontSize: 12,
  },
  chipTextChecked: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    opacity: 0.5,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#A1CEDC',
  },
  levelLabel: {
    fontSize: 12,
    opacity: 0.6,
    width: 48,
  },
  levelSelect: {
    flex: 1,
  },
});
