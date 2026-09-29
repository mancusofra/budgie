import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { Text } from '@/components/ui/text';
import type { Category } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale } from '@/i18n';
import { withAlpha } from '@/lib/color';
import type { AccountScope } from '@/lib/account-scope';
import type { PeriodRange } from '@/lib/period';
import { AnimationMs, Spacing, TabularNums } from '@/theme';

import { useDeleteTransaction, useTransactionList } from './hooks';

type Props = {
  category: Category;
  total: number;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  range: PeriodRange;
  scope: AccountScope;
  money: (minor: number) => string;
};

/** Categoria con totale e numero di movimenti; tap = apre/chiude i suoi movimenti. */
export function CategoryGroup({
  category,
  total,
  count,
  expanded,
  onToggle,
  range,
  scope,
  money,
}: Props) {
  const theme = useTheme();
  const amountColor = category.type === 'expense' ? theme.expense : theme.income;

  return (
    <Animated.View layout={LinearTransition.duration(AnimationMs)}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: theme.surface }]}>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textSecondary}
        />
        <CategoryIcon icon={category.icon} color={category.color} size={38} />
        <View style={styles.name}>
          <Text numberOfLines={1} style={styles.nameText}>
            {category.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: withAlpha(category.color, 0.18) }]}>
            <Text variant="caption" style={[styles.badgeText, { color: category.color }]}>
              {count}
            </Text>
          </View>
        </View>
        <Text style={[styles.total, { color: amountColor }]}>{money(total)}</Text>
      </Pressable>

      {expanded && (
        <CategoryTransactions
          category={category}
          count={count}
          range={range}
          scope={scope}
          money={money}
        />
      )}
    </Animated.View>
  );
}

/** Righe mostrate all'apertura e a ogni "Mostra altre": la lista non è virtualizzata. */
const PAGE = 50;

function CategoryTransactions({
  category,
  count,
  range,
  scope,
  money,
}: Pick<Props, 'category' | 'count' | 'range' | 'scope' | 'money'>) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const deleteTransaction = useDeleteTransaction();
  const [limit, setLimit] = useState(PAGE);
  const rows = useTransactionList({
    ...range,
    categoryId: category.id,
    ...scope,
    limit,
  });
  const remaining = count - rows.length;

  return (
    <Animated.View entering={FadeIn.duration(AnimationMs)} exiting={FadeOut.duration(AnimationMs)}>
      {rows.map(({ transaction: tx }) => (
        <SwipeToDelete key={tx.id} onDelete={() => deleteTransaction(tx)}>
          <Pressable
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: pressed ? theme.surface : theme.background },
            ]}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <View style={styles.itemTexts}>
              <Text style={styles.itemAmount}>{money(tx.amount)}</Text>
              {tx.note ? (
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {tx.note}
                </Text>
              ) : null}
            </View>
            <Text variant="caption" color="textSecondary">
              {format(tx.date, 'd MMM', { locale: dateLocale(i18n.language) })}
            </Text>
          </Pressable>
        </SwipeToDelete>
      ))}
      {remaining > 0 && rows.length >= limit && (
        <Pressable
          onPress={() => setLimit((l) => l + PAGE * 2)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}>
          <Text style={[styles.moreText, { color: theme.primary }]}>
            {t('transactions.showMore', { count: remaining })}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  name: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nameText: { fontWeight: '500', flexShrink: 1 },
  badge: { minWidth: 22, paddingHorizontal: 6, borderRadius: 999, alignItems: 'center' },
  badgeText: { fontWeight: '600', fontSize: 12, lineHeight: 18 },
  total: { fontWeight: '600', ...TabularNums },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingLeft: Spacing.three + 20 + Spacing.two + 2 + 14,
    paddingRight: Spacing.three,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemTexts: { flex: 1 },
  itemAmount: { ...TabularNums },
  more: {
    paddingVertical: Spacing.three,
    paddingLeft: Spacing.three + 20 + Spacing.two + 2 + 14,
  },
  moreText: { fontWeight: '600' },
});
