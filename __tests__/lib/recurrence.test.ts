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
  it('ogni mese dal 31: fine febbraio e poi di nuovo il 31', () => {
    const r = base();
    expect([0, 1, 2, 3].map((n) => occurrenceDate(r, n).toDateString())).toEqual([
      new Date(2026, 0, 31).toDateString(),
      new Date(2026, 1, 28).toDateString(),
      new Date(2026, 2, 31).toDateString(),
      new Date(2026, 3, 30).toDateString(),
    ]);
  });

  it('rispetta frequenza e intervallo', () => {
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
    // Intervallo non valido: vale come 1
    expect(occurrenceDate({ frequency: 'month', interval: 0, startDate: start }, 1)).toEqual(
      new Date(2026, 1, 1),
    );
  });
});

describe('dueOccurrences', () => {
  it('restituisce le occorrenze scadute non ancora registrate', () => {
    const r = base({ count: 1 });
    const due = dueOccurrences(r, new Date(2026, 3, 30, 12));
    expect(due.map((d) => d.getDate())).toEqual([28, 31, 30]);
  });

  it('una prima occorrenza futura non è ancora scaduta', () => {
    expect(dueOccurrences(base(), new Date(2026, 0, 30))).toEqual([]);
  });

  it('si ferma alla data di fine (giorno compreso) e al massimo richiesto', () => {
    const r = base({ endDate: new Date(2026, 2, 31) });
    expect(dueOccurrences(r, new Date(2027, 0, 1))).toHaveLength(3);
    expect(dueOccurrences(base({ frequency: 'day' }), new Date(2030, 0, 1), 50)).toHaveLength(50);
  });
});

describe('nextOccurrence', () => {
  it('prossima data o null se finita', () => {
    expect(nextOccurrence(base({ count: 2 }))).toEqual(new Date(2026, 2, 31, 9));
    expect(nextOccurrence(base({ count: 3, endDate: new Date(2026, 2, 31) }))).toBeNull();
  });
});

describe('countFrom', () => {
  it('salta le occorrenze prima del giorno indicato', () => {
    const r = base({ startDate: new Date(2026, 0, 5), count: 1 });
    expect(countFrom(r, new Date(2026, 4, 5, 18))).toBe(4); // 5 maggio compreso
    expect(countFrom(r, new Date(2026, 4, 6))).toBe(5);
    expect(countFrom(r, new Date(2025, 0, 1))).toBe(1); // mai indietro
  });
});
