import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { repos } from '@/db/client';
import { useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import type { DetailedFilter, NewTransaction, TransactionPatch } from '@/db/repositories';
import { accounts, categories, transactions, type Transaction } from '@/db/schema';
import { useSnackbar } from '@/store/snackbar';
import { useSettings } from '@/features/settings/hooks';
import { dateLocale } from '@/i18n';
import { scopeKey, type AccountScope } from '@/lib/account-scope';
import { formatPeriod, periodRange, type PeriodRange } from '@/lib/period';
import { useUIStore } from '@/store/ui';

/** Selected period with its range and localized label. */
export function useSelectedPeriod() {
  const period = useUIStore((s) => s.period);
  const settings = useSettings();
  const weekStartsOn = settings.weekStart ?? 1;
  const monthStartDay = settings.monthStartDay ?? 1;
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const opts = { weekStartsOn, monthStartDay };
    return {
      period,
      range: periodRange(period, opts),
      label: formatPeriod(period, {
        ...opts,
        locale: dateLocale(i18n.language),
        allLabel: t('period.all'),
      }),
    };
  }, [period, weekStartsOn, monthStartDay, t, i18n.language]);
}

/** Total per category in the period (highest first), for the donut. */
export function useCategoryTotals(
  range: PeriodRange,
  type: 'expense' | 'income' = 'expense',
  scope: AccountScope = {},
) {
  const { data } = useLiveQuery(repos.transactions.sumByCategory({ ...range, ...scope, type }), [
    range.from?.getTime(),
    range.to?.getTime(),
    type,
    scopeKey(scope),
  ]);
  return data ?? [];
}

/** Income, expenses and balance of the period. */
export function usePeriodTotals(range: PeriodRange, scope: AccountScope = {}) {
  const { data } = useLiveQuery(repos.transactions.totals({ ...range, ...scope }), [
    range.from?.getTime(),
    range.to?.getTime(),
    scopeKey(scope),
  ]);
  const { income = 0, expense = 0 } = data?.[0] ?? {};
  return { income, expense, balance: income - expense };
}

export function useAddTransaction() {
  return useCallback((input: NewTransaction) => repos.transactions.create(input), []);
}

export function useTransaction(id: string): Transaction | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.transactions.byId(id), [id]);
  // undefined = loading, null = not found
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export function useUpdateTransaction() {
  return useCallback(
    (id: string, patch: TransactionPatch) => repos.transactions.update(id, patch),
    [],
  );
}

/** Deletes a transaction and offers "Undo" in the snackbar. */
export function useDeleteTransaction() {
  const { t } = useTranslation();
  const show = useSnackbar((s) => s.show);
  return useCallback(
    async (tx: Transaction) => {
      await repos.transactions.remove(tx.id);
      show({
        message: t('transactions.deleted'),
        actionLabel: t('common.undo'),
        onAction: () => repos.transactions.restore(tx),
      });
    },
    [show, t],
  );
}

/** List with category and accounts for the period and the given filters. */
export function useTransactionList(filter: DetailedFilter) {
  const { data } = useLiveQueryOn(
    repos.transactions.listDetailed(filter),
    [transactions, categories, accounts],
    [
      filter.from?.getTime(),
      filter.to?.getTime(),
      filter.accountId,
      filter.accountIds?.join(),
      filter.categoryId,
      filter.type,
      filter.search,
      filter.limit,
    ],
  );
  return data ?? [];
}

/** Total and number of transactions per category in the period (expenses and income). */
export function useCategoryStats(range: PeriodRange, scope: AccountScope = {}) {
  const { data } = useLiveQuery(repos.transactions.statsByCategory({ ...range, ...scope }), [
    range.from?.getTime(),
    range.to?.getTime(),
    scopeKey(scope),
  ]);
  return data ?? [];
}
