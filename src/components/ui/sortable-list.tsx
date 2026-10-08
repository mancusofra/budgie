import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';

type Positions = Record<string, number>;

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  rowHeight: number;
  renderItem: (item: T) => ReactNode;
  /** New order of the keys when dragging ends. */
  onReorder: (keys: string[]) => void;
  handleLabel: string;
};

const toPositions = (keys: string[]): Positions => Object.fromEntries(keys.map((k, i) => [k, i]));

/**
 * List reordered by dragging the handle on the right of each row.
 * Fixed-height rows, animated with Reanimated.
 */
export function SortableList<T>({
  data,
  keyExtractor,
  rowHeight,
  renderItem,
  onReorder,
  handleLabel,
}: Props<T>) {
  const keys = data.map(keyExtractor);
  const positions = useSharedValue<Positions>(toPositions(keys));
  const keysSignature = keys.join('|');

  useEffect(() => {
    positions.set(toPositions(keysSignature ? keysSignature.split('|') : []));
  }, [keysSignature, positions]);

  const finish = (pos: Positions) => {
    onReorder(Object.keys(pos).sort((a, b) => pos[a] - pos[b]));
  };

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item) => {
        const key = keyExtractor(item);
        return (
          <SortableRow
            key={key}
            id={key}
            count={data.length}
            rowHeight={rowHeight}
            positions={positions}
            onDrop={finish}
            handleLabel={handleLabel}>
            {renderItem(item)}
          </SortableRow>
        );
      })}
    </View>
  );
}

function SortableRow({
  id,
  count,
  rowHeight,
  positions,
  onDrop,
  handleLabel,
  children,
}: {
  id: string;
  count: number;
  rowHeight: number;
  positions: SharedValue<Positions>;
  onDrop: (pos: Positions) => void;
  handleLabel: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const activeBackground = theme.surface;
  const active = useSharedValue(false);
  const top = useSharedValue(0); // impostato a inizio trascinamento
  const startTop = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    const target = (positions.get()[id] ?? 0) * rowHeight;
    return {
      // No animation: the row follows the finger, the others move right away
      top: active.get() ? top.get() : target,
      zIndex: active.get() ? 10 : 0,
      // Transparent at rest (shows the card), solid while being dragged
      backgroundColor: active.get() ? activeBackground : 'transparent',
    };
  });

  const pan = Gesture.Pan()
    .onStart(() => {
      active.set(true);
      startTop.set((positions.get()[id] ?? 0) * rowHeight);
      top.set(startTop.get());
      scheduleOnRN(Haptics.selectionAsync);
    })
    .onUpdate((e) => {
      top.set(startTop.get() + e.translationY);
      const next = Math.min(Math.max(Math.round(top.get() / rowHeight), 0), count - 1);
      const current = positions.get()[id];
      if (next !== current) {
        // Swap with the row in the new position
        const updated = { ...positions.get() };
        for (const key in updated) {
          if (updated[key] === next) updated[key] = current;
        }
        updated[id] = next;
        positions.set(updated);
        scheduleOnRN(Haptics.selectionAsync);
      }
    })
    .onFinalize(() => {
      if (!active.get()) return;
      active.set(false);
      scheduleOnRN(onDrop, positions.get());
    });

  return (
    <Animated.View style={[styles.row, { height: rowHeight, shadowColor: '#000' }, style]}>
      <View style={styles.content}>{children}</View>
      <GestureDetector gesture={pan}>
        <View style={styles.handle} accessibilityLabel={handleLabel} hitSlop={8}>
          <MaterialCommunityIcons
            name="drag-horizontal-variant"
            size={22}
            color={theme.textSecondary}
          />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: { flex: 1 },
  handle: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' },
});
