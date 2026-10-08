import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  color?: ThemeColor;
  /** Filled (background color) for the main action; otherwise tonal. */
  filled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  color = 'primary',
  filled,
  icon,
  style,
  disabled,
  ...rest
}: Props) {
  const theme = useTheme();
  const accent = theme[color];

  const content = (
    <View style={styles.content}>
      {icon}
      <Text style={[styles.title, { color: filled ? theme.textOnColor : accent }]}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, style]}
      {...rest}>
      {filled ? (
        <View style={[styles.button, { backgroundColor: accent }]}>{content}</View>
      ) : (
        <Surface tint={accent} interactive style={styles.button}>
          {content}
        </Surface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: Radius + 4,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
});
