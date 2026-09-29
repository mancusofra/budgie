import type { TFunction } from 'i18next';

import { repos } from '@/db/client';
import { useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import { accounts, categories, recurring, type Frequency, type Recurring } from '@/db/schema';

/** Ricorrenze con categoria e conto; si aggiorna anche per nomi e colori. */
export function useRecurringList() {
  const { data } = useLiveQueryOn(repos.recurring.listDetailed(), [
    recurring,
    categories,
    accounts,
  ]);
  return data ?? [];
}

/** undefined = in caricamento, null = non trovata. */
export function useRecurring(id: string | undefined): Recurring | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.recurring.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const recurringActions = {
  create: repos.recurring.create,
  update: repos.recurring.update,
  remove: (id: string) => repos.recurring.remove(id),
  materialize: (now?: Date) => repos.recurring.materialize(now),
};

/** Scelte offerte nell'app (frequenza + intervallo). */
export const REPEAT_OPTIONS: { frequency: Frequency; interval: number }[] = [
  { frequency: 'week', interval: 1 },
  { frequency: 'week', interval: 2 },
  { frequency: 'month', interval: 1 },
  { frequency: 'year', interval: 1 },
];

/** "Ogni mese", "Ogni 2 settimane"… */
export function repeatLabel(t: TFunction, frequency: Frequency, interval = 1) {
  return t(`recurring.every.${frequency}`, { count: interval });
}
