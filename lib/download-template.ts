import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// 번들에 포함된 양식 파일(require(...))을 사용자가 저장/공유할 수 있도록 공유 시트를 띄운다.
// expo-file-system의 File/Paths는 웹을 지원하지 않으므로 웹에서는 <a download> 방식으로 분기한다.
export async function downloadTemplate(assetModule: number, filename: string) {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('양식 파일을 불러오지 못했습니다.');
  }

  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = asset.localUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const source = new File(asset.localUri);
  const destination = new File(Paths.cache, filename);
  if (destination.exists) {
    destination.delete();
  }
  source.copy(destination);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destination.uri);
  }
}

// 원격 URL(Supabase Storage 등)에 있는 양식 파일을 다운로드/공유한다.
// 프로그램 유닛별 PPT 양식처럼 관리자가 업로드해서 매번 바뀔 수 있는 파일용.
export async function downloadTemplateFromUrl(url: string, filename: string) {
  if (Platform.OS === 'web') {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    return;
  }

  const destination = new File(Paths.cache, filename);
  if (destination.exists) {
    destination.delete();
  }
  await File.downloadFileAsync(url, destination);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destination.uri);
  }
}
