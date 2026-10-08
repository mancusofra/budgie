import { groupByDay } from '@/lib/group';

describe('groupByDay', () => {
  it('groups by local day with the total', () => {
    const items = [
      { d: new Date(2026, 8, 28, 20), v: -500 },
      { d: new Date(2026, 8, 28, 8), v: 2000 },
      { d: new Date(2026, 8, 27, 23, 59), v: -150 },
      { d: new Date(2026, 8, 20, 0, 0), v: -1 },
    ];
    const sections = groupByDay(
      items,
      (i) => i.d,
      (i) => i.v,
    );
    expect(sections.map((s) => [s.day, s.total, s.data.length])).toEqual([
      [new Date(2026, 8, 28), 1500, 2],
      [new Date(2026, 8, 27), -150, 1],
      [new Date(2026, 8, 20), -1, 1],
    ]);
    expect(new Set(sections.map((s) => s.key)).size).toBe(3);
  });

  it('empty list → no sections', () => {
    expect(
      groupByDay(
        [],
        () => new Date(),
        () => 0,
      ),
    ).toEqual([]);
  });
});
