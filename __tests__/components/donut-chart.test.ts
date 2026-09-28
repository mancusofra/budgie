import { donutArcs } from '@/components/charts/donut-chart';
import {
  allocateToGaps,
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
  it('restituisce nessun arco se non ci sono valori', () => {
    expect(donutArcs([])).toEqual([]);
    expect(donutArcs([{ key: 'a', value: 0, color: '#000' }])).toEqual([]);
  });

  it('un solo spicchio copre tutto il cerchio, senza spazi', () => {
    expect(donutArcs([{ key: 'a', value: 5, color: '#000' }])).toEqual([
      { key: 'a', value: 5, color: '#000', start: 0, length: 1 },
    ]);
  });

  it('proporziona gli spicchi e lascia uno spazio tra di essi', () => {
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
  it('centra orbita e ciambella lasciando spazio alle icone', () => {
    const g = orbitGeometry({ width: 400, height: 500, iconSize: 48, gap: 8 });
    expect(g.center).toEqual({ x: 200, y: 250 });
    expect(g.orbitRadius).toBe(200 - 24 - 4);
    expect(g.donutSize).toBe((172 - 24 - 8) * 2);
    // le icone restano dentro la larghezza
    expect(g.center.x + g.orbitRadius + 24).toBeLessThanOrEqual(400);
  });
});

describe('angoli', () => {
  const c = { x: 0, y: 0 };
  it('misura in senso orario da ore 12', () => {
    expect(clockAngle(c, { x: 0, y: -1 })).toBeCloseTo(0);
    expect(clockAngle(c, { x: 1, y: 0 })).toBeCloseTo(0.25);
    expect(clockAngle(c, { x: 0, y: 1 })).toBeCloseTo(0.5);
    expect(clockAngle(c, { x: -1, y: 0 })).toBeCloseTo(0.75);
  });

  it('pointAt è l’inverso di clockAngle', () => {
    const p = pointAt(c, 10, 0.3);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(10);
    expect(clockAngle(c, p)).toBeCloseTo(0.3);
  });

  it('turnDistance gestisce il giro completo', () => {
    expect(turnDistance(0.95, 0.05)).toBeCloseTo(0.1);
    expect(turnDistance(0.2, 0.7)).toBeCloseTo(0.5);
  });
});

const minGap = (angles: number[]) =>
  Math.min(...angles.flatMap((a, i) => angles.slice(i + 1).map((b) => turnDistance(a, b))));

describe('spreadAngles', () => {
  it('lascia invariati gli angoli già distanti', () => {
    const [a, b] = spreadAngles([0.1, 0.5], 0.05);
    expect(a).toBeCloseTo(0.1);
    expect(b).toBeCloseTo(0.5);
  });

  it('allontana simmetricamente gli angoli troppo vicini, anche a cavallo di ore 12', () => {
    const [a, b] = spreadAngles([0.99, 0.01], 0.1);
    expect(turnDistance(a, 0.95)).toBeCloseTo(0);
    expect(turnDistance(b, 0.05)).toBeCloseTo(0);
    expect(minGap(spreadAngles([0.3, 0.31, 0.32, 0.33], 0.05))).toBeGreaterThanOrEqual(0.05 - 1e-6);
  });
});

describe('allocateToGaps', () => {
  it('preferisce gli spazi più ampi', () => {
    expect(allocateToGaps([0.1, 0.9], 5, 0.05)).toEqual([0, 5]);
  });

  it('rispetta la capienza di ogni spazio', () => {
    // con sep 0.05: nello spazio da 0.3 stanno 5 icone, in quello da 0.1 una sola
    expect(allocateToGaps([0.1, 0.3], 6, 0.05)).toEqual([1, 5]);
    expect(allocateToGaps([0.04, 0.96], 3, 0.05)).toEqual([0, 3]);
  });
});

describe('placeIcons', () => {
  const ids = [...'abcdefghijklmnop'];
  const sep = 0.055;

  it('senza spicchi distribuisce le icone uniformemente da ore 12', () => {
    const placed = placeIcons(['a', 'b', 'c', 'd'], new Map(), sep);
    expect([...placed.values()]).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('mette ogni icona con spicchio sul proprio spicchio e le altre negli spazi, senza sovrapposizioni', () => {
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

  it('le icone libere mantengono l’ordine delle categorie, in senso orario', () => {
    const placed = placeIcons(['a', 'b', 'c', 'd', 'e'], new Map([['c', 0.5]]), 0.1);
    // un solo spazio, da 0.5 a 1.5: le libere lo dividono in parti uguali, in ordine
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

  it('calcola il centro di ogni spicchio', () => {
    const mid = arcMidpoints(arcs);
    expect(mid.get('a')).toBeCloseTo(0.125);
    expect(mid.get('b')).toBeCloseTo(0.625);
  });

  it('con l’icona sopra lo spicchio la linea è radiale e corta', () => {
    const icons = new Map([['a', pointAt(center, 100, 0.125)]]);
    const [line] = connectors(arcs, icons, center, 70, 24);
    expect(clockAngle(center, line.to)).toBeCloseTo(0.125);
    expect(Math.hypot(line.to.x, line.to.y)).toBeCloseTo(70);
    expect(Math.hypot(line.from.x, line.from.y)).toBeCloseTo(76);
    expect(line.color).toBe('#f00');
  });

  it('se l’icona è stata spostata, punta al bordo più vicino del suo spicchio', () => {
    const icons = new Map([['a', pointAt(center, 100, 0.3)]]);
    const [line] = connectors(arcs, icons, center, 70, 24);
    expect(clockAngle(center, line.to)).toBeCloseTo(0.24);
  });
});
