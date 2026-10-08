import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { createRepositories } from './repositories';
import * as schema from './schema';

export const DATABASE_NAME = 'budgie.db';

// In development fast refresh may re-run this module: reuse the connection
// already open instead of opening a second one (which would find the DB busy).
const globalForDb = globalThis as { __budgieDb?: SQLiteDatabase };

// enableChangeListener lets live queries update by themselves
export const expoDb = (globalForDb.__budgieDb ??= (() => {
  const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  db.execSync('PRAGMA foreign_keys = ON;');
  return db;
})());

export const db = drizzle(expoDb, { schema });
export const repos = createRepositories(db);
