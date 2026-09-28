import type { ArcSegment } from '@/components/charts/donut-chart';

/**
 * Geometria della home stile Monefy: icone categoria attorno alla ciambella
 * (riga in alto, colonna sinistra, colonna destra, riga in basso) e linee che
 * collegano ogni icona al proprio spicchio.
 */

export type Point = { x: number; y: number };

export type RingGeometry = {
  center: Point;
  donutSize: number;
  /** Centri delle icone, nell'ordine: alto (sx→dx), sinistra, destra, basso (sx→dx). */
  slots: Point[];
  /** Altezza minima necessaria per contenere tutto. */
  height: number;
};

export function ringGeometry({
  width,
  height,
  cell,
  gap,
  perSide = 4,
}: {
  width: number;
  height: number;
  cell: number;
  gap: number;
  perSide?: number;
}): RingGeometry {
  const columnHeight = perSide * cell + (perSide - 1) * gap;
  const donutSize = Math.max(0, Math.min(width - 2 * cell - 2 * gap, columnHeight));
  const needed = columnHeight + 2 * (cell + gap);
  const center = { x: width / 2, y: Math.max(height, needed) / 2 };

  const rowX = (i: number) => (width / perSide) * (i + 0.5);
  const columnY = (i: number) => center.y - columnHeight / 2 + cell / 2 + i * (cell + gap);
  const topY = center.y - columnHeight / 2 - gap - cell / 2;
  const bottomY = center.y + columnHeight / 2 + gap + cell / 2;
  const range = [...Array(perSide).keys()];

  return {
    center,
    donutSize,
    height: needed,
    slots: [
      ...range.map((i) => ({ x: rowX(i), y: topY })),
      ...range.map((i) => ({ x: cell / 2, y: columnY(i) })),
      ...range.map((i) => ({ x: width - cell / 2, y: columnY(i) })),
      ...range.map((i) => ({ x: rowX(i), y: bottomY })),
    ],
  };
}

/** Angolo in senso orario da ore 12, in [0, 1) giri. */
export function clockAngle(from: Point, to: Point): number {
  const turns = Math.atan2(to.x - from.x, from.y - to.y) / (2 * Math.PI);
  return (turns + 1) % 1;
}

/** Punto sulla circonferenza di raggio r all'angolo dato (in giri, orario da ore 12). */
export function pointAt(center: Point, r: number, turns: number): Point {
  const a = turns * 2 * Math.PI;
  return { x: center.x + r * Math.sin(a), y: center.y - r * Math.cos(a) };
}

/**
 * Ordina gli spicchi seguendo la posizione delle rispettive icone attorno al
 * grafico, così ogni spicchio sta vicino alla sua icona e le linee non si incrociano.
 * Gli spicchi senza icona finiscono in coda.
 */
export function sortByIconAngle<T extends { key: string }>(
  segments: T[],
  iconPositions: Map<string, Point>,
  center: Point,
): T[] {
  const angle = (s: T) => {
    const p = iconPositions.get(s.key);
    return p ? clockAngle(center, p) : 2;
  };
  return [...segments].sort((a, b) => angle(a) - angle(b));
}

/** Distanza angolare (in giri, 0–0.5) tra due angoli. */
const turnDistance = (a: number, b: number) => {
  const d = (((a - b) % 1) + 1) % 1;
  return Math.min(d, 1 - d);
};

/** Margine dagli estremi dello spicchio, per non puntare sullo spazio tra spicchi. */
const edgeInset = (length: number) => Math.min(0.01, length / 4);

/**
 * Angolo dello spicchio (ruotato di `rotation`) più vicino all'angolo dato:
 * l'angolo stesso se cade dentro lo spicchio, altrimenti l'estremo più vicino.
 */
export function nearestAngleInArc(angle: number, arc: ArcSegment, rotation: number): number {
  const inset = edgeInset(arc.length);
  const start = rotation + arc.start + inset;
  const length = arc.length - 2 * inset;
  const offset = (((angle - start) % 1) + 1) % 1;
  if (offset <= length) return angle;
  const end = start + length;
  return turnDistance(angle, start) < turnDistance(angle, end) ? start % 1 : end % 1;
}

/**
 * Rotazione della ciambella (in giri) che rende minima la distanza tra ogni
 * icona e il proprio spicchio: idealmente ogni icona "cade" dentro il suo spicchio
 * e la linea di collegamento è radiale. Ricerca esaustiva su 720 passi.
 */
export function alignRotation(
  arcs: ArcSegment[],
  iconPositions: Map<string, Point>,
  center: Point,
  steps = 720,
): number {
  const targets = arcs.flatMap((arc) => {
    const icon = iconPositions.get(arc.key);
    return icon ? [{ arc, angle: clockAngle(center, icon) }] : [];
  });
  if (targets.length === 0) return 0;

  let best = 0;
  let bestCost = Infinity;
  for (let i = 0; i < steps; i++) {
    const rotation = i / steps;
    let cost = 0;
    for (const { arc, angle } of targets) {
      cost += turnDistance(angle, nearestAngleInArc(angle, arc, rotation));
    }
    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      best = rotation;
    }
  }
  return best;
}

export type Connector = { key: string; color: string; from: Point; to: Point };

/**
 * Linee dal bordo di ogni icona al punto più vicino del suo spicchio, sul bordo
 * esterno. `rotation` è la rotazione della ciambella in giri.
 */
export function connectors(
  arcs: ArcSegment[],
  iconPositions: Map<string, Point>,
  center: Point,
  donutRadius: number,
  iconRadius: number,
  rotation = 0,
): Connector[] {
  return arcs.flatMap((arc) => {
    const icon = iconPositions.get(arc.key);
    if (!icon) return [];
    const angle = nearestAngleInArc(clockAngle(center, icon), arc, rotation);
    const to = pointAt(center, donutRadius, angle);
    const dx = to.x - icon.x;
    const dy = to.y - icon.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= iconRadius) return [];
    const from = { x: icon.x + (dx / dist) * iconRadius, y: icon.y + (dy / dist) * iconRadius };
    return [{ key: arc.key, color: arc.color, from, to }];
  });
}
