import { useEffect } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadDaumPostcodeScript } from '@/lib/daum-postcode-web';

const NATIVE_HTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <style>
        html, body, #wrap { margin: 0; padding: 0; width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="wrap"></div>
      <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
      <script>
        new daum.Postcode({
          oncomplete: function (data) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ address: data.roadAddress || data.jibunAddress })
            );
          },
          width: '100%',
          height: '100%',
        }).embed(document.getElementById('wrap'));
      </script>
    </body>
  </html>
`;

export function DaumAddressSearch({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // 클릭 시점에 스크립트가 이미 로드되어 있어야 팝업 차단을 피할 수 있어 미리 불러둔다.
      loadDaumPostcodeScript().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    loadDaumPostcodeScript()
      .then(() => {
        if (!window.daum) return;
        new window.daum.Postcode({
          oncomplete: (data) => {
            onSelect(data.roadAddress || data.jibunAddress);
            onClose();
          },
          onclose: () => onClose(),
        }).open();
      })
      .catch(() => onClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS === 'web') {
    // 팝업 창 자체가 UI이므로 별도로 렌더링할 것이 없다.
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">주소 검색</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText type="link">닫기</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <WebView
          originWhitelist={['*']}
          // baseUrl 없이 인라인 html만 주면 WKWebView가 실제 origin이 없는 것으로 취급해서,
          // 내부에 중첩된 다음(Daum) 위젯의 iframe에 터치 이벤트가 전달되지 않는 문제가 있었다.
          // 실존하지 않아도 되니 https:// 형태의 baseUrl을 줘서 "진짜 페이지"처럼 만든다.
          source={{ html: NATIVE_HTML, baseUrl: 'https://mentorapp.dreampia.local/' }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              onSelect(data.address);
              onClose();
            } catch {
              // 무시: 파싱 실패 시 아무 동작도 하지 않는다.
            }
          }}
          // 다음 우편번호 위젯이 내부적으로 window.open() 형태의 새 창 열기를 시도할 때,
          // 이 핸들러가 없으면 iOS가 그 요청을 Safari로 흘려보낼 수 있다. 그냥 무시해서
          // 우리 WebView 밖으로 절대 나가지 않도록 막는다.
          onOpenWindow={() => {}}
          style={styles.webview}
        />
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
});
