import type { ArcSegment } from '@/components/charts/donut-chart';

/**
 * Geometria della home: icone categoria disposte in cerchio ("orbita") attorno
 * alla ciambella. Le categorie con uno spicchio si posizionano accanto al proprio
 * spicchio, le altre riempiono gli spazi liberi. Gli angoli sono in giri (0–1),
 * in senso orario da ore 12.
 */

export type Point = { x: number; y: number };

export type OrbitGeometry = {
  center: Point;
  /** Raggio su cui stanno i centri delle icone. */
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

/** Angolo in senso orario da ore 12, in [0, 1) giri. */
export function clockAngle(from: Point, to: Point): number {
  const turns = Math.atan2(to.x - from.x, from.y - to.y) / (2 * Math.PI);
  return (turns + 1) % 1;
}

/** Punto sulla circonferenza di raggio r all'angolo dato. */
export function pointAt(center: Point, r: number, turns: number): Point {
  const a = turns * 2 * Math.PI;
  return { x: center.x + r * Math.sin(a), y: center.y - r * Math.cos(a) };
}

const mod1 = (a: number) => ((a % 1) + 1) % 1;

/** Distanza angolare (0–0.5) tra due angoli. */
export const turnDistance = (a: number, b: number) => {
  const d = mod1(a - b);
  return Math.min(d, 1 - d);
};

/**
 * Allontana gli angoli troppo vicini tra loro (distanza minima `minSep`),
 * spostandoli il meno possibile dalla posizione desiderata.
 * Restituisce gli angoli nello stesso ordine dell'input.
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
 * Angolo di ogni icona sull'orbita.
 * - `ids`: tutte le categorie, nell'ordine in cui mostrarle
 * - `anchors`: angolo desiderato per le categorie con uno spicchio
 * - `minSep`: separazione minima tra icone (in giri)
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

  // Spazi liberi tra icone ancorate consecutive (in senso orario)
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

  // Riempie gli spazi in senso orario partendo da quello che contiene ore 12,
  // così le icone libere mantengono il loro ordine a partire dall'alto
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
 * Quante icone mettere in ogni spazio libero. Ogni spazio ne contiene al più
 * floor(ampiezza / sep) − 1 senza sovrapposizioni: si riempie un'icona alla volta
 * lo spazio con più margine (ampiezza / (icone + 1) più grande), rispettando la
 * capienza finché possibile.
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
 * Centro (in giri) di ogni spicchio. Uno spicchio che copre l'intero anello
 * non ha una posizione preferita: la sua icona resta dove sarebbe comunque.
 */
export function arcMidpoints(arcs: ArcSegment[]): Map<string, number> {
  return new Map(
    arcs.filter((a) => a.length < 0.999).map((a) => [a.key, mod1(a.start + a.length / 2)]),
  );
}

/**
 * Spicchio che contiene l'angolo dato (in giri); se l'angolo cade nello spazio
 * tra due spicchi, il più vicino entro `tolerance`.
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

/** Margine dagli estremi dello spicchio, per non puntare sullo spazio tra spicchi. */
const edgeInset = (length: number) => Math.min(0.01, length / 4);

/** Angolo dello spicchio più vicino a quello dato (l'angolo stesso se ci cade dentro). */
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

/** Linee dal bordo di ogni icona al punto più vicino del suo spicchio. */
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
