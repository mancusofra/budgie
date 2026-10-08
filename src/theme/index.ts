import { Platform } from 'react-native';

/**
 * WCAG AA contrast (≥ 4.5:1) for normal text: accents on the background, surfaces
 * and their light tints (16%). Checked by __tests__/lib/contrast.test.ts.
 */
export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#626266',
    textOnColor: '#FFFFFF',
    background: '#F7F7F8',
    surface: '#EEEEF0',
    backgroundElement: '#E9E9EC',
    backgroundSelected: '#DEDEE2',
    border: '#E2E2E6',
    primary: '#3E58C5',
    expense: '#A83F38',
    income: '#306E4E',
    /** "Warning" state (budget above 80%): always with an icon and a label. */
    warning: '#865817',
  },
  dark: {
    text: '#F2F2F4',
    textSecondary: '#9A9AA1',
    /** Dark: white is not readable on the light accents of the dark theme. */
    textOnColor: '#0E0E10',
    background: '#0E0E10',
    surface: '#1C1C1F',
    backgroundElement: '#232326',
    backgroundSelected: '#2C2C30',
    border: '#2A2A2E',
    primary: '#8FA2F0',
    expense: '#E0807A',
    income: '#6CC196',
    warning: '#E0A955',
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

/** Single duration for the app's animations (ms). */
export const AnimationMs = 250;

/**
 * Fixed-width digits for amounts. iOS only: on Android `tabular-nums`
 * makes text measure wrong and cuts the last character (e.g. "$765.0").
 */
export const TabularNums = Platform.select({
  ios: { fontVariant: ['tabular-nums' as const] },
  default: {},
});

/**
 * Height of the native tab bar when it floats over the content (iOS 26,
 * "Liquid Glass"), excluding the safe area. On Android the bar doesn't overlap.
 */
export const FloatingTabBarHeight = Platform.select({ ios: 50, default: 0 });

/**
 * On Android the native tab bar, even hidden, keeps catching touches in
 * its area at the bottom: whatever replaces it must be placed above it.
 */
export const HiddenTabBarTouchArea = Platform.select({ android: 80, default: 0 });

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});
