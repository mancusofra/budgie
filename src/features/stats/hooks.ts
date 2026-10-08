import { useMemo } from 'react';

import { repos } from '@/db/client';
import { useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import { budgetMonths, budgets } from '@/db/schema';
import { useSettings } from '@/features/settings/hooks';
import { scopeKey, type AccountScope } from '@/lib/account-scope';
import { budgetMonthKey, budgetStatus } from '@/lib/budget';
import { periodRange, shiftPeriod, type Period, type PeriodRange } from '@/lib/period';
import { chartWindow, fillSeries } from '@/lib/series';

/** Spending per day/month to show in the period's bar chart. */
export function useExpenseSeries(period: Period, range: PeriodRange, scope: AccountScope) {
  const key = scopeKey(scope);
  const { data: first } = useLiveQuery(repos.transactions.firstDate(scope), [key]);
  const firstMs = first?.[0]?.first ?? undefined;
  const window = useMemo(
    () => chartWindow(period, range, { firstDate: firstMs ? new Date(firstMs) : undefined }),
    [period, range, firstMs],
  );
  const { data } = useLiveQuery(
    repos.transactions.seriesByBucket(
      { from: window.from, to: window.to, ...scope },
      window.bucket,
    ),
    [window.from.getTime(), window.to.getTime(), window.bucket, key],
  );
  const points = useMemo(() => fillSeries(window, data ?? []), [window, data]);
  return { window, points };
}

/** Spending of the previous period (for the comparison); null for "All time". */
export function usePreviousExpense(period: Period, scope: AccountScope): number | null {
  const settings = useSettings();
  const opts = {
    weekStartsOn: settings.weekStart ?? 1,
    monthStartDay: settings.monthStartDay ?? 1,
  };
  const previous = period.kind === 'all' ? undefined : periodRange(shiftPeriod(period, -1), opts);
  const { data } = useLiveQuery(repos.transactions.totals({ ...(previous ?? {}), ...scope }), [
    previous?.from?.getTime(),
    previous?.to?.getTime(),
    scopeKey(scope),
  ]);
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
 * Reference date of the budget month for the selected period:
 * the month itself (or the one containing the day/week/range); for
 * a year the current month if it's the current year, otherwise its last one;
 * for "All time" the current month.
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
 * Budgets of the shown month (inherited from the previous month if not defined),
 * with that month's spending across all accounts: every month starts from zero.
 */
export function useBudgetProgress(period: Period, range: PeriodRange, scope: AccountScope) {
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
  // Budgets are in the main currency: only accounts in that currency count
  const { data: stats } = useLiveQuery(repos.transactions.statsByCategory({ ...month, ...scope }), [
    month.from?.getTime(),
    scopeKey(scope),
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
