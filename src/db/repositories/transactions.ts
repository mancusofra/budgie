import { and, desc, eq, gte, inArray, lt, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import type { AccountScope } from '@/lib/account-scope';
import { createId } from '@/lib/id';

import {
  accounts,
  categories,
  transactions,
  type Transaction,
  type TransactionType,
} from '../schema';
import type { AppDatabase } from '../types';

/** Intervallo semiaperto [from, to). */
export type DateRange = { from: Date; to: Date };

export type TransactionFilter = Partial<DateRange> &
  AccountScope & {
    categoryId?: string;
    type?: TransactionType;
  };

export type DetailedFilter = TransactionFilter & {
  /** Text searched in the note and category name (case-insensitive). */
  search?: string;
  /** Maximum number of rows (the most recent ones). */
  limit?: number;
};

export type NewTransaction = {
  type: TransactionType;
  amount: number;
  accountId: string;
  categoryId?: string | null;
  toAccountId?: string | null;
  toAmount?: number | null;
  date?: Date;
  note?: string | null;
};

export type TransactionPatch = Partial<NewTransaction>;

export class InvalidTransactionError extends Error {
  name = 'InvalidTransactionError';
}

export function validateTransaction(tx: NewTransaction) {
  if (!Number.isInteger(tx.amount) || tx.amount <= 0) {
    throw new InvalidTransactionError('The amount must be a positive integer in minor units');
  }
  if (tx.type === 'transfer') {
    if (!tx.toAccountId)
      throw new InvalidTransactionError('A transfer requires a destination account');
    if (tx.toAccountId === tx.accountId) {
      throw new InvalidTransactionError('Source and destination accounts are the same');
    }
    if (tx.categoryId) throw new InvalidTransactionError('A transfer has no category');
    if (tx.toAmount != null && (!Number.isInteger(tx.toAmount) || tx.toAmount <= 0)) {
      throw new InvalidTransactionError('The received amount must be a positive integer');
    }
  } else {
    if (!tx.categoryId) throw new InvalidTransactionError('Expenses and income require a category');
    if (tx.toAccountId || tx.toAmount != null) {
      throw new InvalidTransactionError('Only transfers have a destination account');
    }
  }
}

/**
 * Condition on accounts. With `includeIncoming` the destination account of
 * transfers counts too (for the list); not for totals and stats.
 */
function accountCondition(scope: AccountScope, includeIncoming: boolean) {
  const t = transactions;
  if (scope.accountId) {
    return includeIncoming
      ? or(eq(t.accountId, scope.accountId), eq(t.toAccountId, scope.accountId))
      : eq(t.accountId, scope.accountId);
  }
  if (scope.accountIds) {
    return includeIncoming
      ? or(inArray(t.accountId, scope.accountIds), inArray(t.toAccountId, scope.accountIds))
      : inArray(t.accountId, scope.accountIds);
  }
  return undefined;
}

function where(filter: TransactionFilter) {
  const t = transactions;
  return and(
    filter.from && gte(t.date, filter.from),
    filter.to && lt(t.date, filter.to),
    filter.type && eq(t.type, filter.type),
    filter.categoryId ? eq(t.categoryId, filter.categoryId) : undefined,
    accountCondition(filter, true),
  );
}

export function createTransactionsRepo(db: AppDatabase) {
  const t = transactions;

  return {
    async create(input: NewTransaction): Promise<Transaction> {
      validateTransaction(input);
      const now = new Date();
      const row: Transaction = {
        id: createId(),
        type: input.type,
        amount: input.amount,
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        toAccountId: input.toAccountId ?? null,
        toAmount: input.toAmount ?? null,
        date: input.date ?? now,
        note: input.note?.trim() || null,
        recurringId: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(t).values(row);
      return row;
    },

    async update(id: string, patch: TransactionPatch): Promise<Transaction> {
      const current = await db.select().from(t).where(eq(t.id, id)).get();
      if (!current) throw new InvalidTransactionError(`Transaction ${id} not found`);

      const next: Transaction = { ...current, ...patch, id, updatedAt: new Date() } as Transaction;
      if (patch.note !== undefined) next.note = patch.note?.trim() || null;
      if (next.type === 'transfer') next.categoryId = null;
      else {
        next.toAccountId = null;
        next.toAmount = null;
      }
      validateTransaction(next);

      await db.update(t).set(next).where(eq(t.id, id));
      return next;
    },

    async remove(id: string): Promise<void> {
      await db.delete(t).where(eq(t.id, id));
    },

    /** Re-inserts a deleted transaction (for "Undo"), with the same id. */
    async restore(row: Transaction): Promise<void> {
      await db.insert(t).values(row).onConflictDoNothing();
    },

    getById(id: string) {
      return db.select().from(t).where(eq(t.id, id)).get();
    },

    /** Like getById but as a query builder (for useLiveQuery): 0 or 1 row. */
    byId(id: string) {
      return db.select().from(t).where(eq(t.id, id)).limit(1);
    },

    /**
     * Transactions with category and accounts (for the list), newest first.
     * Query builder: usable with await or useLiveQuery.
     */
    listDetailed(filter: DetailedFilter = {}) {
      const toAccount = alias(accounts, 'to_account');
      const search = filter.search?.trim().toLowerCase();
      const pattern = search ? `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
      return db
        .select({
          transaction: t,
          category: { name: categories.name, icon: categories.icon, color: categories.color },
          account: { name: accounts.name, currency: accounts.currency },
          toAccount: { name: toAccount.name },
        })
        .from(t)
        .innerJoin(accounts, eq(t.accountId, accounts.id))
        .leftJoin(categories, eq(t.categoryId, categories.id))
        .leftJoin(toAccount, eq(t.toAccountId, toAccount.id))
        .where(
          and(
            where(filter),
            pattern
              ? or(
                  sql`lower(${t.note}) like ${pattern} escape '\\'`,
                  sql`lower(${categories.name}) like ${pattern} escape '\\'`,
                )
              : undefined,
          ),
        )
        .orderBy(desc(t.date), desc(t.createdAt))
        .limit(filter.limit ?? -1);
    },

    /** Filtered transactions, newest first. */
    list(filter: TransactionFilter = {}) {
      return db.select().from(t).where(where(filter)).orderBy(desc(t.date), desc(t.createdAt));
    },

    /** Total per category in the period (for the donut), highest first. */
    sumByCategory(
      filter: Partial<DateRange> & AccountScope & { type?: 'expense' | 'income' } = {},
    ) {
      const total = sql<number>`sum(${t.amount})`.mapWith(Number);
      return db
        .select({ categoryId: t.categoryId, total })
        .from(t)
        .where(
          and(
            where({ from: filter.from, to: filter.to, type: filter.type ?? 'expense' }),
            accountCondition(filter, false),
          ),
        )
        .groupBy(t.categoryId)
        .orderBy(desc(total));
    },

    /**
     * Total and number of transactions per category and type (expenses and income),
     * highest total first. Transfers are excluded.
     */
    statsByCategory(filter: Partial<DateRange> & AccountScope = {}) {
      const total = sql<number>`sum(${t.amount})`.mapWith(Number);
      return db
        .select({
          categoryId: t.categoryId,
          type: t.type,
          total,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(t)
        .where(
          and(
            where({ from: filter.from, to: filter.to }),
            ne(t.type, 'transfer'),
            accountCondition(filter, false),
          ),
        )
        .groupBy(t.categoryId, t.type)
        .orderBy(desc(total));
    },

    /**
     * Totals per day ('YYYY-MM-DD') or month ('YYYY-MM') in local time, for the
     * bar chart. Only buckets with transactions: the caller adds the empty ones.
     */
    seriesByBucket(
      filter: Partial<DateRange> & AccountScope & { type?: 'expense' | 'income' },
      bucket: 'day' | 'month',
    ) {
      const format = bucket === 'day' ? '%Y-%m-%d' : '%Y-%m';
      const key = sql<string>`strftime(${format}, ${t.date} / 1000, 'unixepoch', 'localtime')`;
      return db
        .select({ key, total: sql<number>`sum(${t.amount})`.mapWith(Number) })
        .from(t)
        .where(
          and(
            where({ from: filter.from, to: filter.to, type: filter.type ?? 'expense' }),
            accountCondition(filter, false),
          ),
        )
        .groupBy(key)
        .orderBy(key);
    },

    /** Date of the first transaction (for the "All time" period), if any. */
    firstDate(scope: AccountScope = {}) {
      return db
        .select({ first: sql<number | null>`min(${t.date})` })
        .from(t)
        .where(accountCondition(scope, true));
    },

    /** Total income and expenses in the period. Transfers don't count. */
    totals(filter: Partial<DateRange> & AccountScope = {}) {
      return db
        .select({
          income:
            sql<number>`coalesce(sum(case when ${t.type} = 'income' then ${t.amount} end), 0)`.mapWith(
              Number,
            ),
          expense:
            sql<number>`coalesce(sum(case when ${t.type} = 'expense' then ${t.amount} end), 0)`.mapWith(
              Number,
            ),
        })
        .from(t)
        .where(and(where({ from: filter.from, to: filter.to }), accountCondition(filter, false)));
    },
  };
}

export type TransactionsRepo = ReturnType<typeof createTransactionsRepo>;
