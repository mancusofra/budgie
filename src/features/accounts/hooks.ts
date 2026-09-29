import { useMemo } from 'react';

import { repos } from '@/db/client';
import { useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import { accounts, transactions } from '@/db/schema';
import type { Account } from '@/db/schema';
import { useCurrency } from '@/features/settings/hooks';
import { resolveAccountScope, type AccountScope, type ResolvedScope } from '@/lib/account-scope';
import { useUIStore } from '@/store/ui';

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

/**
 * Ambito dei conti per totali e liste, secondo il filtro conto e la valuta
 * principale (vedi resolveAccountScope).
 */
export function useAccountScope(): ResolvedScope & { mainScope: AccountScope } {
  const accountFilter = useUIStore((s) => s.accountFilter);
  const mainCurrency = useCurrency();
  const { data } = useLiveQuery(repos.accounts.list({ includeArchived: true }));
  return useMemo(
    () => ({
      ...resolveAccountScope(accountFilter, data ?? [], mainCurrency),
      // Conti nella valuta principale, indipendentemente dal filtro (es. budget)
      mainScope: resolveAccountScope('all', data ?? [], mainCurrency).scope,
    }),
    [accountFilter, data, mainCurrency],
  );
}
