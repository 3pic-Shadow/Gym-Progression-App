import { Platform, StyleSheet, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#171A1F',
    textMuted: '#606873',
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F4',
    border: '#D9DEE5',
    tint: '#087E62',
    tintContrast: '#FFFFFF',
    success: '#247A45',
    warning: '#9A5B00',
    danger: '#B42318',
    icon: '#59636E',
    tabIconDefault: '#69737D',
    tabIconSelected: '#087E62',
  },
  dark: {
    text: '#F2F4F7',
    textMuted: '#AAB2BC',
    background: '#111416',
    surface: '#1A1F23',
    surfaceMuted: '#242A2F',
    border: '#343C43',
    tint: '#58D0AA',
    tintContrast: '#08291F',
    success: '#6BD593',
    warning: '#F2B84B',
    danger: '#FF8A80',
    icon: '#B2BBC4',
    tabIconDefault: '#909AA4',
    tabIconSelected: '#58D0AA',
  },
  'micro-interactions': {
    text: '#172033', textMuted: '#516078', background: '#F8FAFF', surface: '#FFFFFF', surfaceMuted: '#EFF6FF', border: '#BFDBFE', tint: '#2563EB', tintContrast: '#FFFFFF', success: '#16A34A', warning: '#B45309', danger: '#B42318', icon: '#52617A', tabIconDefault: '#7890B0', tabIconSelected: '#2563EB',
  },
  inclusive: {
    text: '#FFFFFF', textMuted: '#D1D5DB', background: '#000000', surface: '#111827', surfaceMuted: '#1F2937', border: '#4B5563', tint: '#60A5FA', tintContrast: '#0B1220', success: '#6BD593', warning: '#FB923C', danger: '#FF8A80', icon: '#D1D5DB', tabIconDefault: '#9CA3AF', tabIconSelected: '#60A5FA',
  },
  'soft-ui': {
    text: '#203040', textMuted: '#536577', background: '#E0F2FE', surface: '#F8FDFF', surfaceMuted: '#DFF4FA', border: '#B9DDE8', tint: '#0E7490', tintContrast: '#FFFFFF', success: '#15803D', warning: '#DB2777', danger: '#B42318', icon: '#536577', tabIconDefault: '#7593A0', tabIconSelected: '#0E7490',
  },
  cyberpunk: {
    text: '#F8FAFC', textMuted: '#A5B4FC', background: '#090016', surface: '#160B2A', surfaceMuted: '#24113F', border: '#5B21B6', tint: '#22D3EE', tintContrast: '#07111A', success: '#A3E635', warning: '#FACC15', danger: '#F472B6', icon: '#C4B5FD', tabIconDefault: '#8B5CF6', tabIconSelected: '#22D3EE',
  },
  neubrutalism: {
    text: '#111827', textMuted: '#374151', background: '#FFF7D6', surface: '#FFFFFF', surfaceMuted: '#FEF08A', border: '#111827', tint: '#DC2626', tintContrast: '#FFFFFF', success: '#15803D', warning: '#B45309', danger: '#991B1B', icon: '#111827', tabIconDefault: '#4B5563', tabIconSelected: '#DC2626',
  },
};

export type ColorScheme = keyof typeof Colors;

export function isDarkColorScheme(scheme: ColorScheme) {
  return scheme === 'dark' || scheme === 'inclusive' || scheme === 'cyberpunk';
}

export const ThemeTokens: Record<
  ColorScheme,
  {
    radius: number;
    borderWidth: number;
    buttonRadius: number;
    buttonBorderWidth: number;
    surfaceShadow: ViewStyle;
    buttonShadow: ViewStyle;
  }
> = {
  light: {
    radius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    buttonRadius: 8,
    buttonBorderWidth: StyleSheet.hairlineWidth,
    surfaceShadow: {},
    buttonShadow: {},
  },
  dark: {
    radius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    buttonRadius: 8,
    buttonBorderWidth: StyleSheet.hairlineWidth,
    surfaceShadow: {},
    buttonShadow: {},
  },
  'micro-interactions': {
    radius: 14,
    borderWidth: 1,
    buttonRadius: 22,
    buttonBorderWidth: 0,
    surfaceShadow: { elevation: 2, shadowColor: '#2563EB', shadowOpacity: 0.12, shadowRadius: 7 },
    buttonShadow: { elevation: 2, shadowColor: '#2563EB', shadowOpacity: 0.2, shadowRadius: 5 },
  },
  inclusive: {
    radius: 4,
    borderWidth: 2,
    buttonRadius: 4,
    buttonBorderWidth: 2,
    surfaceShadow: {},
    buttonShadow: {},
  },
  'soft-ui': {
    radius: 18,
    borderWidth: 0,
    buttonRadius: 18,
    buttonBorderWidth: 0,
    surfaceShadow: { elevation: 4, shadowColor: '#397488', shadowOpacity: 0.16, shadowRadius: 12 },
    buttonShadow: { elevation: 3, shadowColor: '#397488', shadowOpacity: 0.18, shadowRadius: 8 },
  },
  cyberpunk: {
    radius: 0,
    borderWidth: 1,
    buttonRadius: 0,
    buttonBorderWidth: 1,
    surfaceShadow: { elevation: 4, shadowColor: '#22D3EE', shadowOpacity: 0.35, shadowRadius: 8 },
    buttonShadow: { elevation: 5, shadowColor: '#22D3EE', shadowOpacity: 0.55, shadowRadius: 7 },
  },
  neubrutalism: {
    radius: 0,
    borderWidth: 3,
    buttonRadius: 0,
    buttonBorderWidth: 3,
    surfaceShadow: { elevation: 0, shadowColor: '#111827', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0 },
    buttonShadow: { elevation: 0, shadowColor: '#111827', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
} as const;

export const TouchTarget = {
  minimum: 44,
  primary: 52,
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
