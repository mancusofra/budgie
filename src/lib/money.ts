/**
 * Gli importi sono sempre interi in unità minori (es. centesimi), mai float.
 * Queste funzioni convertono da/verso la rappresentazione per l'utente.
 */

const decimalsCache = new Map<string, number>();

/** Numero di decimali della valuta (EUR → 2, JPY → 0). */
export function currencyDecimals(currency: string): number {
  let decimals = decimalsCache.get(currency);
  if (decimals === undefined) {
    decimals =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    decimalsCache.set(currency, decimals);
  }
  return decimals;
}

/**
 * Converte un importo digitato dall'utente in unità minori.
 * Accetta sia "," che "." come separatore decimale. Restituisce null se non valido.
 *
 * parseAmount('12,5', 'EUR') → 1250
 */
export function parseAmount(input: string, currency = 'EUR'): number | null {
  const decimals = currencyDecimals(currency);
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(normalized);
  if (!match || (!match[2] && !match[3])) return null;

  const [, sign, intPart = '', fracPart = ''] = match;
  if (fracPart.length > decimals) return null;

  const minor =
    Number(intPart || '0') * 10 ** decimals + Number(fracPart.padEnd(decimals, '0') || '0');
  return sign ? -minor : minor;
}

/** Converte unità minori in numero decimale (solo per visualizzazione, mai per calcoli). */
export function fromMinor(minor: number, currency = 'EUR'): number {
  return minor / 10 ** currencyDecimals(currency);
}

/** Formatta un importo in unità minori secondo la locale: formatMoney(123456, 'EUR', 'it-IT') → "1.234,56 €". */
export function formatMoney(minor: number, currency = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    fromMinor(minor, currency),
  );
}
