import { donutArcs } from '@/components/charts/donut-chart';
import {
  allocateToGaps,
  arcAtAngle,
  arcMidpoints,
  clockAngle,
  connectors,
  orbitGeometry,
  placeIcons,
  pointAt,
  spreadAngles,
  turnDistance,
} from '@/features/transactions/ring-layout';

describe('donutArcs', () => {
  it('returns no arcs when there are no values', () => {
    expect(donutArcs([])).toEqual([]);
    expect(donutArcs([{ key: 'a', value: 0, color: '#000' }])).toEqual([]);
  });

  it('a single slice covers the whole circle, with no gaps', () => {
    expect(donutArcs([{ key: 'a', value: 5, color: '#000' }])).toEqual([
      { key: 'a', value: 5, color: '#000', start: 0, length: 1 },
    ]);
  });

  it('sizes slices proportionally and leaves a gap between them', () => {
    const gap = 0.01;
    const arcs = donutArcs(
      [
        { key: 'a', value: 3, color: '#000' },
        { key: 'zero', value: 0, color: '#000' },
        { key: 'b', value: 1, color: '#000' },
      ],
      gap,
    );
    expect(arcs.map((a) => a.key)).toEqual(['a', 'b']);
    expect(arcs[0].start).toBeCloseTo(gap / 2);
    expect(arcs[0].length).toBeCloseTo(0.75 - gap);
    expect(arcs[1].start).toBeCloseTo(0.75 + gap / 2);
    expect(arcs[1].length).toBeCloseTo(0.25 - gap);
  });
});

describe('orbitGeometry', () => {
  it('centers orbit and donut leaving room for the icons', () => {
    const g = orbitGeometry({ width: 400, height: 500, iconSize: 48, gap: 8 });
    expect(g.center).toEqual({ x: 200, y: 250 });
    expect(g.orbitRadius).toBe(200 - 24 - 4);
    expect(g.donutSize).toBe((172 - 24 - 8) * 2);
    // icons stay within the width
    expect(g.center.x + g.orbitRadius + 24).toBeLessThanOrEqual(400);
  });
});

describe('angles', () => {
  const c = { x: 0, y: 0 };
  it('measures clockwise from 12 o’clock', () => {
    expect(clockAngle(c, { x: 0, y: -1 })).toBeCloseTo(0);
    expect(clockAngle(c, { x: 1, y: 0 })).toBeCloseTo(0.25);
    expect(clockAngle(c, { x: 0, y: 1 })).toBeCloseTo(0.5);
    expect(clockAngle(c, { x: -1, y: 0 })).toBeCloseTo(0.75);
  });

  it('pointAt is the inverse of clockAngle', () => {
    const p = pointAt(c, 10, 0.3);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(10);
    expect(clockAngle(c, p)).toBeCloseTo(0.3);
  });

  it('turnDistance handles the full turn', () => {
    expect(turnDistance(0.95, 0.05)).toBeCloseTo(0.1);
    expect(turnDistance(0.2, 0.7)).toBeCloseTo(0.5);
  });
});

const minGap = (angles: number[]) =>
  Math.min(...angles.flatMap((a, i) => angles.slice(i + 1).map((b) => turnDistance(a, b))));

describe('spreadAngles', () => {
  it('leaves angles that are already apart unchanged', () => {
    const [a, b] = spreadAngles([0.1, 0.5], 0.05);
    expect(a).toBeCloseTo(0.1);
    expect(b).toBeCloseTo(0.5);
  });

  it('pushes angles that are too close apart symmetrically, even across 12 o’clock', () => {
    const [a, b] = spreadAngles([0.99, 0.01], 0.1);
    expect(turnDistance(a, 0.95)).toBeCloseTo(0);
    expect(turnDistance(b, 0.05)).toBeCloseTo(0);
    expect(minGap(spreadAngles([0.3, 0.31, 0.32, 0.33], 0.05))).toBeGreaterThanOrEqual(0.05 - 1e-6);
  });
});

