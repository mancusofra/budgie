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
 * CSV delle transazioni: una riga per movimento, importo con segno (spese
 * negative) nel formato decimale indicato. Separatore ";" se il decimale è ",".
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
