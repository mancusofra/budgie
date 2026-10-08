import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { Spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Color grid: the selected one has a ring. */
export function ColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {colors.map((c) => {
        const selected = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={c}
            style={[styles.swatchRing, selected && { borderColor: theme.text }]}>
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Grid of icons tinted with the chosen color. */
export function IconPicker({
  icons,
  value,
  color,
  onChange,
}: {
  icons: readonly string[];
  value: string;
  color: string;
  onChange: (icon: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {icons.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={icon}
            style={[
              styles.iconCell,
              { backgroundColor: selected ? color : withAlpha(color, 0.12) },
            ]}>
            <MaterialCommunityIcons
              name={icon as IconName}
              size={22}
              color={selected ? '#FFFFFF' : theme.text}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
