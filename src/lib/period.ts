import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type Locale,
} from 'date-fns';

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'all';

export type Period = { kind: PeriodKind; anchor: Date };

export type PeriodOptions = {
  /** 0 = domenica, 1 = lunedì */
  weekStartsOn?: 0 | 1;
};

/** Intervallo semiaperto [from, to). Per "all" entrambi undefined. */
export type PeriodRange = { from?: Date; to?: Date };

export function periodRange({ kind, anchor }: Period, opts: PeriodOptions = {}): PeriodRange {
  const weekStartsOn = opts.weekStartsOn ?? 1;
  switch (kind) {
    case 'day': {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = startOfWeek(anchor, { weekStartsOn });
      return { from, to: addWeeks(from, 1) };
    }
    case 'month': {
      const from = startOfMonth(anchor);
      return { from, to: addMonths(from, 1) };
    }
    case 'year': {
      const from = startOfYear(anchor);
      return { from, to: addYears(from, 1) };
    }
    case 'all':
      return {};
  }
}

export function shiftPeriod(period: Period, direction: -1 | 1): Period {
  const { kind, anchor } = period;
  const shift = { day: addDays, week: addWeeks, month: addMonths, year: addYears, all: null }[kind];
  return shift ? { kind, anchor: shift(anchor, direction) } : period;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Etichetta del periodo: "Settembre 2026", "22 – 28 set", "Lun 28 settembre"… */
export function formatPeriod(
  period: Period,
  {
    locale,
    now = new Date(),
    allLabel = 'All',
    ...opts
  }: PeriodOptions & { locale?: Locale; now?: Date; allLabel?: string } = {},
): string {
  const { from, to } = periodRange(period, opts);
  const f = (d: Date, pattern: string) => format(d, pattern, { locale });

  switch (period.kind) {
    case 'day':
      return capitalize(f(from!, isSameYear(from!, now) ? 'EEE d MMMM' : 'EEE d MMMM yyyy'));
    case 'week': {
      const last = addDays(to!, -1);
      const sameMonth = from!.getMonth() === last.getMonth();
      const end = f(last, isSameYear(last, now) ? 'd MMM' : 'd MMM yyyy');
      return `${f(from!, sameMonth ? 'd' : 'd MMM')} – ${end}`;
    }
    case 'month':
      return capitalize(f(from!, 'LLLL yyyy'));
    case 'year':
      return f(from!, 'yyyy');
    case 'all':
      return allLabel;
  }
}
