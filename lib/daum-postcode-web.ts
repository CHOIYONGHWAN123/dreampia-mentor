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

const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

let loadPromise: Promise<void> | null = null;

// 웹에서는 srcDoc/iframe 임베드 대신, 다음이 공식 지원하는 팝업(open()) 방식을 쓴다
// (임베드용 내부 postMessage가 opaque origin(iframe srcDoc)에서 깨지기 때문).
// 클릭 시점에 스크립트 로딩 지연이 있으면 브라우저 팝업 차단에 걸릴 수 있어 미리 로드해둔다.
export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('다음 우편번호 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}
