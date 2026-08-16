declare global {
  interface Window {
    PortOne?: {
      requestIdentityVerification: (params: {
        storeId: string;
        identityVerificationId: string;
        channelKey: string;
      }) => Promise<{ code?: string; message?: string } | undefined>;
    };
  }
}

const SCRIPT_SRC = 'https://cdn.portone.io/v2/browser-sdk.js';

let loadPromise: Promise<void> | null = null;

// react-native-webview는 web을 지원하지 않아, 웹에서는 PortOne 브라우저 SDK를 페이지에
// 직접 로드해 requestIdentityVerification()을 호출한다(SDK가 알아서 팝업 창을 띄운다).
export function loadPortOneScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.PortOne?.requestIdentityVerification) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('PortOne 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}
