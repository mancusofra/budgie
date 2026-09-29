export type BudgetLevel = 'ok' | 'warning' | 'over';

/** Soglia oltre cui un budget è "quasi esaurito". */
export const BUDGET_WARNING_RATIO = 0.8;

export function budgetStatus(spent: number, amount: number) {
  const ratio = amount > 0 ? spent / amount : 0;
  const level: BudgetLevel = ratio >= 1 ? 'over' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
  return { ratio, level, remaining: amount - spent };
}
