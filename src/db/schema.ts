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
 * Movimento che si ripete (affitto, abbonamenti, stipendio). L'occorrenza n
 * cade in startDate + n × interval × frequency: calcolata sempre dall'inizio,
 * così un "ogni mese dal 31" torna al 31 dopo febbraio.
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
  /** Ultimo giorno utile (incluso); NULL = senza fine. */
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  /** Occorrenze già registrate come transazioni. */
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
    /** Ricorrenza che l'ha generata (resta anche se la ricorrenza viene eliminata: NULL). */
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
    /** NULL = budget globale. */
    categoryId: text('category_id').references(() => categories.id),
    amount: integer('amount').notNull(),
    period: text('period', { enum: ['week', 'month', 'year'] }).notNull(),
    /** Mese a cui appartiene ('YYYY-MM', inizio del mese contabile). */
    month: text('month').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('budgets_month_idx').on(t.month)],
);

/**
 * Mesi in cui l'insieme dei budget è stato definito o modificato. Un mese
 * senza riga eredita i budget dell'ultimo mese precedente che ne ha una
 * (anche vuoto: "cancello tutto" vale anche per i mesi successivi).
 */
export const budgetMonths = sqliteTable('budget_months', {
  month: text('month').primaryKey(),
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
export type Recurring = typeof recurring.$inferSelect;
export type Frequency = Recurring['frequency'];
export type CategoryType = Category['type'];
export type TransactionType = Transaction['type'];
