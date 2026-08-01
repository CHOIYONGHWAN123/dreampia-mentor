import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaSelector } from '@/components/area-selector';
import { AuthTextField } from '@/components/auth-text-field';
import { DaumAddressSearch } from '@/components/daum-address-search';
import { FieldSectionForm } from '@/components/field-section-form';
import { FilePicker } from '@/components/file-picker';
import { MentorCodeSearch } from '@/components/mentor-code-search';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BANK_OPTIONS } from '@/constants/banks';
import { useAuth } from '@/contexts/auth-context';
import { createFieldSection, type FieldSectionState } from '@/lib/mentor-profile-types';
import { supabase } from '@/lib/supabase';
import { useProgramCatalog } from '@/lib/use-program-catalog';
import { uploadFile, type PickedFile } from '@/lib/upload-file';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const selfId = session!.user.id;
  const { catalog, loading: catalogLoading } = useProgramCatalog();

  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [belongsToId, setBelongsToId] = useState('');
  const [belongsToName, setBelongsToName] = useState('');
  const [agreementFile, setAgreementFile] = useState<PickedFile | null>(null);
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
    if (!agreementFile) {
      setError('동의서 파일을 첨부해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const agreementFileUrl = await uploadFile('agreement-file', selfId, agreementFile);

      const { data: updatedRows, error: updateError } = await supabase
        .from('mentors')
        .update({
          address: address.trim() || null,
          detail_address: detailAddress.trim() || null,
          id_number: idNumber.trim() || null,
          bank: bankName || null,
          bank_account: bankAccountNumber.trim() || null,
          belongs_to: belongsToId || null,
          available_areas: availableAreas.length ? availableAreas : null,
          agreement_file_url: agreementFileUrl,
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

      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.successContainer}>
          <ThemedText type="title" style={styles.successTitle}>
            제출 완료
          </ThemedText>
          <ThemedText style={styles.successText}>
            추가 정보가 등록되었습니다.{'\n'}관리자 승인을 기다려주세요.
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <ThemedText style={styles.buttonText}>확인</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">추가 정보 입력</ThemedText>
          <ThemedText style={styles.description}>
            관리자 승인 및 강사료 정산을 위해 아래 정보를 입력해주세요.
          </ThemedText>

          <AuthTextField label="주민번호" value={idNumber} onChangeText={setIdNumber} placeholder="000000-0000000" />

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>주소</ThemedText>
            <TouchableOpacity onPress={() => setAddressSearchVisible(true)}>
              <ThemedView style={styles.addressField} pointerEvents="none">
                <ThemedText style={address ? undefined : styles.placeholder}>
                  {address || '주소 검색'}
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
            <AuthTextField
              value={detailAddress}
              onChangeText={setDetailAddress}
              placeholder="상세 주소"
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>계좌번호</ThemedText>
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
            <ThemedText style={styles.label}>소속 강사 (선택)</ThemedText>
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
            <ThemedView style={styles.templateHeader}>
              <ThemedText style={styles.label}>동의서</ThemedText>
            </ThemedView>
            <FilePicker
              file={agreementFile}
              onChange={setAgreementFile}
              mimeTypes={[
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '*/*',
              ]}
              templateAsset={require('@/assets/templates/agreement-form.hwpx')}
              templateFilename="드림피아_동의서_양식.hwpx"
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>출강 가능 지역</ThemedText>
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

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            <ThemedText style={styles.buttonText}>{submitting ? '저장 중...' : '저장'}</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DaumAddressSearch
        visible={addressSearchVisible}
        onClose={() => setAddressSearchVisible(false)}
        onSelect={setAddress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  description: {
    opacity: 0.7,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  placeholder: {
    opacity: 0.5,
  },
  addressField: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bankRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bankSelect: {
    width: 140,
  },
  bankNumber: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programsSection: {
    gap: 12,
    marginTop: 8,
  },
  error: {
    color: '#d32f2f',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  successTitle: {
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
