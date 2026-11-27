import { sql } from 'drizzle-orm';

import type { AppDatabase } from './types';

/** Database passed to the body of a transaction (the same connection). */
export type Tx = AppDatabase;

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs `work` in a transaction, with either Drizzle driver: the synchronous
 * one (iOS/Android, tests) and the asynchronous one (web: Safari can't run
 * synchronous writes). Every query inside must be awaited. Transactions are
 * queued, one at a time on the single connection, so two calls never mix
 * (e.g. the seed run twice by effects in development).
 */
export function inTransaction<T>(db: AppDatabase, work: (tx: Tx) => Promise<T>): Promise<T> {
  const run = async () => {
    await db.run(sql`BEGIN`);
    try {
      const result = await work(db);
      await db.run(sql`COMMIT`);
      return result;
    } catch (error) {
      await db.run(sql`ROLLBACK`);
      throw error;
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
