import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, isToday, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { PeriodHeader } from '@/components/transactions/period-header';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency } from '@/features/settings/hooks';
import {
  useDeleteTransaction,
  useSelectedPeriod,
  useTransactionList,
} from '@/features/transactions/hooks';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale, deviceLocale } from '@/i18n';
import { withAlpha } from '@/lib/color';
import { groupByDay } from '@/lib/group';
import { formatMoney } from '@/lib/money';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

type Row = ReturnType<typeof useTransactionList>[number];

const signed = ({ transaction: tx }: Row) =>
  tx.type === 'expense' ? -tx.amount : tx.type === 'income' ? tx.amount : 0;

export default function TransactionsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const { range } = useSelectedPeriod();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const categoryFilter = useUIStore((s) => s.categoryFilter);
  const setCategoryFilter = useUIStore((s) => s.setCategoryFilter);
  const [search, setSearch] = useState('');
  const accounts = useAccounts();
  const categories = useCategories();
  const deleteTransaction = useDeleteTransaction();

  const rows = useTransactionList({
    ...range,
    accountId: accountFilter === 'all' ? undefined : accountFilter,
    categoryId: categoryFilter,
    search: search.trim() || undefined,
  });
  // Chip: prima la categoria selezionata (sempre visibile), poi spese ed entrate
  const chipCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          Number(b.id === categoryFilter) - Number(a.id === categoryFilter) ||
          Number(a.type === 'income') - Number(b.type === 'income') ||
          a.sortOrder - b.sortOrder,
      ),
    [categories, categoryFilter],
  );
  const sections = useMemo(() => groupByDay(rows, (r) => r.transaction.date, signed), [rows]);

  const money = (minor: number) => formatMoney(minor, currency, deviceLocale);
  const signedMoney = (minor: number) =>
    minor > 0 ? `+${money(minor)}` : minor < 0 ? `−${money(-minor)}` : money(0);
  const dayLabel = (day: Date) => {
    if (isToday(day)) return t('transaction.today');
    if (isYesterday(day)) return t('transaction.yesterday');
    const label = format(day, 'EEEE d MMMM', { locale: dateLocale(i18n.language) });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const showAccount = accounts.length > 1;

  const chip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    color?: string,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? withAlpha(color ?? theme.primary, 0.18) : theme.surface,
          },
        ]}>
        <Text
          variant="caption"
          style={[styles.chipLabel, selected && { color: color ?? theme.primary }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <PeriodHeader />
        <Surface style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('transactions.search')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </Surface>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {chip('all', t('transactions.allCategories'), !categoryFilter, () =>
            setCategoryFilter(undefined),
          )}
          {chipCategories.map((c) =>
            chip(
              c.id,
              c.name,
              categoryFilter === c.id,
              () => setCategoryFilter(categoryFilter === c.id ? undefined : c.id),
              c.color,
            ),
          )}
        </ScrollView>
      </View>

      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(r) => r.transaction.id}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
            <Text variant="overline" color="textSecondary">
              {dayLabel(section.day)}
            </Text>
            <Text variant="caption" color="textSecondary" style={styles.tabular}>
              {signedMoney(section.total)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const tx = item.transaction;
          const isTransfer = tx.type === 'transfer';
          const title = isTransfer ? t('transactions.transfer') : (item.category?.name ?? '—');
          const accountText = isTransfer
            ? `${item.account.name} → ${item.toAccount?.name ?? '—'}`
            : showAccount
              ? item.account.name
              : undefined;
          const subtitle = [tx.note, accountText].filter(Boolean).join(' · ');
          return (
            <TransactionRow
              title={title}
              subtitle={subtitle}
              amount={isTransfer ? money(tx.amount) : signedMoney(signed(item))}
              kind={tx.type}
              icon={isTransfer ? 'swap-horizontal' : (item.category?.icon ?? 'help')}
              color={
                isTransfer ? theme.textSecondary : (item.category?.color ?? theme.textSecondary)
              }
              deleteLabel={t('common.delete')}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
              onDelete={() => deleteTransaction(tx)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={40}
              color={theme.textSecondary}
            />
            <Text color="textSecondary">
              {search || categoryFilter ? t('transactions.emptyFiltered') : t('transactions.empty')}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingBottom: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.two + 2, fontSize: 16 },
  chips: { gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 3, borderRadius: 999 },
  chipLabel: { fontWeight: '500' },
  list: { flex: 1, marginHorizontal: -Spacing.three },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six },
});
