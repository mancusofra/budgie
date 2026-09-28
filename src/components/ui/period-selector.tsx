import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

type Props = {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onPressLabel?: () => void;
  previousLabel: string;
  nextLabel: string;
};

export function PeriodSelector({
  label,
  onPrevious,
  onNext,
  onPressLabel,
  previousLabel,
  nextLabel,
}: Props) {
  const theme = useTheme();
  const arrow = (
    name: 'chevron-left' | 'chevron-right',
    onPress: (() => void) | undefined,
    a11y: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: !onPress ? 0.3 : pressed ? 0.6 : 1 })}>
      <Surface interactive style={styles.arrow}>
        <MaterialCommunityIcons name={name} size={24} color={theme.text} />
      </Surface>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {arrow('chevron-left', onPrevious, previousLabel)}
      <Pressable onPress={onPressLabel} style={styles.label} accessibilityRole="header">
        <Text variant="subtitle" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {arrow('chevron-right', onNext, nextLabel)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, alignItems: 'center' },
});
