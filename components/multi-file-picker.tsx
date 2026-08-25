import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import type { PickedFile } from '@/lib/upload-file';

// 자격증처럼 여러 장을 첨부할 수 있는 private 버킷 파일용. 기존에 올려둔 파일(경로만 앎)과
// 새로 고른 파일을 함께 보여주고, 각각 개별적으로 제거할 수 있다.
export function MultiFilePicker({
  files,
  existingFileUrls,
  onChangeFiles,
  onChangeExistingFileUrls,
  bucket,
  mimeTypes = ['*/*'],
}: {
  files: PickedFile[];
  existingFileUrls: string[];
  onChangeFiles: (files: PickedFile[]) => void;
  onChangeExistingFileUrls: (urls: string[]) => void;
  bucket: string;
  mimeTypes?: string[];
}) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const handleAdd = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: mimeTypes,
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }));
    onChangeFiles([...files, ...picked]);
  };

  const handleViewExisting = async (index: number) => {
    setViewingIndex(index);
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(existingFileUrls[index], 60 * 5);
      if (error || !data) return;
      Linking.openURL(data.signedUrl);
    } finally {
      setViewingIndex(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {existingFileUrls.map((_, i) => (
        <ThemedView key={`existing-${i}`} style={styles.row}>
          <TouchableOpacity onPress={() => handleViewExisting(i)} disabled={viewingIndex === i} style={styles.rowMain}>
            <ThemedText style={styles.existingText} numberOfLines={1}>
              {viewingIndex === i ? '불러오는 중…' : `📎 등록된 자격증 ${i + 1} (탭하여 보기)`}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onChangeExistingFileUrls(existingFileUrls.filter((_, idx) => idx !== i))}
            hitSlop={8}>
            <ThemedText style={styles.remove}>제거</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ))}
      {files.map((file, i) => (
        <ThemedView key={`new-${i}`} style={styles.row}>
          <ThemedText style={styles.fileName} numberOfLines={1}>
            📄 {file.name}
          </ThemedText>
          <TouchableOpacity onPress={() => onChangeFiles(files.filter((_, idx) => idx !== i))} hitSlop={8}>
            <ThemedText style={styles.remove}>제거</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ))}
      <TouchableOpacity style={styles.addZone} onPress={handleAdd}>
        <ThemedText style={styles.addText}>+ 자격증 추가 (여러 장 선택 가능)</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rowMain: {
    flex: 1,
  },
  existingText: {
    fontSize: 13,
    color: '#0a7ea4',
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#2e7d32',
  },
  remove: {
    fontSize: 12,
    color: '#d32f2f',
  },
  addZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: {
    fontSize: 13,
    opacity: 0.7,
  },
});
