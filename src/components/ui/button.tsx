import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/theme';

import { Text } from './text';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  color?: ThemeColor;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, color = 'primary', style, disabled, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme[color], opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
      {...rest}>
      <Text color="textOnColor" style={styles.title}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
