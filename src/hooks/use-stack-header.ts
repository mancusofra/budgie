import { useTheme } from './use-theme';

/** Native header options for the management screens (plain, no shadow). */
export function useStackHeader(title: string) {
  const theme = useTheme();
  return {
    headerShown: true,
    title,
    headerTintColor: theme.text,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: { backgroundColor: theme.background },
  };
}
