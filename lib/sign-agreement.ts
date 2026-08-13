import { supabase } from '@/lib/supabase';

type SignAgreementResponse = { ok: boolean; url?: string; error?: string };

// 캔버스에 그린 서명(PNG base64)을 서버로 보내 동의서 PDF를 생성한다.
// 서버가 DB에 저장된 최신 프로필 값(이름/주소/계좌 등)을 직접 읽어 채우므로,
// 이 함수를 부르기 전에 프로필 필드가 먼저 저장돼 있어야 한다.
export async function signAgreement(signaturePngBase64: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<SignAgreementResponse>(
    'generate-agreement-pdf',
    { body: { signature: signaturePngBase64 } }
  );
  if (error || !data?.ok || !data.url) {
    throw new Error(data?.error ?? '동의서 생성에 실패했습니다.');
  }
  return data.url;
}
