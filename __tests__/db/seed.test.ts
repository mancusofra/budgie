import { DEFAULT_CATEGORIES, resetDatabase, SEED_VERSION, seedDatabase } from '@/db/seed';

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

  it('v1 → v2: ricolora solo le categorie con il colore di default originale', async () => {
    const { db, repos, close } = createTestDb();
    // Simula un DB creato con il seed v1
    const food = await repos.categories.create({
      name: 'Cibo',
      type: 'expense',
      icon: 'food-apple',
      color: '#43A047',
    });
    const custom = await repos.categories.create({
      name: 'Mia',
      type: 'expense',
      icon: 'star',
      color: '#123456',
    });
    await repos.settings.set('seedVersion', 1);

    expect(await seedDatabase(db, { language: 'it', currency: 'EUR' })).toBe(true);
    expect((await repos.categories.getById(food.id))?.color).toBe(DEFAULT_CATEGORIES[0].color);
    expect((await repos.categories.getById(custom.id))?.color).toBe('#123456');
    // non reinserisce i dati di default
    expect(await repos.categories.list()).toHaveLength(2);
    expect(await repos.settings.get('seedVersion')).toBe(SEED_VERSION);
    close();
  });

  it('due seed in parallelo non duplicano i dati', async () => {
    const { db, repos, close } = createTestDb();
    const opts = { language: 'it', currency: 'EUR' };
    const results = await Promise.all([seedDatabase(db, opts), seedDatabase(db, opts)]);
    expect(results.sort()).toEqual([false, true]);
    expect(await repos.categories.list()).toHaveLength(20);
    expect(await repos.accounts.list()).toHaveLength(1);
    close();
  });

  it('resetDatabase cancella tutto e riapplica il seed', async () => {
    const { db, repos, close } = createTestDb();
    const opts = { language: 'it', currency: 'EUR' };
    await seedDatabase(db, opts);
    const [account] = await repos.accounts.list();
    const [food] = await repos.categories.list({ type: 'expense' });
    await repos.transactions.create({
      type: 'expense',
      amount: 100,
      accountId: account.id,
      categoryId: food.id,
    });
    await repos.categories.create({
      name: 'Extra',
      type: 'expense',
      icon: 'star',
      color: '#000000',
    });

    await resetDatabase(db, opts);
    expect(await repos.transactions.list()).toHaveLength(0);
    expect(await repos.categories.list()).toHaveLength(20);
    expect(await repos.accounts.list()).toHaveLength(1);
    expect(await repos.settings.get('seedVersion')).toBe(SEED_VERSION);
    close();
  });
});
