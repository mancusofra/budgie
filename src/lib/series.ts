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

/** Oltre questo numero di giorni un intervallo personalizzato si mostra per mese. */
const MAX_DAILY_BARS = 62;

/**
 * Intervallo e granularità del grafico per il periodo selezionato:
 * - giorno: gli ultimi 7 giorni fino a quello scelto (una barra sola direbbe poco)
 * - settimana, mese, intervallo: un giorno per barra (mese per intervalli lunghi)
 * - anno: un mese per barra
 * - sempre: un mese per barra dalla prima transazione a oggi
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

/** Tutti i bucket dell'intervallo [from, to), con i totali (0 dove non ci sono movimenti). */
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

/** Variazione percentuale rispetto al valore precedente; null se non confrontabile. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
