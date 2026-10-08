import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export type DonutSegment = { key: string; value: number; color: string };

export type ArcSegment = DonutSegment & { start: number; length: number };

/**
 * Converts the values into arcs (fractions of the circle, 0–1), with a small
 * gap between slices when there is more than one.
 */
export function donutArcs(segments: DonutSegment[], gap = 0.006): ArcSegment[] {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return [];

  const g = visible.length > 1 ? gap : 0;
  let start = 0;
  return visible.map((s) => {
    const fraction = s.value / total;
    const arc = { ...s, start: start + g / 2, length: Math.max(fraction - g, 0.001) };
    start += fraction;
    return arc;
  });
}

type Props = {
  segments: DonutSegment[];
  size: number;
  thickness?: number;
  trackColor: string;
  /** Rotation in turns (0–1), clockwise; 0 = first slice starts at 12 o'clock. */
  rotation?: number;
  children?: ReactNode;
};

export function DonutChart({
  segments,
  size,
  thickness = size * 0.12,
  trackColor,
  rotation = 0,
  children,
}: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const arcs = donutArcs(segments);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90 + rotation * 360} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={trackColor}
            strokeWidth={thickness}
            fill="none"
          />
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${a.length * c} ${c}`}
              strokeDashoffset={-a.start * c}
            />
          ))}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, { padding: thickness * 1.2 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
