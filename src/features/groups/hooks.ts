import { useMemo } from 'react';

import { useAccountScope } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency, useSettings } from '@/features/settings/hooks';
import { useCategoryStats } from '@/features/transactions/hooks';
import type { AccountScope } from '@/lib/account-scope';
import {
  computeGroups,
  normalizeShares,
  referenceForPeriod,
  suggestShares,
  type CategoryTotal,
  type Group,
  type Shares,
} from '@/lib/groups';
import { addMonths } from 'date-fns';

import { periodRange, type Period, type PeriodRange } from '@/lib/period';

function useGroupOf(): ReadonlyMap<string, Group | null> {
  const categories = useCategories('expense', { includeArchived: true });
  return useMemo(() => new Map(categories.map((c) => [c.id, c.spendingGroup])), [categories]);
}

const onlyIncomeAndExpenses = (
  rows: { categoryId: string | null; type: string; total: number }[],
) => rows.filter((r): r is CategoryTotal => r.type === 'expense' || r.type === 'income');

export function useGroupShares(): Shares {
  const { groupShares } = useSettings();
  return useMemo(() => normalizeShares(groupShares), [groupShares]);
}

/** Groups of the selected period, for the accounts in scope. */
export function useGroupsSummary(period: Period, range: PeriodRange, scope: AccountScope) {
  const settings = useSettings();
  const shares = useGroupShares();
  const mainCurrency = useCurrency();
  const { currency } = useAccountScope();
  const groupOf = useGroupOf();
  const stats = useCategoryStats(range, scope);
  // The reference income is in the main currency: unusable for an account in another one
  const reference =
    currency === mainCurrency
      ? referenceForPeriod(settings.referenceIncome, period.kind, range)
      : null;

  const summary = useMemo(
    () => computeGroups({ totals: onlyIncomeAndExpenses(stats), groupOf, shares, reference }),
    [stats, groupOf, shares, reference],
  );
  return { summary, shares };
}

/**
 * Shares suggested from the last 3 complete months (accounts in the main
 * currency): how income was actually split, rounded to 5%. Null without income.
 */
export function useSuggestedShares(scope: AccountScope): Shares | null {
  const { monthStartDay = 1 } = useSettings();
  const groupOf = useGroupOf();
  const range = useMemo(() => {
    const current: Period = { kind: 'month', anchor: new Date() };
    const opts = { monthStartDay };
    return {
      from: periodRange({ kind: 'month', anchor: addMonths(new Date(), -3) }, opts).from,
      to: periodRange(current, opts).from,
    };
  }, [monthStartDay]);
  const stats = useCategoryStats(range, scope);
  return useMemo(
    () =>
      suggestShares(
        computeGroups({
          totals: onlyIncomeAndExpenses(stats),
          groupOf,
          shares: normalizeShares(null),
          reference: null,
        }),
      ),
    [stats, groupOf],
  );
}
