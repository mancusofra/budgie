import { format } from 'date-fns';

import { periodRange } from './period';

export type BudgetLevel = 'ok' | 'warning' | 'over';

/** Ratio above which a budget is "almost used up". */
export const BUDGET_WARNING_RATIO = 0.8;

export function budgetStatus(spent: number, amount: number) {
  const ratio = amount > 0 ? spent / amount : 0;
  const level: BudgetLevel = ratio >= 1 ? 'over' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
  return { ratio, level, remaining: amount - spent };
}

/** Key of the accounting month containing the date ('YYYY-MM' of its start). */
export function budgetMonthKey(date: Date, monthStartDay = 1): string {
  const { from } = periodRange({ kind: 'month', anchor: date }, { monthStartDay });
  return format(from!, 'yyyy-MM');
}
