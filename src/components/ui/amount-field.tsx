import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator } from '@/i18n';
import { Spacing } from '@/theme';

import { Text } from './text';

type Props = {
  /** Keypad expression (internal separator ","). */
  expr: string;
  active: boolean;
  onPress: () => void;
  suffix?: string;
  color?: string;
  accessibilityLabel: string;
  size?: number;
};

/** Amount field filled with AmountPad instead of the system keyboard. */
export function AmountField({
  expr,
  active,
  onPress,
  suffix,
  color,
  accessibilityLabel,
  size = 22,
}: Props) {
  const theme = useTheme();
  const empty = expr.length === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={[styles.field, { borderColor: active ? theme.primary : theme.border }]}>
      <View style={styles.valueRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            { fontSize: size, lineHeight: size + 6 },
            { color: empty ? theme.textSecondary : (color ?? theme.text) },
          ]}>
          {empty ? `0${decimalSeparator}00` : expr.replaceAll(',', decimalSeparator)}
        </Text>
        {active && <View style={[styles.caret, { backgroundColor: theme.primary }]} />}
      </View>
      {suffix ? <Text color="textSecondary">{suffix}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1.5,
  },
  valueRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  value: { fontWeight: '600' },
  caret: { width: 2, height: 24, marginLeft: 2, borderRadius: 1 },
});
