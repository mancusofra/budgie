import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { FloatingTabBarHeight, Spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /**
   * La schermata è dentro le tab. Su iOS la tab bar nativa fluttua sopra il
   * contenuto: lascia spazio in basso perché non copra nulla.
   */
  inTabs?: boolean;
};

export function Screen({ children, inTabs = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarSpace = inTabs && FloatingTabBarHeight > 0 ? insets.bottom + FloatingTabBarHeight : 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingBottom: Spacing.three + tabBarSpace },
      ]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three },
});
