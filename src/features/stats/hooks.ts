import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { repos } from '@/db/client';
import { useSettings } from '@/features/settings/hooks';
import { budgetStatus } from '@/lib/budget';
import { periodRange, shiftPeriod, type Period, type PeriodRange } from '@/lib/period';
import { chartWindow, fillSeries } from '@/lib/series';

const accountParam = (accountFilter: string) =>
  accountFilter === 'all' ? undefined : accountFilter;

/** Spese per giorno/mese da mostrare nel grafico a barre del periodo. */
export function useExpenseSeries(period: Period, range: PeriodRange, accountFilter: string) {
  const accountId = accountParam(accountFilter);
  const { data: first } = useLiveQuery(repos.transactions.firstDate(accountId), [accountId]);
  const firstMs = first?.[0]?.first ?? undefined;
  const window = useMemo(
    () => chartWindow(period, range, { firstDate: firstMs ? new Date(firstMs) : undefined }),
    [period, range, firstMs],
  );
  const { data } = useLiveQuery(
    repos.transactions.seriesByBucket(
      { from: window.from, to: window.to, accountId },
      window.bucket,
    ),
    [window.from.getTime(), window.to.getTime(), window.bucket, accountId],
  );
  const points = useMemo(() => fillSeries(window, data ?? []), [window, data]);
  return { window, points };
}

/** Spese del periodo precedente (per il confronto); null per "Sempre". */
export function usePreviousExpense(period: Period, accountFilter: string): number | null {
  const settings = useSettings();
  const opts = {
    weekStartsOn: settings.weekStart ?? 1,
    monthStartDay: settings.monthStartDay ?? 1,
  };
  const previous = period.kind === 'all' ? undefined : periodRange(shiftPeriod(period, -1), opts);
  const { data } = useLiveQuery(
    repos.transactions.totals({ ...(previous ?? {}), accountId: accountParam(accountFilter) }),
    [previous?.from?.getTime(), previous?.to?.getTime(), accountFilter],
  );
  if (!previous) return null;
  return data?.[0]?.expense ?? 0;
}

export type BudgetProgress = {
  id: string;
  categoryId: string | null;
  amount: number;
  spent: number;
} & ReturnType<typeof budgetStatus>;

/**
 * Budget mensili con lo speso del mese corrente (tutti i conti), rispettando
 * il giorno di inizio del mese.
 */
export function useBudgetProgress() {
  const settings = useSettings();
  const month = periodRange(
    { kind: 'month', anchor: new Date() },
    { monthStartDay: settings.monthStartDay ?? 1 },
  );
  const { data: budgets } = useLiveQuery(repos.budgets.list('month'));
  const { data: stats } = useLiveQuery(repos.transactions.statsByCategory(month), [
    month.from?.getTime(),
  ]);

  const progress = useMemo<BudgetProgress[]>(() => {
    const byCategory = new Map(
      (stats ?? []).filter((s) => s.type === 'expense').map((s) => [s.categoryId, s.total]),
    );
    const totalExpense = [...byCategory.values()].reduce((a, b) => a + b, 0);
    return (budgets ?? []).map((b) => {
      const spent = b.categoryId ? (byCategory.get(b.categoryId) ?? 0) : totalExpense;
      return {
        id: b.id,
        categoryId: b.categoryId,
        amount: b.amount,
        spent,
        ...budgetStatus(spent, b.amount),
      };
    });
  }, [budgets, stats]);

  return { month, progress };
}

export function useBudget(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(repos.budgets.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const budgetActions = {
  set: repos.budgets.set,
  remove: (id: string) => repos.budgets.remove(id),
};
