import { startOfDay } from 'date-fns';

export type DaySection<T> = {
  /** Timestamp di inizio giornata (chiave stabile). */
  key: string;
  day: Date;
  /** Somma dei valori con segno del giorno (entrate − spese). */
  total: number;
  data: T[];
};

/**
 * Raggruppa elementi già ordinati per data (dal più recente) in sezioni per
 * giorno locale, con il totale di ciascun giorno.
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => Date,
  getSignedAmount: (item: T) => number,
): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  let current: DaySection<T> | undefined;
  for (const item of items) {
    const day = startOfDay(getDate(item));
    if (!current || current.day.getTime() !== day.getTime()) {
      current = { key: String(day.getTime()), day, total: 0, data: [] };
      sections.push(current);
    }
    current.data.push(item);
    current.total += getSignedAmount(item);
  }
  return sections;
}
