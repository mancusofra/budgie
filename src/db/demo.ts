import { createId } from '@/lib/id';

import { accounts, categories, transactions } from './schema';
import type { AppDatabase } from './types';

/**
 * Genera `count` transazioni realistiche negli ultimi `days` giorni sui conti e
 * le categorie attivi (solo per sviluppo, QA e test di prestazioni).
 */
export async function generateDemoTransactions(
  db: AppDatabase,
  { count = 10_000, days = 1095, now = new Date() } = {},
) {
  const accountIds = (await db.select({ id: accounts.id }).from(accounts)).map((a) => a.id);
  const cats = await db.select({ id: categories.id, type: categories.type }).from(categories);
  const expense = cats.filter((c) => c.type === 'expense');
  const income = cats.filter((c) => c.type === 'income');
  if (accountIds.length === 0 || expense.length === 0) return 0;

  const rows = Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getTime() - ((i * 7919) % days) * 86_400_000 - (i % 86_400) * 1000);
    const isIncome = income.length > 0 && i % 20 === 0;
    const list = isIncome ? income : expense;
    return {
      id: createId(),
      type: isIncome ? ('income' as const) : ('expense' as const),
      amount: isIncome ? 50_000 + (i % 200_000) : 100 + ((i * 37) % 8000),
      accountId: accountIds[i % accountIds.length],
      categoryId: list[(i * 13) % list.length].id,
      date,
      note: i % 7 === 0 ? `Demo ${i}` : null,
      createdAt: date,
      updatedAt: date,
    };
  });

  // A blocchi (SQLite limita i parametri per istruzione), in un'unica transazione
  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 100) {
      tx.insert(transactions)
        .values(rows.slice(i, i + 100))
        .run();
    }
  });
  return rows.length;
}
