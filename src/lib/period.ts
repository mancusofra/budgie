import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  isSameYear,
  startOfDay,
  startOfWeek,
  startOfYear,
  type Locale,
} from 'date-fns';

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export type Period =
  | { kind: Exclude<PeriodKind, 'custom'>; anchor: Date }
  /** Range chosen by the user: `from` and `to` are inclusive days. */
  | { kind: 'custom'; anchor: Date; from: Date; to: Date };

export type PeriodOptions = {
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn?: 0 | 1;
  /** Day of the month the "month" starts on (1–28), e.g. 27 for people paid on the 27th. */
  monthStartDay?: number;
};

/** Half-open range [from, to). Both undefined for "all". */
export type PeriodRange = { from?: Date; to?: Date };

/** Start of the "month" containing the date, taking the start day into account. */
function startOfCustomMonth(date: Date, startDay: number): Date {
  const day = Math.min(Math.max(Math.round(startDay), 1), 28);
  const monthOffset = date.getDate() >= day ? 0 : -1;
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, day);
}

export function periodRange(period: Period, opts: PeriodOptions = {}): PeriodRange {
  const { anchor } = period;
  switch (period.kind) {
    case 'day': {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = startOfWeek(anchor, { weekStartsOn: opts.weekStartsOn ?? 1 });
      return { from, to: addWeeks(from, 1) };
    }
    case 'month': {
      const from = startOfCustomMonth(anchor, opts.monthStartDay ?? 1);
      return { from, to: addMonths(from, 1) };
    }
    case 'year': {
      const from = startOfYear(anchor);
      return { from, to: addYears(from, 1) };
    }
    case 'custom': {
      const [a, b] = [startOfDay(period.from), startOfDay(period.to)].sort(
        (x, y) => x.getTime() - y.getTime(),
      );
      return { from: a, to: addDays(b, 1) };
    }
    case 'all':
      return {};
  }
}

export function customPeriod(from: Date, to: Date): Period {
  const [a, b] = [startOfDay(from), startOfDay(to)].sort((x, y) => x.getTime() - y.getTime());
  return { kind: 'custom', anchor: a, from: a, to: b };
}

export function shiftPeriod(period: Period, direction: -1 | 1): Period {
  const { anchor } = period;
  switch (period.kind) {
    case 'day':
      return { kind: 'day', anchor: addDays(anchor, direction) };
    case 'week':
      return { kind: 'week', anchor: addWeeks(anchor, direction) };
    case 'month':
      return { kind: 'month', anchor: addMonths(anchor, direction) };
    case 'year':
      return { kind: 'year', anchor: addYears(anchor, direction) };
    case 'custom': {
      // Shift by a range of the same length
      const days = (differenceInCalendarDays(period.to, period.from) + 1) * direction;
      return customPeriod(addDays(period.from, days), addDays(period.to, days));
    }
    case 'all':
      return period;
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type FormatOptions = PeriodOptions & { locale?: Locale; now?: Date; allLabel?: string };

/** "14 – 20 set", "28 set – 4 ott", "28 dic 2025 – 3 gen 2026" */
function formatSpan(first: Date, last: Date, locale: Locale | undefined, now: Date) {
  const f = (d: Date, pattern: string) => format(d, pattern, { locale });
  const sameYearAsNow = isSameYear(first, now) && isSameYear(last, now);
  const sameMonth = first.getMonth() === last.getMonth() && isSameYear(first, last);
  const end = f(last, sameYearAsNow ? 'd MMM' : 'd MMM yyyy');
  if (sameMonth) return `${f(first, 'd')} – ${end}`;
  const start = f(first, sameYearAsNow || isSameYear(first, last) ? 'd MMM' : 'd MMM yyyy');
  return `${start} – ${end}`;
}

/** Period label: "September 2026", "22 – 28 Sep", "Mon 28 September"… */
export function formatPeriod(
  period: Period,
  { locale, now = new Date(), allLabel = 'All', ...opts }: FormatOptions = {},
): string {
  const { from, to } = periodRange(period, opts);
  const f = (d: Date, pattern: string) => format(d, pattern, { locale });

  switch (period.kind) {
    case 'day':
      return capitalize(f(from!, isSameYear(from!, now) ? 'EEE d MMMM' : 'EEE d MMMM yyyy'));
    case 'month':
      // With a start day other than the 1st, the "month" is a range
      if ((opts.monthStartDay ?? 1) !== 1) return formatSpan(from!, addDays(to!, -1), locale, now);
      return capitalize(f(from!, 'LLLL yyyy'));
    case 'year':
      return f(from!, 'yyyy');
    case 'week':
    case 'custom':
      return formatSpan(from!, addDays(to!, -1), locale, now);
    case 'all':
      return allLabel;
  }
}
