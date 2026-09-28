import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#60646C',
    textOnColor: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#F5F6F8',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#E0E1E6',
    primary: '#3E63DD',
    expense: '#E5484D',
    income: '#30A46C',
  },
  dark: {
    text: '#F2F2F2',
    textSecondary: '#B0B4BA',
    textOnColor: '#FFFFFF',
    background: '#121212',
    surface: '#1E1E1E',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    border: '#2E3135',
    primary: '#849DFF',
    expense: '#FF6369',
    income: '#4CC38A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = 12;

/**
 * Altezza della tab bar nativa quando fluttua sopra il contenuto (iOS 26,
 * "Liquid Glass"), esclusa l'area sicura. Su Android la barra non si sovrappone.
 */
export const FloatingTabBarHeight = Platform.select({ ios: 50, default: 0 });

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});
