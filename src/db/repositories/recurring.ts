import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { createId } from '@/lib/id';
import { countFrom, dueOccurrences, type Frequency } from '@/lib/recurrence';

import { accounts, categories, recurring, transactions, type Recurring } from '../schema';
import type { AppDatabase } from '../types';
import { InvalidTransactionError, validateTransaction, type NewTransaction } from './transactions';

export type NewRecurring = Omit<NewTransaction, 'date'> & {
  frequency: Frequency;
  interval?: number;
  /** First occurrence. */
  startDate: Date;
  endDate?: Date | null;
};

export type RecurringPatch = Partial<Omit<NewRecurring, 'type'>> & { paused?: boolean };

/** Compares by value: dates by instant, everything else with ===. */
const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

/** Occurrences start over if one of these fields changes. */
const SCHEDULE_KEYS = ['frequency', 'interval', 'startDate'] as const;

export function createRecurringRepo(db: AppDatabase) {
  const r = recurring;

  const validate = (input: NewRecurring) => {
    validateTransaction({ ...input, date: input.startDate });
    if (input.interval !== undefined && (!Number.isInteger(input.interval) || input.interval < 1)) {
      throw new InvalidTransactionError('The interval must be an integer ≥ 1');
    }
    if (input.endDate && input.endDate < input.startDate) {
      throw new InvalidTransactionError('The end date is before the first occurrence');
    }
  };

  return {
    async create(input: NewRecurring): Promise<Recurring> {
      validate(input);
      const now = new Date();
      const row: Recurring = {
        id: createId(),
        type: input.type,
        amount: input.amount,
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        toAccountId: input.toAccountId ?? null,
        toAmount: input.toAmount ?? null,
        note: input.note?.trim() || null,
        frequency: input.frequency,
        interval: input.interval ?? 1,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        count: 0,
        paused: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(r).values(row);
      return row;
    },

    /**
     * Changes future occurrences (those already logged stay as they are).
     * Changing frequency, interval or start date restarts the schedule from
     * `startDate`, which becomes the next occurrence.
     */
    async update(id: string, patch: RecurringPatch, now = new Date()): Promise<Recurring> {
      const current = await db.select().from(r).where(eq(r.id, id)).get();
      if (!current) throw new InvalidTransactionError(`Recurring rule ${id} not found`);
      const next = { ...current, ...patch, updatedAt: now } as Recurring;
      if (patch.note !== undefined) next.note = patch.note?.trim() || null;
      if (SCHEDULE_KEYS.some((k) => patch[k] !== undefined && !sameValue(patch[k], current[k]))) {
        next.count = 0;
      }
      // When resuming, occurrences of the paused period are not caught up
      if (current.paused && patch.paused === false) next.count = countFrom(next, now);
      validate({ ...next, startDate: next.startDate });
      await db.update(r).set(next).where(eq(r.id, id));
      return next;
    },

    /** Deletes the rule; transactions already logged are kept. */
    async remove(id: string): Promise<void> {
      await db
        .update(transactions)
        .set({ recurringId: null })
        .where(eq(transactions.recurringId, id));
      await db.delete(r).where(eq(r.id, id));
    },

    getById(id: string) {
      return db.select().from(r).where(eq(r.id, id)).get();
    },

    /** Query builder (for useLiveQuery): 0 or 1 row. */
    byId(id: string) {
      return db.select().from(r).where(eq(r.id, id)).limit(1);
    },

    /** Recurring rules with category and accounts, for the list. */
    listDetailed() {
      const toAccount = alias(accounts, 'to_account');
      return db
        .select({
          recurring: r,
          category: { name: categories.name, icon: categories.icon, color: categories.color },
          account: { name: accounts.name, currency: accounts.currency },
          toAccount: { name: toAccount.name },
        })
        .from(r)
        .innerJoin(accounts, eq(r.accountId, accounts.id))
        .leftJoin(categories, eq(r.categoryId, categories.id))
        .leftJoin(toAccount, eq(r.toAccountId, toAccount.id))
        .orderBy(asc(r.createdAt));
    },

    /**
     * Logs the occurrences due up to `now` as transactions, in a single
     * transaction. Returns how many were created.
     */
    materialize(now = new Date()): number {
      let created = 0;
      db.transaction((tx) => {
        const active = tx.select().from(r).where(eq(r.paused, false)).all();
        for (const item of active) {
          const due = dueOccurrences(item, now);
          if (due.length === 0) continue;
          for (let i = 0; i < due.length; i += 100) {
            tx.insert(transactions)
              .values(
                due.slice(i, i + 100).map((date) => ({
                  id: createId(),
                  type: item.type,
                  amount: item.amount,
                  accountId: item.accountId,
                  categoryId: item.categoryId,
                  toAccountId: item.toAccountId,
                  toAmount: item.toAmount,
                  date,
                  note: item.note,
                  recurringId: item.id,
                  createdAt: now,
                  updatedAt: now,
                })),
              )
              .run();
          }
          tx.update(r)
            .set({ count: item.count + due.length })
            .where(eq(r.id, item.id))
            .run();
          created += due.length;
        }
      });
      return created;
    },
  };
}

export type RecurringRepo = ReturnType<typeof createRecurringRepo>;
