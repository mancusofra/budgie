import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutRight,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { AnimationMs } from '@/theme';

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
    <Animated.View
      entering={FadeIn.duration(AnimationMs)}
      exiting={FadeOut.duration(AnimationMs)}
      style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <Animated.View
        entering={FadeInDown.duration(AnimationMs)}
        style={[styles.dialog, { backgroundColor: theme.background }]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Narrow web screens: the native transitions the browser doesn't have. Sheets
 * and modals slide up from the bottom, pages come in from the right.
 */
export function WebTransition({ kind, children }: { kind: 'sheet' | 'page'; children: ReactNode }) {
  const sheet = kind === 'sheet';
  return (
    <Animated.View
      entering={(sheet ? SlideInDown : SlideInRight).duration(AnimationMs)}
      exiting={(sheet ? SlideOutDown : SlideOutRight).duration(AnimationMs)}
      style={styles.fill}>
      {children}
    </Animated.View>
  );
}

/** Full-screen pages (categories, accounts…) on a wide screen: centered, limited width. */
export function WebPage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(AnimationMs)}
      style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={styles.pageContent}>{children}</View>
    </Animated.View>
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
  fill: { flex: 1 },
  pageContent: { flex: 1, width: '100%', maxWidth: 720 },
});
