import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { repos } from '@/db/client';
import { useLiveQueryOn } from '@/db/live-query';
import { accounts, transactions } from '@/db/schema';
import type { Account } from '@/db/schema';

export function useAccounts(): Account[] {
  const { data } = useLiveQuery(repos.accounts.list());
  return data ?? [];
}

/** Conti con saldo corrente; si aggiorna anche quando cambiano le transazioni. */
export function useAccountsWithBalance({
  includeArchived = false,
}: { includeArchived?: boolean } = {}) {
  const { data } = useLiveQueryOn(
    repos.accounts.listWithBalance({ includeArchived }),
    [accounts, transactions],
    [includeArchived],
  );
  return data ?? [];
}

/** undefined = in caricamento, null = non trovato. */
export function useAccount(id: string | undefined): Account | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.accounts.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const accountActions = {
  create: repos.accounts.create,
  update: repos.accounts.update,
  remove: (id: string) => repos.accounts.remove(id),
  setArchived: repos.accounts.setArchived,
  reorder: repos.accounts.reorder,
  transactionCount: (id: string) => repos.accounts.transactionCount(id),
};
