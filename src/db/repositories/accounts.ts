import { asc, eq, or, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { accounts, recurring, transactions, type Account } from '../schema';
import { InUseError } from './errors';
import type { AppDatabase } from '../types';

export type NewAccount = Pick<Account, 'name' | 'currency'> &
  Partial<Pick<Account, 'initialBalance' | 'icon' | 'color'>>;
export type AccountPatch = Partial<NewAccount & Pick<Account, 'sortOrder'>>;

/**
 * Balance = initial + income − expenses − outgoing transfers + incoming transfers.
 * Incoming transfers use to_amount when present (different currencies).
 *
 * Hand-written names: Drizzle omits the table prefix in single-table selects,
 * and in the correlated subquery "id" would resolve to transactions.
 */
const balance = sql<number>`"accounts"."initial_balance"
  + coalesce((
      select sum(case when tx."type" = 'income' then tx."amount" else -tx."amount" end)
      from ${transactions} tx where tx."account_id" = "accounts"."id"
    ), 0)
  + coalesce((
      select sum(coalesce(tx."to_amount", tx."amount"))
      from ${transactions} tx where tx."type" = 'transfer' and tx."to_account_id" = "accounts"."id"
    ), 0)`.mapWith(Number);

export function createAccountsRepo(db: AppDatabase) {
  const a = accounts;

  return {
    list({ includeArchived = false }: { includeArchived?: boolean } = {}) {
      return db
        .select()
        .from(a)
        .where(includeArchived ? undefined : eq(a.archived, false))
        .orderBy(asc(a.sortOrder), asc(a.name));
    },

    /** Accounts with their current balance computed from transactions. */
    listWithBalance({ includeArchived = false }: { includeArchived?: boolean } = {}) {
      return db
        .select({ account: a, balance })
        .from(a)
        .where(includeArchived ? undefined : eq(a.archived, false))
        .orderBy(asc(a.sortOrder), asc(a.name));
    },

    getById(id: string) {
      return db.select().from(a).where(eq(a.id, id)).get();
    },

    async create(input: NewAccount): Promise<Account> {
      const last = await db
        .select({ max: sql<number | null>`max(${a.sortOrder})` })
        .from(a)
        .get();
      const row: Account = {
        id: createId(),
        name: input.name.trim(),
        currency: input.currency,
        initialBalance: input.initialBalance ?? 0,
        icon: input.icon ?? null,
        color: input.color ?? null,
        sortOrder: (last?.max ?? -1) + 1,
        archived: false,
        createdAt: new Date(),
      };
      await db.insert(a).values(row);
      return row;
    },

    async update(id: string, patch: AccountPatch): Promise<void> {
      await db
        .update(a)
        .set(patch.name ? { ...patch, name: patch.name.trim() } : patch)
        .where(eq(a.id, id));
    },

    async setArchived(id: string, archived: boolean): Promise<void> {
      await db.update(a).set({ archived }).where(eq(a.id, id));
    },

    /** Query builder (for useLiveQuery): 0 or 1 row. */
    byId(id: string) {
      return db.select().from(a).where(eq(a.id, id)).limit(1);
    },

    /** Number of transactions involving the account (also as destination). */
    async transactionCount(id: string): Promise<number> {
      const row = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(transactions)
        .where(or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)))
        .get();
      return row?.n ?? 0;
    },

    /** Deletes an account with no transactions; otherwise InUseError. */
    async remove(id: string): Promise<void> {
      const count = await this.transactionCount(id);
      if (count > 0) throw new InUseError('The account', count);
      await db.delete(a).where(eq(a.id, id));
    },

    /**
     * Permanently deletes an archived account together with its transactions
     * (including transfers from and to the account) and its recurring rules.
     * Returns how many transactions were deleted.
     */
    purge(id: string): number {
      return db.transaction((tx) => {
        const account = tx.select().from(a).where(eq(a.id, id)).get();
        if (!account) return 0;
        if (!account.archived)
          throw new Error('Only an archived account can be permanently deleted');
        const involves = (t: typeof transactions | typeof recurring) =>
          or(eq(t.accountId, id), eq(t.toAccountId, id));
        // Transactions first: they may reference the account's recurring rules
        const removed = tx
          .delete(transactions)
          .where(involves(transactions))
          .returning({ id: transactions.id })
          .all();
        tx.delete(recurring).where(involves(recurring)).run();
        tx.delete(a).where(eq(a.id, id)).run();
        return removed.length;
      });
    },

    async reorder(ids: string[]): Promise<void> {
      db.transaction((tx) => {
        ids.forEach((id, sortOrder) => tx.update(a).set({ sortOrder }).where(eq(a.id, id)).run());
      });
    },
  };
}

export type AccountsRepo = ReturnType<typeof createAccountsRepo>;
