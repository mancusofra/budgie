import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  initialBalance: integer('initial_balance').notNull().default(0),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    /** Importo in unità minori (centesimi), sempre positivo. */
    amount: integer('amount').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    toAccountId: text('to_account_id').references(() => accounts.id),
    /** Importo accreditato sul conto di destinazione, se in valuta diversa. */
    toAmount: integer('to_amount'),
    categoryId: text('category_id').references(() => categories.id),
    date: integer('date', { mode: 'timestamp_ms' }).notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('tx_date_idx').on(t.date),
    index('tx_category_date_idx').on(t.categoryId, t.date),
    index('tx_account_date_idx').on(t.accountId, t.date),
  ],
);

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  /** NULL = budget globale. */
  categoryId: text('category_id').references(() => categories.id),
  amount: integer('amount').notNull(),
  period: text('period', { enum: ['week', 'month', 'year'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  /** Valore serializzato in JSON. */
  value: text('value').notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type CategoryType = Category['type'];
export type TransactionType = Transaction['type'];
