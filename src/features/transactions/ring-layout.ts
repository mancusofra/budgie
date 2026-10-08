import type { ArcSegment } from '@/components/charts/donut-chart';

/**
 * Home screen geometry: category icons arranged in a circle ("orbit") around
 * the donut. Categories with a slice are placed next to their own slice,
 * the others fill the free gaps. Angles are in turns (0–1),
 * clockwise from 12 o'clock.
 */

export type Point = { x: number; y: number };

export type OrbitGeometry = {
  center: Point;
  /** Radius on which the icon centers sit. */
  orbitRadius: number;
  donutSize: number;
};

export function orbitGeometry({
  width,
  height,
  iconSize,
  gap,
}: {
  width: number;
  height: number;
  iconSize: number;
  gap: number;
}): OrbitGeometry {
  const h = height > 0 ? height : width;
  const orbitRadius = Math.max(0, Math.min(width, h) / 2 - iconSize / 2 - gap / 2);
  const donutRadius = Math.max(0, orbitRadius - iconSize / 2 - gap);
  return { center: { x: width / 2, y: h / 2 }, orbitRadius, donutSize: donutRadius * 2 };
}

/** Clockwise angle from 12 o'clock, in [0, 1) turns. */
export function clockAngle(from: Point, to: Point): number {
  const turns = Math.atan2(to.x - from.x, from.y - to.y) / (2 * Math.PI);
  return (turns + 1) % 1;
}

/** Point on the circle of radius r at the given angle. */
export function pointAt(center: Point, r: number, turns: number): Point {
  const a = turns * 2 * Math.PI;
  return { x: center.x + r * Math.sin(a), y: center.y - r * Math.cos(a) };
}

const mod1 = (a: number) => ((a % 1) + 1) % 1;

/** Angular distance (0–0.5) between two angles. */
export const turnDistance = (a: number, b: number) => {
  const d = mod1(a - b);
  return Math.min(d, 1 - d);
};

/**
 * Pushes apart angles that are too close (minimum distance `minSep`),
 * moving them as little as possible from their desired position.
 * Returns the angles in the same order as the input.
 */
