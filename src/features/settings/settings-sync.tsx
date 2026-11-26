import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { applyLanguage } from '@/i18n';
import { useUIStore } from '@/store/ui';

import { useSettings } from './hooks';

/** Applies the saved preferences to the app: theme, language, spending groups. */
export function SettingsSync() {
  const { theme = 'system', language = 'system', groupsEnabled = false } = useSettings();
  const setGroupsEnabled = useUIStore((s) => s.setGroupsEnabled);

  useEffect(() => {
    setGroupsEnabled(groupsEnabled);
  }, [groupsEnabled, setGroupsEnabled]);

  useEffect(() => {
    // 'unspecified' = follow the system
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return null;
}
