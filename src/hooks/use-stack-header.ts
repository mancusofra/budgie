import { useTheme } from './use-theme';

/** Opzioni dell'header nativo per le schermate di gestione (sobrio, senza ombra). */
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
