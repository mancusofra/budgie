import { createBackup, InvalidBackupError, parseBackup, restoreBackup } from '@/db/backup';
import { seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

async function populated() {
  const ctx = createTestDb();
  await seedDatabase(ctx.db, { language: 'it', currency: 'EUR' });
  const [cash] = await ctx.repos.accounts.list();
  const bank = await ctx.repos.accounts.create({
    name: 'Banca',
    currency: 'EUR',
    initialBalance: 5000,
  });
  const [food] = await ctx.repos.categories.list({ type: 'expense' });
  await ctx.repos.transactions.create({
    type: 'expense',
    amount: 1250,
    accountId: cash.id,
    categoryId: food.id,
    date: new Date(2026, 8, 3),
    note: 'pizza',
  });
  await ctx.repos.transactions.create({
    type: 'transfer',
    amount: 1000,
    accountId: bank.id,
    toAccountId: cash.id,
    date: new Date(2026, 8, 4),
  });
  await ctx.repos.budgets.set({ month: '2026-09', categoryId: food.id, amount: 20000 });
  await ctx.repos.settings.set('monthStartDay', 27);
  return ctx;
}

describe('backup', () => {
  it('exports and restores all data unchanged (also through JSON)', async () => {
    const source = await populated();
    const backup = await createBackup(source.db, new Date(2026, 8, 29));
    const json = JSON.stringify(backup);

    const target = createTestDb();
    await seedDatabase(target.db, { language: 'en', currency: 'USD' }); // different data, to be replaced
    restoreBackup(target.db, parseBackup(json));

    const again = await createBackup(target.db, new Date(2026, 8, 29));
    expect(again).toEqual(backup);
    expect((await target.repos.transactions.list())[0]).toMatchObject({ type: 'transfer' });
    expect((await target.repos.transactions.list())[1].date).toEqual(new Date(2026, 8, 3));
    expect(await target.repos.settings.get('monthStartDay')).toBe(27);
    source.close();
    target.close();
  });

  it('accepts backups made when the app was called Moneta', async () => {
    const { db, close } = await populated();
    const backup = await createBackup(db);
    expect(backup.format).toBe('budgie-backup');
    const legacy = JSON.stringify({ ...backup, format: 'moneta-backup' });
    expect(parseBackup(legacy).data.transactions).toHaveLength(backup.data.transactions.length);
    close();
  });

  it('rejects invalid files without touching the data', () => {
    expect(() => parseBackup('non è json')).toThrow(InvalidBackupError);
    expect(() => parseBackup(JSON.stringify({ format: 'altro' }))).toThrow(/Budgie/);
    expect(() =>
      parseBackup(JSON.stringify({ format: 'budgie-backup', version: 99, data: {} })),
    ).toThrow(/newer version/);
    expect(() =>
      parseBackup(JSON.stringify({ format: 'budgie-backup', version: 1, data: { accounts: [] } })),
    ).toThrow(/Missing section/);
  });
});
