import { InUseError } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

describe('accountsRepo', () => {
  it('calcola il saldo con entrate, spese e trasferimenti (anche tra valute)', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    const [cash] = await repos.accounts.list();
    const bank = await repos.accounts.create({
      name: 'Banca',
      currency: 'EUR',
      initialBalance: 100000,
    });
    const usd = await repos.accounts.create({ name: 'Dollari', currency: 'USD' });
    const [food] = await repos.categories.list({ type: 'expense' });
    const [salary] = await repos.categories.list({ type: 'income' });

    await repos.transactions.create({
      type: 'income',
      amount: 200000,
      accountId: bank.id,
      categoryId: salary.id,
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 3000,
      accountId: bank.id,
      categoryId: food.id,
    });
    await repos.transactions.create({
      type: 'transfer',
      amount: 5000,
      accountId: bank.id,
      toAccountId: cash.id,
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 1200,
      accountId: cash.id,
      categoryId: food.id,
    });
    await repos.transactions.create({
      type: 'transfer',
      amount: 10000,
      toAmount: 10800,
      accountId: bank.id,
      toAccountId: usd.id,
    });

    const balances = Object.fromEntries(
      (await repos.accounts.listWithBalance()).map((r) => [r.account.name, r.balance]),
    );
    expect(balances).toEqual({
      Contanti: 5000 - 1200,
      Banca: 100000 + 200000 - 3000 - 5000 - 10000,
      Dollari: 10800,
    });
    close();
  });

  it('nasconde i conti archiviati e mantiene l’ordine di inserimento', async () => {
    const { repos, close } = createTestDb();
    const a = await repos.accounts.create({ name: ' Zeta ', currency: 'EUR' });
    const b = await repos.accounts.create({ name: 'Alfa', currency: 'EUR' });
    expect(a.name).toBe('Zeta');
    expect((await repos.accounts.list()).map((x) => x.id)).toEqual([a.id, b.id]);

    await repos.accounts.setArchived(a.id, true);
    expect((await repos.accounts.list()).map((x) => x.id)).toEqual([b.id]);
    expect(await repos.accounts.list({ includeArchived: true })).toHaveLength(2);
    close();
  });
});

describe('categoriesRepo', () => {
  it('crea in coda al proprio tipo, aggiorna e archivia', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    const created = await repos.categories.create({
      name: 'Viaggi',
      type: 'expense',
      icon: 'airplane',
      color: '#039BE5',
    });
    expect(created.sortOrder).toBe(16);

    await repos.categories.update(created.id, { name: ' Vacanze ' });
    expect(await repos.categories.getById(created.id)).toMatchObject({ name: 'Vacanze' });

    await repos.categories.setArchived(created.id, true);
    expect((await repos.categories.list({ type: 'expense' })).map((c) => c.id)).not.toContain(
      created.id,
    );
    close();
  });
});

describe('settingsRepo', () => {
  it('salva valori JSON tipizzati e li sovrascrive', async () => {
    const { repos, close } = createTestDb();
    expect(await repos.settings.get('theme')).toBeUndefined();
    await repos.settings.set('theme', 'dark');
    await repos.settings.set('monthStartDay', 27);
    await repos.settings.set('theme', 'light');
    expect(await repos.settings.getAll()).toEqual({ theme: 'light', monthStartDay: 27 });
    close();
  });
});

describe('eliminazione e riordino', () => {
  it('categoria: elimina solo se non ha transazioni, altrimenti InUseError', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    const [cash] = await repos.accounts.list();
    const [food, home] = await repos.categories.list({ type: 'expense' });
    await repos.transactions.create({
      type: 'expense',
      amount: 100,
      accountId: cash.id,
      categoryId: food.id,
    });

    expect(await repos.categories.transactionCount(food.id)).toBe(1);
    await expect(repos.categories.remove(food.id)).rejects.toBeInstanceOf(InUseError);
    await repos.categories.remove(home.id);
    expect(await repos.categories.getById(home.id)).toBeUndefined();
    close();
  });

  it('conto: conta anche i trasferimenti in entrata', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    const [cash] = await repos.accounts.list();
    const bank = await repos.accounts.create({ name: 'Banca', currency: 'EUR' });
    const empty = await repos.accounts.create({ name: 'Vuoto', currency: 'EUR' });
    await repos.transactions.create({
      type: 'transfer',
      amount: 100,
      accountId: cash.id,
      toAccountId: bank.id,
    });

    expect(await repos.accounts.transactionCount(bank.id)).toBe(1);
    await expect(repos.accounts.remove(bank.id)).rejects.toThrow(InUseError);
    await repos.accounts.remove(empty.id);
    expect(await repos.accounts.list()).toHaveLength(2);
    close();
  });

  it('reorder salva il nuovo ordine', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, { language: 'it', currency: 'EUR' });
    const ids = (await repos.categories.list({ type: 'income' })).map((c) => c.id);
    await repos.categories.reorder([...ids].reverse());
    expect((await repos.categories.list({ type: 'income' })).map((c) => c.id)).toEqual(
      [...ids].reverse(),
    );
    close();
  });
});
