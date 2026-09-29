/**
 * Hook delle feature eseguiti davvero su un DB SQLite in memoria: si sostituisce
 * solo il client (expo-sqlite non gira in Node) e le notifiche di modifica.
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

/** Dopo una scrittura: riesegue le live query e attende i risultati. */
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

describe('impostazioni', () => {
  it('legge e scrive le impostazioni', async () => {
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

describe('transazioni', () => {
  it('aggiunge, aggiorna ed elimina aggiornando totali e liste', async () => {
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

    // Nell'app si elimina la riga aggiornata (quella mostrata in lista)
    const updated = (await repos.transactions.getById(first.id))!;
    await settle(() => result.current.remove(updated));
    expect(result.current.totals.expense).toBe(5800);
    const snack = useSnackbar.getState().current!;
    expect(snack.actionLabel).toBeTruthy();

    // "Annulla" reinserisce la transazione
    await settle(() => snack.onAction?.());
    expect(result.current.totals.expense).toBe(7300);
  });

  it('useTransaction distingue caricamento e non trovata', async () => {
    const [tx] = await repos.transactions.list();
    const { result } = await render(() => ({
      found: useTransaction(tx.id),
      missing: useTransaction('nope'),
    }));
    expect(result.current.found?.id).toBe(tx.id);
    expect(result.current.missing).toBeNull();
  });

  it('useSelectedPeriod usa il periodo dello store', async () => {
    useUIStore.setState({ period: month });
    const { result } = await render(() => useSelectedPeriod());
    expect(result.current.range).toEqual(range);
    expect(result.current.label).toMatch(/2026/);
  });
});

describe('conti e categorie', () => {
  it('saldi, ambito per valuta e azioni', async () => {
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

    // Un conto in un'altra valuta resta fuori da "Tutti i conti"
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

  it('crea, archivia e trova categorie', async () => {
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

describe('statistiche e budget', () => {
  it('serie, periodo precedente e avanzamento dei budget', async () => {
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

describe('azzeramento', () => {
  it('cancella tutto e aggiorna le schermate aperte', async () => {
    const { result } = await render(() => ({
      reset: useResetDatabase(),
      list: useTransactionList({}),
    }));
    expect(result.current.list.length).toBeGreaterThan(0);
    await settle(() => result.current.reset());
    expect(result.current.list).toHaveLength(0);
  });
});
