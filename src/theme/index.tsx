import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export type AppColors = {
  background: string;
  backgroundRaised: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentPressed: string;
  accentInk: string;
  accentSoft: string;
  mint: string;
  success: string;
  warning: string;
  danger: string;
  scrim: string;
  white: string;
  black: string;
  overlayTop: string;
  overlayBottom: string;
};

const darkColors: AppColors = {
  background: '#08100D',
  backgroundRaised: '#0C1611',
  surface: '#111C16',
  surfaceStrong: '#16241D',
  surfaceMuted: '#0E1913',
  border: 'rgba(214, 240, 218, 0.10)',
  borderStrong: 'rgba(200, 241, 105, 0.28)',
  text: '#F2F6EE',
  textSecondary: '#A7B5AA',
  textTertiary: '#708074',
  accent: '#C8F169',
  accentPressed: '#B5DD56',
  accentInk: '#101A10',
  accentSoft: 'rgba(200, 241, 105, 0.12)',
  mint: '#7DE3C3',
  success: '#9BE8A8',
  warning: '#F7D488',
  danger: '#FF9A8B',
  scrim: 'rgba(3, 8, 6, 0.72)',
  white: '#FFFFFF',
  black: '#000000',
  overlayTop: '#0A120E',
  overlayBottom: '#060B09',
};

const lightColors: AppColors = {
  background: '#F3F5EE',
  backgroundRaised: '#EDF1E7',
  surface: '#FBFCF8',
  surfaceStrong: '#FFFFFF',
  surfaceMuted: '#EFF3EA',
  border: 'rgba(20, 38, 28, 0.10)',
  borderStrong: 'rgba(64, 98, 34, 0.24)',
  text: '#111A14',
  textSecondary: '#5D6B60',
  textTertiary: '#89968C',
  accent: '#5B7F12',
  accentPressed: '#4C6C0C',
  accentInk: '#F8FBEF',
  accentSoft: 'rgba(91, 127, 18, 0.10)',
  mint: '#2F8F76',
  success: '#2E7D45',
  warning: '#8A6414',
  danger: '#B34A3D',
  scrim: 'rgba(8, 18, 12, 0.42)',
  white: '#FFFFFF',
  black: '#000000',
  overlayTop: '#0A120E',
  overlayBottom: '#060B09',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 34,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const layout = {
  gutter: 22,
  maxWidth: 620,
  contentBottom: 48,
} as const;

export type Theme = {
  colors: AppColors;
  isDark: boolean;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
};

const ThemeContext = createContext<Theme>({
  colors: darkColors,
  isDark: true,
  fonts,
  spacing,
  radii,
  layout,
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';

  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      fonts,
      spacing,
      radii,
      layout,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Creates a memoized StyleSheet for the current color scheme. */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
