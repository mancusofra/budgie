import { useMemo } from 'react';

import { repos } from '@/db/client';
import { refreshLiveQueries, useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import { accounts, transactions } from '@/db/schema';
import type { Account } from '@/db/schema';
import { useCurrency } from '@/features/settings/hooks';
import { resolveAccountScope, type AccountScope, type ResolvedScope } from '@/lib/account-scope';
import { useUIStore } from '@/store/ui';

export function useAccounts(): Account[] {
  const { data } = useLiveQuery(repos.accounts.list());
  return data ?? [];
}

/** Accounts with their current balance; also updates when transactions change. */
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

/** undefined = loading, null = not found. */
export function useAccount(id: string | undefined): Account | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.accounts.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const accountActions = {
  create: repos.accounts.create,
  update: repos.accounts.update,
  remove: (id: string) => repos.accounts.remove(id),
  /** Synchronous transaction: refreshes the screens explicitly (see materialize). */
  purge: (id: string) => {
    const removed = repos.accounts.purge(id);
    refreshLiveQueries();
    return removed;
  },
  setArchived: repos.accounts.setArchived,
  reorder: repos.accounts.reorder,
  transactionCount: (id: string) => repos.accounts.transactionCount(id),
};

/**
 * Account scope for totals and lists, based on the account filter and the
 * main currency (see resolveAccountScope).
 */
export function useAccountScope(): ResolvedScope & { mainScope: AccountScope } {
  const accountFilter = useUIStore((s) => s.accountFilter);
  const mainCurrency = useCurrency();
  const { data } = useLiveQuery(repos.accounts.list({ includeArchived: true }));
  return useMemo(
    () => ({
      ...resolveAccountScope(accountFilter, data ?? [], mainCurrency),
      // Accounts in the main currency, regardless of the filter (e.g. budgets)
      mainScope: resolveAccountScope('all', data ?? [], mainCurrency).scope,
    }),
    [accountFilter, data, mainCurrency],
  );
}
