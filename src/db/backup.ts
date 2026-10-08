import {
  accounts,
  budgetMonths,
  budgets,
  categories,
  recurring,
  settings,
  transactions,
} from './schema';
import type { AppDatabase } from './types';

export const BACKUP_FORMAT = 'budgie-backup';
/** Backups made when the app was called Moneta: same content, still restorable. */
const LEGACY_BACKUP_FORMATS = ['moneta-backup'];
/** 2: recurring rules added (version 1 backups are restored without them). */
export const BACKUP_VERSION = 2;

/** Tables in insertion order (respects foreign keys). */
const TABLES = {
  accounts,
  categories,
  recurring,
  transactions,
  budgets,
  budgetMonths,
  settings,
} as const;

type TableName = keyof typeof TABLES;
type Row = Record<string, unknown>;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  data: Record<TableName, Row[]>;
};

export class InvalidBackupError extends Error {
  name = 'InvalidBackupError';
}

/** Timestamp columns: milliseconds in the file, Date objects in the DB. */
const DATE_KEYS = new Set(['createdAt', 'updatedAt', 'date', 'startDate', 'endDate']);

const toPlain = (row: Row): Row =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.getTime() : v]));

const fromPlain = (row: Row): Row =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      DATE_KEYS.has(k) && typeof v === 'number' ? new Date(v) : v,
    ]),
  );

/** All the app data, ready for JSON.stringify. */
export async function createBackup(db: AppDatabase, now = new Date()): Promise<Backup> {
  const data = {} as Record<TableName, Row[]>;
  for (const [name, table] of Object.entries(TABLES) as [TableName, (typeof TABLES)[TableName]][]) {
    const rows = (await db.select().from(table)) as Row[];
    data[name] = rows.map(toPlain);
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.getTime(), data };
}

/** Reads and validates a backup file. */
export function parseBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidBackupError('The file is not valid JSON');
  }
  const b = parsed as Partial<Backup>;
  if (b?.format !== BACKUP_FORMAT && !LEGACY_BACKUP_FORMATS.includes(String(b?.format)))
    throw new InvalidBackupError('Not a Budgie backup');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new InvalidBackupError('Backup created by a newer version of the app');
  }
  // Sections added after version 1: missing from older backups
  if (b.data && b.version < 2) b.data.recurring ??= [];
  for (const name of Object.keys(TABLES) as TableName[]) {
    if (!Array.isArray(b.data?.[name])) throw new InvalidBackupError(`Missing section: ${name}`);
  }
  return b as Backup;
}

const CHUNK = 100;

/** Replaces ALL data with the backup's, in a single transaction. */
export function restoreBackup(db: AppDatabase, backup: Backup) {
  const names = Object.keys(TABLES) as TableName[];
  db.transaction((tx) => {
    // Delete in reverse order (referencing tables first)
    for (const name of [...names].reverse()) tx.delete(TABLES[name]).run();
    for (const name of names) {
      const rows = backup.data[name].map(fromPlain);
      for (let i = 0; i < rows.length; i += CHUNK) {
        tx.insert(TABLES[name])
          .values(rows.slice(i, i + CHUNK) as any)
          .run();
      }
    }
  });
}
