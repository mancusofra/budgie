import { and, asc, desc, eq, isNull, lt, lte, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { budgetMonths, budgets, type Budget } from '../schema';
import type { AppDatabase } from '../types';

export class InvalidBudgetError extends Error {
  name = 'InvalidBudgetError';
}

type Tx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

/**
 * Monthly budgets with inheritance: a month's budgets are those of the latest
 * month (same or earlier) in which they were defined or changed. The first
 * change to a month copies the inherited budgets into it and then applies it,
 * so past months stay as they were. Months as 'YYYY-MM'.
 */
export function createBudgetsRepo(db: AppDatabase) {
  const b = budgets;
  const m = budgetMonths;
  const sameCategory = (categoryId: string | null) =>
    categoryId ? eq(b.categoryId, categoryId) : isNull(b.categoryId);

  /** Creates the month's definition by copying the inherited one, if it doesn't exist yet. */
  const ensureMonth = (tx: Tx, month: string) => {
    if (tx.select().from(m).where(eq(m.month, month)).get()) return;
    const prev = tx
      .select({ month: m.month })
      .from(m)
      .where(lt(m.month, month))
      .orderBy(desc(m.month))
      .limit(1)
      .get();
    tx.insert(m).values({ month, createdAt: new Date() }).run();
    if (!prev) return;
    const inherited = tx.select().from(b).where(eq(b.month, prev.month)).all();
    if (inherited.length === 0) return;
    tx.insert(b)
      .values(inherited.map((row) => ({ ...row, id: createId(), month, createdAt: new Date() })))
      .run();
  };

  return {
    /**
     * Budgets in effect for the month: the overall one first, then per category.
     * Query builder (for live queries: depends on budgets and budget_months).
     */
    effective(month: string) {
      const source = sql`(select max(${m.month}) from ${m} where ${m.month} <= ${month})`;
      return db
        .select()
        .from(b)
        .where(eq(b.month, source))
        .orderBy(sql`${b.categoryId} is not null`, asc(b.createdAt));
    },

    /** Month the budgets of `month` come from (undefined if none). */
    async sourceMonth(month: string): Promise<string | undefined> {
      const row = await db
        .select({ month: m.month })
        .from(m)
        .where(lte(m.month, month))
        .orderBy(desc(m.month))
        .limit(1)
        .get();
      return row?.month;
    },

    byId(id: string) {
      return db.select().from(b).where(eq(b.id, id)).limit(1);
    },

    /** Sets the budget of a category (or the overall one with `null`) for the month. */
    async set(input: { month: string; categoryId: string | null; amount: number }): Promise<void> {
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new InvalidBudgetError('The amount must be a positive integer in minor units');
      }
      db.transaction((tx) => {
        ensureMonth(tx, input.month);
        const where = and(eq(b.month, input.month), sameCategory(input.categoryId));
        const existing = tx.select().from(b).where(where).get();
        if (existing) {
          tx.update(b).set({ amount: input.amount }).where(eq(b.id, existing.id)).run();
        } else {
          const row: Budget = {
            id: createId(),
            categoryId: input.categoryId,
            amount: input.amount,
            period: 'month',
            month: input.month,
            createdAt: new Date(),
          };
          tx.insert(b).values(row).run();
        }
      });
    },

    /** Removes a category (or overall) budget from the month and from those inheriting it. */
    async remove(input: { month: string; categoryId: string | null }): Promise<void> {
      db.transaction((tx) => {
        ensureMonth(tx, input.month);
        tx.delete(b)
          .where(and(eq(b.month, input.month), sameCategory(input.categoryId)))
          .run();
      });
    },
  };
}

export type BudgetsRepo = ReturnType<typeof createBudgetsRepo>;
