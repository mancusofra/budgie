export type AccountScope = { accountId?: string; accountIds?: string[] };

export type ResolvedScope = {
  scope: AccountScope;
  /** Valuta in cui mostrare gli importi. */
  currency: string;
  /** "Tutti i conti" ma alcuni esclusi perché in un'altra valuta. */
  partial: boolean;
};

/**
 * Conti da includere nei totali. Un conto selezionato: solo quello, nella sua
 * valuta. "Tutti i conti": se hanno tutti la stessa valuta nessun filtro,
 * altrimenti solo quelli nella valuta principale (gli importi in valute
 * diverse non si sommano senza un tasso di cambio).
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

/** Chiave stabile per le dipendenze delle query. */
export const scopeKey = (scope: AccountScope) =>
  scope.accountId ?? (scope.accountIds ? scope.accountIds.join(',') : 'all');
