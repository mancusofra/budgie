import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useUIStore } from '@/store/ui';

/**
 * Color scheme in use: the one chosen in Settings, otherwise the system's.
 * On iOS/Android the choice is also applied to the system appearance
 * (SettingsSync); on the web there is no such API, so it's applied here.
 */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const chosen = useUIStore((s) => s.colorScheme);
  return chosen ?? (system === 'dark' ? 'dark' : 'light');
}
