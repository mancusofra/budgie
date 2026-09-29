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
  /** ScrollView che contiene la pila (per lo scorrimento automatico). */
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollY: SharedValue<number>;
  /** Fasce (coordinate schermo) vicino ai bordi in cui la pagina scorre da sola. */
  autoScrollEdges: { top: number; bottom: number };
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Nuovo ordine delle chiavi a fine trascinamento. */
  onReorder: (keys: string[]) => void;
};

const LONG_PRESS_MS = 300;
const AUTO_SCROLL_SPEED = 10;

/** Top di un elemento nell'ordine dato, sommando le altezze precedenti. */
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
 * Pila verticale di riquadri di altezza diversa, riordinabile trascinandoli
 * direttamente (tocco lungo, poi su e giù), stile schermata Home di iOS.
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
}: Props) {
  const keys = items.map((i) => i.key);
  const signature = keys.join('|');
  const order = useSharedValue<string[]>(keys);
  const heights = useSharedValue<Heights>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    order.set(signature ? signature.split('|') : []);
  }, [signature, order]);

  const containerStyle = useAnimatedStyle(() => {
    const h = heights.get();
    const ks = order.get();
    const total = ks.reduce((sum, k) => sum + (h[k] ?? 0), 0) + gap * Math.max(ks.length - 1, 0);
    return { height: total };
  });

  // Fonte di verità delle altezze sul thread JS: più onLayout nello stesso
  // frame farebbero leggere a heights.get() un valore non ancora aggiornato
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
          onReorder={onReorder}>
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
  children: ReactNode;
}) {
  const active = useSharedValue(false);
  const startTop = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const dragY = useSharedValue(0);
  const autoDir = useSharedValue(0);

  /**
   * Scambia l'elemento trascinato con il vicino quando lo supera a metà, come
   * sulla schermata Home di iOS: salendo conta il bordo superiore, scendendo
   * quello inferiore (con riquadri alti il centro richiederebbe troppa strada).
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

  // Scorrimento automatico mentre si trascina vicino ai bordi
  useFrameCallback(() => {
    if (!active.get() || autoDir.get() === 0) return;
    scrollTo(scrollRef, 0, Math.max(scrollY.get() + autoDir.get() * AUTO_SCROLL_SPEED, 0), false);
    reorder();
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      active.set(true);
      startTop.set(topOf(id, order.get(), heights.get(), gap));
      startScroll.set(scrollY.get());
      dragY.set(0);
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      if (onDragStart) scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      dragY.set(e.translationY);
      autoDir.set(e.absoluteY < edges.top ? -1 : e.absoluteY > edges.bottom ? 1 : 0);
      reorder();
    })
    .onFinalize(() => {
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
