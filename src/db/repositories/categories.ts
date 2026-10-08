import { and, asc, eq, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { budgets, categories, transactions, type Category, type CategoryType } from '../schema';
import { InUseError } from './errors';
import type { AppDatabase } from '../types';

export type NewCategory = Pick<Category, 'name' | 'type' | 'icon' | 'color'>;
export type CategoryPatch = Partial<NewCategory & Pick<Category, 'sortOrder'>>;

export function createCategoriesRepo(db: AppDatabase) {
  const c = categories;

  return {
    list({
      type,
      includeArchived = false,
    }: { type?: CategoryType; includeArchived?: boolean } = {}) {
      return db
        .select()
        .from(c)
        .where(and(type && eq(c.type, type), includeArchived ? undefined : eq(c.archived, false)))
        .orderBy(asc(c.sortOrder), asc(c.name));
    },

    getById(id: string) {
      return db.select().from(c).where(eq(c.id, id)).get();
    },

    async create(input: NewCategory): Promise<Category> {
      const last = await db
        .select({ max: sql<number | null>`max(${c.sortOrder})` })
        .from(c)
        .where(eq(c.type, input.type))
        .get();
      const row: Category = {
        ...input,
        name: input.name.trim(),
        id: createId(),
        sortOrder: (last?.max ?? -1) + 1,
        archived: false,
        createdAt: new Date(),
      };
      await db.insert(c).values(row);
      return row;
    },

    async update(id: string, patch: CategoryPatch): Promise<void> {
      await db
        .update(c)
        .set(patch.name ? { ...patch, name: patch.name.trim() } : patch)
        .where(eq(c.id, id));
    },

    /** Categories with transactions are not deleted: they are archived. */
    async setArchived(id: string, archived: boolean): Promise<void> {
      await db.update(c).set({ archived }).where(eq(c.id, id));
    },

    /** Query builder (for useLiveQuery): 0 or 1 row. */
    byId(id: string) {
      return db.select().from(c).where(eq(c.id, id)).limit(1);
    },

    /** Number of transactions using the category. */
    async transactionCount(id: string): Promise<number> {
      const row = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(transactions)
        .where(eq(transactions.categoryId, id))
        .get();
      return row?.n ?? 0;
    },

    /** Deletes a category with no transactions (and its budgets); otherwise InUseError. */
    async remove(id: string): Promise<void> {
      const count = await this.transactionCount(id);
      if (count > 0) throw new InUseError('The category', count);
      db.transaction((tx) => {
        tx.delete(budgets).where(eq(budgets.categoryId, id)).run();
        tx.delete(c).where(eq(c.id, id)).run();
      });
    },

    /** Saves the new order: `ids` in the desired order. */
    async reorder(ids: string[]): Promise<void> {
      db.transaction((tx) => {
        ids.forEach((id, sortOrder) => tx.update(c).set({ sortOrder }).where(eq(c.id, id)).run());
      });
    },
  };
}

export type CategoriesRepo = ReturnType<typeof createCategoriesRepo>;
