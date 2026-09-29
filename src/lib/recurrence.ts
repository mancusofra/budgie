import { addDays, addMonths, addWeeks, addYears, endOfDay, startOfDay } from 'date-fns';

export type Frequency = 'day' | 'week' | 'month' | 'year';

export type Recurrence = {
  frequency: Frequency;
  interval: number;
  startDate: Date;
  endDate: Date | null;
  /** Occorrenze già registrate. */
  count: number;
};

const ADD = { day: addDays, week: addWeeks, month: addMonths, year: addYears } as const;

/**
 * Data dell'occorrenza n (0 = la prima), calcolata sempre dall'inizio: con
 * date-fns un "ogni mese dal 31" cade il 28/29 febbraio e torna al 31 marzo.
 */
export function occurrenceDate(
  r: Pick<Recurrence, 'frequency' | 'interval' | 'startDate'>,
  n: number,
) {
  return ADD[r.frequency](r.startDate, n * Math.max(1, r.interval));
}

/** Prossima occorrenza da registrare, o null se la ricorrenza è finita. */
export function nextOccurrence(r: Recurrence): Date | null {
  const next = occurrenceDate(r, r.count);
  return r.endDate && next > endOfDay(r.endDate) ? null : next;
}

/**
 * Occorrenze scadute (fino a `now` compreso) ancora da registrare, al massimo
 * `max` per volta (protegge da date di inizio molto lontane).
 */
export function dueOccurrences(r: Recurrence, now: Date, max = 500): Date[] {
  const due: Date[] = [];
  for (let n = r.count; due.length < max; n++) {
    const date = occurrenceDate(r, n);
    if (date > now || (r.endDate && date > endOfDay(r.endDate))) break;
    due.push(date);
  }
  return due;
}

/**
 * Indice della prima occorrenza che cade da `from` (giorno compreso) in poi:
 * alla ripresa dopo una pausa le occorrenze saltate non vengono recuperate.
 */
export function countFrom(r: Recurrence, from: Date): number {
  const day = startOfDay(from);
  let n = r.count;
  while (occurrenceDate(r, n) < day) n++;
  return n;
}
