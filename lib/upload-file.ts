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
