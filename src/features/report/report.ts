import { format, startOfMonth } from 'date-fns';

import type { TransactionType } from '@/db/schema';

/** A transaction as returned by `transactions.listDetailed()`. */
export type ReportTransaction = {
  transaction: {
    id: string;
    date: Date;
    type: TransactionType;
    amount: number;
    note: string | null;
  };
  category: { name: string; color: string } | null;
  account: { name: string; currency: string };
  toAccount: { name: string } | null;
};

export type Totals = { income: number; expense: number; count: number };

export type CategoryTotal = {
  name: string;
  color: string;
  currency: string;
  total: number;
  /** Share of the expenses in the same currency (0–1). */
  share: number;
};

export type ReportMonth = {
  /** 'YYYY-MM' */
  key: string;
  start: Date;
  /** Oldest first, as in a statement. */
  rows: ReportTransaction[];
  /** Per currency, in order of first appearance. */
  totals: Map<string, Totals>;
};

export type Report = {
  /** Per currency: amounts in different currencies are never added up. */
  totals: Map<string, Totals>;
  /** Expenses by category, highest first within each currency. */
  byCategory: CategoryTotal[];
  months: ReportMonth[];
  count: number;
};

const empty = (): Totals => ({ income: 0, expense: 0, count: 0 });

function add(map: Map<string, Totals>, currency: string, tx: ReportTransaction['transaction']) {
  const totals = map.get(currency) ?? empty();
  totals.count += 1;
  if (tx.type === 'income') totals.income += tx.amount;
  if (tx.type === 'expense') totals.expense += tx.amount;
  map.set(currency, totals);
}

/**
 * Groups transactions into calendar months with totals per currency, plus the
 * totals and the expense breakdown of the whole period. Transfers are listed
 * but, as in the rest of the app, count neither as income nor as expenses.
 */
export function buildReport(rows: ReportTransaction[]): Report {
  const sorted = [...rows].sort((a, b) => +a.transaction.date - +b.transaction.date);
  const totals = new Map<string, Totals>();
  const months = new Map<string, ReportMonth>();
  const categories = new Map<string, CategoryTotal>();

  for (const row of sorted) {
    const { transaction: tx, account } = row;
    add(totals, account.currency, tx);

    const key = format(tx.date, 'yyyy-MM');
    let month = months.get(key);
    if (!month) {
      month = { key, start: startOfMonth(tx.date), rows: [], totals: new Map() };
      months.set(key, month);
    }
    month.rows.push(row);
    add(month.totals, account.currency, tx);

    if (tx.type === 'expense') {
      const name = row.category?.name ?? '—';
      const id = `${account.currency}\u0000${name}`;
      const item = categories.get(id) ?? {
        name,
        color: row.category?.color ?? '#9A9AA1',
        currency: account.currency,
        total: 0,
        share: 0,
      };
      item.total += tx.amount;
      categories.set(id, item);
    }
  }

  const byCategory = [...categories.values()]
    .map((c) => ({ ...c, share: c.total / (totals.get(c.currency)?.expense || 1) }))
    .sort((a, b) => a.currency.localeCompare(b.currency) || b.total - a.total);

  return { totals, byCategory, months: [...months.values()], count: sorted.length };
}
