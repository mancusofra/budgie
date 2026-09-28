import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: 'body' | 'title' | 'subtitle' | 'caption';
  color?: ThemeColor;
};

export function Text({ style, variant = 'body', color = 'text', ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText style={[{ color: theme[color] }, styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
});
