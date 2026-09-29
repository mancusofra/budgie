import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { FloatingTabBarHeight, Spacing } from '@/theme';

/**
 * Spazio occupato in basso dalla tab bar che fluttua sopra il contenuto
 * (iOS 26, Liquid Glass). 0 dove la barra non si sovrappone (Android).
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return FloatingTabBarHeight > 0 ? insets.bottom + FloatingTabBarHeight : 0;
}

type Props = {
  children: ReactNode;
  /**
   * La schermata scorre: il contenuto arriva fino al bordo e passa sotto la
   * tab bar di vetro. La lista deve aggiungere `useTabBarSpace()` in fondo.
   * Altrimenti (schermata fissa) si lascia spazio perché la barra non copra nulla.
   */
  scrolls?: boolean;
};

export function Screen({ children, scrolls = false }: Props) {
  const theme = useTheme();
  const tabBarSpace = useTabBarSpace();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingBottom: scrolls ? 0 : Spacing.three + tabBarSpace,
        },
      ]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three },
});
