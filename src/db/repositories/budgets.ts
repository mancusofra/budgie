import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { budgets, type Budget } from '../schema';
import type { AppDatabase } from '../types';

export type BudgetPeriod = Budget['period'];

export class InvalidBudgetError extends Error {
  name = 'InvalidBudgetError';
}

export function createBudgetsRepo(db: AppDatabase) {
  const b = budgets;
  const sameTarget = (categoryId: string | null, period: BudgetPeriod) =>
    and(categoryId ? eq(b.categoryId, categoryId) : isNull(b.categoryId), eq(b.period, period));

  return {
    /** Budget del periodo: prima quello globale, poi per categoria (query builder). */
    list(period: BudgetPeriod = 'month') {
      return db
        .select()
        .from(b)
        .where(eq(b.period, period))
        .orderBy(sql`${b.categoryId} is not null`, asc(b.createdAt));
    },

    byId(id: string) {
      return db.select().from(b).where(eq(b.id, id)).limit(1);
    },

    /**
     * Imposta il budget per una categoria (o globale con `null`): un solo budget
     * per categoria e periodo, quindi se esiste già ne aggiorna l'importo.
     */
    async set(input: {
      categoryId: string | null;
      amount: number;
      period?: BudgetPeriod;
    }): Promise<Budget> {
      const period = input.period ?? 'month';
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new InvalidBudgetError("L'importo deve essere un intero positivo in centesimi");
      }
      const existing = await db.select().from(b).where(sameTarget(input.categoryId, period)).get();
      if (existing) {
        await db.update(b).set({ amount: input.amount }).where(eq(b.id, existing.id));
        return { ...existing, amount: input.amount };
      }
      const row: Budget = {
        id: createId(),
        categoryId: input.categoryId,
        amount: input.amount,
        period,
        createdAt: new Date(),
      };
      await db.insert(b).values(row);
      return row;
    },

    async remove(id: string): Promise<void> {
      await db.delete(b).where(eq(b.id, id));
    },
  };
}

export type BudgetsRepo = ReturnType<typeof createBudgetsRepo>;
