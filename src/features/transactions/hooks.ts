import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { repos } from '@/db/client';
import type { NewTransaction } from '@/db/repositories';
import { useSettings } from '@/features/settings/hooks';
import { dateLocale } from '@/i18n';
import { formatPeriod, periodRange, type PeriodRange } from '@/lib/period';
import { useUIStore } from '@/store/ui';

/** Periodo selezionato con intervallo ed etichetta localizzata. */
export function useSelectedPeriod() {
  const period = useUIStore((s) => s.period);
  const weekStartsOn = useSettings().weekStart ?? 1;
  const { t, i18n } = useTranslation();

  return useMemo(
    () => ({
      period,
      range: periodRange(period, { weekStartsOn }),
      label: formatPeriod(period, {
        weekStartsOn,
        locale: dateLocale(i18n.language),
        allLabel: t('period.all'),
      }),
    }),
    [period, weekStartsOn, t, i18n.language],
  );
}

const accountParam = (accountFilter: string) =>
  accountFilter === 'all' ? undefined : accountFilter;

/** Totale per categoria nel periodo (dal più alto), per la ciambella. */
export function useCategoryTotals(
  range: PeriodRange,
  type: 'expense' | 'income' = 'expense',
  accountFilter = 'all',
) {
  const { data } = useLiveQuery(
    repos.transactions.sumByCategory({ ...range, type, accountId: accountParam(accountFilter) }),
    [range.from?.getTime(), range.to?.getTime(), type, accountFilter],
  );
  return data ?? [];
}

/** Entrate, spese e saldo del periodo. */
export function usePeriodTotals(range: PeriodRange, accountFilter = 'all') {
  const { data } = useLiveQuery(
    repos.transactions.totals({ ...range, accountId: accountParam(accountFilter) }),
    [range.from?.getTime(), range.to?.getTime(), accountFilter],
  );
  const { income = 0, expense = 0 } = data?.[0] ?? {};
  return { income, expense, balance: income - expense };
}

export function useAddTransaction() {
  return useCallback((input: NewTransaction) => repos.transactions.create(input), []);
}
