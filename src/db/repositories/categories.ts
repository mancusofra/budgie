import { and, asc, eq, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { categories, type Category, type CategoryType } from '../schema';
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
  };
}

export type CategoriesRepo = ReturnType<typeof createCategoriesRepo>;
