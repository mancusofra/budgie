import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { repos } from '@/db/client';
import { useLiveQueryOn } from '@/db/live-query';
import { budgetMonths, budgets } from '@/db/schema';
import { useSettings } from '@/features/settings/hooks';
import { budgetMonthKey, budgetStatus } from '@/lib/budget';
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
 * Data di riferimento del mese dei budget per il periodo selezionato:
 * il mese stesso (o quello che contiene giorno/settimana/intervallo); per
 * un anno il mese corrente se è l'anno in corso, altrimenti il suo ultimo;
 * per "Sempre" il mese corrente.
 */
function budgetAnchor(period: Period, range: PeriodRange, now = new Date()): Date {
  switch (period.kind) {
    case 'year': {
      const last = new Date(range.to!.getTime() - 1);
      return now >= range.from! && now < range.to! ? now : last;
    }
    case 'all':
      return now;
    case 'custom':
      return period.from;
    default:
      return period.anchor;
  }
}

/**
 * Budget del mese mostrato (ereditati dal mese precedente se non definiti),
 * con lo speso di quel mese su tutti i conti: ogni mese si riparte da zero.
 */
export function useBudgetProgress(period: Period, range: PeriodRange) {
  const settings = useSettings();
  const monthStartDay = settings.monthStartDay ?? 1;
  const anchor = budgetAnchor(period, range);
  const month = periodRange({ kind: 'month', anchor }, { monthStartDay });
  const monthKey = budgetMonthKey(anchor, monthStartDay);

  const { data: budgetRows } = useLiveQueryOn(
    repos.budgets.effective(monthKey),
    [budgets, budgetMonths],
    [monthKey],
  );
  const { data: stats } = useLiveQuery(repos.transactions.statsByCategory(month), [
    month.from?.getTime(),
  ]);

  const progress = useMemo<BudgetProgress[]>(() => {
    const byCategory = new Map(
      (stats ?? []).filter((s) => s.type === 'expense').map((s) => [s.categoryId, s.total]),
    );
    const totalExpense = [...byCategory.values()].reduce((a, v) => a + v, 0);
    return (budgetRows ?? []).map((row) => {
      const spent = row.categoryId ? (byCategory.get(row.categoryId) ?? 0) : totalExpense;
      return {
        id: row.id,
        categoryId: row.categoryId,
        amount: row.amount,
        spent,
        ...budgetStatus(spent, row.amount),
      };
    });
  }, [budgetRows, stats]);

  return { month, monthKey, progress };
}

export function useBudget(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(repos.budgets.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const budgetActions = {
  set: repos.budgets.set,
  remove: repos.budgets.remove,
};
