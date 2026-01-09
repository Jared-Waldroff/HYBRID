// Theme Colors - Converted from CSS Custom Properties
// Design System for Workout Tracker

// Preset Theme Type - Each theme has primary, secondary, and background colors
// All themes can work in BOTH light and dark mode
export interface PresetTheme {
  id: string;
  name: string;
  primary: string;      // Main accent color (buttons, key elements)
  secondary: string;    // Secondary accent (highlights, gradients)
}

// 8 Curated Preset Themes - each with distinct primary and secondary colors
// These work with both light and dark mode
export const presetThemes: Record<string, PresetTheme> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    primary: '#c9a227',    // Gold
    secondary: '#1e3a5f',  // Navy
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    primary: '#00bcd4',    // Cyan
    secondary: '#0288d1',  // Blue
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    primary: '#4caf50',    // Green
    secondary: '#81c784',  // Light green
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    primary: '#ff7043',    // Orange
    secondary: '#ffab91',  // Light coral
  },
  royal: {
    id: 'royal',
    name: 'Royal',
    primary: '#9c27b0',    // Purple
    secondary: '#ce93d8',  // Light purple
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    primary: '#607d8b',    // Blue-grey
    secondary: '#90a4ae',  // Light grey
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    primary: '#e91e63',    // Pink
    secondary: '#f48fb1',  // Light pink
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    primary: '#ff9800',    // Amber/orange
    secondary: '#ffcc80',  // Light amber
  },
};

// Helper function to generate full theme colors from a preset + dark/light mode + optional overrides
export function generateThemeColors(
  preset: PresetTheme,
  isDark: boolean,
  overrides?: { primary?: string; secondary?: string; background?: string }
) {
  const primary = overrides?.primary || preset.primary;
  const secondary = overrides?.secondary || preset.secondary;

  // Background is based on dark/light mode, can be overridden
  const bgBase = overrides?.background || (isDark ? '#0a141f' : '#f8f9fc');
  const bgSecondary = overrides?.background
    ? lightenDarken(overrides.background, isDark ? 10 : -5)
    : (isDark ? '#0f1e2d' : '#ffffff');
  const bgTertiary = overrides?.background
    ? lightenDarken(overrides.background, isDark ? 20 : -10)
    : (isDark ? '#15293b' : '#eef1f7');

  return {
    bgPrimary: bgBase,
    bgSecondary: bgSecondary,
    bgTertiary: bgTertiary,
    headerBg: bgSecondary,
    footerBg: bgSecondary,
    glassBg: isDark ? `rgba(15, 30, 45, 0.8)` : `rgba(255, 255, 255, 0.85)`,
    glassBorder: hexToRgba(primary, 0.15),
    textPrimary: isDark ? '#ffffff' : '#0a141f',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(10, 20, 31, 0.7)',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(10, 20, 31, 0.5)',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(10, 20, 31, 0.35)',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(30, 58, 95, 0.05)',
    inputBorder: hexToRgba(primary, 0.2),
    divider: hexToRgba(primary, 0.15),
    accent: primary,
    accentSecondary: secondary,
    accentText: getContrastText(primary),
  };
}

// Helper to lighten or darken a hex color
function lightenDarken(hex: string, amount: number): string {
  let usePound = false;
  if (hex[0] === '#') {
    hex = hex.slice(1);
    usePound = true;
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amount;
  r = Math.min(255, Math.max(0, r));
  let g = ((num >> 8) & 0x00ff) + amount;
  g = Math.min(255, Math.max(0, g));
  let b = (num & 0x0000ff) + amount;
  b = Math.min(255, Math.max(0, b));
  return (usePound ? '#' : '') + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to get contrasting text color (black or white)
function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Legacy colors object (for backwards compatibility)
export const colors = {
  // Accent colors (user customizable)
  accentPrimary: '#1e3a5f',
  accentSecondary: '#c9a227',

  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',

  // Dark theme (default)
  dark: {
    bgPrimary: '#0a141f',
    bgSecondary: '#0f1e2d',
    bgTertiary: '#15293b',
    glassBg: 'rgba(15, 30, 45, 0.8)',
    glassBorder: 'rgba(201, 162, 39, 0.15)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    textMuted: 'rgba(255, 255, 255, 0.3)',
    inputBg: 'rgba(255, 255, 255, 0.05)',
    inputBorder: 'rgba(201, 162, 39, 0.2)',
    divider: 'rgba(201, 162, 39, 0.15)',
  },

  // Light theme
  light: {
    bgPrimary: '#f8f9fc',
    bgSecondary: '#ffffff',
    bgTertiary: '#eef1f7',
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(30, 58, 95, 0.1)',
    textPrimary: '#0a141f',
    textSecondary: 'rgba(10, 20, 31, 0.7)',
    textTertiary: 'rgba(10, 20, 31, 0.5)',
    textMuted: 'rgba(10, 20, 31, 0.35)',
    inputBg: 'rgba(30, 58, 95, 0.05)',
    inputBorder: 'rgba(30, 58, 95, 0.15)',
    divider: 'rgba(30, 58, 95, 0.1)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    light: '300' as '300',
    normal: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
  },
};

// Minimum touch target size for accessibility (48dp)
export const MIN_TOUCH_TARGET = 48;

export type ThemeColors = typeof colors.dark & { accent: string; accentSecondary: string; accentText: string; headerBg: string; footerBg: string };
export type Theme = 'dark' | 'light';
