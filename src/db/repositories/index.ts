import type { AppDatabase } from '../types';
import { createAccountsRepo } from './accounts';
import { createBudgetsRepo } from './budgets';
import { createCategoriesRepo } from './categories';
import { createSettingsRepo } from './settings';
import { createTransactionsRepo } from './transactions';

export function createRepositories(db: AppDatabase) {
  return {
    accounts: createAccountsRepo(db),
    budgets: createBudgetsRepo(db),
    categories: createCategoriesRepo(db),
    settings: createSettingsRepo(db),
    transactions: createTransactionsRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export * from './accounts';
export * from './budgets';
export * from './categories';
export * from './errors';
export * from './settings';
export * from './transactions';
