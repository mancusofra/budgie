import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { repos } from '@/db/client';
import { parseSettings, type SettingsMap } from '@/db/repositories';

export function useSettings(): Partial<SettingsMap> {
  const { data } = useLiveQuery(repos.settings.rows());
  return useMemo(() => parseSettings(data ?? []), [data]);
}

export function useCurrency(): string {
  return useSettings().currency ?? 'EUR';
}
