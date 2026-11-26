import {
  computeGroups,
  DEFAULT_SHARES,
  moveHandle,
  normalizeShares,
  referenceForPeriod,
  roundShares,
  suggestShares,
  type CategoryTotal,
  type Group,
} from '@/lib/groups';

const groupOf = new Map<string, Group | null>([
  ['house', 'need'],
  ['food', 'need'],
  ['eatingOut', 'want'],
  ['invest', 'save'],
]);

const exp = (categoryId: string | null, total: number): CategoryTotal => ({
  categoryId,
  type: 'expense',
  total,
});
const inc = (total: number): CategoryTotal => ({ categoryId: 'salary', type: 'income', total });

describe('computeGroups', () => {
  it('splits spending by group and adds what was not spent to Savings', () => {
    // The example of the mockup: income 2,400, Needs 1,310, Wants 590, Investments 300
    const s = computeGroups({
      totals: [
        inc(240000),
        exp('house', 97000),
        exp('food', 34000),
        exp('eatingOut', 59000),
        exp('invest', 30000),
      ],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    expect(s).toMatchObject({
      base: 240000,
      baseSource: 'income',
      income: 240000,
      expense: 220000,
      overspent: 0,
    });
    const [need, want, save] = s.groups;
    expect(need).toMatchObject({
      amount: 131000,
      target: 120000,
      level: 'over',
      remaining: -11000,
    });
    expect(want).toMatchObject({
      amount: 59000,
      target: 72000,
      level: 'warning',
      remaining: 13000,
    });
    expect(save).toMatchObject({ amount: 50000, target: 48000, level: 'reached' });
    expect(need.share).toBeCloseTo(54.58, 1);
  });

  it('when spending exceeds income nothing is unspent and the excess is reported', () => {
    const s = computeGroups({
      totals: [inc(240000), exp('house', 150000), exp('eatingOut', 105000)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    expect(s.overspent).toBe(15000);
    expect(s.groups[2]).toMatchObject({ amount: 0, level: 'short', remaining: 48000 });
  });

  it('expenses without a category or with an unknown one count as Needs', () => {
    const s = computeGroups({
      totals: [inc(1000), exp(null, 100), exp('deleted', 200)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    expect(s.groups[0].amount).toBe(300);
  });

  it('falls back to the reference income, without unspent', () => {
    const s = computeGroups({
      totals: [exp('food', 30000)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: 50000,
    });
    expect(s).toMatchObject({ base: 50000, baseSource: 'reference', overspent: 30000 });
    expect(s.groups[0]).toMatchObject({ target: 25000, level: 'over' });
    expect(s.groups[2].amount).toBe(0);
  });

  it('without income nor reference there are no targets', () => {
    const s = computeGroups({
      totals: [exp('food', 100)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    expect(s.base).toBeNull();
    expect(s.groups.every((g) => g.level === 'none' && g.target === null && g.share === null)).toBe(
      true,
    );
  });
});

describe('referenceForPeriod', () => {
  const day = (d: number) => new Date(2026, 8, d);
  it('scales the monthly reference to the period', () => {
    expect(referenceForPeriod(300000, 'month', {})).toBe(300000);
    expect(referenceForPeriod(300000, 'year', {})).toBe(3600000);
    expect(referenceForPeriod(304375, 'week', { from: day(7), to: day(14) })).toBe(70000);
    expect(referenceForPeriod(304375, 'day', { from: day(7), to: day(8) })).toBe(10000);
  });
  it('none for "All time" or without a reference', () => {
    expect(referenceForPeriod(300000, 'all', {})).toBeNull();
    expect(referenceForPeriod(null, 'month', {})).toBeNull();
    expect(referenceForPeriod(0, 'month', {})).toBeNull();
  });
});

describe('moveHandle', () => {
  it('handle 0 moves only Needs and Wants', () => {
    expect(moveHandle([50, 30, 20], 0, 56)).toEqual([55, 25, 20]);
    expect(moveHandle([50, 30, 20], 0, 92)).toEqual([80, 0, 20]); // can't cross handle 1
    expect(moveHandle([50, 30, 20], 0, -10)).toEqual([0, 80, 20]);
  });
  it('handle 1 moves only Wants and Savings', () => {
    expect(moveHandle([50, 30, 20], 1, 74)).toEqual([50, 25, 25]);
    expect(moveHandle([50, 30, 20], 1, 30)).toEqual([50, 0, 50]);
    expect(moveHandle([50, 30, 20], 1, 120)).toEqual([50, 50, 0]);
  });
  it('fine adjustment by 1 (accessibility)', () => {
    expect(moveHandle([50, 30, 20], 0, 51, 1)).toEqual([51, 29, 20]);
  });
});

describe('shares helpers', () => {
  it('roundShares keeps the total at 100 in steps of 5', () => {
    expect(roundShares([54.6, 24.6, 20.8])).toEqual([55, 25, 20]);
    expect(roundShares([1, 1, 1])).toEqual([35, 35, 30]);
    expect(roundShares([0, 0, 0])).toEqual(DEFAULT_SHARES);
    expect(roundShares([33.3, 33.3, 33.4], 1)).toEqual([33, 33, 34]);
  });

  it('normalizeShares rejects invalid values', () => {
    expect(normalizeShares([60, 20, 20])).toEqual([60, 20, 20]);
    expect(normalizeShares([60, 20, 30])).toEqual(DEFAULT_SHARES);
    expect(normalizeShares([50.5, 29.5, 20])).toEqual(DEFAULT_SHARES);
    expect(normalizeShares(undefined)).toEqual(DEFAULT_SHARES);
  });

  it('suggestShares uses how income was actually split', () => {
    const s = computeGroups({
      totals: [inc(300000), exp('house', 186000), exp('eatingOut', 84000)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    // 62% / 28% / 10% (unspent) → 60 / 30 / 10
    expect(suggestShares(s)).toEqual([60, 30, 10]);
    const none = computeGroups({
      totals: [exp('food', 1)],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: 5,
    });
    expect(suggestShares(none)).toBeNull();
  });
});
