import { it as itLocale } from 'date-fns/locale';

import { customPeriod, formatPeriod, periodRange, shiftPeriod, type Period } from '@/lib/period';

const anchor = new Date(2026, 8, 28, 15, 30); // Monday 28 September 2026

describe('periodRange', () => {
  it('computes half-open ranges', () => {
    expect(periodRange({ kind: 'day', anchor })).toEqual({
      from: new Date(2026, 8, 28),
      to: new Date(2026, 8, 29),
    });
    expect(periodRange({ kind: 'week', anchor })).toEqual({
      from: new Date(2026, 8, 28),
      to: new Date(2026, 9, 5),
    });
    expect(periodRange({ kind: 'week', anchor }, { weekStartsOn: 0 }).from).toEqual(
      new Date(2026, 8, 27),
    );
    expect(periodRange({ kind: 'month', anchor })).toEqual({
      from: new Date(2026, 8, 1),
      to: new Date(2026, 9, 1),
    });
    expect(periodRange({ kind: 'year', anchor })).toEqual({
      from: new Date(2026, 0, 1),
      to: new Date(2027, 0, 1),
    });
    expect(periodRange({ kind: 'all', anchor })).toEqual({});
  });
});

describe('shiftPeriod', () => {
  it('moves forward and backward', () => {
    expect(shiftPeriod({ kind: 'month', anchor: new Date(2026, 0, 31) }, 1).anchor).toEqual(
      new Date(2026, 1, 28),
    );
    expect(shiftPeriod({ kind: 'day', anchor }, -1).anchor).toEqual(new Date(2026, 8, 27, 15, 30));
    const all: Period = { kind: 'all', anchor };
    expect(shiftPeriod(all, 1)).toBe(all);
  });
});

describe('formatPeriod', () => {
  const opts = { locale: itLocale, now: anchor, allLabel: 'Sempre' };
  it('formats in Italian', () => {
    expect(formatPeriod({ kind: 'month', anchor }, opts)).toBe('Settembre 2026');
    expect(formatPeriod({ kind: 'day', anchor }, opts)).toBe('Lun 28 settembre');
    expect(formatPeriod({ kind: 'week', anchor }, opts)).toBe('28 set – 4 ott');
    expect(formatPeriod({ kind: 'week', anchor: new Date(2026, 8, 16) }, opts)).toBe('14 – 20 set');
    expect(formatPeriod({ kind: 'year', anchor }, opts)).toBe('2026');
    expect(formatPeriod({ kind: 'all', anchor }, opts)).toBe('Sempre');
    expect(formatPeriod({ kind: 'day', anchor: new Date(2025, 0, 2) }, opts)).toBe(
      'Gio 2 gennaio 2025',
    );
  });
});

describe('month start day', () => {
  it('the "month" runs from the chosen day to the day before in the next month', () => {
    const opts = { monthStartDay: 27 };
    expect(periodRange({ kind: 'month', anchor: new Date(2026, 8, 28) }, opts)).toEqual({
      from: new Date(2026, 8, 27),
      to: new Date(2026, 9, 27),
    });
    // before the 27th you are still in the "month" that started in August
    expect(periodRange({ kind: 'month', anchor: new Date(2026, 8, 10) }, opts).from).toEqual(
      new Date(2026, 7, 27),
    );
    // in January the previous month is December of the year before
    expect(periodRange({ kind: 'month', anchor: new Date(2026, 0, 5) }, opts).from).toEqual(
      new Date(2025, 11, 27),
    );
  });

  it('shows the range as the label', () => {
    expect(
      formatPeriod(
        { kind: 'month', anchor: new Date(2026, 8, 10) },
        { locale: itLocale, now: anchor, monthStartDay: 27 },
      ),
    ).toBe('27 ago – 26 set');
  });
});

describe('custom period', () => {
  it('includes both days and accepts dates in reverse order', () => {
    const p = customPeriod(new Date(2026, 8, 15, 18), new Date(2026, 8, 1, 9));
    expect(periodRange(p)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 8, 16) });
    expect(formatPeriod(p, { locale: itLocale, now: anchor })).toBe('1 – 15 set');
  });

  it('shifts by a range of the same length', () => {
    const next = shiftPeriod(customPeriod(new Date(2026, 8, 1), new Date(2026, 8, 15)), 1);
    expect(periodRange(next)).toEqual({ from: new Date(2026, 8, 16), to: new Date(2026, 9, 1) });
  });

  it('shows the year if different from the current one', () => {
    const p = customPeriod(new Date(2025, 11, 28), new Date(2026, 0, 3));
    expect(formatPeriod(p, { locale: itLocale, now: anchor })).toBe('28 dic 2025 – 3 gen 2026');
  });
});
