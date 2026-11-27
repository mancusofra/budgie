import { drizzle } from 'drizzle-orm/expo-sqlite';
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy';
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { notifyTableChanged } from './live-query';
import { createRepositories } from './repositories';
import * as schema from './schema';
import type { AppDatabase } from './types';

export const DATABASE_NAME = 'budgie.db';

const isWeb = Platform.OS === 'web';

// In development fast refresh may re-run this module: reuse the connection
// already open instead of opening a second one (which would find the DB busy).
const globalForDb = globalThis as { __budgieDb?: SQLiteDatabase };

/**
 * Web: records the startup step for the diagnostics shown when the app
 * doesn't start (see scripts/web-postbuild.js). No-op elsewhere.
 */
export function bootStep(step: string) {
  if (isWeb && typeof window !== 'undefined') {
    const w = window as unknown as { __budgieBoot?: string };
    // Once started, later renders don't move it back
    if (w.__budgieBoot !== 'ready') w.__budgieBoot = step;
  }
}

// --- iOS / Android: synchronous connection --------------------------------

function nativeConnection(): SQLiteDatabase {
  // enableChangeListener lets live queries update by themselves
  return (globalForDb.__budgieDb ??= (() => {
    const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
    db.execSync('PRAGMA foreign_keys = ON;');
    return db;
  })());
}

/** Native connection, opened on first use (not on import). */
export const expoDb = new Proxy({} as SQLiteDatabase, {
  get(_, prop) {
    const db = nativeConnection();
    const value = Reflect.get(db, prop, db);
    return typeof value === 'function' ? value.bind(db) : value;
  },
});

// --- Web: asynchronous connection ------------------------------------------
//
// Safari can't complete a synchronous write from the page (it waits forever),
// so on the web every query goes through expo-sqlite's async API, with
// Drizzle's async "sqlite-proxy" driver. The change listener is off too: the
// writes notify the live queries themselves.

function webConnection(): SQLiteDatabase {
  const db = globalForDb.__budgieDb;
  if (!db) throw new Error('Database not ready: prepareDatabase() must run first');
  return db;
}

/** Table written by an INSERT / UPDATE / DELETE / REPLACE statement, if any. */
export function writtenTable(sql: string): string | null {
  const match =
    /^\s*(?:insert(?:\s+or\s+\w+)?\s+into|replace\s+into|update(?:\s+or\s+\w+)?|delete\s+from)\s+["`[]?(\w+)/i.exec(
      sql,
    );
  return match ? match[1] : null;
}

/** Runs one statement for Drizzle's async driver: rows as arrays of values. */
async function webQuery(
  sql: string,
  params: unknown[],
  method: 'run' | 'all' | 'values' | 'get',
): Promise<{ rows: unknown[] }> {
  const statement = await webConnection().prepareAsync(sql);
  try {
    const result = await statement.executeForRawResultAsync(params as never);
    const rows = method === 'run' ? [] : await result.getAllAsync();
    const table = writtenTable(sql);
    if (table) notifyTableChanged(table);
    // "get" wants the single row itself (undefined when there is none)
    return { rows: method === 'get' ? (rows[0] as unknown[]) : rows };
  } finally {
    await statement.finalizeAsync();
  }
}

/**
 * Resolves when the database can be used. Immediate on iOS/Android; on the
 * web it opens the async connection (after the SQLite worker has loaded).
 */
export async function prepareDatabase(): Promise<void> {
  bootStep('prepare');
  if (!isWeb) {
    nativeConnection();
    return;
  }
  if (globalForDb.__budgieDb) return;
  if (waitingForIsolation()) {
    bootStep('waiting for the isolation reload');
    // The page is about to reload with the headers SQLite needs (scripts/web-postbuild.js)
    await new Promise(() => {});
  }
  if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
    // A fixed version may be waiting in the service worker: the app can't start
    // anyway, so activate it now instead of waiting for "Update"
    bootStep('not isolated: activating the new service worker');
    await activateWaitingWorker();
    // Without isolation there is no SharedArrayBuffer: say why instead of a cryptic error
    throw new WebIsolationError();
  }
  bootStep(`opening ${DATABASE_NAME}`);
  const db = await openWithRetry();
  await db.execAsync('PRAGMA foreign_keys = ON;');
  globalForDb.__budgieDb = db;
  // Release the file when the page goes away (reload, update, closing the tab):
  // otherwise the next page finds it locked for a while, Safari above all
  window.addEventListener('pagehide', () => {
    globalForDb.__budgieDb = undefined;
    db.closeAsync().catch(() => {});
  });
  // A page restored from the back/forward cache has the database closed: reload it
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
}

/**
 * Web: the file may still be locked for a moment by the previous page (a
 * reload just happened): retry a few times before giving up.
 */
async function openWithRetry(attempts = 12, delayMs = 500): Promise<SQLiteDatabase> {
  for (let i = 1; ; i++) {
    try {
      bootStep(`opening ${DATABASE_NAME} (attempt ${i})`);
      return await openDatabaseAsync(DATABASE_NAME);
    } catch (error) {
      if (i >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/** Activates a waiting service worker and reloads the page; resolves if there is none. */
async function activateWaitingWorker(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration();
  const waiting = registration?.waiting;
  if (!waiting || sessionStorage.getItem('budgie-sw-forced')) return;
  sessionStorage.setItem('budgie-sw-forced', '1');
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  waiting.postMessage('SKIP_WAITING');
  await new Promise(() => {}); // the page reloads
}

/** The browser didn't isolate the page (old browser, private mode…): no database. */
export class WebIsolationError extends Error {
  name = 'WebIsolationError';
  constructor() {
    super('Cross-origin isolation unavailable: SharedArrayBuffer is missing');
  }
}

/**
 * Web: SQLite needs cross-origin isolation. Without it, the service worker
 * is about to reload the page once (only if it hasn't already tried).
 */
function waitingForIsolation(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.crossOriginIsolated &&
    'serviceWorker' in navigator &&
    !sessionStorage.getItem('budgie-coi-reload')
  );
}

/**
 * The app's Drizzle database. The code is written for the synchronous driver
 * type; on the web the async driver is used instead, which works because
 * every query is awaited and transactions go through inTransaction().
 */
export const db: AppDatabase = isWeb
  ? (drizzleProxy(webQuery, { schema }) as unknown as AppDatabase)
  : drizzle(expoDb, { schema });
export const repos = createRepositories(db);
