import { it as itLocale } from 'date-fns/locale';

import { formatPeriod, periodRange, shiftPeriod, type Period } from '@/lib/period';

const anchor = new Date(2026, 8, 28, 15, 30); // lunedì 28 settembre 2026

describe('periodRange', () => {
  it('calcola intervalli semiaperti', () => {
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
  it('sposta avanti e indietro', () => {
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
  it('formatta in italiano', () => {
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
