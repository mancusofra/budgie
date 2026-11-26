import { sql } from 'drizzle-orm';

import { createBackup, parseBackup, restoreBackup } from '@/db/backup';
import { SAVINGS_CATEGORY } from '@/db/repositories';
import { defaultGroupForIcon, SEED_VERSION, seedDatabase } from '@/db/seed';

import { createTestDb } from '../../test-utils/db';

const opts = { language: 'it', currency: 'EUR' };

describe('spending groups: data model', () => {
  it('a new install gives every default expense category its group, none to income', async () => {
    const { db, repos, close } = createTestDb();
    await seedDatabase(db, opts);

    const expense = await repos.categories.list({ type: 'expense' });
    const byName = Object.fromEntries(expense.map((c) => [c.name, c.spendingGroup]));
    expect(byName).toMatchObject({
      Cibo: 'need',
      Casa: 'need',
      Bollette: 'need',
      Animali: 'need',
      Svago: 'want',
      Ristoranti: 'want',
      Regali: 'want',
      Altro: 'want',
    });
    expect(expense.every((c) => c.spendingGroup)).toBe(true);
    const income = await repos.categories.list({ type: 'income' });
    expect(income.every((c) => c.spendingGroup === null)).toBe(true);
    close();
  });

  it('v2 → v3: existing expense categories get the default group by icon, custom ones "need"', async () => {
    const { db, repos, close } = createTestDb();
    const make = (name: string, icon: string, type: 'expense' | 'income' = 'expense') =>
      repos.categories.create({ name, type, icon, color: '#123456' });
    const food = await make('Spesa', 'food-apple');
    const fun = await make('Giochi', 'gamepad-variant');
    const mine = await make('Mia', 'star');
    const salary = await make('Stipendio', 'cash', 'income');
    // Simulate categories created before the column existed
    await db.run(sql`UPDATE categories SET spending_group = NULL`);
    await repos.settings.set('seedVersion', 2);

    expect(await seedDatabase(db, opts)).toBe(true);
    expect((await repos.categories.getById(food.id))?.spendingGroup).toBe('need');
    expect((await repos.categories.getById(fun.id))?.spendingGroup).toBe('want');
    expect((await repos.categories.getById(mine.id))?.spendingGroup).toBe('need');
    expect((await repos.categories.getById(salary.id))?.spendingGroup).toBeNull();
    expect(await repos.settings.get('seedVersion')).toBe(SEED_VERSION);
    close();
  });

  it('defaultGroupForIcon falls back to "need"', () => {
    expect(defaultGroupForIcon('silverware-fork-knife')).toBe('want');
    expect(defaultGroupForIcon('home')).toBe('need');
    expect(defaultGroupForIcon('unknown-icon')).toBe('need');
  });

  it('keeps the group consistent with the category type', async () => {
    const { repos, close } = createTestDb();
    const base = { icon: 'star', color: '#123456' };
    const a = await repos.categories.create({ ...base, name: 'A', type: 'expense' });
    expect(a.spendingGroup).toBe('need');
    const b = await repos.categories.create({
      ...base,
      name: 'B',
      type: 'income',
      spendingGroup: 'want',
    });
    expect(b.spendingGroup).toBeNull();

    await repos.categories.update(a.id, { spendingGroup: 'want' });
    expect((await repos.categories.getById(a.id))?.spendingGroup).toBe('want');
    await repos.categories.update(a.id, { type: 'income' });
    expect((await repos.categories.getById(a.id))?.spendingGroup).toBeNull();
    await repos.categories.update(a.id, { type: 'expense' });
    expect((await repos.categories.getById(a.id))?.spendingGroup).toBe('need');
    await repos.categories.update(a.id, { spendingGroup: null });
    expect((await repos.categories.getById(a.id))?.spendingGroup).toBe('need');
    await repos.categories.update(a.id, { name: ' Renamed ' });
    expect((await repos.categories.getById(a.id))?.name).toBe('Renamed');
    close();
  });

  it('ensureSavingsCategory creates the category once, then reuses it', async () => {
    const { repos, close } = createTestDb();
    const created = await repos.categories.ensureSavingsCategory('Investimenti');
    expect(created).toMatchObject({
      name: 'Investimenti',
      type: 'expense',
      spendingGroup: 'save',
      ...SAVINGS_CATEGORY,
    });
    const again = await repos.categories.ensureSavingsCategory('investimenti');
    expect(again.id).toBe(created.id);
    expect(await repos.categories.list({ type: 'expense' })).toHaveLength(1);
    close();
  });

  it('ensureSavingsCategory reuses an archived category with the same name', async () => {
    const { repos, close } = createTestDb();
    const old = await repos.categories.create({
      name: 'Investimenti',
      type: 'expense',
      icon: 'bank',
      color: '#123456',
    });
    await repos.categories.setArchived(old.id, true);
    const reused = await repos.categories.ensureSavingsCategory('Investimenti');
    expect(reused.id).toBe(old.id);
    expect(await repos.categories.getById(old.id)).toMatchObject({
      spendingGroup: 'save',
      archived: false,
      icon: 'bank',
    });
    close();
  });

  it('restoring a backup made before groups assigns the default groups', async () => {
    const source = createTestDb();
    await seedDatabase(source.db, opts);
    const backup = await createBackup(source.db);
    // Version 2 backup: categories without spendingGroup
    const legacy = {
      ...backup,
      version: 2,
      data: {
        ...backup.data,
        categories: backup.data.categories.map(({ spendingGroup: _, ...c }) => c),
      },
    };

    const target = createTestDb();
    restoreBackup(target.db, parseBackup(JSON.stringify(legacy)));
    const expense = await target.repos.categories.list({ type: 'expense' });
    expect(expense.find((c) => c.name === 'Ristoranti')?.spendingGroup).toBe('want');
    expect(expense.every((c) => c.spendingGroup)).toBe(true);
    source.close();
    target.close();
  });
});
