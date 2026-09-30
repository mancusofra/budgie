import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useSnackbar } from '@/store/snackbar';
import { AnimationMs, FloatingTabBarHeight, Radius, Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

/** Mostra il messaggio corrente dello store snackbar, sopra la tab bar. */
export function SnackbarHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const current = useSnackbar((s) => s.current);
  const hide = useSnackbar((s) => s.hide);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => hide(current.id), current.duration);
    return () => clearTimeout(timer);
  }, [current, hide]);

  // Il contenitore resta montato: così l'uscita del messaggio può dissolversi
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + Math.max(FloatingTabBarHeight, 64) + Spacing.three },
      ]}>
      {current && (
        <Animated.View
          key={current.id}
          entering={FadeIn.duration(AnimationMs)}
          exiting={FadeOut.duration(AnimationMs * 2)}>
          <Surface style={[styles.bar, { borderColor: theme.border }]}>
            <Text style={styles.message} numberOfLines={2}>
              {current.message}
            </Text>
            {current.actionLabel && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  current.onAction?.();
                  hide(current.id);
                }}>
                <Text style={[styles.action, { color: theme.primary }]}>{current.actionLabel}</Text>
              </Pressable>
            )}
          </Surface>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: Spacing.three, right: Spacing.three },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius + 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: { flex: 1 },
  action: { fontWeight: '600' },
});
