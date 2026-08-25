import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgreementDocuments, type ConsentDocKey } from '@/components/agreement-documents';
import { AreaSelector } from '@/components/area-selector';
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
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  buildFieldSectionsFromExisting,
  createFieldSection,
  type ExistingMentorOccupationProgramRow,
  type FieldSectionState,
} from '@/lib/mentor-profile-types';
import { signAgreement } from '@/lib/sign-agreement';
import { supabase } from '@/lib/supabase';
import { useProgramCatalog } from '@/lib/use-program-catalog';
import { type PickedFile, uploadFile, uploadPrivateFile } from '@/lib/upload-file';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const selfId = session!.user.id;
  const { catalog, loading: catalogLoading } = useProgramCatalog();
  const surface = useThemeColor({}, 'surface');
  const textMuted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idCardFile, setIdCardFile] = useState<PickedFile | null>(null);
  const [existingIdCardFileUrl, setExistingIdCardFileUrl] = useState<string | null>(null);
  const [bankbookFile, setBankbookFile] = useState<PickedFile | null>(null);
  const [existingBankbookFileUrl, setExistingBankbookFileUrl] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [belongsToId, setBelongsToId] = useState('');
  const [belongsToName, setBelongsToName] = useState('');
  const [existingConsentFileUrls, setExistingConsentFileUrls] = useState<Record<ConsentDocKey, string | null>>({
    criminalRecordConsent: null,
    adminInfoConsent: null,
    contract: null,
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [fieldSections, setFieldSections] = useState<FieldSectionState[]>([createFieldSection()]);

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [existingProgramRows, setExistingProgramRows] = useState<ExistingMentorOccupationProgramRow[]>([]);
  const [certsByOccupation, setCertsByOccupation] = useState<Record<string, string[]>>({});
  const [payerNames, setPayerNames] = useState<Record<string, string>>({});
  const sectionsInitializedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mentorRes, mopRes, certRes] = await Promise.all([
      supabase.from('mentors').select('*').eq('id', selfId).maybeSingle(),
      supabase
        .from('mentor_occupation_programs')
        .select(
          'occupation_program_unit_id, lecture_fee_payer_id, material_fee_payer_id, ppt_file_url, profile_file_url, school_request_note'
        )
        .eq('mentor_id', selfId),
      supabase.from('mentor_occupation_certificates').select('occupation_id, file_url').eq('mentor_id', selfId),
    ]);

    if (mentorRes.error || !mentorRes.data) {
      setLoadError(mentorRes.error?.message ?? '멘토 정보를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    const mentor = mentorRes.data;
    setName(mentor.name ?? '');
    setPhone(mentor.phone ?? '');
    setIdNumber(mentor.id_number ?? '');
    setExistingIdCardFileUrl(mentor.id_card_file_url ?? null);
    setExistingBankbookFileUrl(mentor.bankbook_file_url ?? null);
    setAddress(mentor.address ?? '');
    setDetailAddress(mentor.detail_address ?? '');
    setAvailableAreas(mentor.available_areas ?? []);
    setExistingConsentFileUrls({
      criminalRecordConsent: mentor.criminal_record_consent_file_url ?? null,
      adminInfoConsent: mentor.admin_info_consent_file_url ?? null,
      contract: mentor.contract_file_url ?? null,
    });
    setBelongsToId(mentor.belongs_to ?? '');

    setBankName(mentor.bank ?? '');
    setBankAccountNumber(mentor.bank_account ?? '');

    const mopRows = mopRes.data ?? [];
    setExistingProgramRows(mopRows);

    const certMap: Record<string, string[]> = {};
    for (const c of certRes.data ?? []) {
      const arr = certMap[c.occupation_id] ?? [];
      arr.push(c.file_url);
      certMap[c.occupation_id] = arr;
    }
    setCertsByOccupation(certMap);

    const payerIds = [
      mentor.belongs_to,
      ...mopRows.map((r) => r.lecture_fee_payer_id),
      ...mopRows.map((r) => r.material_fee_payer_id),
    ].filter((v): v is string => !!v);

    if (payerIds.length > 0) {
      const { data: names } = await supabase.rpc('get_mentor_names', { ids: [...new Set(payerIds)] });
      const map: Record<string, string> = {};
      for (const n of names ?? []) map[n.id] = n.name;
      setPayerNames(map);
      setBelongsToName(mentor.belongs_to ? (map[mentor.belongs_to] ?? '') : '');
    } else {
      setPayerNames({});
      setBelongsToName('');
    }

    setLoadError(null);
    setLoading(false);
  }, [selfId]);

  useEffect(() => {
    load();
  }, [load]);

  // 멘토 정보 + 프로그램 카탈로그가 모두 준비되면 딱 한 번만 기존 등록 내용을 폼 상태로 되돌린다.
  useEffect(() => {
    if (sectionsInitializedRef.current || loading || catalogLoading) return;
    const sections = buildFieldSectionsFromExisting(existingProgramRows, catalog, payerNames, certsByOccupation);
    setFieldSections(sections.length > 0 ? sections : [createFieldSection()]);
    sectionsInitializedRef.current = true;
  }, [loading, catalogLoading, catalog, existingProgramRows, payerNames, certsByOccupation]);

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
    if (!name.trim() || !phone.trim()) {
      setError('이름과 연락처를 입력해주세요.');
      return;
    }
    if (!idNumber.trim() || !address.trim() || !bankName || !bankAccountNumber.trim()) {
      setError('주민번호, 주소, 계좌번호는 필수입니다.');
      return;
    }
    if (!idCardFile && !existingIdCardFileUrl) {
      setError('신분증 사진을 첨부해주세요.');
      return;
    }
    if (!bankbookFile && !existingBankbookFileUrl) {
      setError('통장사본을 첨부해주세요.');
      return;
    }
    const hasExistingConsent = Object.values(existingConsentFileUrls).some(Boolean);
    if (!signature && !hasExistingConsent) {
      setError('동의서에 서명해주세요.');
      return;
    }
    if (newPassword || newPasswordConfirm) {
      if (newPassword.length < 6) {
        setError('새 비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        setError('새 비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      if (newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw new Error(pwError.message);
      }

      const idCardFileUrl = idCardFile
        ? await uploadPrivateFile('id-card', selfId, idCardFile)
        : existingIdCardFileUrl;
      const bankbookFileUrl = bankbookFile
        ? await uploadPrivateFile('bankbook', selfId, bankbookFile)
        : existingBankbookFileUrl;

      const { error: updateError } = await supabase
        .from('mentors')
        .update({
          name: name.trim(),
          phone: phone.trim(),
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
        .eq('id', selfId);
      if (updateError) throw new Error(updateError.message);

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
              : (entry.existingPptFileUrls[level.schoolLevel] ?? null);
            const profileFile = entry.profileFiles[level.schoolLevel];
            const profileFileUrl = profileFile
              ? await uploadFile('profile-file', `${selfId}/${level.unitId}`, profileFile)
              : (entry.existingProfileFileUrls[level.schoolLevel] ?? null);
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

      // 자격증도 프로그램과 동일하게 항상 기존 것을 지우고 새로 채워 넣는다.
      const { error: certDeleteError } = await supabase
        .from('mentor_occupation_certificates')
        .delete()
        .eq('mentor_id', selfId);
      if (certDeleteError) throw new Error(certDeleteError.message);

      const certificateRows: { mentor_id: string; occupation_id: string; file_url: string }[] = [];
      const nextFieldSections = [];
      for (const section of fieldSections) {
        if (!section.occupationId) {
          nextFieldSections.push(section);
          continue;
        }
        const uploadedUrls: string[] = [];
        for (const file of section.certificateFiles) {
          const fileUrl = await uploadPrivateFile('certificate', selfId, file);
          uploadedUrls.push(fileUrl);
        }
        const allUrls = [...section.existingCertificateFileUrls, ...uploadedUrls];
        for (const fileUrl of allUrls) {
          certificateRows.push({ mentor_id: selfId, occupation_id: section.occupationId, file_url: fileUrl });
        }
        nextFieldSections.push({ ...section, certificateFiles: [], existingCertificateFileUrls: allUrls });
      }
      if (certificateRows.length > 0) {
        const { error: certInsertError } = await supabase
          .from('mentor_occupation_certificates')
          .insert(certificateRows);
        if (certInsertError) throw new Error(certInsertError.message);
      }
      setFieldSections(nextFieldSections);

      if (idCardFile) {
        setExistingIdCardFileUrl(idCardFileUrl);
        setIdCardFile(null);
      }
      if (bankbookFile) {
        setExistingBankbookFileUrl(bankbookFileUrl);
        setBankbookFile(null);
      }

      // 재서명한 경우에만 동의서 PDF 3종을 새로 만든다 (기존 서명을 유지하는 경우는 건드리지 않는다).
      if (signature) {
        const newPaths = await signAgreement(signature);
        setExistingConsentFileUrls({
          criminalRecordConsent: newPaths.criminalRecordConsent,
          adminInfoConsent: newPaths.adminInfoConsent,
          contract: newPaths.contract,
        });
        setSignature(null);
      }

      setNewPassword('');
      setNewPasswordConfirm('');
      Alert.alert('저장되었습니다.', undefined, [{ text: '확인', onPress: () => router.back() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || catalogLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ThemedText style={[styles.error, { color: danger }]}>{loadError}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">회원정보 수정</ThemedText>
          <ThemedText style={[styles.description, { color: textMuted }]}>
            회원가입 및 추가 정보 제출 시 입력했던 내용을 확인하고 수정할 수 있습니다.
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>이메일 (로그인 ID)</ThemedText>
            <AuthTextField value={session?.user.email ?? ''} editable={false} />
          </ThemedView>

          <AuthTextField label="이름" value={name} onChangeText={setName} placeholder="홍길동" />
          <AuthTextField
            label="연락처"
            value={phone}
            onChangeText={setPhone}
            placeholder="010-0000-0000"
            keyboardType="phone-pad"
          />

          <AuthTextField
            label="주민번호"
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="000000-0000000"
          />

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>신분증 사진</ThemedText>
            <FilePicker
              file={idCardFile}
              existingFileUrl={existingIdCardFileUrl}
              onChange={setIdCardFile}
              mimeTypes={['image/*', 'application/pdf']}
              privateExisting
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>주소</ThemedText>
            <TouchableOpacity onPress={() => setAddressSearchVisible(true)}>
              <ThemedView
                style={[styles.addressField, { backgroundColor: surface }]}
                pointerEvents="none">
                <ThemedText style={address ? undefined : { color: textMuted }}>
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
              existingFileUrl={existingBankbookFileUrl}
              onChange={setBankbookFile}
              mimeTypes={['image/*', 'application/pdf']}
              privateExisting
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>소속 강사 (선택)</ThemedText>
            <MentorCodeSearch
              value={belongsToId}
              displayName={belongsToName}
              onChange={(id, mentorName) => {
                setBelongsToId(id);
                setBelongsToName(mentorName);
              }}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>동의서</ThemedText>
            <AgreementDocuments
              signature={signature}
              onChange={setSignature}
              existingFileUrls={existingConsentFileUrls}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={[styles.label, { color: textMuted }]}>출강 가능 지역</ThemedText>
            <AreaSelector value={availableAreas} onChange={setAvailableAreas} />
          </ThemedView>

          <ThemedView style={styles.programsSection}>
            <ThemedText type="subtitle">프로그램 (선택)</ThemedText>
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
          </ThemedView>

          <ThemedView style={[styles.passwordSection, { borderTopColor: border }]}>
            <ThemedText type="subtitle">비밀번호 변경 (선택)</ThemedText>
            <ThemedText style={[styles.description, { color: textMuted }]}>
              변경하지 않으려면 비워두세요.
            </ThemedText>
            <AuthTextField
              label="새 비밀번호"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="6자 이상"
              secureTextEntry
              autoComplete="new-password"
            />
            <AuthTextField
              label="새 비밀번호 확인"
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
              placeholder="비밀번호 재입력"
              secureTextEntry
              autoComplete="new-password"
            />
          </ThemedView>

          {error && <ThemedText style={[styles.error, { color: danger }]}>{error}</ThemedText>}

          <Button title="저장" onPress={handleSubmit} loading={submitting} style={styles.button} />
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginBottom: Spacing.xs,
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
  passwordSection: {
    gap: Spacing.sm + 4,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  error: {
    fontSize: 13,
  },
  button: {
    marginTop: Spacing.xs,
  },
});
