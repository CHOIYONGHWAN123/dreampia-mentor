import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 번들에 포함된 양식 파일(require(...))을 사용자가 저장/공유할 수 있도록 공유 시트를 띄운다.
export async function downloadTemplate(assetModule: number, filename: string) {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('양식 파일을 불러오지 못했습니다.');
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
