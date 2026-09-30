import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { createRepositories } from './repositories';
import * as schema from './schema';

export const DATABASE_NAME = 'budgie.db';

// In sviluppo il fast refresh può rieseguire questo modulo: riusa la connessione
// già aperta invece di aprirne una seconda (che troverebbe il DB occupato).
const globalForDb = globalThis as { __budgieDb?: SQLiteDatabase };

// enableChangeListener serve alle live query per aggiornarsi da sole
export const expoDb = (globalForDb.__budgieDb ??= (() => {
  const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  db.execSync('PRAGMA foreign_keys = ON;');
  return db;
})());

export const db = drizzle(expoDb, { schema });
export const repos = createRepositories(db);
