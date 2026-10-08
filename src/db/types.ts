import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * "Sync" Drizzle database with the app schema. In the app it is ExpoSQLiteDatabase,
 * better-sqlite3 in tests: the repositories accept both.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;
