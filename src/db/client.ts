import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { createRepositories } from './repositories';
import * as schema from './schema';

export const DATABASE_NAME = 'budgie.db';

// In development fast refresh may re-run this module: reuse the connection
// already open instead of opening a second one (which would find the DB busy).
const globalForDb = globalThis as { __budgieDb?: SQLiteDatabase };

/**
 * Web: records the startup step for the diagnostics shown when the app
 * doesn't start (see scripts/web-postbuild.js). No-op elsewhere.
 */
export function bootStep(step: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as unknown as { __budgieBoot?: string };
    // Once started, later renders don't move it back
    if (w.__budgieBoot !== 'ready') w.__budgieBoot = step;
  }
}

function connection(): SQLiteDatabase {
  // enableChangeListener lets live queries update by themselves
  return (globalForDb.__budgieDb ??= (() => {
    const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
    db.execSync('PRAGMA foreign_keys = ON;');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Release the file when the page goes away (reload, update, closing the tab):
      // otherwise the next page finds it locked for a while, Safari above all
      window.addEventListener('pagehide', () => {
        try {
          db.closeSync();
        } catch {
          // already closed
        }
        globalForDb.__budgieDb = undefined;
      });
      // A page restored from the back/forward cache has the database closed: reload it
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) window.location.reload();
      });
    }
    return db;
  })());
}

/**
 * The connection is opened on first use, not on import: on the web SQLite
 * runs in a worker that must finish loading first (see prepareDatabase).
 */
export const expoDb = new Proxy({} as SQLiteDatabase, {
  get(_, prop) {
    const db = connection();
    const value = Reflect.get(db, prop, db);
    return typeof value === 'function' ? value.bind(db) : value;
  },
});

/**
 * Resolves when the database can be used. Immediate on iOS/Android; on the
 * web it waits for the SQLite worker (WebAssembly) to load.
 */
export async function prepareDatabase(): Promise<void> {
  bootStep('prepare');
  if (Platform.OS === 'web' && !globalForDb.__budgieDb && waitingForIsolation()) {
    bootStep('waiting for the isolation reload');
    // The page is about to reload with the headers SQLite needs (scripts/web-postbuild.js)
    await new Promise(() => {});
  }
  if (Platform.OS === 'web' && !globalForDb.__budgieDb) {
    if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
      // A fixed version may be waiting in the service worker: the app can't start
      // anyway, so activate it now instead of waiting for "Update"
      bootStep('not isolated: activating the new service worker');
      await activateWaitingWorker();
      // Without isolation there is no SharedArrayBuffer: say why instead of a cryptic error
      throw new WebIsolationError();
    }
    // Wait for the SQLite worker with an in-memory database, closed right away:
    // opening the real file twice fails on Safari (one access handle per file)
    bootStep('loading the SQLite worker');
    const warmUp = await openDatabaseAsync(':memory:');
    bootStep('closing the in-memory database');
    // Never wait more than 3 s for it: it's only a warm-up
    await Promise.race([warmUp.closeAsync(), new Promise((r) => setTimeout(r, 3000))]);
    await openWithRetry();
    await probeWeb();
    return;
  }
  connection();
}

/**
 * Web: small read/write checks before the app uses the database, each one
 * recorded as a startup step: if Safari hangs, the diagnostics panel shows
 * which kind of access is stuck (sync read, async write, sync write).
 */
async function probeWeb() {
  const db = connection();
  bootStep('probe: sync read');
  db.getFirstSync('SELECT 1');
  bootStep('probe: async write');
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS __budgie_probe (x INTEGER); INSERT INTO __budgie_probe VALUES (1);',
  );
  bootStep('probe: sync write');
  db.execSync('DELETE FROM __budgie_probe;');
  bootStep('probe: sync transaction');
  db.withTransactionSync(() => db.execSync('INSERT INTO __budgie_probe VALUES (2);'));
  db.execSync('DROP TABLE __budgie_probe;');
}

/**
 * Web: the file may still be locked for a moment by the previous page (a
 * reload just happened): retry a few times before giving up.
 */
async function openWithRetry(attempts = 12, delayMs = 500): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      bootStep(`opening ${DATABASE_NAME} (attempt ${i})`);
      connection();
      return;
    } catch (error) {
      globalForDb.__budgieDb = undefined;
      if (i >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
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

export const db = drizzle(expoDb, { schema });
export const repos = createRepositories(db);
