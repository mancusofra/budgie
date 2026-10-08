import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AnimationMs } from '@/theme';

export type StackItem = { key: string; node: ReactNode };

type Heights = Record<string, number>;

type Props = {
  items: StackItem[];
  gap: number;
  /** ScrollView containing the stack (for auto-scrolling). */
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollY: SharedValue<number>;
  /** Bands (screen coordinates) near the edges where the page scrolls by itself. */
  autoScrollEdges: { top: number; bottom: number };
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** New order of the keys when dragging ends. */
  onReorder: (keys: string[]) => void;
  /**
   * true (e.g. already editing): a short press (0.1 s) is enough to
   * drag. false: a long press (0.3 s) is required, so normal page
   * scrolling doesn't move the cards by mistake.
   */
  dragImmediately?: boolean;
};

const LONG_PRESS_MS = 300;
/** While editing a very short press is enough before dragging. */
const QUICK_PRESS_MS = 100;
const AUTO_SCROLL_SPEED = 10;

/** Top of an item in the given order, adding up the previous heights. */
function topOf(key: string, order: string[], heights: Heights, gap: number) {
  'worklet';
  let y = 0;
  for (const k of order) {
    if (k === key) return y;
    y += (heights[k] ?? 0) + gap;
  }
  return y;
}

/**
 * Vertical stack of cards of different heights, reordered by dragging them
 * directly (long press, then up and down), like the iOS home screen.
 */
export function ReorderableStack({
  items,
  gap,
  scrollRef,
  scrollY,
  autoScrollEdges,
  onDragStart,
  onDragEnd,
  onReorder,
  dragImmediately = false,
}: Props) {
  const keys = items.map((i) => i.key);
  const signature = keys.join('|');
  const order = useSharedValue<string[]>(keys);
  const heights = useSharedValue<Heights>({});
  const [ready, setReady] = useState(false);

  // Same items in another order (e.g. the saved order arriving after the
  // first render): the props order wins. Items added or removed: keeps
  // the current order and appends the new ones at the end
  useEffect(() => {
    const next = signature ? signature.split('|') : [];
    const prev = order.get();
    if (prev.length === next.length && next.every((k) => prev.includes(k))) {
      order.set(next);
      return;
    }
    const current = prev.filter((k) => next.includes(k));
    order.set([...current, ...next.filter((k) => !current.includes(k))]);
  }, [signature, order]);

  const containerStyle = useAnimatedStyle(() => {
    const h = heights.get();
    const ks = order.get();
    const total = ks.reduce((sum, k) => sum + (h[k] ?? 0), 0) + gap * Math.max(ks.length - 1, 0);
    return { height: total };
  });

  // Source of truth for heights on the JS thread: several onLayout calls in
  // the same frame would make heights.get() read a stale value
  const measured = useRef<Heights>({});
  const onMeasure = (key: string, e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (measured.current[key] === h) return;
    measured.current = { ...measured.current, [key]: h };
    heights.set(measured.current);
    if (!ready) setReady(true);
  };

  return (
    <Animated.View style={[containerStyle, { opacity: ready ? 1 : 0, overflow: 'visible' }]}>
      {items.map((item) => (
        <Row
          key={item.key}
          id={item.key}
          order={order}
          heights={heights}
          gap={gap}
          scrollRef={scrollRef}
          scrollY={scrollY}
          edges={autoScrollEdges}
          onMeasure={onMeasure}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onReorder={onReorder}
          dragImmediately={dragImmediately}>
          {item.node}
        </Row>
      ))}
    </Animated.View>
  );
}

function Row({
  id,
  order,
  heights,
  gap,
  scrollRef,
  scrollY,
  edges,
  onMeasure,
  onDragStart,
  onDragEnd,
  onReorder,
  dragImmediately,
  children,
}: {
  id: string;
  order: SharedValue<string[]>;
  heights: SharedValue<Heights>;
  gap: number;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollY: SharedValue<number>;
  edges: { top: number; bottom: number };
  onMeasure: (key: string, e: LayoutChangeEvent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onReorder: (keys: string[]) => void;
  dragImmediately: boolean;
  children: ReactNode;
}) {
  const active = useSharedValue(false);
  const startTop = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const dragY = useSharedValue(0);
  const autoDir = useSharedValue(0);

  /**
   * Swaps the dragged item with its neighbor when it passes its middle, as
   * on the iOS home screen: going up the top edge counts, going down
   * the bottom one (with tall cards the center would need too much travel).
   */
  const reorder = () => {
    'worklet';
    const h = heights.get();
    const top = startTop.get() + dragY.get() + (scrollY.get() - startScroll.get());
    const bottom = top + (h[id] ?? 0);
    let current = order.get();
    let changed = false;
    for (let guard = 0; guard < current.length; guard++) {
      const i = current.indexOf(id);
      const prev = current[i - 1];
      const next = current[i + 1];
      if (prev !== undefined && top < topOf(prev, current, h, gap) + (h[prev] ?? 0) / 2) {
        current = [...current.slice(0, i - 1), id, prev, ...current.slice(i + 1)];
      } else if (next !== undefined && bottom > topOf(next, current, h, gap) + (h[next] ?? 0) / 2) {
        current = [...current.slice(0, i), next, id, ...current.slice(i + 2)];
      } else {
        break;
      }
      changed = true;
    }
    if (changed) {
      order.set(current);
      scheduleOnRN(Haptics.selectionAsync);
    }
  };

  // Auto-scroll while dragging near the edges
  useFrameCallback(() => {
    if (!active.get() || autoDir.get() === 0) return;
    scrollTo(scrollRef, 0, Math.max(scrollY.get() + autoDir.get() * AUTO_SCROLL_SPEED, 0), false);
    reorder();
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(dragImmediately ? QUICK_PRESS_MS : LONG_PRESS_MS)
    .onStart(() => {
      'worklet';
      active.set(true);
      startTop.set(topOf(id, order.get(), heights.get(), gap));
      startScroll.set(scrollY.get());
      dragY.set(0);
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      if (onDragStart) scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      'worklet';
      dragY.set(e.translationY);
      autoDir.set(e.absoluteY < edges.top ? -1 : e.absoluteY > edges.bottom ? 1 : 0);
      reorder();
    })
    .onFinalize(() => {
      'worklet';
      if (!active.get()) return;
      active.set(false);
      autoDir.set(0);
      scheduleOnRN(onReorder, order.get());
      if (onDragEnd) scheduleOnRN(onDragEnd);
    });

  const style = useAnimatedStyle(() => {
    const target = topOf(id, order.get(), heights.get(), gap);
    return {
      top: active.get()
        ? startTop.get() + dragY.get() + (scrollY.get() - startScroll.get())
        : withTiming(target, { duration: AnimationMs }),
      zIndex: active.get() ? 10 : 0,
    };
  });

  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, right: 0, overflow: 'visible' }, style]}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          style={{ overflow: 'visible' }}
          onLayout={(e) => onMeasure(id, e)}>
          {children}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
