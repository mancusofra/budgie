import { and, asc, eq, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import {
  budgets,
  categories,
  transactions,
  type Category,
  type CategoryType,
  type SpendingGroup,
} from '../schema';
import { InUseError } from './errors';
import { inTransaction } from '../transaction';
import type { AppDatabase } from '../types';

export type NewCategory = Pick<Category, 'name' | 'type' | 'icon' | 'color'> & {
  /** Expense categories only; defaults to "need". Ignored for income. */
  spendingGroup?: SpendingGroup | null;
};
export type CategoryPatch = Partial<NewCategory & Pick<Category, 'sortOrder'>>;

/** Icon and color of the savings category created when groups are enabled. */
export const SAVINGS_CATEGORY = { icon: 'chart-line', color: '#4F9690' } as const;

/** Group to store: none for income, "need" when an expense category has none. */
function groupFor(type: CategoryType, group: SpendingGroup | null | undefined) {
  return type === 'expense' ? (group ?? 'need') : null;
}

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
        spendingGroup: groupFor(input.type, input.spendingGroup),
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
      const set = { ...patch };
      if (set.name) set.name = set.name.trim();
      if (set.type || set.spendingGroup !== undefined) {
        // Keep the group consistent with the type: none for income, always one for expenses
        const current = await db.select().from(c).where(eq(c.id, id)).get();
        if (current) {
          const type = set.type ?? current.type;
          const group = set.spendingGroup !== undefined ? set.spendingGroup : current.spendingGroup;
          set.spendingGroup = groupFor(type, group);
        }
      }
      await db.update(c).set(set).where(eq(c.id, id));
    },

    /**
     * Expense category for savings: an existing one with the same name (any
     * case, archived too) is reused and moved to "save"; otherwise it is created.
     */
    async ensureSavingsCategory(name: string): Promise<Category> {
      const key = name.trim().toLocaleLowerCase();
      const rows = await db.select().from(c).where(eq(c.type, 'expense'));
      const existing = rows.find((r) => r.name.trim().toLocaleLowerCase() === key);
      if (existing) {
        await db
          .update(c)
          .set({ spendingGroup: 'save', archived: false })
          .where(eq(c.id, existing.id));
        return { ...existing, spendingGroup: 'save', archived: false };
      }
      return this.create({ name, type: 'expense', spendingGroup: 'save', ...SAVINGS_CATEGORY });
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
      await inTransaction(db, async (tx) => {
        await tx.delete(budgets).where(eq(budgets.categoryId, id)).run();
        await tx.delete(c).where(eq(c.id, id)).run();
      });
    },

    /** Saves the new order: `ids` in the desired order. */
    async reorder(ids: string[]): Promise<void> {
      await inTransaction(db, async (tx) => {
        for (const [sortOrder, id] of ids.entries()) {
          await tx.update(c).set({ sortOrder }).where(eq(c.id, id)).run();
        }
      });
    },
  };
}

export type CategoriesRepo = ReturnType<typeof createCategoriesRepo>;
