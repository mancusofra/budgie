import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { createRepositories } from './repositories';
import * as schema from './schema';

export const DATABASE_NAME = 'moneta.db';

// enableChangeListener serve a useLiveQuery per aggiornarsi da solo
export const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
export const repos = createRepositories(db);
