import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: 'body' | 'title' | 'subtitle' | 'caption' | 'overline';
  color?: ThemeColor;
};

/** Varianti annunciate come intestazioni dallo screen reader (navigazione per sezioni). */
const HEADERS = new Set<TextProps['variant']>(['title', 'subtitle', 'overline']);

export function Text({ style, variant = 'body', color = 'text', ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      accessibilityRole={HEADERS.has(variant) ? 'header' : undefined}
      style={[{ color: theme[color] }, styles[variant], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 19, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  caption: { fontSize: 13, lineHeight: 18 },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
