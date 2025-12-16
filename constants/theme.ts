/**
 * ランチ＆ディナーレコメンドアプリのカラーテーマ
 * オレンジベースの暖色系で食欲を刺激するデザイン
 */

import { Platform } from "react-native";

// Primary accent color - warm orange
const tintColorLight = "#FF6B35";
const tintColorDark = "#FF8C5A";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#666666",
    textDisabled: "#AAAAAA",
    background: "#F8F8F8",
    card: "#FFFFFF",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorLight,
    border: "#E5E5E5",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    errorLight: "#FFE5E5",
    // Category colors
    japanese: "#E74C3C",
    western: "#3498DB",
    chinese: "#F39C12",
    other: "#9B59B6",
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#A0A0A0",
    textDisabled: "#666666",
    background: "#121212",
    card: "#1E1E1E",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#666666",
    tabIconSelected: tintColorDark,
    border: "#333333",
    success: "#30D158",
    warning: "#FFD60A",
    error: "#FF453A",
    errorLight: "#3D1A1A",
    // Category colors
    japanese: "#FF6B6B",
    western: "#5DADE2",
    chinese: "#F5B041",
    other: "#BB8FCE",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
