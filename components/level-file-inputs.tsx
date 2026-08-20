import { StyleSheet } from 'react-native';

import { FilePicker } from '@/components/file-picker';
import type { UnitOption } from '@/components/program-unit-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { PickedFile } from '@/lib/upload-file';

// 선택된 교급들마다 PPT/프로필 파일을 각각 받는 입력.
export function LevelFileInputs({
  levels,
  units,
  pptFiles = {},
  profileFiles = {},
  existingPptFileUrls = {},
  existingProfileFileUrls = {},
  onPptChange,
  onProfileChange,
}: {
  levels: { schoolLevel: string; unitId: string }[];
  // PPT 양식은 유닛마다 다를 수 있어(관리자가 유닛별로 등록), unitId로 카탈로그에서 찾는다.
  units: UnitOption[];
  pptFiles?: Record<string, PickedFile | null>;
  profileFiles?: Record<string, PickedFile | null>;
  existingPptFileUrls?: Record<string, string | null>;
  existingProfileFileUrls?: Record<string, string | null>;
  onPptChange: (schoolLevel: string, file: PickedFile | null) => void;
  onProfileChange: (schoolLevel: string, file: PickedFile | null) => void;
}) {
  if (!levels.length) return null;

  return (
    <ThemedView style={styles.container}>
      {levels.map((l) => {
        const unit = units.find((u) => u.id === l.unitId);
        return (
        <ThemedView key={l.schoolLevel} style={styles.levelBlock}>
          <ThemedText style={styles.levelLabel}>{l.schoolLevel}</ThemedText>
          <ThemedView style={styles.fileRow}>
            <ThemedView style={styles.fileCol}>
              <ThemedText style={styles.fileLabel}>PPT</ThemedText>
              <FilePicker
                file={pptFiles[l.schoolLevel] ?? null}
                existingFileUrl={existingPptFileUrls[l.schoolLevel] ?? null}
                onChange={(file) => onPptChange(l.schoolLevel, file)}
                mimeTypes={[
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/pdf',
                ]}
                templateUrl={unit?.ppt_template_url ?? null}
                templateFilename="드림피아_PPT_양식.pptx"
              />
            </ThemedView>
            <ThemedView style={styles.fileCol}>
              <ThemedText style={styles.fileLabel}>프로필</ThemedText>
              <FilePicker
                file={profileFiles[l.schoolLevel] ?? null}
                existingFileUrl={existingProfileFileUrls[l.schoolLevel] ?? null}
                onChange={(file) => onProfileChange(l.schoolLevel, file)}
                templateAsset={require('@/assets/templates/profile-template.hwpx')}
                templateFilename="드림피아_프로필_양식.hwpx"
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#A1CEDC',
  },
  levelBlock: {
    gap: 6,
  },
  levelLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  fileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fileCol: {
    flex: 1,
    gap: 4,
  },
  fileLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
});
