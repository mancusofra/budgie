import { createBackup, parseBackup, restoreBackup } from '@/db/backup';
import { InvalidTransactionError } from '@/db/repositories';
import { resetDatabase, seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

async function setup() {
  const ctx = createTestDb();
  await seedDatabase(ctx.db, { language: 'it', currency: 'EUR' });
  const [cash] = await ctx.repos.accounts.list();
  const cats = await ctx.repos.categories.list();
  const rent = cats.find((c) => c.name === 'Casa')!.id;
  const salary = cats.find((c) => c.name === 'Stipendio')!.id;
  return { ...ctx, cash, rent, salary };
}

const rentInput = (accountId: string, categoryId: string) => ({
  type: 'expense' as const,
  amount: 70000,
  accountId,
  categoryId,
  note: 'Affitto',
  frequency: 'month' as const,
  startDate: new Date(2026, 0, 1, 9),
});

describe('recurringRepo', () => {
  it('logs due occurrences only once', async () => {
    const { repos, cash, rent, close } = await setup();
    const r = await repos.recurring.create(rentInput(cash.id, rent));

    expect(repos.recurring.materialize(new Date(2026, 2, 15))).toBe(3);
    // Already logged: a second run doesn't duplicate
    expect(repos.recurring.materialize(new Date(2026, 2, 15))).toBe(0);
    expect(repos.recurring.materialize(new Date(2026, 3, 1, 10))).toBe(1);

    const txs = await repos.transactions.list();
    expect(txs).toHaveLength(4);
    expect(
      txs.every((t) => t.recurringId === r.id && t.amount === 70000 && t.note === 'Affitto'),
    ).toBe(true);
    expect((await repos.recurring.getById(r.id))!.count).toBe(4);
    close();
  });

  it('validates like a transaction and checks interval and end date', async () => {
    const { repos, cash, rent, close } = await setup();
    await expect(
      repos.recurring.create({ ...rentInput(cash.id, rent), amount: 0 }),
    ).rejects.toThrow(InvalidTransactionError);
    await expect(
      repos.recurring.create({ ...rentInput(cash.id, rent), interval: 0 }),
    ).rejects.toThrow(InvalidTransactionError);
    await expect(
      repos.recurring.create({ ...rentInput(cash.id, rent), endDate: new Date(2025, 0, 1) }),
    ).rejects.toThrow(InvalidTransactionError);
    close();
  });

  it('changes only the future and restarts if the schedule changes', async () => {
    const { repos, cash, rent, close } = await setup();
    const r = await repos.recurring.create(rentInput(cash.id, rent));
    repos.recurring.materialize(new Date(2026, 1, 15));

    // As the edit screen does: all fields, schedule unchanged
    await repos.recurring.update(r.id, {
      amount: 75000,
      frequency: 'month',
      interval: 1,
      startDate: new Date(2026, 0, 1, 9),
    });
    expect(repos.recurring.materialize(new Date(2026, 1, 15))).toBe(0);
    expect((await repos.recurring.getById(r.id))!.count).toBe(2);

    // New next date: the count restarts from there
    await repos.recurring.update(r.id, { startDate: new Date(2026, 2, 5, 9) });
    expect((await repos.recurring.getById(r.id))!.count).toBe(0);
    repos.recurring.materialize(new Date(2026, 2, 10));

    const amounts = (await repos.transactions.list()).map((t) => t.amount).sort();
    expect(amounts).toEqual([70000, 70000, 75000]);
    close();
  });

  it('logs nothing while paused and does not catch up when resumed', async () => {
    const { repos, cash, salary, close } = await setup();
    const r = await repos.recurring.create({
      type: 'income',
      amount: 200000,
      accountId: cash.id,
      categoryId: salary,
      frequency: 'month',
      startDate: new Date(2026, 0, 27),
    });
    repos.recurring.materialize(new Date(2026, 0, 28));
    await repos.recurring.update(r.id, { paused: true });
    expect(repos.recurring.materialize(new Date(2026, 4, 1))).toBe(0);

    await repos.recurring.update(r.id, { paused: false }, new Date(2026, 4, 1));
    expect(repos.recurring.materialize(new Date(2026, 4, 28))).toBe(1); // only May 27
    close();
  });

  it('deleting it keeps the transactions', async () => {
    const { repos, cash, rent, close } = await setup();
    const r = await repos.recurring.create(rentInput(cash.id, rent));
    repos.recurring.materialize(new Date(2026, 1, 1, 12));
    await repos.recurring.remove(r.id);
    const txs = await repos.transactions.list();
    expect(txs).toHaveLength(2);
    expect(txs.every((t) => t.recurringId === null)).toBe(true);
    expect(await repos.recurring.listDetailed()).toEqual([]);
    close();
  });

  it('list with category and account', async () => {
    const { repos, cash, rent, close } = await setup();
    await repos.recurring.create(rentInput(cash.id, rent));
    const [row] = await repos.recurring.listDetailed();
    expect(row.category?.name).toBe('Casa');
    expect(row.account.name).toBe(cash.name);
    close();
  });

  it('backup, restore (version 1 backups too) and reset', async () => {
    const { db, repos, cash, rent, close } = await setup();
    await repos.recurring.create({ ...rentInput(cash.id, rent), endDate: new Date(2026, 11, 31) });
    repos.recurring.materialize(new Date(2026, 1, 1, 12));

    const backup = parseBackup(JSON.stringify(await createBackup(db)));
    expect(backup.data.recurring).toHaveLength(1);
    await repos.recurring.remove((await repos.recurring.listDetailed())[0].recurring.id);
    restoreBackup(db, backup);
    const [restored] = await repos.recurring.listDetailed();
    expect(restored.recurring.endDate).toEqual(new Date(2026, 11, 31));
    expect(restored.recurring.startDate).toBeInstanceOf(Date);

    const v1 = { ...backup, version: 1, data: { ...backup.data } } as Record<string, unknown> &
      typeof backup;
    delete (v1.data as Partial<typeof backup.data>).recurring;
    expect(parseBackup(JSON.stringify(v1)).data.recurring).toEqual([]);

    await resetDatabase(db, { language: 'it', currency: 'EUR' });
    expect(await repos.recurring.listDetailed()).toEqual([]);
    close();
  });
});
