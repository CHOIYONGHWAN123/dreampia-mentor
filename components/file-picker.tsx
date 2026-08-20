import * as DocumentPicker from 'expo-document-picker';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { downloadTemplate, downloadTemplateFromUrl } from '@/lib/download-template';
import type { PickedFile } from '@/lib/upload-file';

export function FilePicker({
  file,
  existingFileUrl = null,
  onChange,
  mimeTypes = ['*/*'],
  templateAsset,
  templateUrl,
  templateFilename,
}: {
  file: PickedFile | null;
  // 회원정보 수정 화면처럼 이미 업로드된 파일이 있을 때, 새로 고르지 않으면 이 파일을 유지한다는 표시용.
  existingFileUrl?: string | null;
  onChange: (file: PickedFile | null) => void;
  mimeTypes?: string[];
  // 앱에 번들된 정적 양식(예: 프로필 양식 — 전체 공용, require()로 참조).
  templateAsset?: number;
  // 관리자가 올려둔 원격 양식(예: 프로그램 유닛별 PPT 양식 — Supabase Storage URL).
  templateUrl?: string | null;
  templateFilename?: string;
}) {
  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: mimeTypes,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onChange({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  return (
    <ThemedView style={styles.container}>
      {templateAsset && templateFilename && (
        <TouchableOpacity onPress={() => downloadTemplate(templateAsset, templateFilename)}>
          <ThemedText type="link" style={styles.templateLink}>
            양식 다운로드
          </ThemedText>
        </TouchableOpacity>
      )}
      {templateUrl && templateFilename && (
        <TouchableOpacity onPress={() => downloadTemplateFromUrl(templateUrl, templateFilename)}>
          <ThemedText type="link" style={styles.templateLink}>
            양식 다운로드
          </ThemedText>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.dropZone} onPress={handlePick}>
        {file ? (
          <>
            <ThemedText style={styles.fileName} numberOfLines={1}>
              📄 {file.name}
            </ThemedText>
            <TouchableOpacity onPress={() => onChange(null)} hitSlop={8}>
              <ThemedText style={styles.remove}>제거</ThemedText>
            </TouchableOpacity>
          </>
        ) : existingFileUrl ? (
          <>
            <ThemedText style={styles.existingText} numberOfLines={1}>
              📎 기존 파일 등록됨 (탭하여 교체)
            </ThemedText>
            <TouchableOpacity onPress={() => Linking.openURL(existingFileUrl)} hitSlop={8}>
              <ThemedText style={styles.viewLink}>보기</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <ThemedText style={styles.placeholder}>파일 선택</ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  templateLink: {
    fontSize: 12,
  },
  dropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#2e7d32',
  },
  placeholder: {
    fontSize: 13,
    opacity: 0.5,
  },
  remove: {
    fontSize: 12,
    color: '#d32f2f',
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
});
