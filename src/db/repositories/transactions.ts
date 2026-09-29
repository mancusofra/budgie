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
  /** Testo cercato nella nota e nel nome della categoria (senza distinzione maiuscole). */
  search?: string;
  /** Numero massimo di righe (le più recenti). */
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

function validate(tx: NewTransaction) {
  if (!Number.isInteger(tx.amount) || tx.amount <= 0) {
    throw new InvalidTransactionError("L'importo deve essere un intero positivo in centesimi");
  }
  if (tx.type === 'transfer') {
    if (!tx.toAccountId)
      throw new InvalidTransactionError('Un trasferimento richiede un conto di destinazione');
    if (tx.toAccountId === tx.accountId) {
      throw new InvalidTransactionError('Conto di origine e destinazione coincidono');
    }
    if (tx.categoryId) throw new InvalidTransactionError('Un trasferimento non ha categoria');
    if (tx.toAmount != null && (!Number.isInteger(tx.toAmount) || tx.toAmount <= 0)) {
      throw new InvalidTransactionError("L'importo accreditato deve essere un intero positivo");
    }
  } else {
    if (!tx.categoryId)
      throw new InvalidTransactionError('Spese ed entrate richiedono una categoria');
    if (tx.toAccountId || tx.toAmount != null) {
      throw new InvalidTransactionError('Solo i trasferimenti hanno un conto di destinazione');
    }
  }
}

/**
 * Condizione sui conti. Con `includeIncoming` conta anche il conto di
 * destinazione dei trasferimenti (per la lista); per totali e statistiche no.
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
      validate(input);
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
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(t).values(row);
      return row;
    },

    async update(id: string, patch: TransactionPatch): Promise<Transaction> {
      const current = await db.select().from(t).where(eq(t.id, id)).get();
      if (!current) throw new InvalidTransactionError(`Transazione ${id} non trovata`);

      const next: Transaction = { ...current, ...patch, id, updatedAt: new Date() } as Transaction;
      if (patch.note !== undefined) next.note = patch.note?.trim() || null;
      if (next.type === 'transfer') next.categoryId = null;
      else {
        next.toAccountId = null;
        next.toAmount = null;
      }
      validate(next);

      await db.update(t).set(next).where(eq(t.id, id));
      return next;
    },

    async remove(id: string): Promise<void> {
      await db.delete(t).where(eq(t.id, id));
    },

    /** Reinserisce una transazione cancellata (per "Annulla"), con lo stesso id. */
    async restore(row: Transaction): Promise<void> {
      await db.insert(t).values(row).onConflictDoNothing();
    },

    getById(id: string) {
      return db.select().from(t).where(eq(t.id, id)).get();
    },

    /** Come getById ma come query builder (per useLiveQuery): 0 o 1 riga. */
    byId(id: string) {
      return db.select().from(t).where(eq(t.id, id)).limit(1);
    },

    /**
     * Transazioni con categoria e conti (per la lista), dalla più recente.
     * Query builder: usabile con await o useLiveQuery.
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

    /** Transazioni filtrate, dalla più recente. */
    list(filter: TransactionFilter = {}) {
      return db.select().from(t).where(where(filter)).orderBy(desc(t.date), desc(t.createdAt));
    },

    /** Totale per categoria nel periodo (per la ciambella), dal più alto. */
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
     * Totale e numero di movimenti per categoria e tipo (spese ed entrate),
     * dal totale più alto. I trasferimenti sono esclusi.
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
     * Totali per giorno ('YYYY-MM-DD') o mese ('YYYY-MM') in ora locale, per il
     * grafico a barre. Solo i bucket con movimenti: quelli vuoti li aggiunge il chiamante.
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

    /** Data della prima transazione (per il periodo "Sempre"), se esiste. */
    firstDate(scope: AccountScope = {}) {
      return db
        .select({ first: sql<number | null>`min(${t.date})` })
        .from(t)
        .where(accountCondition(scope, true));
    },

    /** Entrate e spese totali nel periodo. I trasferimenti non contano. */
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
