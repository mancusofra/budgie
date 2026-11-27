import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** From this width the web layout uses a sidebar, dialogs and centered pages. */
export const WIDE_BREAKPOINT = 768;

/** Web on a wide screen (computer, tablet in landscape). */
export function useWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_BREAKPOINT;
}

/** Sheets and modals on a wide screen: a centered window over a dimmed page. */
export function WebDialog({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.dialog, { backgroundColor: theme.background }]}>{children}</View>
    </View>
  );
}

/** Full-screen pages (categories, accounts…) on a wide screen: centered, limited width. */
export function WebPage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={styles.pageContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    height: '100%',
    maxHeight: 760,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  },
  page: { flex: 1, alignItems: 'center' },
  pageContent: { flex: 1, width: '100%', maxWidth: 720 },
});
