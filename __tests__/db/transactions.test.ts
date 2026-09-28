import { InvalidTransactionError } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

async function setup() {
  const ctx = createTestDb();
  await seedDatabase(ctx.db, { language: 'it', currency: 'EUR' });
  const [cash] = await ctx.repos.accounts.list();
  const card = await ctx.repos.accounts.create({ name: 'Carta', currency: 'EUR' });
  const cats = await ctx.repos.categories.list();
  const byName = (name: string, type = 'expense') =>
    cats.find((c) => c.name === name && c.type === type)!.id;
  return {
    ...ctx,
    cash,
    card,
    food: byName('Cibo'),
    bills: byName('Bollette'),
    salary: byName('Stipendio', 'income'),
  };
}

const day = (d: number) => new Date(2026, 8, d, 12);

describe('transactionsRepo', () => {
  it('crea e rilegge una spesa', async () => {
    const { repos, cash, food, close } = await setup();
    const tx = await repos.transactions.create({
      type: 'expense',
      amount: 1250,
      accountId: cash.id,
      categoryId: food,
      date: day(10),
      note: '  spesa  ',
    });
    expect(await repos.transactions.getById(tx.id)).toEqual(tx);
    expect(tx.note).toBe('spesa');
    close();
  });

  it('valida gli input', async () => {
    const { repos, cash, card, food, close } = await setup();
    const base = { accountId: cash.id, categoryId: food };
    await expect(
      repos.transactions.create({ ...base, type: 'expense', amount: 0 }),
    ).rejects.toThrow(InvalidTransactionError);
    await expect(
      repos.transactions.create({ ...base, type: 'expense', amount: 12.5 }),
    ).rejects.toThrow(InvalidTransactionError);
    await expect(
      repos.transactions.create({ type: 'expense', amount: 100, accountId: cash.id }),
    ).rejects.toThrow(/categoria/);
    await expect(
      repos.transactions.create({ type: 'transfer', amount: 100, accountId: cash.id }),
    ).rejects.toThrow(/destinazione/);
    await expect(
      repos.transactions.create({
        type: 'transfer',
        amount: 100,
        accountId: cash.id,
        toAccountId: card.id,
        categoryId: food,
      }),
    ).rejects.toThrow(/categoria/);
    close();
  });

  it('rifiuta riferimenti inesistenti (foreign key)', async () => {
    const { repos, food, close } = await setup();
    await expect(
      repos.transactions.create({
        type: 'expense',
        amount: 100,
        accountId: 'nope',
        categoryId: food,
      }),
    ).rejects.toThrow(/FOREIGN KEY/);
    close();
  });

  it('aggiorna ed elimina', async () => {
    const { repos, cash, food, bills, close } = await setup();
    const tx = await repos.transactions.create({
      type: 'expense',
      amount: 500,
      accountId: cash.id,
      categoryId: food,
    });
    const updated = await repos.transactions.update(tx.id, { amount: 700, categoryId: bills });
    expect(updated).toMatchObject({ amount: 700, categoryId: bills });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(tx.updatedAt.getTime());
    expect(await repos.transactions.getById(tx.id)).toMatchObject({
      amount: 700,
      categoryId: bills,
    });

    await expect(repos.transactions.update(tx.id, { amount: -1 })).rejects.toThrow(
      InvalidTransactionError,
    );

    await repos.transactions.remove(tx.id);
    expect(await repos.transactions.getById(tx.id)).toBeUndefined();
    close();
  });

  it('filtra per periodo [from, to), conto e categoria, dalla più recente', async () => {
    const { repos, cash, card, food, bills, close } = await setup();
    const a = await repos.transactions.create({
      type: 'expense',
      amount: 100,
      accountId: cash.id,
      categoryId: food,
      date: day(1),
    });
    const b = await repos.transactions.create({
      type: 'expense',
      amount: 200,
      accountId: card.id,
      categoryId: bills,
      date: day(15),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 300,
      accountId: cash.id,
      categoryId: food,
      date: new Date(2026, 9, 1),
    });
    const t = await repos.transactions.create({
      type: 'transfer',
      amount: 50,
      accountId: cash.id,
      toAccountId: card.id,
      date: day(20),
    });

    const september = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
    expect((await repos.transactions.list(september)).map((x) => x.id)).toEqual([t.id, b.id, a.id]);
    expect(
      (await repos.transactions.list({ ...september, categoryId: food })).map((x) => x.id),
    ).toEqual([a.id]);
    // I trasferimenti compaiono sia sul conto di origine che su quello di destinazione
    expect(
      (await repos.transactions.list({ ...september, accountId: card.id })).map((x) => x.id),
    ).toEqual([t.id, b.id]);
    close();
  });

  it('somma per categoria e calcola i totali del periodo, ignorando i trasferimenti', async () => {
    const { repos, cash, card, food, bills, salary, close } = await setup();
    await repos.transactions.create({
      type: 'expense',
      amount: 1000,
      accountId: cash.id,
      categoryId: food,
      date: day(2),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 250,
      accountId: card.id,
      categoryId: food,
      date: day(3),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 5000,
      accountId: card.id,
      categoryId: bills,
      date: day(4),
    });
    await repos.transactions.create({
      type: 'income',
      amount: 150000,
      accountId: card.id,
      categoryId: salary,
      date: day(5),
    });
    await repos.transactions.create({
      type: 'transfer',
      amount: 2000,
      accountId: card.id,
      toAccountId: cash.id,
      date: day(6),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 999,
      accountId: cash.id,
      categoryId: food,
      date: new Date(2026, 7, 31),
    });

    const september = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
    expect(await repos.transactions.sumByCategory(september)).toEqual([
      { categoryId: bills, total: 5000 },
      { categoryId: food, total: 1250 },
    ]);
    expect(await repos.transactions.sumByCategory({ ...september, accountId: cash.id })).toEqual([
      { categoryId: food, total: 1000 },
    ]);
    expect(await repos.transactions.sumByCategory({ ...september, type: 'income' })).toEqual([
      { categoryId: salary, total: 150000 },
    ]);
    expect(await repos.transactions.totals(september)).toEqual([{ income: 150000, expense: 6250 }]);
    expect(
      await repos.transactions.totals({ from: new Date(2027, 0, 1), to: new Date(2027, 1, 1) }),
    ).toEqual([{ income: 0, expense: 0 }]);
    close();
  });
});

