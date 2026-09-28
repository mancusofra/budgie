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

    /** Le categorie con transazioni non si cancellano: si archiviano. */
    async setArchived(id: string, archived: boolean): Promise<void> {
      await db.update(c).set({ archived }).where(eq(c.id, id));
    },

    /** Query builder (per useLiveQuery): 0 o 1 riga. */
    byId(id: string) {
      return db.select().from(c).where(eq(c.id, id)).limit(1);
    },

    /** Numero di transazioni che usano la categoria. */
    async transactionCount(id: string): Promise<number> {
      const row = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(transactions)
        .where(eq(transactions.categoryId, id))
        .get();
      return row?.n ?? 0;
    },

    /** Elimina una categoria senza transazioni (e i suoi budget); altrimenti InUseError. */
    async remove(id: string): Promise<void> {
      const count = await this.transactionCount(id);
      if (count > 0) throw new InUseError('La categoria', count);
      db.transaction((tx) => {
        tx.delete(budgets).where(eq(budgets.categoryId, id)).run();
        tx.delete(c).where(eq(c.id, id)).run();
      });
    },

    /** Salva il nuovo ordine: `ids` nell'ordine desiderato. */
    async reorder(ids: string[]): Promise<void> {
      db.transaction((tx) => {
        ids.forEach((id, sortOrder) => tx.update(c).set({ sortOrder }).where(eq(c.id, id)).run());
      });
    },
  };
}

export type CategoriesRepo = ReturnType<typeof createCategoriesRepo>;
