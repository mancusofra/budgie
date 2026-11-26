import { differenceInCalendarDays } from 'date-fns';

import { BUDGET_WARNING_RATIO } from './budget';
import type { PeriodKind, PeriodRange } from './period';

/**
 * Spending groups: every expense category belongs to Needs, Wants or Savings,
 * and each group has a target share of the period's income (50/30/20 by default).
 * Savings also include what was not spent (income − expenses, when positive).
 */
export const GROUPS = ['need', 'want', 'save'] as const;
export type Group = (typeof GROUPS)[number];

/** Target shares in percent, in GROUPS order; they always add up to 100. */
export type Shares = [number, number, number];

export const DEFAULT_SHARES: Shares = [50, 30, 20];
export const SHARE_PRESETS: Shares[] = [
  [50, 30, 20],
  [60, 20, 20],
  [70, 20, 10],
];
/** Step of the handles when dragging (percent). */
export const SHARE_STEP = 5;

export type GroupLevel =
  /** Needs / Wants: below 80% of the target. */
  | 'ok'
  /** Needs / Wants: between 80% and 100%. */
  | 'warning'
  /** Needs / Wants: over the target. */
  | 'over'
  /** Savings: target not reached yet. */
  | 'short'
  /** Savings: target reached. */
  | 'reached'
  /** No base to compute a target from. */
  | 'none';

export type GroupSummary = {
  group: Group;
  /** Amount in the group (for Savings: savings categories + unspent). */
  amount: number;
  /** Target share in percent. */
  targetShare: number;
  /** Target amount; null without a base. */
  target: number | null;
  /** Actual share of the base in percent; null without a base. */
  share: number | null;
  level: GroupLevel;
  /** Target − amount (negative when over); null without a base. */
  remaining: number | null;
};

export type GroupsSummary = {
  /** Amount the shares apply to; null when there is none. */
  base: number | null;
  baseSource: 'income' | 'reference' | null;
  income: number;
  expense: number;
  /** Expenses above income (0 when within income). */
  overspent: number;
  groups: GroupSummary[];
};

export type CategoryTotal = {
  categoryId: string | null;
  type: 'expense' | 'income';
  total: number;
};

export function computeGroups(input: {
  totals: CategoryTotal[];
  /** Group of each expense category; missing ones count as Needs. */
  groupOf: ReadonlyMap<string, Group | null>;
  shares: Shares;
  /** Reference income already scaled to the period; null = none. */
  reference: number | null;
}): GroupsSummary {
  const sums: Record<Group, number> = { need: 0, want: 0, save: 0 };
  let income = 0;
  let expense = 0;
  for (const row of input.totals) {
    if (row.type === 'income') {
      income += row.total;
      continue;
    }
    expense += row.total;
    const group = (row.categoryId && input.groupOf.get(row.categoryId)) || 'need';
    sums[group] += row.total;
  }
  sums.save += Math.max(0, income - expense);

  const base =
    income > 0 ? income : input.reference && input.reference > 0 ? input.reference : null;
  const baseSource = income > 0 ? 'income' : base ? 'reference' : null;

  const groups = GROUPS.map((group, i): GroupSummary => {
    const amount = sums[group];
    const targetShare = input.shares[i];
    if (!base) {
      return {
        group,
        amount,
        targetShare,
        target: null,
        share: null,
        level: 'none',
        remaining: null,
      };
    }
    const target = Math.round((base * targetShare) / 100);
    return {
      group,
      amount,
      targetShare,
      target,
      share: (amount / base) * 100,
      level: groupLevel(group, amount, target),
      remaining: target - amount,
    };
  });

  return { base, baseSource, income, expense, overspent: Math.max(0, expense - income), groups };
}

function groupLevel(group: Group, amount: number, target: number): GroupLevel {
  if (group === 'save') return amount >= target ? 'reached' : 'short';
  if (target <= 0) return amount > 0 ? 'over' : 'ok';
  const ratio = amount / target;
  return ratio > 1 ? 'over' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
}

const DAYS_PER_MONTH = 365.25 / 12;

/**
 * Monthly reference income brought to the period: as is for a month, ×12 for
 * a year, in proportion to the days otherwise; none for "All time".
 */
export function referenceForPeriod(
  monthly: number | null | undefined,
  kind: PeriodKind,
  range: PeriodRange,
): number | null {
  if (!monthly || monthly <= 0) return null;
  if (kind === 'month') return monthly;
  if (kind === 'year') return monthly * 12;
  if (!range.from || !range.to) return null;
  const days = differenceInCalendarDays(range.to, range.from);
  return Math.round((monthly * days) / DAYS_PER_MONTH);
}

/**
 * Moves one of the two handles that split the bar: handle 0 sits between
 * Needs and Wants, handle 1 between Wants and Savings. Only the two groups
 * next to the handle change; the position snaps to `step` and can't cross
 * the other handle.
 */
export function moveHandle(
  shares: Shares,
  handle: 0 | 1,
  position: number,
  step = SHARE_STEP,
): Shares {
  const first = shares[0];
  const second = shares[0] + shares[1];
  const snapped = Math.round(position / step) * step;
  if (handle === 0) {
    const p = clamp(snapped, 0, second);
    return [p, second - p, 100 - second];
  }
  const p = clamp(snapped, first, 100);
  return [first, p - first, 100 - p];
}

/** Valid shares from any input (e.g. a corrupted setting): 3 integers ≥ 0 adding up to 100. */
export function normalizeShares(value: unknown): Shares {
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((v) => Number.isInteger(v) && v >= 0) &&
    value[0] + value[1] + value[2] === 100
  ) {
    return value as Shares;
  }
  return DEFAULT_SHARES;
}

/**
 * Rounds percentages to multiples of `step` keeping the total at 100
 * (largest remainder method).
 */
export function roundShares(values: [number, number, number], step = SHARE_STEP): Shares {
  const total = values.reduce((a, v) => a + Math.max(0, v), 0);
  if (total <= 0) return DEFAULT_SHARES;
  const units = 100 / step;
  const exact = values.map((v) => (Math.max(0, v) / total) * units);
  const floors = exact.map(Math.floor);
  let left = units - floors.reduce((a, v) => a + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return floors.map((v) => v * step) as Shares;
}

/**
 * Suggested shares from a past period (e.g. the last 3 months): how income
 * was actually split, rounded to 5%. Null without income.
 */
export function suggestShares(summary: GroupsSummary): Shares | null {
  if (summary.income <= 0) return null;
  const amounts = summary.groups.map((g) => g.amount) as [number, number, number];
  // When spending exceeded income the amounts are shares of spending instead
  return roundShares(amounts);
}

export const sameShares = (a: Shares, b: Shares) => a.every((v, i) => v === b[i]);

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
