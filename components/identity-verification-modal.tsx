import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export type IdentityVerificationResult =
  | { ok: true; name: string; phone: string; ci: string | null }
  | { ok: false; error: string };

const STORE_ID = process.env.EXPO_PUBLIC_PORTONE_STORE_ID;
const CHANNEL_KEY = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY;

// PortOne 브라우저 SDK를 인라인 HTML로 띄워 본인인증 팝업(PASS/카카오 등)을 진행한다.
// daum-address-search.tsx와 같은 패턴: 실제 페이지처럼 보이는 baseUrl을 줘야 WKWebView가
// 내부 팝업/터치를 정상 처리한다.
//
// PortOne.requestIdentityVerification()은 프로미스로 완료 결과를 돌려주는 방식이 문서상
// 기본 흐름이다. 다만 특정 PG(카카오톡 실행 등)는 앱 전환이 필요할 수 있어, onOpenWindow /
// onShouldStartLoadWithRequest로 http(s)가 아닌 딥링크는 외부 앱으로 넘겨줘야 할 수 있다 —
// 실제 키로 연동 테스트할 때 함께 확인이 필요하다.
function buildHtml(identityVerificationId: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>
          html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, sans-serif; }
          #status { display: flex; align-items: center; justify-content: center; height: 100%; color: #687076; font-size: 14px; }
        </style>
      </head>
      <body>
        <div id="status">본인인증 창을 여는 중...</div>
        <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
        <script>
          (async function () {
            try {
              var response = await PortOne.requestIdentityVerification({
                storeId: ${JSON.stringify(STORE_ID)},
                identityVerificationId: ${JSON.stringify(identityVerificationId)},
                channelKey: ${JSON.stringify(CHANNEL_KEY)},
              });
              if (response && response.code !== undefined) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({ ok: false, error: response.message || '본인인증이 취소되었습니다.' })
                );
                return;
              }
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ ok: true, identityVerificationId: ${JSON.stringify(identityVerificationId)} })
              );
            } catch (e) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ ok: false, error: '본인인증 중 오류가 발생했습니다.' })
              );
            }
          })();
        </script>
      </body>
    </html>
  `;
}

function createIdentityVerificationId() {
  const random = Math.random().toString(36).slice(2);
  return `identity-verification-${Date.now()}-${random}`;
}

export function IdentityVerificationModal({
  visible,
  onClose,
  onResult,
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (result: IdentityVerificationResult) => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [identityVerificationId] = useState(createIdentityVerificationId);

  const handleMessage = async (rawData: string) => {
    let parsed: { ok: boolean; error?: string; identityVerificationId?: string };
    try {
      parsed = JSON.parse(rawData);
    } catch {
      onClose();
      onResult({ ok: false, error: '본인인증 결과를 확인할 수 없습니다.' });
      return;
    }

    if (!parsed.ok || !parsed.identityVerificationId) {
      onClose();
      onResult({ ok: false, error: parsed.error ?? '본인인증이 취소되었습니다.' });
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.functions.invoke<IdentityVerificationResult>(
      'verify-identity',
      { body: { identityVerificationId: parsed.identityVerificationId } }
    );
    setVerifying(false);
    onClose();

    if (error || !data) {
      onResult({ ok: false, error: '본인인증 확인에 실패했습니다. 다시 시도해주세요.' });
      return;
    }
    onResult(data);
  };

  if (!STORE_ID || !CHANNEL_KEY) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">본인인증</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText type="link">닫기</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <WebView
          originWhitelist={['*']}
          source={{ html: buildHtml(identityVerificationId), baseUrl: 'https://mentorapp.dreampia.local/' }}
          onMessage={(event) => handleMessage(event.nativeEvent.data)}
          onOpenWindow={() => {}}
          style={styles.webview}
        />
        {verifying && (
          <ThemedView style={styles.overlay}>
            <ActivityIndicator />
            <ThemedText style={styles.overlayText}>인증 결과 확인 중...</ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  webview: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: {
    fontSize: 13,
    color: '#687076',
  },
});
