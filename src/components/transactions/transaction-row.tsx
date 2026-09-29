import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing, TabularNums } from '@/theme';

import { SwipeToDelete } from '../ui/swipe-to-delete';
import { Text } from '../ui/text';
import { CategoryIcon } from './category-icon';

type Props = {
  title: string;
  subtitle?: string;
  amount: string;
  kind: 'expense' | 'income' | 'transfer';
  icon: string;
  color: string;
  deleteLabel: string;
  onPress: () => void;
  onDelete: () => void;
  /** Generata da una ricorrenza: piccola icona accanto al titolo. */
  recurringLabel?: string;
};

/** Riga della lista transazioni: swipe a sinistra per eliminare, tap per modificare. */
export function TransactionRow({
  title,
  subtitle,
  amount,
  kind,
  icon,
  color,
  deleteLabel,
  onPress,
  onDelete,
  recurringLabel,
}: Props) {
  const theme = useTheme();
  const amountColor =
    kind === 'expense' ? theme.expense : kind === 'income' ? theme.income : theme.textSecondary;

  return (
    <SwipeToDelete onDelete={onDelete}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityActions={[{ name: 'delete', label: deleteLabel }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.surface : theme.background },
        ]}>
        <CategoryIcon icon={icon} color={color} size={40} />
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {recurringLabel && (
              <MaterialCommunityIcons
                name="repeat"
                size={14}
                color={theme.textSecondary}
                accessibilityLabel={recurringLabel}
              />
            )}
          </View>
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
      </Pressable>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  texts: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { fontWeight: '500', flexShrink: 1 },
  amount: { fontWeight: '600', ...TabularNums },
});
