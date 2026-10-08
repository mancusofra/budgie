import { addDays, addMonths, addWeeks, addYears, endOfDay, startOfDay } from 'date-fns';

export type Frequency = 'day' | 'week' | 'month' | 'year';

export type Recurrence = {
  frequency: Frequency;
  interval: number;
  startDate: Date;
  endDate: Date | null;
  /** Occurrences already logged. */
  count: number;
};

const ADD = { day: addDays, week: addWeeks, month: addMonths, year: addYears } as const;

/**
 * Date of occurrence n (0 = the first), always computed from the start: with
 * date-fns "monthly from the 31st" lands on Feb 28/29 and back on Mar 31.
 */
export function occurrenceDate(
  r: Pick<Recurrence, 'frequency' | 'interval' | 'startDate'>,
  n: number,
) {
  return ADD[r.frequency](r.startDate, n * Math.max(1, r.interval));
}

/** Next occurrence to log, or null if the rule has ended. */
export function nextOccurrence(r: Recurrence): Date | null {
  const next = occurrenceDate(r, r.count);
  return r.endDate && next > endOfDay(r.endDate) ? null : next;
}

/**
 * Due occurrences (up to the day of `now`, inclusive) not logged yet, at most
 * `max` at a time (guards against start dates far in the past).
 */
export function dueOccurrences(r: Recurrence, now: Date, max = 500): Date[] {
  // Compare days, not times: rent due on the 1st is logged when the app is opened on the 1st
  // at any time, even earlier than the time of day the rule was created
  const today = endOfDay(now);
  const due: Date[] = [];
  for (let n = r.count; due.length < max; n++) {
    const date = occurrenceDate(r, n);
    if (date > today || (r.endDate && date > endOfDay(r.endDate))) break;
    due.push(date);
  }
  return due;
}

/**
 * Index of the first occurrence falling on `from` (inclusive) or later: when
 * resuming after a pause, skipped occurrences are not caught up.
 */
export function countFrom(r: Recurrence, from: Date): number {
  const day = startOfDay(from);
  let n = r.count;
  while (occurrenceDate(r, n) < day) n++;
  return n;
}
