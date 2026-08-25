import { supabase } from '@/lib/supabase';

export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

function safeFileName(file: PickedFile): string {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  return ext ? `${Date.now()}.${ext}` : String(Date.now());
}

export async function uploadFile(bucket: string, dir: string, file: PickedFile): Promise<string> {
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const path = `${dir}/${safeFileName(file)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: file.mimeType, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// 신분증 사진처럼 민감한 파일용. 버킷이 public이 아니라서 getPublicUrl()로는 실제로
// 못 열리는 URL만 나온다 — 대신 버킷 내부 경로만 돌려주고, 열람할 때 그때그때
// createSignedUrl()로 짧게 유효한 링크를 발급받아 써야 한다.
export async function uploadPrivateFile(bucket: string, dir: string, file: PickedFile): Promise<string> {
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const path = `${dir}/${safeFileName(file)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: file.mimeType, upsert: true });
  if (error) throw new Error(error.message);

  return path;
}
