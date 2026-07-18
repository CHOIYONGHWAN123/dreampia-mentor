import type { ProgramSelectionValue } from '@/components/program-unit-picker';
import type { PickedFile } from '@/lib/upload-file';

// React 리스트 key로만 쓰이는 로컬 식별자라 RFC4122 UUID일 필요는 없다.
function createLocalKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface ProgramEntryState {
  key: string;
  selection: ProgramSelectionValue;
  lectureFeePayerId: string;
  lectureFeePayerName: string;
  materialFeePayerId: string;
  materialFeePayerName: string;
  pptFiles: Record<string, PickedFile | null>;
  profileFiles: Record<string, PickedFile | null>;
}

export interface FieldSectionState {
  key: string;
  fieldId: string;
  occupationId: string;
  programEntries: ProgramEntryState[];
}

export function createProgramEntry(): ProgramEntryState {
  return {
    key: createLocalKey(),
    selection: { occupationProgramId: '', levels: [] },
    lectureFeePayerId: '',
    lectureFeePayerName: '',
    materialFeePayerId: '',
    materialFeePayerName: '',
    pptFiles: {},
    profileFiles: {},
  };
}

export function createFieldSection(): FieldSectionState {
  return {
    key: createLocalKey(),
    fieldId: '',
    occupationId: '',
    programEntries: [createProgramEntry()],
  };
}
