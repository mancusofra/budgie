import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

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
}: Props) {
  const theme = useTheme();
  const amountColor =
    kind === 'expense' ? theme.expense : kind === 'income' ? theme.income : theme.textSecondary;

  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={80}
      overshootRight={false}
      onSwipeableOpen={onDelete}
      renderRightActions={() => (
        <View style={[styles.delete, { backgroundColor: theme.expense }]}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#FFFFFF" />
        </View>
      )}>
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
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
      </Pressable>
    </ReanimatedSwipeable>
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
  title: { fontWeight: '500' },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  delete: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
