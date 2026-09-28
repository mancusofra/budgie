import { SEED_VERSION, seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

describe('seedDatabase', () => {
  it('crea categorie, conto Contanti e impostazioni al primo avvio', async () => {
    const { db, repos, close } = createTestDb();

    expect(await seedDatabase(db, { language: 'it', currency: 'EUR' })).toBe(true);

    const expense = await repos.categories.list({ type: 'expense' });
    const income = await repos.categories.list({ type: 'income' });
    expect(expense).toHaveLength(16);
    expect(income).toHaveLength(4);
    expect(expense[0].name).toBe('Cibo');
    expect(expense.map((c) => c.sortOrder)).toEqual([...Array(16).keys()]);

    const accounts = await repos.accounts.list();
    expect(accounts).toEqual([expect.objectContaining({ name: 'Contanti', currency: 'EUR' })]);

    expect(await repos.settings.get('currency')).toBe('EUR');
    expect(await repos.settings.get('seedVersion')).toBe(SEED_VERSION);
    close();
  });

  it('è idempotente', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    expect(await seedDatabase(db, { language: 'it', currency: 'EUR' })).toBe(false);
    expect(await repos.categories.list()).toHaveLength(20);
    expect(await repos.accounts.list()).toHaveLength(1);
    close();
  });

  it('usa i nomi inglesi per lingue diverse dall’italiano', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'de', currency: 'CHF' });
    const [first] = await repos.categories.list({ type: 'expense' });
    expect(first.name).toBe('Food');
    expect((await repos.accounts.list())[0]).toMatchObject({ name: 'Cash', currency: 'CHF' });
    close();
  });
});
