import { useColorScheme } from 'react-native';

import { Colors } from '@/theme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
