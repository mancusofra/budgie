import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, isToday, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { PeriodHeader } from '@/components/transactions/period-header';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { Screen, useTabBarSpace } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Category } from '@/db/schema';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency } from '@/features/settings/hooks';
import { CategoryGroup } from '@/features/transactions/category-group';
import {
  useCategoryStats,
  useDeleteTransaction,
  usePeriodTotals,
  useSelectedPeriod,
  useTransactionList,
} from '@/features/transactions/hooks';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale, deviceLocale } from '@/i18n';
import { groupByDay } from '@/lib/group';
import { formatMoney } from '@/lib/money';
import type { PeriodRange } from '@/lib/period';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing, TabularNums } from '@/theme';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const { range } = useSelectedPeriod();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const openCategory = useUIStore((s) => s.openCategory);
  const totals = usePeriodTotals(range, accountFilter);
  const stats = useCategoryStats(range, accountFilter);
  // Anche le archiviate: i loro movimenti restano nel periodo
  const categories = useCategories(undefined, { includeArchived: true });

  const tabBarSpace = useTabBarSpace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Arrivando dal tap su uno spicchio: apri solo quella categoria (una volta per richiesta)
  const [handledOpenAt, setHandledOpenAt] = useState(0);
  if (openCategory && openCategory.at !== handledOpenAt) {
    setHandledOpenAt(openCategory.at);
    setExpanded(new Set([openCategory.id]));
    setSearchOpen(false);
    setSearch('');
  }

  const money = (minor: number) => formatMoney(minor, currency, deviceLocale);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const groups = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const rows = stats.flatMap((s) => {
      const category = s.categoryId ? byId.get(s.categoryId) : undefined;
      return category ? [{ ...s, category }] : [];
    });
    return {
      expense: rows.filter((r) => r.type === 'expense'),
      income: rows.filter((r) => r.type === 'income'),
    };
  }, [stats, categories]);

  const balance = totals.balance;
  const balanceColor =
    balance < 0 ? theme.expense : balance > 0 ? theme.income : theme.textSecondary;
  const searching = searchOpen && search.trim().length > 0;
  const hasTransfers =
    useTransactionList({
      ...range,
      type: 'transfer',
      accountId: accountFilter === 'all' ? undefined : accountFilter,
    }).length > 0;

  const section = (
    title: string,
    total: number,
    rows: { category: Category; total: number; count: number }[],
  ) =>
    rows.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="overline" color="textSecondary">
            {title}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.tabular}>
            {money(total)}
          </Text>
        </View>
        {rows.map((r) => (
          <CategoryGroup
            key={r.category.id}
            category={r.category}
            total={r.total}
            count={r.count}
            expanded={expanded.has(r.category.id)}
            onToggle={() => toggle(r.category.id)}
            range={range}
            accountFilter={accountFilter}
            money={money}
          />
        ))}
      </View>
    );

  return (
    <Screen scrolls>
      <View style={styles.header}>
        <PeriodHeader />
        <View style={styles.balanceRow}>
          <Surface tint={balanceColor} style={styles.balance}>
            <Text style={[styles.balanceLabel, { color: balanceColor }]}>{t('home.balance')}</Text>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>{money(balance)}</Text>
          </Surface>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('transactions.search')}
            accessibilityState={{ expanded: searchOpen }}
            onPress={() => {
              setSearchOpen((o) => !o);
              setSearch('');
            }}>
            <Surface interactive tint={searchOpen ? theme.primary : undefined} style={styles.round}>
              <MaterialCommunityIcons
                name={searchOpen ? 'close' : 'magnify'}
                size={22}
                color={searchOpen ? theme.primary : theme.text}
              />
            </Surface>
          </Pressable>
        </View>
        {searchOpen && (
          <Surface style={styles.search}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder={t('transactions.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </Surface>
        )}
      </View>

      {searching ? (
        <SearchResults
          search={search.trim()}
          range={range}
          accountFilter={accountFilter}
          money={money}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: Spacing.four + tabBarSpace }}
          scrollIndicatorInsets={{ bottom: tabBarSpace }}>
          {section(t('home.expenses'), totals.expense, groups.expense)}
          {section(t('home.income'), totals.income, groups.income)}
          <TransfersSection range={range} accountFilter={accountFilter} money={money} />
          {stats.length === 0 && !hasTransfers && (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={40}
                color={theme.textSecondary}
              />
              <Text color="textSecondary">{t('transactions.empty')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

type Row = ReturnType<typeof useTransactionList>[number];

/** Trasferimenti del periodo (non contano come spese o entrate). */
function TransfersSection({
  range,
  accountFilter,
  money,
}: {
  range: PeriodRange;
  accountFilter: string;
  money: (minor: number) => string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const deleteTransaction = useDeleteTransaction();
  const rows = useTransactionList({
    ...range,
    type: 'transfer',
    accountId: accountFilter === 'all' ? undefined : accountFilter,
  });
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="overline" color="textSecondary">
          {t('transfer.section')}
        </Text>
      </View>
      {rows.map(({ transaction: tx, account, toAccount }) => (
        <TransactionRow
          key={tx.id}
          title={`${account.name} → ${toAccount?.name ?? '—'}`}
          subtitle={tx.note ?? undefined}
          amount={money(tx.amount)}
          kind="transfer"
          icon="swap-horizontal"
          color={theme.textSecondary}
          deleteLabel={t('common.delete')}
          onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
          onDelete={() => deleteTransaction(tx)}
        />
      ))}
    </View>
  );
}

const signed = ({ transaction: tx }: Row) =>
  tx.type === 'expense' ? -tx.amount : tx.type === 'income' ? tx.amount : 0;

/** Risultati di ricerca: tutte le transazioni corrispondenti, raggruppate per giorno. */
function SearchResults({
  search,
  range,
  accountFilter,
  money,
}: {
  search: string;
  range: PeriodRange;
  accountFilter: string;
  money: (minor: number) => string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const accounts = useAccounts();
  const tabBarSpace = useTabBarSpace();
  const deleteTransaction = useDeleteTransaction();
  const rows = useTransactionList({
    ...range,
    accountId: accountFilter === 'all' ? undefined : accountFilter,
    search,
  });
  const sections = useMemo(() => groupByDay(rows, (r) => r.transaction.date, signed), [rows]);

  const signedMoney = (minor: number) =>
    minor > 0 ? `+${money(minor)}` : minor < 0 ? `−${money(-minor)}` : money(0);
  const dayLabel = (day: Date) => {
    if (isToday(day)) return t('transaction.today');
    if (isYesterday(day)) return t('transaction.yesterday');
    const label = format(day, 'EEEE d MMMM', { locale: dateLocale(i18n.language) });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(r) => r.transaction.id}
      contentContainerStyle={{ paddingBottom: Spacing.four + tabBarSpace }}
      scrollIndicatorInsets={{ bottom: tabBarSpace }}
      stickySectionHeadersEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      renderSectionHeader={({ section }) => (
        <View style={[styles.daySectionHeader, { backgroundColor: theme.background }]}>
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
        const accountText = isTransfer
          ? `${item.account.name} → ${item.toAccount?.name ?? '—'}`
          : accounts.length > 1
            ? item.account.name
            : undefined;
        return (
          <TransactionRow
            title={isTransfer ? t('transactions.transfer') : (item.category?.name ?? '—')}
            subtitle={[tx.note, accountText].filter(Boolean).join(' · ')}
            amount={isTransfer ? money(tx.amount) : signedMoney(signed(item))}
            kind={tx.type}
            icon={isTransfer ? 'swap-horizontal' : (item.category?.icon ?? 'help')}
            color={isTransfer ? theme.textSecondary : (item.category?.color ?? theme.textSecondary)}
            deleteLabel={t('common.delete')}
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
            onDelete={() => deleteTransaction(tx)}
          />
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons name="magnify" size={40} color={theme.textSecondary} />
          <Text color="textSecondary">{t('transactions.emptyFiltered')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingBottom: Spacing.two },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  balance: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius + 4,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  balanceLabel: { fontWeight: '500' },
  balanceAmount: { fontSize: 20, fontWeight: '700', ...TabularNums },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.two + 2, fontSize: 16 },
  list: { flex: 1, marginHorizontal: -Spacing.three },
  section: { marginTop: Spacing.two },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  tabular: { ...TabularNums },
  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six },
});
