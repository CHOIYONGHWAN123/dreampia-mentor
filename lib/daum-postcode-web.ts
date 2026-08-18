import { DAUM_POSTCODE_SCRIPT } from '@/lib/daum-postcode-script';

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void;
        onclose?: () => void;
      }) => { open: () => void };
    };
  }
}

let loadPromise: Promise<void> | null = null;

// 웹에서는 srcDoc/iframe 임베드 대신, 다음이 공식 지원하는 팝업(open()) 방식을 쓴다
// (임베드용 내부 postMessage가 opaque origin(iframe srcDoc)에서 깨지기 때문).
// 원격 CDN 대신 앱에 내장된 스크립트를 그대로 실행한다(daum-postcode-script.ts 참고).
export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.textContent = DAUM_POSTCODE_SCRIPT;
      document.head.appendChild(script);
      resolve();
    } catch {
      loadPromise = null;
      reject(new Error('다음 우편번호 스크립트를 실행하지 못했습니다.'));
    }
  });
  return loadPromise;
}
