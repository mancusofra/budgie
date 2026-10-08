/**
 * Feature hooks running for real on an in-memory SQLite DB: only the client
 * (expo-sqlite doesn't run in Node) and change notifications are replaced.
 */
import { act, renderHook } from '@testing-library/react-native';

import { db, repos } from '@/db/client';
import { refreshLiveQueries } from '@/db/live-query';
import { seedDatabase } from '@/db/seed';
import {
  accountActions,
  useAccount,
  useAccounts,
  useAccountScope,
  useAccountsWithBalance,
} from '@/features/accounts/hooks';
import { categoryActions, useCategories, useCategory } from '@/features/categories/hooks';
import {
  useCurrency,
  useResetDatabase,
  useSetSetting,
  useSettings,
  useSettingsState,
} from '@/features/settings/hooks';
import {
  budgetActions,
  useBudget,
  useBudgetProgress,
  useExpenseSeries,
  usePreviousExpense,
} from '@/features/stats/hooks';
import {
  useAddTransaction,
  useCategoryStats,
  useCategoryTotals,
  useDeleteTransaction,
  usePeriodTotals,
  useSelectedPeriod,
  useTransaction,
  useTransactionList,
  useUpdateTransaction,
} from '@/features/transactions/hooks';
import { useTranslation } from 'react-i18next';

import {
  recurringActions,
  REPEAT_OPTIONS,
  repeatLabel,
  useRecurring,
  useRecurringList,
} from '@/features/recurring/hooks';
import { budgetMonthKey } from '@/lib/budget';
import { periodRange, type Period } from '@/lib/period';
import { useSnackbar } from '@/store/snackbar';
import { useUIStore } from '@/store/ui';

jest.mock('@/db/client', () => {
  const { createTestDb } = require('../../test-utils/db');
  const ctx = createTestDb();
  return { db: ctx.db, repos: ctx.repos, expoDb: {} };
});
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove() {} }) }));

/** After a write: re-runs the live queries and waits for the results. */
async function settle(action?: () => unknown) {
  await act(async () => {
    await action?.();
    refreshLiveQueries();
    await new Promise((r) => setImmediate(r));
  });
}

async function render<T>(hook: () => T) {
  const utils = await renderHook(hook);
  await settle();
  return utils;
}

const month: Period = { kind: 'month', anchor: new Date(2026, 8, 15) };
const range = periodRange(month);
const day = (d: number) => new Date(2026, 8, d, 12);

let cashId: string;
let foodId: string;
let billsId: string;

beforeAll(async () => {
  await seedDatabase(db, { language: 'it', currency: 'EUR' });
  cashId = (await repos.accounts.list())[0].id;
  const cats = await repos.categories.list({ type: 'expense' });
  foodId = cats.find((c) => c.name === 'Cibo')!.id;
  billsId = cats.find((c) => c.name === 'Bollette')!.id;
});

describe('settings', () => {
  it('reads and writes settings', async () => {
    const { result } = await render(() => ({
      state: useSettingsState(),
      settings: useSettings(),
      currency: useCurrency(),
      set: useSetSetting(),
    }));
    expect(result.current.state.loaded).toBe(true);
    expect(result.current.currency).toBe('EUR');
    await settle(() => result.current.set('weekStart', 0));
    expect(result.current.settings.weekStart).toBe(0);
    await settle(() => result.current.set('weekStart', 1));
  });
});

describe('transactions', () => {
  it('adds, updates and deletes, updating totals and lists', async () => {
    const { result } = await render(() => ({
      add: useAddTransaction(),
      update: useUpdateTransaction(),
      remove: useDeleteTransaction(),
      totals: usePeriodTotals(range),
      byCategory: useCategoryTotals(range),
      stats: useCategoryStats(range),
      list: useTransactionList({ ...range }),
      foodList: useTransactionList({ ...range, categoryId: foodId, limit: 1 }),
    }));
    expect(result.current.totals).toEqual({ income: 0, expense: 0, balance: 0 });

    let first!: Awaited<ReturnType<typeof result.current.add>>;
    await settle(async () => {
      first = await result.current.add({
        type: 'expense',
        amount: 1200,
        accountId: cashId,
        categoryId: foodId,
        date: day(3),
      });
      await result.current.add({
        type: 'expense',
        amount: 800,
        accountId: cashId,
        categoryId: foodId,
        date: day(4),
      });
      await result.current.add({
        type: 'expense',
        amount: 5000,
        accountId: cashId,
        categoryId: billsId,
        date: day(5),
      });
    });
    expect(result.current.totals).toEqual({ income: 0, expense: 7000, balance: -7000 });
    expect(result.current.byCategory).toEqual([
      { categoryId: billsId, total: 5000 },
      { categoryId: foodId, total: 2000 },
    ]);
    expect(result.current.stats).toContainEqual({
      categoryId: foodId,
      type: 'expense',
      total: 2000,
      count: 2,
    });
    expect(result.current.list).toHaveLength(3);
    expect(result.current.foodList).toHaveLength(1);

    await settle(() => result.current.update(first.id, { amount: 1500 }));
    expect(result.current.totals.expense).toBe(7300);

    // In the app the updated row is deleted (the one shown in the list)
    const updated = (await repos.transactions.getById(first.id))!;
    await settle(() => result.current.remove(updated));
    expect(result.current.totals.expense).toBe(5800);
    const snack = useSnackbar.getState().current!;
    expect(snack.actionLabel).toBeTruthy();

    // "Undo" re-inserts the transaction
    await settle(() => snack.onAction?.());
    expect(result.current.totals.expense).toBe(7300);
  });

  it('useTransaction tells loading and not found apart', async () => {
    const [tx] = await repos.transactions.list();
    const { result } = await render(() => ({
      found: useTransaction(tx.id),
      missing: useTransaction('nope'),
    }));
    expect(result.current.found?.id).toBe(tx.id);
    expect(result.current.missing).toBeNull();
  });

  it('useSelectedPeriod uses the period from the store', async () => {
    useUIStore.setState({ period: month });
    const { result } = await render(() => useSelectedPeriod());
    expect(result.current.range).toEqual(range);
    expect(result.current.label).toMatch(/2026/);
  });
});

