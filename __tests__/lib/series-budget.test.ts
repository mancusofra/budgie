import { budgetMonthKey, budgetStatus } from '@/lib/budget';
import { customPeriod, periodRange, type Period } from '@/lib/period';
import { chartWindow, fillSeries, percentChange } from '@/lib/series';

const anchor = new Date(2026, 8, 28, 15);

describe('chartWindow', () => {
  const win = (p: Period, extra = {}) => chartWindow(p, periodRange(p), extra);

  it('day → last 7 days, one bar per day', () => {
    expect(win({ kind: 'day', anchor })).toEqual({
      from: new Date(2026, 8, 22),
      to: new Date(2026, 8, 29),
      bucket: 'day',
    });
  });

  it('month → one day per bar; year → one month per bar', () => {
    expect(win({ kind: 'month', anchor }).bucket).toBe('day');
    expect(win({ kind: 'year', anchor })).toEqual({
      from: new Date(2026, 0, 1),
      to: new Date(2027, 0, 1),
      bucket: 'month',
    });
  });

  it('long range → by month; all time → from the first transaction', () => {
    const long = customPeriod(new Date(2026, 0, 15), new Date(2026, 5, 10));
    expect(win(long)).toEqual({
      from: new Date(2026, 0, 1),
      to: new Date(2026, 6, 1),
      bucket: 'month',
    });
    expect(win({ kind: 'all', anchor }, { firstDate: new Date(2026, 6, 20), now: anchor })).toEqual(
      {
        from: new Date(2026, 6, 1),
        to: new Date(2026, 9, 1),
        bucket: 'month',
      },
    );
  });
});

describe('fillSeries', () => {
  it('fills empty buckets with 0, in order', () => {
    const w = { from: new Date(2026, 8, 1), to: new Date(2026, 8, 4), bucket: 'day' as const };
    expect(fillSeries(w, [{ key: '2026-09-02', total: 500 }]).map((p) => [p.key, p.value])).toEqual(
      [
        ['2026-09-01', 0],
        ['2026-09-02', 500],
        ['2026-09-03', 0],
      ],
    );
    const m = { from: new Date(2026, 0, 1), to: new Date(2026, 3, 1), bucket: 'month' as const };
    expect(fillSeries(m, []).map((p) => p.key)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});

describe('percentChange / budgetStatus', () => {
  it('computes the change, null without a previous period', () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(50, 100)).toBeCloseTo(-50);
    expect(percentChange(50, 0)).toBeNull();
  });

  it('levels: ok < 80% ≤ warning < 100% ≤ over', () => {
    expect(budgetStatus(7999, 10000).level).toBe('ok');
    expect(budgetStatus(8000, 10000).level).toBe('warning');
    expect(budgetStatus(10000, 10000)).toEqual({ ratio: 1, level: 'over', remaining: 0 });
    expect(budgetStatus(12000, 10000).remaining).toBe(-2000);
  });
});

describe('budgetMonthKey', () => {
  it('uses the start of the accounting month', () => {
    expect(budgetMonthKey(new Date(2026, 8, 28))).toBe('2026-09');
    // month starting on the 27th: September 10 belongs to the month that started on August 27
    expect(budgetMonthKey(new Date(2026, 8, 10), 27)).toBe('2026-08');
    expect(budgetMonthKey(new Date(2026, 8, 28), 27)).toBe('2026-09');
  });
});
