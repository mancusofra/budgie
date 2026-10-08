import {
  countFrom,
  dueOccurrences,
  nextOccurrence,
  occurrenceDate,
  type Recurrence,
} from '@/lib/recurrence';

const base = (over: Partial<Recurrence> = {}): Recurrence => ({
  frequency: 'month',
  interval: 1,
  startDate: new Date(2026, 0, 31, 9),
  endDate: null,
  count: 0,
  ...over,
});

describe('occurrenceDate', () => {
  it('monthly from the 31st: end of February and then the 31st again', () => {
    const r = base();
    expect([0, 1, 2, 3].map((n) => occurrenceDate(r, n).toDateString())).toEqual([
      new Date(2026, 0, 31).toDateString(),
      new Date(2026, 1, 28).toDateString(),
      new Date(2026, 2, 31).toDateString(),
      new Date(2026, 3, 30).toDateString(),
    ]);
  });

  it('respects frequency and interval', () => {
    const start = new Date(2026, 0, 1);
    expect(occurrenceDate({ frequency: 'week', interval: 2, startDate: start }, 1)).toEqual(
      new Date(2026, 0, 15),
    );
    expect(occurrenceDate({ frequency: 'day', interval: 1, startDate: start }, 10)).toEqual(
      new Date(2026, 0, 11),
    );
    expect(occurrenceDate({ frequency: 'year', interval: 1, startDate: start }, 2)).toEqual(
      new Date(2028, 0, 1),
    );
    // Invalid interval: counts as 1
    expect(occurrenceDate({ frequency: 'month', interval: 0, startDate: start }, 1)).toEqual(
      new Date(2026, 1, 1),
    );
  });
});

describe('dueOccurrences', () => {
  it('returns the due occurrences not logged yet', () => {
    const r = base({ count: 1 });
    const due = dueOccurrences(r, new Date(2026, 3, 30, 12));
    expect(due.map((d) => d.getDate())).toEqual([28, 31, 30]);
  });

  it('the due day counts at any time of day', () => {
    // Created at 9: opening the app at 7 on the same day it is already due
    expect(dueOccurrences(base(), new Date(2026, 0, 31, 7))).toHaveLength(1);
  });

  it('a first occurrence in the future is not due yet', () => {
    expect(dueOccurrences(base(), new Date(2026, 0, 30))).toEqual([]);
  });

  it('stops at the end date (inclusive) and at the requested maximum', () => {
    const r = base({ endDate: new Date(2026, 2, 31) });
    expect(dueOccurrences(r, new Date(2027, 0, 1))).toHaveLength(3);
    expect(dueOccurrences(base({ frequency: 'day' }), new Date(2030, 0, 1), 50)).toHaveLength(50);
  });
});

describe('nextOccurrence', () => {
  it('next date or null if ended', () => {
    expect(nextOccurrence(base({ count: 2 }))).toEqual(new Date(2026, 2, 31, 9));
    expect(nextOccurrence(base({ count: 3, endDate: new Date(2026, 2, 31) }))).toBeNull();
  });
});

describe('countFrom', () => {
  it('skips occurrences before the given day', () => {
    const r = base({ startDate: new Date(2026, 0, 5), count: 1 });
    expect(countFrom(r, new Date(2026, 4, 5, 18))).toBe(4); // 5 maggio compreso
    expect(countFrom(r, new Date(2026, 4, 6))).toBe(5);
    expect(countFrom(r, new Date(2025, 0, 1))).toBe(1); // mai indietro
  });
});