describe('accounts and categories', () => {
  it('balances, scope by currency and actions', async () => {
    const { result } = await render(() => ({
      accounts: useAccounts(),
      balances: useAccountsWithBalance(),
      scope: useAccountScope(),
      cash: useAccount(cashId),
      none: useAccount(undefined),
    }));
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.balances[0].balance).toBe(-7300);
    expect(result.current.cash?.id).toBe(cashId);
    expect(result.current.none).toBeNull();

    // An account in another currency stays out of "All accounts"
    let usdId = '';
    await settle(async () => {
      usdId = (await accountActions.create({ name: 'USD', currency: 'USD' })).id;
    });
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.scope.scope).toEqual({ accountIds: [cashId] });
    expect(await accountActions.transactionCount(usdId)).toBe(0);
    await settle(() => accountActions.remove(usdId));
    expect(result.current.accounts).toHaveLength(1);
  });

  it('creates, archives and finds categories', async () => {
    const { result } = await render(() => ({
      expense: useCategories('expense'),
      all: useCategories(undefined, { includeArchived: true }),
      food: useCategory(foodId),
      none: useCategory(undefined),
    }));
    const before = result.current.expense.length;
    let id = '';
    await settle(async () => {
      id = (
        await categoryActions.create({
          name: 'Palestra',
          type: 'expense',
          icon: 'dumbbell',
          color: '#123456',
        })
      ).id;
    });
    expect(result.current.expense).toHaveLength(before + 1);
    await settle(() => categoryActions.setArchived(id, true));
    expect(result.current.expense).toHaveLength(before);
    expect(result.current.all.some((c) => c.id === id)).toBe(true);
    expect(result.current.food?.name).toBe('Cibo');
    expect(result.current.none).toBeNull();
  });
});

describe('stats and budgets', () => {
  it('series, previous period and budget progress', async () => {
    const monthKey = budgetMonthKey(month.anchor, 1);
    await budgetActions.set({ month: monthKey, categoryId: foodId, amount: 2000 });
    await budgetActions.set({ month: monthKey, categoryId: null, amount: 10000 });
    await repos.transactions.create({
      type: 'expense',
      amount: 900,
      accountId: cashId,
      categoryId: foodId,
      date: new Date(2026, 7, 20),
    });

    const { result } = await render(() => ({
      series: useExpenseSeries(month, range, {}),
      previous: usePreviousExpense(month, {}),
      all: usePreviousExpense({ kind: 'all', anchor: month.anchor }, {}),
      budgets: useBudgetProgress(month, range, {}),
    }));
    expect(result.current.series.window.bucket).toBe('day');
    expect(result.current.series.points.reduce((a, p) => a + p.value, 0)).toBe(7300);
    expect(result.current.previous).toBe(900);
    expect(result.current.all).toBeNull();
    expect(result.current.budgets.monthKey).toBe(monthKey);

    const food = result.current.budgets.progress.find((b) => b.categoryId === foodId)!;
    expect(food).toMatchObject({ amount: 2000, spent: 2300, level: 'over' });
    const global = result.current.budgets.progress.find((b) => b.categoryId === null)!;
    expect(global).toMatchObject({ amount: 10000, spent: 7300 });

    const { result: one } = await render(() => useBudget(food.id));
    expect(one.current?.amount).toBe(2000);
    await settle(() => budgetActions.remove({ month: monthKey, categoryId: foodId }));
  });
});

describe('recurring', () => {
  it('creates, lists, logs and edits', async () => {
    const { result } = await render(() => ({
      list: useRecurringList(),
      none: useRecurring(undefined),
    }));
    expect(result.current.list).toHaveLength(0);
    expect(result.current.none).toBeNull();

    let id = '';
    await settle(async () => {
      id = (
        await recurringActions.create({
          type: 'expense',
          amount: 1000,
          accountId: cashId,
          categoryId: billsId,
          frequency: 'month',
          startDate: new Date(2026, 0, 10),
        })
      ).id;
      expect(recurringActions.materialize(new Date(2026, 2, 10, 12))).toBe(3);
    });
    expect(result.current.list).toHaveLength(1);
    expect(result.current.list[0].category?.name).toBe('Bollette');

    const { result: one } = await render(() => useRecurring(id));
    expect(one.current?.count).toBe(3);
    await settle(() => recurringActions.update(id, { paused: true }));
    expect(one.current?.paused).toBe(true);
    await settle(() => recurringActions.remove(id));
    expect(result.current.list).toHaveLength(0);
  });

  it('frequency labels', async () => {
    const { result } = await render(() => useTranslation().t);
    expect(REPEAT_OPTIONS.map((o) => repeatLabel(result.current, o.frequency, o.interval))).toEqual(
      ['Every week', 'Every 2 weeks', 'Every month', 'Every year'],
    );
  });
});

describe('reset', () => {
  it('deletes everything and updates the open screens', async () => {
    const { result } = await render(() => ({
      reset: useResetDatabase(),
      list: useTransactionList({}),
    }));
    expect(result.current.list.length).toBeGreaterThan(0);
    await settle(() => result.current.reset());
    expect(result.current.list).toHaveLength(0);
  });
});
