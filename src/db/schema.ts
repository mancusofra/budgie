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

/**
 * A transaction that repeats (rent, subscriptions, salary). Occurrence n
 * falls on startDate + n × interval × frequency: always computed from the start,
 * so "monthly from the 31st" goes back to the 31st after February.
 */
export const recurring = sqliteTable('recurring', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
  amount: integer('amount').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  toAccountId: text('to_account_id').references(() => accounts.id),
  toAmount: integer('to_amount'),
  note: text('note'),
  frequency: text('frequency', { enum: ['day', 'week', 'month', 'year'] }).notNull(),
  interval: integer('interval').notNull().default(1),
  startDate: integer('start_date', { mode: 'timestamp_ms' }).notNull(),
  /** Last valid day (inclusive); NULL = no end. */
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  /** Occurrences already logged as transactions. */
  count: integer('count').notNull().default(0),
  paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    /** Amount in minor units (cents), always positive. */
    amount: integer('amount').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    toAccountId: text('to_account_id').references(() => accounts.id),
    /** Amount received by the destination account, if in a different currency. */
    toAmount: integer('to_amount'),
    categoryId: text('category_id').references(() => categories.id),
    date: integer('date', { mode: 'timestamp_ms' }).notNull(),
    note: text('note'),
    /** Recurring rule that generated it (kept, as NULL, if the rule is deleted). */
    recurringId: text('recurring_id').references(() => recurring.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('tx_date_idx').on(t.date),
    index('tx_category_date_idx').on(t.categoryId, t.date),
    index('tx_account_date_idx').on(t.accountId, t.date),
  ],
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    /** NULL = overall budget. */
    categoryId: text('category_id').references(() => categories.id),
    amount: integer('amount').notNull(),
    period: text('period', { enum: ['week', 'month', 'year'] }).notNull(),
    /** Month it belongs to ('YYYY-MM', start of the accounting month). */
    month: text('month').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('budgets_month_idx').on(t.month)],
);

/**
 * Months in which the set of budgets was defined or changed. A month
 * without a row inherits the budgets of the latest earlier month that has one
 * (even an empty one: "delete everything" also applies to later months).
 */
export const budgetMonths = sqliteTable('budget_months', {
  month: text('month').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  /** Value serialized as JSON. */
  value: text('value').notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Recurring = typeof recurring.$inferSelect;
export type Frequency = Recurring['frequency'];
export type CategoryType = Category['type'];
export type TransactionType = Transaction['type'];
