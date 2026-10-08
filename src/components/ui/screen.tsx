import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { FloatingTabBarHeight, Spacing } from '@/theme';

/**
 * Space taken at the bottom by the tab bar floating over the content
 * (iOS 26, Liquid Glass). 0 where the bar doesn't overlap (Android).
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return FloatingTabBarHeight > 0 ? insets.bottom + FloatingTabBarHeight : 0;
}

type Props = {
  children: ReactNode;
  /**
   * The screen scrolls: content reaches the edge and goes under the
   * glass tab bar. The list must add `useTabBarSpace()` at the bottom.
   * Otherwise (fixed screen) space is left so the bar doesn't cover anything.
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
