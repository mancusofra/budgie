/**
 * Amounts are always integers in minor units (e.g. cents), never floats.
 * These functions convert to and from the representation shown to the user.
 */

const decimalsCache = new Map<string, number>();

/** Number of decimals of the currency (EUR → 2, JPY → 0). */
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
 * Converts an amount typed by the user into minor units.
 * Accepts both "," and "." as decimal separator. Returns null if invalid.
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

/** Converts minor units to a decimal number (for display only, never for calculations). */
export function fromMinor(minor: number, currency = 'EUR'): number {
  return minor / 10 ** currencyDecimals(currency);
}

/** Formats an amount in minor units for the locale: formatMoney(123456, 'EUR', 'it-IT') → "1.234,56 €". */
export function formatMoney(minor: number, currency = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    fromMinor(minor, currency),
  );
}
