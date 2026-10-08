import { format } from 'date-fns';

import { toCsv } from '@/lib/csv';
import { currencyDecimals } from '@/lib/money';

export type CsvTransaction = {
  transaction: {
    date: Date;
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    note: string | null;
  };
  category: { name: string } | null;
  account: { name: string; currency: string };
  toAccount: { name: string } | null;
};

type Labels = {
  headers: [string, string, string, string, string, string, string, string];
  types: Record<'expense' | 'income' | 'transfer', string>;
};

/**
 * Transactions CSV: one row per transaction, signed amount (expenses
 * negative) in the given decimal format. Separator ";" if the decimal is ",".
 */
export function transactionsCsv(
  rows: CsvTransaction[],
  labels: Labels,
  decimalSeparator = '.',
): string {
  const separator = decimalSeparator === ',' ? ';' : ',';
  const amount = (minor: number, currency: string) => {
    const decimals = currencyDecimals(currency);
    const text = (Math.abs(minor) / 10 ** decimals).toFixed(decimals);
    return `${minor < 0 ? '-' : ''}${text.replace('.', decimalSeparator)}`;
  };
  const lines = rows.map(({ transaction: tx, category, account, toAccount }) => [
    format(tx.date, 'yyyy-MM-dd'),
    labels.types[tx.type],
    category?.name ?? '',
    account.name,
    toAccount?.name ?? '',
    amount(tx.type === 'expense' ? -tx.amount : tx.amount, account.currency),
    account.currency,
    tx.note ?? '',
  ]);
  return toCsv([labels.headers, ...lines], separator);
}

/**
 * Transactions JSON (for other apps or spreadsheets): fixed English keys,
 * signed decimal amount as in the CSV, date 'YYYY-MM-DD'.
 */
export function transactionsJson(rows: CsvTransaction[]): string {
  const items = rows.map(({ transaction: tx, category, account, toAccount }) => {
    const decimals = currencyDecimals(account.currency);
    const amount = tx.amount / 10 ** decimals;
    return {
      date: format(tx.date, 'yyyy-MM-dd'),
      type: tx.type,
      category: category?.name ?? null,
      account: account.name,
      toAccount: toAccount?.name ?? null,
      amount: tx.type === 'expense' ? -amount : amount,
      currency: account.currency,
      note: tx.note,
    };
  });
  return JSON.stringify(items, null, 2);
}
