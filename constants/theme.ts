/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    textMuted: '#5B6470',
    background: '#fff',
    // card: 그림자로 페이지 배경 위에 "떠 있는" 흰 패널. surface: 그 안에 있는 입력창 등의
    // 채움색 — card보다 뚜렷하게 톤 차이가 나야 입력창이 상자 안에 상자처럼 보이지 않는다.
    card: '#ffffff',
    surface: '#EDF0F3',
    border: '#E3E7EB',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // 버튼/CTA 전용 브랜드 컬러. tint(탭 아이콘 등)와는 별개로, 다크모드에서도
    // 흰색이 아닌 실제 브랜드 톤을 유지하기 위해 나눴다.
    primary: tintColorLight,
    onPrimary: '#ffffff',
    success: '#2E7D32',
    successMuted: '#E8F5E9',
    warning: '#B26A00',
    warningMuted: '#FFF3E0',
    danger: '#C62828',
    dangerMuted: '#FDECEA',
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#151718',
    card: '#1E2124',
    surface: '#282C30',
    border: '#34393D',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#4FB6D9',
    onPrimary: '#0B1B22',
    success: '#7BC67E',
    successMuted: '#1C3320',
    warning: '#E0A855',
    warningMuted: '#3A2D14',
    danger: '#E4837F',
    dangerMuted: '#3A1E1D',
  },
};

// 4pt 그리드 기반 spacing 스케일. 화면 여백은 md, 카드 내부 여백은 sm~md를 기본으로 쓴다.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const Shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.06)',
  raised: '0 4px 12px rgba(0, 0, 0, 0.10)',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
