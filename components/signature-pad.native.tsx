import { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';

const HEIGHT = 160;

// daum-address-search.tsx의 NATIVE_HTML과 동일한 이유로 WebView 안에 순수 canvas를 그린다:
// RN 자체에는 자유곡선 드로잉을 위한 저수준 캔버스 API가 없어서, 이미 설치된
// react-native-webview로 실제 브라우저 canvas를 빌려 쓴다.
const CANVAS_HTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overscroll-behavior: none; }
        canvas { display: block; touch-action: none; }
      </style>
    </head>
    <body>
      <canvas id="pad"></canvas>
      <script>
        const canvas = document.getElementById('pad');
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a1a1a';

        // 서명은 굵은 선 몇 개뿐이라 고해상도가 필요 없다. 이 캔버스가 window.innerWidth/
        // innerHeight 기준이라 기기에 따라 원본 해상도가 매우 커질 수 있는데, 그대로 보내면
        // 서버(generate-agreement-pdf)가 문서 3개에 매번 새로 임베드하며 CPU 시간을 다 써서
        // "CPU Time exceeded"로 죽는 사례가 있었다 — 전송 직전에 항상 이 크기 이하로 맞춘다.
        const MAX_EXPORT_WIDTH = 800;
        const MAX_EXPORT_HEIGHT = 300;
        function exportResizedPng(source) {
          const scale = Math.min(1, MAX_EXPORT_WIDTH / source.width, MAX_EXPORT_HEIGHT / source.height);
          if (scale >= 1) return source.toDataURL('image/png');
          const out = document.createElement('canvas');
          out.width = Math.round(source.width * scale);
          out.height = Math.round(source.height * scale);
          out.getContext('2d').drawImage(source, 0, 0, out.width, out.height);
          return out.toDataURL('image/png');
        }

        let drawing = false;

        function pos(e) {
          const t = e.touches && e.touches.length ? e.touches[0] : e;
          return { x: t.clientX, y: t.clientY };
        }
        function start(e) {
          drawing = true;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }
        function move(e) {
          if (!drawing) return;
          e.preventDefault();
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        function end() {
          if (!drawing) return;
          drawing = false;
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'signed', dataUrl: exportResizedPng(canvas) })
          );
        }
        canvas.addEventListener('touchstart', start, { passive: true });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);

        function handleClearMessage(e) {
          if (e.data === 'clear') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        // Android는 document에, iOS는 window에 message 이벤트를 실어 보내서 둘 다 등록한다.
        document.addEventListener('message', handleClearMessage);
        window.addEventListener('message', handleClearMessage);
      </script>
    </body>
  </html>
`;

export function SignaturePad({ onChange }: { onChange: (base64Png: string | null) => void }) {
  const webviewRef = useRef<WebView>(null);

  const handleClear = () => {
    webviewRef.current?.postMessage('clear');
    onChange(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.canvasBox}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: CANVAS_HTML, baseUrl: 'https://mentorapp.dreampia.local/' }}
          scrollEnabled={false}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'signed' && typeof data.dataUrl === 'string') {
                onChange(data.dataUrl.split(',')[1]);
              }
            } catch {
              // 무시: 파싱 실패 시 아무 동작도 하지 않는다.
            }
          }}
          style={styles.webview}
        />
      </View>
      <TouchableOpacity onPress={handleClear} hitSlop={8}>
        <ThemedText type="link" style={styles.clear}>
          지우기
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  canvasBox: {
    height: HEIGHT,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  clear: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
});
