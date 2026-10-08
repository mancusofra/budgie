import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { applyLanguage } from '@/i18n';

import { useSettings } from './hooks';

/** Applies the saved preferences to the app: theme and language. */
export function SettingsSync() {
  const { theme = 'system', language = 'system' } = useSettings();

  useEffect(() => {
    // 'unspecified' = follow the system
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return null;
}
