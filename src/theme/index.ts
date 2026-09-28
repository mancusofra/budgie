import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6E6E73',
    textOnColor: '#FFFFFF',
    background: '#F7F7F8',
    surface: '#EEEEF0',
    backgroundElement: '#E9E9EC',
    backgroundSelected: '#DEDEE2',
    border: '#E2E2E6',
    primary: '#4B63C9',
    expense: '#C4554D',
    income: '#3D8B63',
  },
  dark: {
    text: '#F2F2F4',
    textSecondary: '#9A9AA1',
    textOnColor: '#FFFFFF',
    background: '#0E0E10',
    surface: '#1C1C1F',
    backgroundElement: '#232326',
    backgroundSelected: '#2C2C30',
    border: '#2A2A2E',
    primary: '#8FA2F0',
    expense: '#E0807A',
    income: '#6CC196',
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

/** Durata unica delle animazioni dell'app (ms). */
export const AnimationMs = 250;

/**
 * Cifre a larghezza fissa per gli importi. Solo iOS: su Android `tabular-nums`
 * fa misurare male il testo e taglia l'ultimo carattere (es. "$765.0").
 */
export const TabularNums = Platform.select({
  ios: { fontVariant: ['tabular-nums' as const] },
  default: {},
});

/**
 * Altezza della tab bar nativa quando fluttua sopra il contenuto (iOS 26,
 * "Liquid Glass"), esclusa l'area sicura. Su Android la barra non si sovrappone.
 */
export const FloatingTabBarHeight = Platform.select({ ios: 50, default: 0 });

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});
