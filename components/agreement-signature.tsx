import { Linking, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { SignaturePad } from '@/components/signature-pad';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// TODO: 법무 검토가 끝난 실제 동의 문구로 교체 필요. 지금은 자리표시자 문구다.
const AGREEMENT_TEXT = `강사 활동 동의서 (임시 문구)

본인은 드림피아 강사로 활동함에 있어 아래 사항에 동의합니다.

1. (임시) 개인정보 수집·이용에 동의합니다.
2. (임시) 강사료 정산을 위한 계좌 정보 제공에 동의합니다.
3. (임시) 회사가 정한 강사 운영 방침을 준수합니다.

※ 실제 법무 검토 문구가 확정되면 이 내용은 교체됩니다.`;

export function AgreementSignature({
  signature,
  onChange,
  existingFileUrl = null,
}: {
  signature: string | null;
  onChange: (signature: string | null) => void;
  existingFileUrl?: string | null;
}) {
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.textBox} nestedScrollEnabled>
        <ThemedText style={styles.text}>{AGREEMENT_TEXT}</ThemedText>
      </ScrollView>

      {existingFileUrl && !signature && (
        <ThemedView style={styles.existingRow}>
          <ThemedText style={styles.existingText} numberOfLines={1}>
            📎 이미 서명한 동의서가 있습니다
          </ThemedText>
          <TouchableOpacity onPress={() => Linking.openURL(existingFileUrl)} hitSlop={8}>
            <ThemedText style={styles.viewLink}>보기</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      <ThemedText style={styles.label}>
        {existingFileUrl ? '다시 서명하려면 아래에 서명해주세요' : '위 내용에 동의하며 아래에 서명해주세요'}
      </ThemedText>
      <SignaturePad onChange={onChange} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  textBox: {
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
  },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingText: {
    flex: 1,
    fontSize: 13,
    color: '#0a7ea4',
  },
  viewLink: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
  },
});
