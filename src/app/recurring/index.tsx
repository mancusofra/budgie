import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { RowSeparator } from '@/components/ui/nav-row';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { repeatLabel, useRecurringList } from '@/features/recurring/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale, deviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { nextOccurrence } from '@/lib/recurrence';
import { Radius, Spacing, TabularNums } from '@/theme';

/** List of recurring rules with frequency and next due date. */
export default function RecurringListScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(t('recurring.title'));
  const rows = useRecurringList();

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="repeat" size={40} color={theme.textSecondary} />
            <Text variant="subtitle">{t('recurring.empty')}</Text>
            <Text color="textSecondary" style={styles.center}>
              {t('recurring.emptyHint')}
            </Text>
          </View>
        ) : (
          <Surface style={styles.card}>
            {rows.map(({ recurring: r, category, account, toAccount }, i) => {
              const next = nextOccurrence(r);
              const status = r.paused
                ? t('recurring.paused')
                : next
                  ? t('recurring.next', {
                      date: format(next, 'd MMM yyyy', { locale: dateLocale(i18n.language) }),
                    })
                  : t('recurring.ended');
              const isTransfer = r.type === 'transfer';
              const color =
                r.type === 'expense'
                  ? theme.expense
                  : r.type === 'income'
                    ? theme.income
                    : theme.text;
              const sign = r.type === 'expense' ? '−' : r.type === 'income' ? '+' : '';
              return (
                <View key={r.id}>
                  {i > 0 && <RowSeparator />}
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/recurring/[id]', params: { id: r.id } })
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.row,
                      (pressed || r.paused || !next) && { opacity: pressed ? 0.6 : 0.55 },
                    ]}>
                    <CategoryIcon
                      icon={isTransfer ? 'swap-horizontal' : (category?.icon ?? 'help')}
                      color={
                        isTransfer ? theme.textSecondary : (category?.color ?? theme.textSecondary)
                      }
                      size={40}
                    />
                    <View style={styles.texts}>
                      <Text numberOfLines={1} style={styles.name}>
                        {r.note ||
                          (isTransfer
                            ? `${account.name} → ${toAccount?.name ?? '—'}`
                            : (category?.name ?? '—'))}
                      </Text>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {repeatLabel(t, r.frequency, r.interval)} · {status}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { color }]}>
                      {sign}
                      {formatMoney(r.amount, account.currency, deviceLocale)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Surface>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { borderRadius: Radius + 4, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 4,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '600', ...TabularNums },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.three,
  },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
