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

export const BACKUP_FORMAT = 'moneta-backup';
/** 2: aggiunte le ricorrenze (i backup 1 si ripristinano senza). */
export const BACKUP_VERSION = 2;

/** Tabelle nell'ordine di inserimento (rispetta le chiavi esterne). */
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

/** Colonne timestamp: nel file sono millisecondi, nel DB oggetti Date. */
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

/** Tutti i dati dell'app, pronti per JSON.stringify. */
export async function createBackup(db: AppDatabase, now = new Date()): Promise<Backup> {
  const data = {} as Record<TableName, Row[]>;
  for (const [name, table] of Object.entries(TABLES) as [TableName, (typeof TABLES)[TableName]][]) {
    const rows = (await db.select().from(table)) as Row[];
    data[name] = rows.map(toPlain);
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.getTime(), data };
}

/** Legge e valida un file di backup. */
export function parseBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidBackupError('Il file non è un JSON valido');
  }
  const b = parsed as Partial<Backup>;
  if (b?.format !== BACKUP_FORMAT) throw new InvalidBackupError('Non è un backup di Moneta');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new InvalidBackupError('Backup creato da una versione più recente dell’app');
  }
  // Sezioni introdotte dopo la versione 1: assenti nei backup più vecchi
  if (b.data && b.version < 2) b.data.recurring ??= [];
  for (const name of Object.keys(TABLES) as TableName[]) {
    if (!Array.isArray(b.data?.[name])) throw new InvalidBackupError(`Sezione mancante: ${name}`);
  }
  return b as Backup;
}

const CHUNK = 100;

/** Sostituisce TUTTI i dati con quelli del backup, in un'unica transazione. */
export function restoreBackup(db: AppDatabase, backup: Backup) {
  const names = Object.keys(TABLES) as TableName[];
  db.transaction((tx) => {
    // Cancella in ordine inverso (prima chi referenzia)
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