export function spreadAngles(desired: number[], minSep: number): number[] {
  const n = desired.length;
  if (n < 2) return desired.map(mod1);
  const sep = Math.min(minSep, 1 / n);

  const order = desired.map((a, i) => ({ a: mod1(a), i })).sort((x, y) => x.a - y.a);
  const a = order.map((o) => o.a);

  for (let iter = 0; iter < 500; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const next = (k + 1) % n;
      const gap = next === 0 ? a[0] + 1 - a[k] : a[next] - a[k];
      if (gap < sep - 1e-9) {
        const push = (sep - gap) / 2;
        a[k] -= push;
        a[next] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const result = new Array<number>(n);
  order.forEach((o, k) => (result[o.i] = mod1(a[k])));
  return result;
}

/**
 * Angle of each icon on the orbit.
 * - `ids`: all categories, in the order to show them
 * - `anchors`: desired angle for the categories with a slice
 * - `minSep`: minimum separation between icons (in turns)
 */
export function placeIcons(
  ids: string[],
  anchors: Map<string, number>,
  minSep: number,
): Map<string, number> {
  const placed = new Map<string, number>();
  const anchored = ids.filter((id) => anchors.has(id));
  const free = ids.filter((id) => !anchors.has(id));

  if (anchored.length === 0) {
    ids.forEach((id, i) => placed.set(id, i / ids.length));
    return placed;
  }

  const spread = spreadAngles(
    anchored.map((id) => anchors.get(id)!),
    minSep,
  );
  anchored.forEach((id, i) => placed.set(id, spread[i]));

  // Free gaps between consecutive anchored icons (clockwise)
  const sorted = [...spread].sort((x, y) => x - y);
  const gaps = sorted.map((start, k) => ({
    start,
    size: (k + 1 < sorted.length ? sorted[k + 1] : sorted[0] + 1) - start,
  }));

  const counts = allocateToGaps(
    gaps.map((g) => g.size),
    free.length,
    Math.min(minSep, 1 / ids.length),
  );

  // Fill the gaps clockwise starting from the one containing 12 o'clock,
  // so the free icons keep their order starting from the top
  const first = Math.max(
    gaps.findIndex((g) => g.start + g.size >= 1),
    0,
  );
  let next = 0;
  for (let step = 0; step < gaps.length; step++) {
    const k = (first + step) % gaps.length;
    const { start, size } = gaps[k];
    for (let j = 0; j < counts[k]; j++) {
      placed.set(free[next++], mod1(start + (size * (j + 1)) / (counts[k] + 1)));
    }
  }
  return placed;
}

/**
 * How many icons to put in each free gap. Each gap holds at most
 * floor(width / sep) − 1 without overlaps: one icon at a time goes into
 * the gap with the most room (largest width / (icons + 1)), respecting the
 * capacity as long as possible.
 */
export function allocateToGaps(sizes: number[], count: number, sep: number): number[] {
  const counts = sizes.map(() => 0);
  const capacity = sizes.map((s) => Math.max(0, Math.floor(s / sep + 1e-9) - 1));
  for (let n = 0; n < count; n++) {
    let best = -1;
    let bestSpacing = -1;
    for (const strict of [true, false]) {
      sizes.forEach((size, k) => {
        if (strict && counts[k] >= capacity[k]) return;
        const spacing = size / (counts[k] + 2);
        if (spacing > bestSpacing) {
          bestSpacing = spacing;
          best = k;
        }
      });
      if (best >= 0) break;
    }
    counts[best]++;
  }
  return counts;
}

/**
 * Center (in turns) of each slice. A slice covering the whole ring has no
 * preferred position: its icon stays where it would be anyway.
 */
export function arcMidpoints(arcs: ArcSegment[]): Map<string, number> {
  return new Map(
    arcs.filter((a) => a.length < 0.999).map((a) => [a.key, mod1(a.start + a.length / 2)]),
  );
}

/**
 * Slice containing the given angle (in turns); if the angle falls in the gap
 * between two slices, the closest one within `tolerance`.
 */
export function arcAtAngle(
  arcs: ArcSegment[],
  angle: number,
  tolerance = 0.02,
): ArcSegment | undefined {
  const inside = arcs.find((a) => mod1(angle - a.start) <= a.length);
  if (inside) return inside;
  let best: ArcSegment | undefined;
  let bestDist = tolerance;
  for (const a of arcs) {
    const d = Math.min(turnDistance(angle, a.start), turnDistance(angle, a.start + a.length));
    if (d <= bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

/** Margin from the slice edges, so as not to point at the gap between slices. */
const edgeInset = (length: number) => Math.min(0.01, length / 4);

/** Angle of the slice closest to the given one (the angle itself if it falls inside). */
export function nearestAngleInArc(angle: number, arc: ArcSegment): number {
  if (arc.length >= 0.999) return mod1(angle);
  const inset = edgeInset(arc.length);
  const start = arc.start + inset;
  const length = arc.length - 2 * inset;
  if (mod1(angle - start) <= length) return mod1(angle);
  const end = start + length;
  return turnDistance(angle, start) < turnDistance(angle, end) ? mod1(start) : mod1(end);
}

export type Connector = { key: string; color: string; from: Point; to: Point };

/** Lines from the edge of each icon to the closest point of its slice. */
export function connectors(
  arcs: ArcSegment[],
  iconPositions: Map<string, Point>,
  center: Point,
  donutRadius: number,
  iconRadius: number,
): Connector[] {
  return arcs.flatMap((arc) => {
    const icon = iconPositions.get(arc.key);
    if (!icon) return [];
    const to = pointAt(center, donutRadius, nearestAngleInArc(clockAngle(center, icon), arc));
    const dx = to.x - icon.x;
    const dy = to.y - icon.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= iconRadius) return [];
    const from = { x: icon.x + (dx / dist) * iconRadius, y: icon.y + (dy / dist) * iconRadius };
    return [{ key: arc.key, color: arc.color, from, to }];
  });
}
