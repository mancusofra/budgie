import { donutArcs } from '@/components/charts/donut-chart';
import {
  alignRotation,
  clockAngle,
  connectors,
  pointAt,
  ringGeometry,
  sortByIconAngle,
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

describe('ringGeometry', () => {
  const g = ringGeometry({ width: 400, height: 500, cell: 64, gap: 8 });

  it('dispone 16 slot attorno a una ciambella centrata', () => {
    expect(g.slots).toHaveLength(16);
    expect(g.center).toEqual({ x: 200, y: 250 });
    // larghezza − 2 colonne − 2 spazi, limitata dall'altezza delle colonne (4×64 + 3×8)
    expect(g.donutSize).toBe(400 - 128 - 16);
    expect(g.height).toBe(280 + 2 * 72);
  });

  it('mette le righe sopra/sotto e le colonne ai lati, senza sovrapporsi alla ciambella', () => {
    const r = g.donutSize / 2;
    for (const s of g.slots) {
      expect(Math.hypot(s.x - g.center.x, s.y - g.center.y)).toBeGreaterThan(r + 32);
    }
    expect(g.slots.slice(0, 4).every((s) => s.y < g.center.y - r)).toBe(true);
    expect(g.slots.slice(12).every((s) => s.y > g.center.y + r)).toBe(true);
    expect(g.slots.slice(4, 8).every((s) => s.x < g.center.x - r)).toBe(true);
    expect(g.slots.slice(8, 12).every((s) => s.x > g.center.x + r)).toBe(true);
  });

  it('centra verticalmente sull’altezza minima se lo spazio non basta', () => {
    expect(ringGeometry({ width: 400, height: 100, cell: 64, gap: 8 }).center.y).toBe(212);
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
});

describe('sortByIconAngle / connectors', () => {
  const center = { x: 0, y: 0 };
  const icons = new Map([
    ['left', { x: -100, y: 0 }],
    ['top', { x: 0, y: -100 }],
    ['right', { x: 100, y: 0 }],
  ]);

  it('ordina gli spicchi come le icone, in senso orario; quelli senza icona in coda', () => {
    const sorted = sortByIconAngle(
      [{ key: 'orphan' }, { key: 'left' }, { key: 'right' }, { key: 'top' }],
      icons,
      center,
    );
    expect(sorted.map((s) => s.key)).toEqual(['top', 'right', 'left', 'orphan']);
  });

  it('collega l’icona al punto più vicino del suo spicchio (radiale se ci cade dentro)', () => {
    const arcs = donutArcs(
      [
        { key: 'top', value: 1, color: '#f00' },
        { key: 'orphan', value: 1, color: '#0f0' },
      ],
      0,
    );
    // "top" copre [0, 0.5): l'icona a ore 12 cade appena fuori → estremo iniziale (con margine)
    const [line] = connectors(arcs, icons, center, 50, 20);
    expect(clockAngle(center, line.to)).toBeCloseTo(0.01);
    expect(Math.hypot(line.to.x, line.to.y)).toBeCloseTo(50);
    expect(line.color).toBe('#f00');

    // ruotando di −0.25 lo spicchio copre ore 9 → ore 3 passando da ore 12: linea radiale
    const [radial] = connectors(arcs, icons, center, 50, 20, 0.75);
    expect(radial.to.x).toBeCloseTo(0);
    expect(radial.to.y).toBeCloseTo(-50);
    expect(radial.from.x).toBeCloseTo(0);
    expect(radial.from.y).toBeCloseTo(-80);
  });

  it('sceglie una rotazione che mette ogni icona dentro il proprio spicchio', () => {
    // Caso difficile: spicchio grande (71%) e piccolo con icone vicine tra loro
    const ringIcons = new Map([
      ['bills', pointAt(center, 100, 0.78)],
      ['food', pointAt(center, 100, 0.88)],
    ]);
    const segments = sortByIconAngle(
      [
        { key: 'food', value: 1250, color: '#0f0' },
        { key: 'bills', value: 500, color: '#ff0' },
      ],
      ringIcons,
      center,
    );
    const arcs = donutArcs(segments);
    const rotation = alignRotation(arcs, ringIcons, center);
    for (const line of connectors(arcs, ringIcons, center, 50, 20, rotation)) {
      const icon = ringIcons.get(line.key)!;
      // linea radiale: punta verso il centro
      expect(clockAngle(center, line.to)).toBeCloseTo(clockAngle(center, icon), 5);
    }
  });
});
