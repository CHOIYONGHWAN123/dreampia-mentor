import { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const HEIGHT = 160;

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
      onChangeRef.current(canvas.toDataURL('image/png').split(',')[1]);
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
