import type { ProgramCatalog } from '@/lib/use-program-catalog';
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
  schoolRequestNote: string;
  pptFiles: Record<string, PickedFile | null>;
  profileFiles: Record<string, PickedFile | null>;
  // 회원정보 수정 화면에서 기존에 등록돼 있던 파일 URL. 새 파일을 고르지 않으면 이 값을 그대로 유지한다.
  existingPptFileUrls: Record<string, string | null>;
  existingProfileFileUrls: Record<string, string | null>;
}

export interface FieldSectionState {
  key: string;
  fieldId: string;
  occupationId: string;
  programEntries: ProgramEntryState[];
  // 자격증은 프로그램/교급이 아니라 이 분야 섹션(직종) 단위로 여러 장 첨부한다.
  certificateFiles: PickedFile[];
  // 회원정보 수정 화면에서 기존에 등록돼 있던 자격증 경로들. 제거하지 않으면 그대로 유지된다.
  existingCertificateFileUrls: string[];
}

export function createProgramEntry(): ProgramEntryState {
  return {
    key: createLocalKey(),
    selection: { occupationProgramId: '', levels: [] },
    lectureFeePayerId: '',
    lectureFeePayerName: '',
    materialFeePayerId: '',
    materialFeePayerName: '',
    schoolRequestNote: '',
    pptFiles: {},
    profileFiles: {},
    existingPptFileUrls: {},
    existingProfileFileUrls: {},
  };
}

export function createFieldSection(): FieldSectionState {
  return {
    key: createLocalKey(),
    fieldId: '',
    occupationId: '',
    programEntries: [createProgramEntry()],
    certificateFiles: [],
    existingCertificateFileUrls: [],
  };
}

export type ExistingMentorOccupationProgramRow = {
  occupation_program_unit_id: string | null;
  lecture_fee_payer_id: string | null;
  material_fee_payer_id: string | null;
  ppt_file_url: string | null;
  profile_file_url: string | null;
  school_request_note: string | null;
};

// 회원정보 수정 화면 전용: DB에 저장된 mentor_occupation_programs 행들을
// (분야→직종) 섹션, (프로그램) 항목, (교급) 레벨 구조의 폼 상태로 되돌린다.
// 같은 직종(occupationId)에 속한 행은 한 섹션으로, 같은 프로그램(occupationProgramId)에
// 속한 행은 한 프로그램 항목으로 묶고, 그 안에서 교급별로 레벨을 나눈다.
export function buildFieldSectionsFromExisting(
  rows: ExistingMentorOccupationProgramRow[],
  catalog: ProgramCatalog,
  payerNames: Record<string, string>,
  certsByOccupation: Record<string, string[]> = {}
): FieldSectionState[] {
  const unitById = new Map(catalog.units.map((u) => [u.id, u]));
  const programById = new Map(catalog.programs.map((p) => [p.id, p]));
  const occupationById = new Map(catalog.occupations.map((o) => [o.id, o]));

  const sectionsByOccupation = new Map<
    string,
    { fieldId: string; occupationId: string; entriesByProgram: Map<string, ProgramEntryState> }
  >();

  for (const row of rows) {
    const unit = row.occupation_program_unit_id ? unitById.get(row.occupation_program_unit_id) : undefined;
    if (!unit || !unit.occupation_programs_id) continue;
    const program = programById.get(unit.occupation_programs_id);
    if (!program || !program.occupation_id) continue;
    const occupation = occupationById.get(program.occupation_id);
    if (!occupation) continue;
    const schoolLevel = unit.school_level;
    if (!schoolLevel) continue;

    let section = sectionsByOccupation.get(occupation.id);
    if (!section) {
      section = { fieldId: occupation.field_id ?? '', occupationId: occupation.id, entriesByProgram: new Map() };
      sectionsByOccupation.set(occupation.id, section);
    }

    let entry = section.entriesByProgram.get(program.id);
    if (!entry) {
      entry = createProgramEntry();
      entry.selection.occupationProgramId = program.id;
      entry.lectureFeePayerId = row.lecture_fee_payer_id ?? '';
      entry.lectureFeePayerName = row.lecture_fee_payer_id ? (payerNames[row.lecture_fee_payer_id] ?? '') : '';
      entry.materialFeePayerId = row.material_fee_payer_id ?? '';
      entry.materialFeePayerName = row.material_fee_payer_id ? (payerNames[row.material_fee_payer_id] ?? '') : '';
      entry.schoolRequestNote = row.school_request_note ?? '';
      section.entriesByProgram.set(program.id, entry);
    }

    entry.selection.levels.push({ schoolLevel, unitId: unit.id });
    entry.existingPptFileUrls[schoolLevel] = row.ppt_file_url;
    entry.existingProfileFileUrls[schoolLevel] = row.profile_file_url;
  }

  // 자격증만 있고 프로그램은 아직 하나도 등록하지 않은 직종도 있을 수 있다(프로그램 선택 전에
  // 자격증부터 올려두는 경우). 그런 직종도 프로그램 0개짜리 섹션으로 화면에 남겨서 자격증이
  // 조용히 사라지지 않게 한다.
  for (const occupationId of Object.keys(certsByOccupation)) {
    if (sectionsByOccupation.has(occupationId)) continue;
    if (!certsByOccupation[occupationId]?.length) continue;
    const occupation = occupationById.get(occupationId);
    if (!occupation) continue;
    sectionsByOccupation.set(occupationId, {
      fieldId: occupation.field_id ?? '',
      occupationId: occupation.id,
      entriesByProgram: new Map(),
    });
  }

  return [...sectionsByOccupation.values()].map((section) => ({
    key: createLocalKey(),
    fieldId: section.fieldId,
    occupationId: section.occupationId,
    programEntries: [...section.entriesByProgram.values()],
    certificateFiles: [],
    existingCertificateFileUrls: certsByOccupation[section.occupationId] ?? [],
  }));
}
