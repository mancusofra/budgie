import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { applyLanguage } from '@/i18n';

import { useSettings } from './hooks';

/** Applica all'app le preferenze salvate: tema e lingua. */
export function SettingsSync() {
  const { theme = 'system', language = 'system' } = useSettings();

  useEffect(() => {
    // 'unspecified' = segui il sistema
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return null;
}
