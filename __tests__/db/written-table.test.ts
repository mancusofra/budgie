import { writtenTable } from '@/db/client';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
  addDatabaseChangeListener: () => ({ remove() {} }),
}));

describe('writtenTable (web change notifications)', () => {
  it('finds the table of writes as Drizzle generates them', () => {
    expect(writtenTable('insert into "transactions" ("id") values (?)')).toBe('transactions');
    expect(writtenTable('update "categories" set "name" = ? where "id" = ?')).toBe('categories');
    expect(writtenTable('delete from "budgets" where "category_id" = ?')).toBe('budgets');
    expect(writtenTable('insert or replace into settings (key) values (?)')).toBe('settings');
    expect(writtenTable('  INSERT INTO `accounts` VALUES (1)')).toBe('accounts');
  });

  it('ignores reads', () => {
    expect(writtenTable('select * from "transactions"')).toBeNull();
    expect(writtenTable('with x as (select 1) select * from x')).toBeNull();
  });
});
