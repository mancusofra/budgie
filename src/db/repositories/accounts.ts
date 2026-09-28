import { asc, eq, sql } from 'drizzle-orm';

import { createId } from '@/lib/id';

import { accounts, transactions, type Account } from '../schema';
import type { AppDatabase } from '../types';

export type NewAccount = Pick<Account, 'name' | 'currency'> &
  Partial<Pick<Account, 'initialBalance' | 'icon' | 'color'>>;
export type AccountPatch = Partial<NewAccount & Pick<Account, 'sortOrder'>>;

/**
 * Saldo = iniziale + entrate − spese − trasferimenti in uscita + trasferimenti in entrata.
 * I trasferimenti in entrata usano to_amount se presente (valute diverse).
 *
 * Nomi scritti a mano: Drizzle omette il prefisso di tabella nelle select su una sola
 * tabella, e nella subquery correlata "id" verrebbe risolto su transactions.
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

    /** Conti con saldo corrente calcolato dalle transazioni. */
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
  };
}

export type AccountsRepo = ReturnType<typeof createAccountsRepo>;
