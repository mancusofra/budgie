import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Database Drizzle "sync" con lo schema dell'app. In app è ExpoSQLiteDatabase,
 * nei test better-sqlite3: i repository accettano entrambi.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;
