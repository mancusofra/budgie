import { and, asc, desc, eq, isNull, lt, lte, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { budgetMonths, budgets, type Budget } from '../schema';
import type { AppDatabase } from '../types';

export class InvalidBudgetError extends Error {
  name = 'InvalidBudgetError';
}

type Tx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

/**
 * Budget mensili con ereditarietà: i budget di un mese sono quelli dell'ultimo
 * mese (uguale o precedente) in cui sono stati definiti o modificati. La prima
 * modifica di un mese copia in quel mese i budget ereditati e poi la applica,
 * così i mesi passati restano come erano. Mesi come 'YYYY-MM'.
 */
export function createBudgetsRepo(db: AppDatabase) {
  const b = budgets;
  const m = budgetMonths;
  const sameCategory = (categoryId: string | null) =>
    categoryId ? eq(b.categoryId, categoryId) : isNull(b.categoryId);

  /** Crea la definizione del mese copiando quella ereditata, se non esiste già. */
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
     * Budget validi per il mese: prima quello globale, poi per categoria.
     * Query builder (per le live query: dipende da budgets e budget_months).
     */
    effective(month: string) {
      const source = sql`(select max(${m.month}) from ${m} where ${m.month} <= ${month})`;
      return db
        .select()
        .from(b)
        .where(eq(b.month, source))
        .orderBy(sql`${b.categoryId} is not null`, asc(b.createdAt));
    },

    /** Mese da cui provengono i budget di `month` (undefined se nessuno). */
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

    /** Imposta il budget di una categoria (o globale con `null`) per il mese. */
    async set(input: { month: string; categoryId: string | null; amount: number }): Promise<void> {
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new InvalidBudgetError("L'importo deve essere un intero positivo in centesimi");
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

    /** Toglie il budget di una categoria (o globale) dal mese e da quelli che lo ereditano. */
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
