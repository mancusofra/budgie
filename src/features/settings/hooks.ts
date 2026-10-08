import { refreshLiveQueries, useLiveQuery } from '@/db/live-query';
import { getLocales } from 'expo-localization';
import { useCallback, useMemo } from 'react';

import { db, repos } from '@/db/client';
import { parseSettings, type SettingsMap } from '@/db/repositories';
import { resetDatabase } from '@/db/seed';

export function useSettings(): Partial<SettingsMap> {
  return useSettingsState().settings;
}

/** Settings plus `loaded`: useful to initialize forms with the saved values. */
export function useSettingsState() {
  const { data, updatedAt } = useLiveQuery(repos.settings.rows());
  const settings = useMemo(() => parseSettings(data ?? []), [data]);
  return { settings, loaded: !!updatedAt };
}

export function useCurrency(): string {
  return useSettings().currency ?? 'EUR';
}

/** Deletes all data and recreates the defaults (development only). */
export function useResetDatabase() {
  return useCallback(() => {
    const locale = getLocales()[0];
    return resetDatabase(db, {
      language: locale?.languageCode ?? 'en',
      currency: locale?.currencyCode ?? 'EUR',
    }).then(refreshLiveQueries);
  }, []);
}

export function useSetSetting() {
  return useCallback(
    <K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) => repos.settings.set(key, value),
    [],
  );
}
