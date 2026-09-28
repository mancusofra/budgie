import { donutArcs } from '@/components/charts/donut-chart';
import { ringLayout } from '@/features/transactions/ring-layout';

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

describe('ringLayout', () => {
  it('riempie alto, sinistra, destra e basso', () => {
    const items = [...Array(16).keys()];
    expect(ringLayout(items)).toEqual({
      top: [0, 1, 2, 3],
      left: [4, 5, 6, 7],
      right: [8, 9, 10, 11],
      bottom: [12, 13, 14, 15],
    });
    expect(ringLayout([1, 2, 3, 4, 5])).toEqual({
      top: [1, 2, 3, 4],
      left: [5],
      right: [],
      bottom: [],
    });
  });
});
