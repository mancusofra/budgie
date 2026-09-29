import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export type BarDatum = { key: string; label: string; value: number };

type Props = {
  data: BarDatum[];
  color: string;
  height?: number;
  selectedKey?: string;
  onSelect?: (key: string | undefined) => void;
  /** Etichetta accessibile di una barra, es. "12 set: 45,00 €". */
  accessibilityLabelFor: (d: BarDatum) => string;
};

const GAP = 2;
const RADIUS = 4;
const LABEL_HEIGHT = 18;
const MAX_LABELS = 6;

/** Rettangolo con gli angoli superiori arrotondati, poggiato sulla base. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Barre verticali per una sola serie. Tap su una colonna = selezione
 * (il valore lo mostra il chiamante); di nuovo = deseleziona.
 */
export function BarChart({
  data,
  color,
  height = 150,
  selectedKey,
  onSelect,
  accessibilityLabelFor,
}: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const plotHeight = height - LABEL_HEIGHT;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = data.length > 0 ? width / data.length : 0;
  const barWidth = Math.max(slot - GAP, 1);
  const labelEvery = Math.max(1, Math.ceil(data.length / MAX_LABELS));

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="image">
      {width > 0 && (
        <Svg width={width} height={plotHeight}>
          <Line
            x1={0}
            x2={width}
            y1={plotHeight - 0.5}
            y2={plotHeight - 0.5}
            stroke={theme.border}
            strokeWidth={1}
          />
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max((d.value / max) * (plotHeight - 4), 2) : 0;
            const x = i * slot + GAP / 2;
            const dimmed = selectedKey !== undefined && selectedKey !== d.key;
            return (
              <Path
                key={d.key}
                d={h > 0 ? barPath(x, plotHeight - h, barWidth, h) : ''}
                fill={color}
                opacity={dimmed ? 0.35 : 1}
              />
            );
          })}
          {/* Aree di tocco a tutta altezza, più grandi delle barre */}
          {data.map((d, i) => (
            <Rect
              key={`hit-${d.key}`}
              x={i * slot}
              y={0}
              width={slot}
              height={plotHeight}
              fill="transparent"
              accessible
              accessibilityLabel={accessibilityLabelFor(d)}
              onPress={() => onSelect?.(selectedKey === d.key ? undefined : d.key)}
            />
          ))}
        </Svg>
      )}
      <View style={styles.labels}>
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <Text
              key={d.key}
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={[styles.label, { left: i * slot, width: slot * labelEvery }]}>
              {d.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { height: LABEL_HEIGHT, position: 'relative' },
  label: { position: 'absolute', top: 2, fontSize: 11, lineHeight: 14 },
});
