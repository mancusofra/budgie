import { eq } from 'drizzle-orm';

import type { StatsLayout } from '@/lib/stats-layout';

import { settings } from '../schema';
import type { AppDatabase } from '../types';

export type SettingsMap = {
  currency: string;
  theme: 'system' | 'light' | 'dark';
  language: 'system' | 'it' | 'en';
  /** 0 = domenica, 1 = lunedì */
  weekStart: 0 | 1;
  /** Giorno del mese da cui parte il "mese" (1–28). */
  monthStartDay: number;
  seedVersion: number;
  /** Blocco dell'app con Face ID / impronta all'apertura. */
  appLock: boolean;
  /** Ordine e sezioni nascoste della schermata Statistiche. */
  statsLayout: StatsLayout;
};

export type SettingKey = keyof SettingsMap;

export function parseSettings(rows: { key: string; value: string }[]): Partial<SettingsMap> {
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export function createSettingsRepo(db: AppDatabase) {
  const s = settings;

  return {
    async get<K extends SettingKey>(key: K): Promise<SettingsMap[K] | undefined> {
      const row = await db.select().from(s).where(eq(s.key, key)).get();
      return row ? (JSON.parse(row.value) as SettingsMap[K]) : undefined;
    },

    async set<K extends SettingKey>(key: K, value: SettingsMap[K]): Promise<void> {
      const json = JSON.stringify(value);
      await db
        .insert(s)
        .values({ key, value: json })
        .onConflictDoUpdate({ target: s.key, set: { value: json } });
    },

    async getAll(): Promise<Partial<SettingsMap>> {
      return parseSettings(await db.select().from(s));
    },

    /** Righe grezze (query builder, per useLiveQuery); convertire con parseSettings. */
    rows() {
      return db.select().from(s);
    },
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
