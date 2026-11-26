import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { createRepositories } from './repositories';
import * as schema from './schema';

export const DATABASE_NAME = 'budgie.db';

// In development fast refresh may re-run this module: reuse the connection
// already open instead of opening a second one (which would find the DB busy).
const globalForDb = globalThis as { __budgieDb?: SQLiteDatabase };

function connection(): SQLiteDatabase {
  // enableChangeListener lets live queries update by themselves
  return (globalForDb.__budgieDb ??= (() => {
    const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
    db.execSync('PRAGMA foreign_keys = ON;');
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
  if (Platform.OS === 'web' && !globalForDb.__budgieDb && waitingForIsolation()) {
    // The page is about to reload with the headers SQLite needs (see +html.tsx)
    await new Promise(() => {});
  }
  if (Platform.OS === 'web' && !globalForDb.__budgieDb) {
    await openDatabaseAsync(DATABASE_NAME);
  }
  connection();
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

export const db = drizzle(expoDb, { schema });
export const repos = createRepositories(db);
