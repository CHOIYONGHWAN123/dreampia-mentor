import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgreementDocuments } from '@/components/agreement-documents';
import { AreaSelector } from '@/components/area-selector';
import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { Button } from '@/components/button';
import { DaumAddressSearch } from '@/components/daum-address-search';
import { FieldSectionForm } from '@/components/field-section-form';
import { FilePicker } from '@/components/file-picker';
import { MentorCodeSearch } from '@/components/mentor-code-search';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BANK_OPTIONS } from '@/constants/banks';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { createFieldSection, type FieldSectionState } from '@/lib/mentor-profile-types';
import { signAgreement } from '@/lib/sign-agreement';
import { supabase } from '@/lib/supabase';
import { useProgramCatalog } from '@/lib/use-program-catalog';
import { type PickedFile, uploadFile, uploadPrivateFile } from '@/lib/upload-file';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const selfId = session!.user.id;
  const { catalog, loading: catalogLoading } = useProgramCatalog();
  const card = useThemeColor({}, 'card');
  const surface = useThemeColor({}, 'surface');
  const textMuted = useThemeColor({}, 'textMuted');
  const danger = useThemeColor({}, 'danger');

  const [idNumber, setIdNumber] = useState('');
  const [idCardFile, setIdCardFile] = useState<PickedFile | null>(null);
  const [bankbookFile, setBankbookFile] = useState<PickedFile | null>(null);
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [belongsToId, setBelongsToId] = useState('');
  const [belongsToName, setBelongsToName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [fieldSections, setFieldSections] = useState<FieldSectionState[]>([createFieldSection()]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const globalExcludedUnitIds = useMemo(() => {
    const ids = fieldSections.flatMap((s) =>
      s.programEntries.flatMap((e) => e.selection.levels.map((l) => l.unitId))
    );
    return new Set(ids.filter(Boolean));
  }, [fieldSections]);

  const updateSection = (next: FieldSectionState) => {
    setFieldSections((prev) => prev.map((s) => (s.key === next.key ? next : s)));
  };

  const handleSubmit = async () => {
    if (!idNumber.trim() || !address.trim() || !bankName || !bankAccountNumber.trim()) {
      setError('주민번호, 주소, 계좌번호는 필수입니다.');
      return;
    }
    if (!idCardFile) {
      setError('신분증 사진을 첨부해주세요.');
      return;
    }
    if (!bankbookFile) {
      setError('통장사본을 첨부해주세요.');
      return;
    }
    if (!signature) {
      setError('동의서에 서명해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const idCardFileUrl = await uploadPrivateFile('id-card', selfId, idCardFile);
      const bankbookFileUrl = await uploadPrivateFile('bankbook', selfId, bankbookFile);

      const { data: updatedRows, error: updateError } = await supabase
        .from('mentors')
        .update({
          address: address.trim() || null,
          detail_address: detailAddress.trim() || null,
          id_number: idNumber.trim() || null,
          id_card_file_url: idCardFileUrl,
          bank: bankName || null,
          bank_account: bankAccountNumber.trim() || null,
          bankbook_file_url: bankbookFileUrl,
          belongs_to: belongsToId || null,
          available_areas: availableAreas.length ? availableAreas : null,
        })
        .eq('id', selfId)
        .select('id');
      if (updateError) throw new Error(updateError.message);
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          '내 계정의 멘토 프로필을 찾을 수 없습니다. 로그아웃 후 다시 로그인해보시고, 그래도 안 되면 관리자에게 문의해주세요.'
        );
      }

      // 프로그램 등록 내용은 재입력 시 항상 기존 것을 지우고 새로 채워 넣는다(변경 = 삭제 후 재추가).
      const { error: deleteError } = await supabase
        .from('mentor_occupation_programs')
        .delete()
        .eq('mentor_id', selfId);
      if (deleteError) throw new Error(deleteError.message);

      const programRows: {
        mentor_id: string;
        occupation_program_unit_id: string;
        lecture_fee_payer_id: string | null;
        material_fee_payer_id: string | null;
        ppt_file_url: string | null;
        profile_file_url: string | null;
        school_request_note: string | null;
      }[] = [];

      for (const section of fieldSections) {
        for (const entry of section.programEntries) {
          for (const level of entry.selection.levels) {
            if (!level.unitId) continue;
            const pptFile = entry.pptFiles[level.schoolLevel];
            const pptFileUrl = pptFile
              ? await uploadFile('ppt-file', `${selfId}/${level.unitId}`, pptFile)
              : null;
            const profileFile = entry.profileFiles[level.schoolLevel];
            const profileFileUrl = profileFile
              ? await uploadFile('profile-file', `${selfId}/${level.unitId}`, profileFile)
              : null;
            programRows.push({
              mentor_id: selfId,
              occupation_program_unit_id: level.unitId,
              lecture_fee_payer_id: entry.lectureFeePayerId || null,
              material_fee_payer_id: entry.materialFeePayerId || null,
              ppt_file_url: pptFileUrl,
              profile_file_url: profileFileUrl,
              school_request_note: entry.schoolRequestNote.trim() || null,
            });
          }
        }
      }

      if (programRows.length > 0) {
        const { error: insertError } = await supabase
          .from('mentor_occupation_programs')
          .insert(programRows);
        if (insertError) throw new Error(insertError.message);
      }

      // 방금 저장한 최신 프로필 값을 서버가 읽어 동의서 PDF를 만들기 때문에, 반드시 위 저장이 끝난 뒤 호출한다.
      await signAgreement(signature);

      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthScreen title="제출 완료" subtitle="관리자 승인을 기다려주세요">
        <ThemedView style={[styles.card, styles.successCard, { backgroundColor: card, boxShadow: Shadows.raised }]}>
          <ThemedText style={styles.successText}>
            추가 정보가 등록되었습니다.{'\n'}관리자 승인을 기다려주세요.
          </ThemedText>
          <Button title="확인" onPress={() => router.back()} style={styles.successButton} />
        </ThemedView>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="추가 정보 입력" subtitle="관리자 승인 및 강사료 정산을 위해 필요해요">
      <ThemedView style={[styles.card, { backgroundColor: card, boxShadow: Shadows.raised }]}>
        <AuthTextField label="주민번호" value={idNumber} onChangeText={setIdNumber} placeholder="000000-0000000" />

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>신분증 사진</ThemedText>
          <FilePicker
            file={idCardFile}
            onChange={setIdCardFile}
            mimeTypes={['image/*', 'application/pdf']}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>주소</ThemedText>
          <TouchableOpacity onPress={() => setAddressSearchVisible(true)}>
            <ThemedView style={[styles.addressField, { backgroundColor: surface }]} pointerEvents="none">
              <ThemedText style={address ? undefined : { color: textMuted }}>
                {address || '주소 검색'}
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
          <AuthTextField value={detailAddress} onChangeText={setDetailAddress} placeholder="상세 주소" />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>계좌번호</ThemedText>
          <ThemedView style={styles.bankRow}>
            <ThemedView style={styles.bankSelect}>
              <SelectField
                title="은행 선택"
                value={bankName}
                options={BANK_OPTIONS.map((b) => ({ id: b, label: b }))}
                onChange={setBankName}
                placeholder="은행 선택"
              />
            </ThemedView>
            <ThemedView style={styles.bankNumber}>
              <AuthTextField
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="계좌번호"
                keyboardType="number-pad"
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>통장사본</ThemedText>
          <FilePicker
            file={bankbookFile}
            onChange={setBankbookFile}
            mimeTypes={['image/*', 'application/pdf']}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>소속 강사 (선택)</ThemedText>
          <MentorCodeSearch
            value={belongsToId}
            displayName={belongsToName}
            onChange={(id, name) => {
              setBelongsToId(id);
              setBelongsToName(name);
            }}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>동의서</ThemedText>
          <AgreementDocuments signature={signature} onChange={setSignature} />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText style={[styles.label, { color: textMuted }]}>출강 가능 지역</ThemedText>
          <AreaSelector value={availableAreas} onChange={setAvailableAreas} />
        </ThemedView>

        <ThemedView style={styles.programsSection}>
          <ThemedText type="subtitle">프로그램 (선택)</ThemedText>
          {catalogLoading ? (
            <ActivityIndicator />
          ) : (
            <>
              {fieldSections.map((section) => (
                <FieldSectionForm
                  key={section.key}
                  section={section}
                  fields={catalog.fields}
                  occupations={catalog.occupations}
                  programs={catalog.programs}
                  units={catalog.units}
                  globalExcludedUnitIds={globalExcludedUnitIds}
                  selfId={selfId}
                  onChange={updateSection}
                  onRemove={
                    fieldSections.length > 1
                      ? () => setFieldSections((prev) => prev.filter((s) => s.key !== section.key))
                      : undefined
                  }
                />
              ))}
              <TouchableOpacity onPress={() => setFieldSections((prev) => [...prev, createFieldSection()])}>
                <ThemedText type="link">+ 분야 추가</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </ThemedView>

        {error && <ThemedText style={[styles.error, { color: danger }]}>{error}</ThemedText>}

        <Button title="저장" onPress={handleSubmit} loading={submitting} style={styles.button} />
      </ThemedView>

      <DaumAddressSearch
        visible={addressSearchVisible}
        onClose={() => setAddressSearchVisible(false)}
        onSelect={setAddress}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs + 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  addressField: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  bankRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bankSelect: {
    width: 140,
  },
  bankNumber: {
    flex: 1,
  },
  programsSection: {
    gap: Spacing.sm + 4,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: 13,
  },
  button: {
    marginTop: Spacing.xs,
  },
  successCard: {
    alignItems: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  successButton: {
    minWidth: 200,
    paddingHorizontal: Spacing.xl,
  },
});
