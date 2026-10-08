import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns';

import type { Period, PeriodRange } from './period';

export type Bucket = 'day' | 'month';

export type ChartWindow = { from: Date; to: Date; bucket: Bucket };

/** Above this many days a custom range is shown by month. */
const MAX_DAILY_BARS = 62;

/**
 * Chart range and granularity for the selected period:
 * - day: the last 7 days up to the chosen one (a single bar would say little)
 * - week, month, range: one bar per day (per month for long ranges)
 * - year: one bar per month
 * - all: one bar per month from the first transaction to today
 */
export function chartWindow(
  period: Period,
  range: PeriodRange,
  { firstDate, now = new Date() }: { firstDate?: Date; now?: Date } = {},
): ChartWindow {
  switch (period.kind) {
    case 'day': {
      const to = addDays(startOfDay(period.anchor), 1);
      return { from: addDays(to, -7), to, bucket: 'day' };
    }
    case 'year':
      return { from: range.from!, to: range.to!, bucket: 'month' };
    case 'all': {
      const start = startOfMonth(firstDate ?? now);
      return { from: start, to: addMonths(startOfMonth(now), 1), bucket: 'month' };
    }
    default: {
      const days = differenceInCalendarDays(range.to!, range.from!);
      if (days > MAX_DAILY_BARS) {
        return {
          from: startOfMonth(range.from!),
          to: addMonths(startOfMonth(addDays(range.to!, -1)), 1),
          bucket: 'month',
        };
      }
      return { from: range.from!, to: range.to!, bucket: 'day' };
    }
  }
}

export const bucketKey = (date: Date, bucket: Bucket) =>
  format(date, bucket === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM');

/** All buckets of the range [from, to), with totals (0 where there are no transactions). */
export function fillSeries(
  { from, to, bucket }: ChartWindow,
  rows: { key: string; total: number }[],
): { key: string; date: Date; value: number }[] {
  const totals = new Map(rows.map((r) => [r.key, r.total]));
  const out: { key: string; date: Date; value: number }[] = [];
  const step = bucket === 'day' ? (d: Date) => addDays(d, 1) : (d: Date) => addMonths(d, 1);
  for (let d = bucket === 'day' ? startOfDay(from) : startOfMonth(from); d < to; d = step(d)) {
    const key = bucketKey(d, bucket);
    out.push({ key, date: d, value: totals.get(key) ?? 0 });
  }
  return out;
}

/** Percentage change from the previous value; null if not comparable. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
