import { getTableName, is, type Table } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * SQLite notifications arrive one per row: a restore or a bulk insert
 * produces thousands of them. They are collected here and each query re-runs
 * once when the burst is over (or every MAX_WAIT_MS if it keeps going).
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
 * Re-runs every live query. Needed after a DELETE without WHERE (reset,
 * restore): SQLite runs it with the "truncate optimization", which doesn't notify.
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
    // The query is recreated on every render: it re-runs only when deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, updatedAt, error };
}

/**
 * Replacement for Drizzle's useLiveQuery (same signature): updates when the
 * FROM table changes, with batched notifications.
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
 * Like useLiveQuery, but re-runs when any of the given tables changes
 * (Drizzle only listens to the FROM table, so it ignores joins and
 * subqueries: e.g. account balances or category names).
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
