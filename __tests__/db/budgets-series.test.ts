import { InvalidBudgetError } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

async function setup() {
  const ctx = createTestDb();
  await seedDatabase(ctx.db, { language: 'it', currency: 'EUR' });
  const [cash] = await ctx.repos.accounts.list();
  const [food, home] = await ctx.repos.categories.list({ type: 'expense' });
  const [salary] = await ctx.repos.categories.list({ type: 'income' });
  return { ...ctx, cash, food, home, salary };
}

describe('budgetsRepo', () => {
  it('un budget per categoria (e uno globale): set aggiorna invece di duplicare', async () => {
    const { repos, food, close } = await setup();
    const global = await repos.budgets.set({ categoryId: null, amount: 100000 });
    await repos.budgets.set({ categoryId: food.id, amount: 30000 });
    await repos.budgets.set({ categoryId: food.id, amount: 35000 });

    const list = await repos.budgets.list();
    expect(list.map((b) => [b.categoryId, b.amount])).toEqual([
      [null, 100000],
      [food.id, 35000],
    ]);
    await expect(repos.budgets.set({ categoryId: null, amount: 0 })).rejects.toThrow(
      InvalidBudgetError,
    );

    await repos.budgets.remove(global.id);
    expect(await repos.budgets.list()).toHaveLength(1);
    close();
  });

  it('eliminando una categoria non usata si eliminano anche i suoi budget', async () => {
    const { repos, home, close } = await setup();
    await repos.budgets.set({ categoryId: home.id, amount: 5000 });
    await repos.categories.remove(home.id);
    expect(await repos.budgets.list()).toHaveLength(0);
    close();
  });
});

describe('serie per il grafico', () => {
  it('somma le spese per giorno e per mese in ora locale, esclude entrate e trasferimenti', async () => {
    const { repos, cash, food, home, salary, close } = await setup();
    const add = (amount: number, date: Date, categoryId = food.id) =>
      repos.transactions.create({ type: 'expense', amount, accountId: cash.id, categoryId, date });
    await add(100, new Date(2026, 8, 1, 0, 30)); // subito dopo mezzanotte: resta il 1°
    await add(200, new Date(2026, 8, 1, 23, 30), home.id);
    await add(50, new Date(2026, 8, 3, 12));
    await add(999, new Date(2026, 9, 1, 12));
    await repos.transactions.create({
      type: 'income',
      amount: 5000,
      accountId: cash.id,
      categoryId: salary.id,
      date: new Date(2026, 8, 2),
    });

    const september = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
    expect(await repos.transactions.seriesByBucket(september, 'day')).toEqual([
      { key: '2026-09-01', total: 300 },
      { key: '2026-09-03', total: 50 },
    ]);
    expect(await repos.transactions.seriesByBucket({}, 'month')).toEqual([
      { key: '2026-09', total: 350 },
      { key: '2026-10', total: 999 },
    ]);
    expect(await repos.transactions.firstDate()).toEqual([
      { first: new Date(2026, 8, 1, 0, 30).getTime() },
    ]);
    close();
  });
});
