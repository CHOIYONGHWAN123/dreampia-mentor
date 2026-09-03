import { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const HEIGHT = 160;

// 서명은 어차피 굵은 선 몇 개뿐이라 고해상도가 필요 없다. devicePixelRatio가 높은
// 데스크톱/큰 화면에서 캔버스 원본 해상도가 그대로 나가면 서버(generate-agreement-pdf)가
// 이 PNG를 문서 3개에 매번 새로 임베드하면서 CPU 시간을 다 써버려 "CPU Time exceeded"로
// 죽는 사례가 있었다 — 전송 직전에 항상 이 크기 이하로 맞춘다.
const MAX_EXPORT_WIDTH = 800;
const MAX_EXPORT_HEIGHT = 300;

function exportResizedPng(source: HTMLCanvasElement): string {
  const scale = Math.min(1, MAX_EXPORT_WIDTH / source.width, MAX_EXPORT_HEIGHT / source.height);
  if (scale >= 1) return source.toDataURL('image/png');
  const out = document.createElement('canvas');
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  out.getContext('2d')!.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

// 웹 전용 구현 (네이티브는 signature-pad.native.tsx가 대신 로드된다).
// react-native-web에서 View의 ref는 실제 DOM 엘리먼트를 가리키므로, 그 안에
// <canvas>를 명령형으로 붙여서 pointer 이벤트로 그린다.
export function SignaturePad({ onChange }: { onChange: (base64Png: string | null) => void }) {
  const containerRef = useRef<View>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 320;
    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${HEIGHT}px`;
    canvas.style.touchAction = 'none';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handlePointerDown = (e: PointerEvent) => {
      drawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const handlePointerUp = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      onChangeRef.current(exportResizedPng(canvas).split(',')[1]);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeChild(canvas);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
    onChangeRef.current(null);
  };

  return (
    <View style={styles.wrap}>
      <View ref={containerRef} style={styles.canvasContainer} />
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
  canvasContainer: {
    height: HEIGHT,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  clear: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
});
