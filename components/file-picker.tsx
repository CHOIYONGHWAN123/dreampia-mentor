import * as DocumentPicker from 'expo-document-picker';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { downloadTemplate } from '@/lib/download-template';
import type { PickedFile } from '@/lib/upload-file';

export function FilePicker({
  file,
  onChange,
  mimeTypes = ['*/*'],
  templateAsset,
  templateFilename,
}: {
  file: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  mimeTypes?: string[];
  templateAsset?: number;
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
});