describe('allocateToGaps', () => {
  it('prefers the widest gaps', () => {
    expect(allocateToGaps([0.1, 0.9], 5, 0.05)).toEqual([0, 5]);
  });

  it('respects the capacity of each gap', () => {
    // with sep 0.05: the 0.3 gap holds 5 icons, the 0.1 gap only one
    expect(allocateToGaps([0.1, 0.3], 6, 0.05)).toEqual([1, 5]);
    expect(allocateToGaps([0.04, 0.96], 3, 0.05)).toEqual([0, 3]);
  });
});

describe('placeIcons', () => {
  const ids = [...'abcdefghijklmnop'];
  const sep = 0.055;

  it('without slices spreads the icons evenly from 12 o’clock', () => {
    const placed = placeIcons(['a', 'b', 'c', 'd'], new Map(), sep);
    expect([...placed.values()]).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('puts each icon with a slice on its slice and the others in the gaps, without overlaps', () => {
    const anchors = new Map([
      ['a', 0.3],
      ['k', 0.65],
      ['f', 0.9],
    ]);
    const placed = placeIcons(ids, anchors, sep);
    expect(placed.size).toBe(16);
    for (const [id, angle] of anchors) expect(placed.get(id)).toBeCloseTo(angle);
    expect(minGap([...placed.values()])).toBeGreaterThanOrEqual(sep - 1e-6);
  });

  it('free icons keep the category order, clockwise', () => {
    const placed = placeIcons(['a', 'b', 'c', 'd', 'e'], new Map([['c', 0.5]]), 0.1);
    // a single gap, from 0.5 to 1.5: free icons split it evenly, in order
    const unwrapped = ['a', 'b', 'd', 'e'].map((id) => {
      const angle = placed.get(id)!;
      return angle < 0.5 ? angle + 1 : angle;
    });
    [0.7, 0.9, 1.1, 1.3].forEach((expected, i) => expect(unwrapped[i]).toBeCloseTo(expected));
  });
});

describe('arcMidpoints / connectors', () => {
  const center = { x: 0, y: 0 };
  const arcs = donutArcs(
    [
      { key: 'a', value: 1, color: '#f00' },
      { key: 'b', value: 3, color: '#0f0' },
    ],
    0,
  );

  it('finds the slice under an angle', () => {
    expect(arcAtAngle(arcs, 0.1)?.key).toBe('a');
    expect(arcAtAngle(arcs, 0.9)?.key).toBe('b');
    expect(arcAtAngle([], 0.5)).toBeUndefined();
    // in the gap between two slices the closest one wins, within the tolerance
    const gapped = donutArcs(
      [
        { key: 'a', value: 1, color: '#f00' },
        { key: 'b', value: 1, color: '#0f0' },
      ],
      0.02,
    );
    expect(arcAtAngle(gapped, 0.004)?.key).toBe('a');
    expect(arcAtAngle(gapped, 0.996)?.key).toBe('b');
    expect(arcAtAngle(gapped, 0.004, 0)).toBeUndefined();
  });

  it('computes the center of each slice', () => {
    const mid = arcMidpoints(arcs);
    expect(mid.get('a')).toBeCloseTo(0.125);
    expect(mid.get('b')).toBeCloseTo(0.625);
  });

  it('a slice covering the whole ring does not move its icon', () => {
    expect(arcMidpoints(donutArcs([{ key: 'a', value: 5, color: '#000' }])).size).toBe(0);
  });

  it('with the icon over its slice the line is radial and short', () => {
    const icons = new Map([['a', pointAt(center, 100, 0.125)]]);
    const [line] = connectors(arcs, icons, center, 70, 24);
    expect(clockAngle(center, line.to)).toBeCloseTo(0.125);
    expect(Math.hypot(line.to.x, line.to.y)).toBeCloseTo(70);
    expect(Math.hypot(line.from.x, line.from.y)).toBeCloseTo(76);
    expect(line.color).toBe('#f00');
  });

  it('if the icon was moved, it points at the closest edge of its slice', () => {
    const icons = new Map([['a', pointAt(center, 100, 0.3)]]);
    const [line] = connectors(arcs, icons, center, 70, 24);
    expect(clockAngle(center, line.to)).toBeCloseTo(0.24);
  });
});
