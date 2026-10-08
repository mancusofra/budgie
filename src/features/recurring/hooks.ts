import type { TFunction } from 'i18next';

import { repos } from '@/db/client';
import { refreshLiveQueries, useLiveQuery, useLiveQueryOn } from '@/db/live-query';
import { accounts, categories, recurring, type Frequency, type Recurring } from '@/db/schema';

/** Recurring rules with category and account; also updates for names and colors. */
export function useRecurringList() {
  const { data } = useLiveQueryOn(repos.recurring.listDetailed(), [
    recurring,
    categories,
    accounts,
  ]);
  return data ?? [];
}

/** undefined = loading, null = not found. */
export function useRecurring(id: string | undefined): Recurring | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.recurring.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

export const recurringActions = {
  create: repos.recurring.create,
  update: repos.recurring.update,
  remove: (id: string) => repos.recurring.remove(id),
  /**
   * Logs the due occurrences. Writes happen in a single synchronous
   * transaction, which on iOS doesn't always notify live queries:
   * if it created anything it refreshes the open screens explicitly.
   */
  materialize: (now?: Date) => {
    const created = repos.recurring.materialize(now);
    if (created > 0) refreshLiveQueries();
    return created;
  },
};

/** Options offered in the app (frequency + interval). */
export const REPEAT_OPTIONS: { frequency: Frequency; interval: number }[] = [
  { frequency: 'week', interval: 1 },
  { frequency: 'week', interval: 2 },
  { frequency: 'month', interval: 1 },
  { frequency: 'year', interval: 1 },
];

/** "Every month", "Every 2 weeks"… */
export function repeatLabel(t: TFunction, frequency: Frequency, interval = 1) {
  return t(`recurring.every.${frequency}`, { count: interval });
}
