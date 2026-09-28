import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { createRepositories } from '@/db/repositories';
import * as schema from '@/db/schema';

/** DB SQLite in memoria con le stesse migrazioni dell'app. */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../src/db/migrations') });
  return { db, repos: createRepositories(db), close: () => sqlite.close() };
}
