import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { getLocales } from 'expo-localization';
import { useCallback, useMemo } from 'react';

import { db, repos } from '@/db/client';
import { parseSettings, type SettingsMap } from '@/db/repositories';
import { resetDatabase } from '@/db/seed';

export function useSettings(): Partial<SettingsMap> {
  const { data } = useLiveQuery(repos.settings.rows());
  return useMemo(() => parseSettings(data ?? []), [data]);
}

export function useCurrency(): string {
  return useSettings().currency ?? 'EUR';
}

/** Cancella tutti i dati e ricrea quelli di default (solo sviluppo). */
export function useResetDatabase() {
  return useCallback(() => {
    const locale = getLocales()[0];
    return resetDatabase(db, {
      language: locale?.languageCode ?? 'en',
      currency: locale?.currencyCode ?? 'EUR',
    });
  }, []);
}
