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

/** Periodo selezionato con intervallo ed etichetta localizzata. */
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

/** Totale per categoria nel periodo (dal più alto), per la ciambella. */
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

/** Entrate, spese e saldo del periodo. */
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
  // undefined = in caricamento, null = non trovata
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export function useUpdateTransaction() {
  return useCallback(
    (id: string, patch: TransactionPatch) => repos.transactions.update(id, patch),
    [],
  );
}

/** Elimina una transazione e offre "Annulla" nella snackbar. */
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

/** Lista con categoria e conti per il periodo e i filtri dati. */
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

/** Totale e numero di movimenti per categoria nel periodo (spese ed entrate). */
export function useCategoryStats(range: PeriodRange, scope: AccountScope = {}) {
  const { data } = useLiveQuery(repos.transactions.statsByCategory({ ...range, ...scope }), [
    range.from?.getTime(),
    range.to?.getTime(),
    scopeKey(scope),
  ]);
  return data ?? [];
}
