import { supabase } from '@/lib/supabase';

export type SignAgreementPaths = {
  criminalRecordConsent: string;
  adminInfoConsent: string;
  contract: string;
};

type SignAgreementResponse = { ok: boolean; paths?: SignAgreementPaths; error?: string };

// 캔버스에 그린 서명(PNG base64) 하나를 서버로 보내, 실제 법정 서식 3종
// (성범죄 및 아동학대관련범죄 전력 조회 동의서 / 행정정보 공동이용 사전동의서 / 강사계약서)에
// 한 번에 서명한다. 서버가 DB에 저장된 최신 프로필 값(이름/연락처/주민번호)을 직접 읽어
// 채우므로, 이 함수를 부르기 전에 프로필 필드가 먼저 저장돼 있어야 한다.
export async function signAgreement(signaturePngBase64: string): Promise<SignAgreementPaths> {
  const { data, error } = await supabase.functions.invoke<SignAgreementResponse>(
    'generate-agreement-pdf',
    { body: { signature: signaturePngBase64 } }
  );
  if (error || !data?.ok || !data.paths) {
    throw new Error(data?.error ?? '동의서 생성에 실패했습니다.');
  }
  return data.paths;
}
