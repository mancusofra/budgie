import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { applyLanguage } from '@/i18n';
import { useUIStore } from '@/store/ui';

import { useSettings } from './hooks';

/** Applies the saved preferences to the app: theme, language, spending groups. */
export function SettingsSync() {
  const { theme = 'system', language = 'system', groupsEnabled = false } = useSettings();
  const setGroupsEnabled = useUIStore((s) => s.setGroupsEnabled);
  const setColorScheme = useUIStore((s) => s.setColorScheme);

  useEffect(() => {
    setGroupsEnabled(groupsEnabled);
  }, [groupsEnabled, setGroupsEnabled]);

  useEffect(() => {
    setColorScheme(theme === 'system' ? null : theme);
    // 'unspecified' = follow the system. Not available on the web: useColorScheme applies it
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
    }
  }, [theme, setColorScheme]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return null;
}
