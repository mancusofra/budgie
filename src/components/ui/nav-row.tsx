import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing, TabularNums } from '@/theme';

import { Text } from './text';

type Props = {
  title: string;
  value?: string;
  leading?: ReactNode;
  onPress: () => void;
};

/** Navigation row (settings, lists): icon, title, value and chevron. */
export function NavRow({ title, value, leading, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      {leading}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {value ? (
        <Text color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export function RowSeparator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
  },
  title: { flex: 1, fontWeight: '500' },
  value: { maxWidth: '45%', ...TabularNums },
  separator: { height: StyleSheet.hairlineWidth },
});
