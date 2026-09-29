import { getTableName, is, type Table } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Le notifiche di SQLite arrivano una per riga: un ripristino o un inserimento
 * in blocco ne genera migliaia. Le raccogliamo qui e rieseguiamo ogni query
 * una volta sola a raffica finita (o ogni MAX_WAIT_MS se la raffica continua).
 */
const QUIET_MS = 50;
const MAX_WAIT_MS = 500;

type Subscriber = { tables: Set<string>; run: () => void };

const subscribers = new Set<Subscriber>();
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let firstPendingAt = 0;
let nativeListener: { remove: () => void } | undefined;

function flush() {
  clearTimeout(timer);
  timer = undefined;
  const changed = new Set(pending);
  pending.clear();
  for (const s of subscribers) {
    for (const table of s.tables) {
      if (changed.has(table)) {
        s.run();
        break;
      }
    }
  }
}

function onChange(tableName: string) {
  if (pending.size === 0) firstPendingAt = Date.now();
  pending.add(tableName);
  clearTimeout(timer);
  if (Date.now() - firstPendingAt >= MAX_WAIT_MS) flush();
  else timer = setTimeout(flush, QUIET_MS);
}

function subscribe(subscriber: Subscriber) {
  subscribers.add(subscriber);
  nativeListener ??= addDatabaseChangeListener(({ tableName }) => onChange(tableName));
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      nativeListener?.remove();
      nativeListener = undefined;
    }
  };
}

/**
 * Riesegue tutte le live query. Serve dopo un DELETE senza WHERE (azzeramento,
 * ripristino): SQLite lo esegue con la "truncate optimization", che non notifica.
 */
export function refreshLiveQueries() {
  clearTimeout(timer);
  timer = undefined;
  pending.clear();
  for (const s of subscribers) s.run();
}

type LiveResult<T> = { data: T; updatedAt: Date | undefined; error: unknown };

function useLive<T>(
  query: PromiseLike<T>,
  tableNames: string[],
  initial: T,
  deps: unknown[],
): LiveResult<T> {
  const [data, setData] = useState<T>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    const run = () =>
      query.then(
        (result) => {
          if (cancelled) return;
          setData(result);
          setUpdatedAt(new Date());
        },
        (e) => !cancelled && setError(e),
      );
    run();
    const unsubscribe = subscribe({ tables: new Set(tableNames), run });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // La query viene ricreata a ogni render: si riesegue solo quando cambiano le deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, updatedAt, error };
}

/**
 * Sostituto di useLiveQuery di Drizzle (stessa firma): si aggiorna quando
 * cambia la tabella del FROM, con le notifiche raggruppate.
 */
export function useLiveQuery<T extends PromiseLike<unknown>>(
  query: T,
  deps: unknown[] = [],
): LiveResult<Awaited<T>> {
  const table = (query as { config?: { table?: unknown } }).config?.table;
  const names = is(table, SQLiteTable) ? [getTableName(table)] : [];
  return useLive(query as PromiseLike<Awaited<T>>, names, [] as Awaited<T>, deps);
}

/**
 * Come useLiveQuery, ma si riesegue quando cambia una qualsiasi delle tabelle
 * indicate (Drizzle ascolta solo la tabella del FROM, quindi ignora join e
 * subquery: es. saldi dei conti o nomi di categoria).
 */
export function useLiveQueryOn<T>(
  query: PromiseLike<T>,
  tables: Table[],
  deps: unknown[] = [],
): { data: T | undefined; updatedAt: Date | undefined; error: unknown } {
  return useLive<T | undefined>(
    query,
    tables.map((t) => getTableName(t)),
    undefined,
    deps,
  );
}
