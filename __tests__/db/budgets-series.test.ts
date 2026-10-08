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

describe('budgetsRepo – monthly budgets with inheritance', () => {
  const summary = async (
    repos: Awaited<ReturnType<typeof setup>>['repos'],
    month: string,
    names: Record<string, string>,
  ) =>
    (await repos.budgets.effective(month)).map(
      (b) => `${names[b.categoryId ?? 'global']}:${b.amount}`,
    );

  it('follows the example: inherits from the previous month, changes apply from that month on', async () => {
    const { repos, food, home, close } = await setup();
    const names = { global: 'generale', [food.id]: 'cibo', [home.id]: 'medicine' };

    // month 1: overall 200, food 100, medicine 50
    await repos.budgets.set({ month: '2026-01', categoryId: null, amount: 20000 });
    await repos.budgets.set({ month: '2026-01', categoryId: food.id, amount: 10000 });
    await repos.budgets.set({ month: '2026-01', categoryId: home.id, amount: 5000 });
    // month 2: remove medicine
    await repos.budgets.remove({ month: '2026-02', categoryId: home.id });
    // month 4: delete everything
    await repos.budgets.remove({ month: '2026-04', categoryId: null });
    await repos.budgets.remove({ month: '2026-04', categoryId: food.id });

    expect(await summary(repos, '2025-12', names)).toEqual([]);
    expect(await summary(repos, '2026-01', names)).toEqual([
      'generale:20000',
      'cibo:10000',
      'medicine:5000',
    ]);
    expect(await summary(repos, '2026-02', names)).toEqual(['generale:20000', 'cibo:10000']);
    // month 3: no changes → inherits month 2
    expect(await summary(repos, '2026-03', names)).toEqual(['generale:20000', 'cibo:10000']);
    expect(await repos.budgets.sourceMonth('2026-03')).toBe('2026-02');
    expect(await summary(repos, '2026-04', names)).toEqual([]);
    // month 5: inherits the "delete everything" of month 4
    expect(await summary(repos, '2026-05', names)).toEqual([]);
    close();
  });

  it('changing a month does not change earlier months', async () => {
    const { repos, food, close } = await setup();
    await repos.budgets.set({ month: '2026-01', categoryId: food.id, amount: 10000 });
    await repos.budgets.set({ month: '2026-03', categoryId: food.id, amount: 15000 });
    const amount = async (month: string) => (await repos.budgets.effective(month))[0]?.amount;
    expect(await amount('2026-01')).toBe(10000);
    expect(await amount('2026-02')).toBe(10000);
    expect(await amount('2026-03')).toBe(15000);
    expect(await amount('2026-09')).toBe(15000);
    close();
  });

  it('one budget per category in the month; invalid amount rejected', async () => {
    const { repos, food, close } = await setup();
    await repos.budgets.set({ month: '2026-01', categoryId: food.id, amount: 100 });
    await repos.budgets.set({ month: '2026-01', categoryId: food.id, amount: 200 });
    expect((await repos.budgets.effective('2026-01')).map((b) => b.amount)).toEqual([200]);
    await expect(
      repos.budgets.set({ month: '2026-01', categoryId: null, amount: 0 }),
    ).rejects.toThrow(InvalidBudgetError);
    close();
  });

  it('deleting an unused category also deletes its budgets', async () => {
    const { repos, home, close } = await setup();
    await repos.budgets.set({ month: '2026-01', categoryId: home.id, amount: 5000 });
    await repos.categories.remove(home.id);
    expect(await repos.budgets.effective('2026-01')).toHaveLength(0);
    close();
  });
});

describe('chart series', () => {
  it('sums expenses per day and per month in local time, excluding income and transfers', async () => {
    const { repos, cash, food, home, salary, close } = await setup();
    const add = (amount: number, date: Date, categoryId = food.id) =>
      repos.transactions.create({ type: 'expense', amount, accountId: cash.id, categoryId, date });
    await add(100, new Date(2026, 8, 1, 0, 30)); // right after midnight: stays on the 1st
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
