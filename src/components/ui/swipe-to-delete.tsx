import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';
import { AnimationMs } from '@/theme';

/** Frazione della larghezza oltre la quale il rilascio elimina. */
const THRESHOLD = 0.5;
/** Uno scatto veloce elimina anche da più corto (ma almeno da qui). */
const FLING_MIN = 0.25;
const FLING_VELOCITY = 900;

const hapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/**
 * Swipe completo a sinistra per eliminare, come in Mail: la riga segue il dito,
 * oltre metà larghezza una leggera vibrazione segnala che al rilascio verrà
 * eliminata; allora esce dallo schermo, si chiude in altezza e chiama onDelete
 * (l'annullamento è a carico del chiamante). Sotto la soglia torna al suo posto.
 */
export function SwipeToDelete({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  /** Altezza della riga misurata; durante la chiusura quella animata. */
  const measured = useSharedValue(0);
  const height = useSharedValue<number | null>(null);
  const armed = useSharedValue(false);
  const removing = useSharedValue(false);

  const pan = Gesture.Pan()
    // Solo movimenti orizzontali verso sinistra: lo scroll verticale resta alla lista
    .activeOffsetX(-12)
    .failOffsetX(12)
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (removing.get()) return;
      const next = Math.min(0, e.translationX);
      x.set(next);
      const over = -next > width.get() * THRESHOLD;
      if (over !== armed.get()) {
        armed.set(over);
        scheduleOnRN(hapticLight);
      }
    })
    .onEnd((e) => {
      if (removing.get()) return;
      const w = width.get();
      const fling = e.velocityX < -FLING_VELOCITY && -x.get() > w * FLING_MIN;
      if (armed.get() || fling) {
        removing.set(true);
        x.set(
          withTiming(-w, { duration: AnimationMs }, () => {
            // Poi la riga si chiude, e solo alla fine viene davvero eliminata
            height.set(measured.get());
            height.set(withTiming(0, { duration: AnimationMs }, () => scheduleOnRN(onDelete)));
          }),
        );
      } else {
        x.set(withTiming(0, { duration: AnimationMs }));
      }
      armed.set(false);
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const containerStyle = useAnimatedStyle(() => {
    const h = height.get();
    return h === null ? {} : { height: h, overflow: 'hidden' };
  });
  const iconStyle = useAnimatedStyle(() => {
    const w = width.get() || 1;
    const progress = Math.min(1, -x.get() / (w * THRESHOLD));
    return {
      opacity: interpolate(progress, [0, 0.3, 1], [0, 1, 1]),
      transform: [{ scale: withTiming(-x.get() > w * THRESHOLD ? 1.25 : 1, { duration: 150 }) }],
    };
  });

  return (
    <Animated.View
      style={containerStyle}
      onLayout={(e) => {
        if (removing.get()) return;
        width.set(e.nativeEvent.layout.width);
        // Altezza di partenza per l'animazione di chiusura
        measured.set(e.nativeEvent.layout.height);
      }}>
      <View style={[StyleSheet.absoluteFill, styles.behind, { backgroundColor: theme.expense }]}>
        <Animated.View style={iconStyle}>
          <MaterialCommunityIcons name="delete-outline" size={24} color="#FFFFFF" />
        </Animated.View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  behind: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 28 },
});