describe('transactionsRepo – lista dettagliata', () => {
  it('unisce categoria e conti, cerca nella nota e nel nome categoria', async () => {
    const { repos, cash, card, food, bills, close } = await setup();
    await repos.transactions.create({
      type: 'expense',
      amount: 100,
      accountId: cash.id,
      categoryId: food,
      note: 'Pizza con amici',
      date: day(1),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 200,
      accountId: card.id,
      categoryId: bills,
      note: '100% luce',
      date: day(2),
    });
    await repos.transactions.create({
      type: 'transfer',
      amount: 50,
      accountId: cash.id,
      toAccountId: card.id,
      date: day(3),
    });

    const all = await repos.transactions.listDetailed();
    expect(all).toHaveLength(3);
    const [transfer, bill, pizza] = all;
    expect(transfer.category).toBeNull();
    expect(transfer.toAccount).toEqual({ name: 'Carta' });
    expect(bill).toMatchObject({
      category: { name: 'Bollette' },
      account: { name: 'Carta', currency: 'EUR' },
    });
    expect(pizza.transaction.note).toBe('Pizza con amici');

    const names = async (search: string) =>
      (await repos.transactions.listDetailed({ search })).map((r) => r.transaction.note);
    expect(await names('PIZZA')).toEqual(['Pizza con amici']);
    expect(await names('bollet')).toEqual(['100% luce']);
    // % e _ sono cercati letteralmente, non come caratteri jolly
    expect(await names('100%')).toEqual(['100% luce']);
    expect(await names('_')).toEqual([]);
    close();
  });

  it('restore reinserisce una transazione cancellata', async () => {
    const { repos, cash, food, close } = await setup();
    const tx = await repos.transactions.create({
      type: 'expense',
      amount: 300,
      accountId: cash.id,
      categoryId: food,
    });
    await repos.transactions.remove(tx.id);
    await repos.transactions.restore(tx);
    expect(await repos.transactions.getById(tx.id)).toEqual(tx);
    // idempotente
    await repos.transactions.restore(tx);
    expect(await repos.transactions.list()).toHaveLength(1);
    close();
  });
});

describe('transactionsRepo – statistiche per categoria', () => {
  it('somma e conta per categoria e tipo, esclude i trasferimenti e rispetta il periodo', async () => {
    const { repos, cash, card, food, bills, salary, close } = await setup();
    await repos.transactions.create({
      type: 'expense',
      amount: 1000,
      accountId: cash.id,
      categoryId: food,
      date: day(2),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 500,
      accountId: card.id,
      categoryId: food,
      date: day(3),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 4000,
      accountId: card.id,
      categoryId: bills,
      date: day(4),
    });
    await repos.transactions.create({
      type: 'income',
      amount: 9000,
      accountId: card.id,
      categoryId: salary,
      date: day(5),
    });
    await repos.transactions.create({
      type: 'transfer',
      amount: 100,
      accountId: card.id,
      toAccountId: cash.id,
      date: day(6),
    });
    await repos.transactions.create({
      type: 'expense',
      amount: 7,
      accountId: cash.id,
      categoryId: food,
      date: new Date(2026, 9, 1),
    });

    const september = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
    expect(await repos.transactions.statsByCategory(september)).toEqual([
      { categoryId: salary, type: 'income', total: 9000, count: 1 },
      { categoryId: bills, type: 'expense', total: 4000, count: 1 },
      { categoryId: food, type: 'expense', total: 1500, count: 2 },
    ]);
    expect(await repos.transactions.statsByCategory({ ...september, accountId: cash.id })).toEqual([
      { categoryId: food, type: 'expense', total: 1000, count: 1 },
    ]);
    close();
  });
});
