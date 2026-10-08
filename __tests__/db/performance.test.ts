import { addMonths, startOfMonth } from 'date-fns';

import { generateDemoTransactions } from '@/db/demo';
import { seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

const COUNT = 12_000;

/**
 * With 10,000+ transactions the queries of the main screens must stay
 * fast and use indexes (no full table scan).
 */
describe('performance with many transactions', () => {
  const ctx = createTestDb();
  const now = new Date(2026, 8, 15);
  const month = { from: startOfMonth(now), to: addMonths(startOfMonth(now), 1) };
  let cashId: string;

  beforeAll(async () => {
    await seedDatabase(ctx.db, { language: 'it', currency: 'EUR' });
    const [cash] = await ctx.repos.accounts.list();
    await ctx.repos.accounts.create({ name: 'Carta', currency: 'EUR' });
    cashId = cash.id;
    expect(await generateDemoTransactions(ctx.db, { count: COUNT, now })).toBe(COUNT);
  });

  afterAll(() => ctx.close());

  const timed = async <T>(fn: () => PromiseLike<T>) => {
    const start = performance.now();
    const result = await fn();
    return { result, ms: performance.now() - start };
  };

  it('home and stats queries stay under 50 ms', async () => {
    const queries: (() => PromiseLike<unknown>)[] = [
      () => ctx.repos.transactions.sumByCategory(month),
      () => ctx.repos.transactions.totals(month),
      () => ctx.repos.transactions.statsByCategory(month),
      () => ctx.repos.transactions.seriesByBucket(month, 'day'),
      () => ctx.repos.transactions.listDetailed(month),
      () => ctx.repos.transactions.listDetailed({ ...month, accountId: cashId }),
    ];
    for (const q of queries) {
      await q(); // riscaldamento
      const { ms } = await timed(q);
      expect(ms).toBeLessThan(50);
    }
  });

  it('"All time" (every transaction) is manageable too', async () => {
    const { result, ms } = await timed(() => ctx.repos.transactions.listDetailed());
    expect(result).toHaveLength(COUNT);
    expect(ms).toBeLessThan(500);
  });

  it('limit returns only the most recent (for the paged list)', async () => {
    const page = await ctx.repos.transactions.listDetailed({ limit: 50 });
    const all = await ctx.repos.transactions.listDetailed();
    expect(page).toEqual(all.slice(0, 50));
  });

  it('queries by period use an index on the date', () => {
    const { sql, params } = ctx.repos.transactions.listDetailed(month).toSQL();
    const plan = ctx.db.$client.prepare(`explain query plan ${sql}`).all(...params) as {
      detail: string;
    }[];
    const main = plan.map((p) => p.detail).find((d) => d.includes('transactions'));
    expect(main).toMatch(/USING (COVERING )?INDEX/);
  });
});
