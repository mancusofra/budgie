import { startOfDay } from 'date-fns';

export type DaySection<T> = {
  /** Start-of-day timestamp (stable key). */
  key: string;
  day: Date;
  /** Sum of the day's signed values (income − expenses). */
  total: number;
  data: T[];
};

/**
 * Groups items already sorted by date (newest first) into sections per
 * local day, with each day's total.
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
