export type AccountScope = { accountId?: string; accountIds?: string[] };

export type ResolvedScope = {
  scope: AccountScope;
  /** Currency the amounts are shown in. */
  currency: string;
  /** "All accounts" but some excluded because they use another currency. */
  partial: boolean;
};

/**
 * Accounts to include in totals. A selected account: only that one, in its
 * currency. "All accounts": no filter if they all share a currency,
 * otherwise only those in the main currency (amounts in different
 * currencies can't be added up without an exchange rate).
 */
export function resolveAccountScope(
  accountFilter: string,
  accounts: { id: string; currency: string }[],
  mainCurrency: string,
): ResolvedScope {
  if (accountFilter !== 'all') {
    const account = accounts.find((a) => a.id === accountFilter);
    if (account)
      return { scope: { accountId: account.id }, currency: account.currency, partial: false };
  }
  const same = accounts.filter((a) => a.currency === mainCurrency);
  if (same.length === accounts.length) {
    return { scope: {}, currency: mainCurrency, partial: false };
  }
  return { scope: { accountIds: same.map((a) => a.id) }, currency: mainCurrency, partial: true };
}

/** Stable key for query dependencies. */
export const scopeKey = (scope: AccountScope) =>
  scope.accountId ?? (scope.accountIds ? scope.accountIds.join(',') : 'all');
