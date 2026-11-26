import { enUS } from 'date-fns/locale';

import { escapeHtml, renderReportHtml, type ReportLabels } from '@/features/report/html';
import { buildReport, type ReportTransaction } from '@/features/report/report';

let id = 0;
const tx = (
  date: Date,
  type: 'expense' | 'income' | 'transfer',
  amount: number,
  extra: Partial<ReportTransaction> & { note?: string } = {},
): ReportTransaction => ({
  transaction: { id: String(++id), date, type, amount, note: extra.note ?? null },
  category: type === 'transfer' ? null : (extra.category ?? { name: 'Food', color: '#5B9A5D' }),
  account: extra.account ?? { name: 'Cash', currency: 'EUR' },
  toAccount: extra.toAccount ?? (type === 'transfer' ? { name: 'Bank' } : null),
});

const rows = [
  tx(new Date(2026, 8, 20), 'expense', 1500),
  tx(new Date(2026, 8, 3), 'income', 200000, { category: { name: 'Salary', color: '#306E4E' } }),
  tx(new Date(2026, 9, 1), 'expense', 4500, { category: { name: 'House', color: '#9A8070' } }),
  tx(new Date(2026, 9, 2), 'transfer', 10000),
  tx(new Date(2026, 9, 5), 'expense', 1000, { account: { name: 'Card US', currency: 'USD' } }),
];

const labels = Object.fromEntries(
  [
    'title',
    'generatedOn',
    'accounts',
    'allAccounts',
    'summary',
    'income',
    'expenses',
    'balance',
    'transactions',
    'byCategory',
    'share',
    'monthDetail',
    'date',
    'category',
    'note',
    'account',
    'amount',
    'transfer',
    'monthTotal',
    'empty',
  ].map((k) => [k, `[${k}]`]),
) as ReportLabels;

describe('buildReport', () => {
  const report = buildReport(rows);

  it('groups by month in chronological order, oldest transaction first', () => {
    expect(report.months.map((m) => m.key)).toEqual(['2026-09', '2026-10']);
    expect(report.months[0].rows.map((r) => r.transaction.type)).toEqual(['income', 'expense']);
    expect(report.count).toBe(5);
  });

  it('keeps totals per currency and leaves transfers out of income and expenses', () => {
    expect(report.totals.get('EUR')).toEqual({ income: 200000, expense: 6000, count: 4 });
    expect(report.totals.get('USD')).toEqual({ income: 0, expense: 1000, count: 1 });
    expect(report.months[1].totals.get('EUR')).toEqual({ income: 0, expense: 4500, count: 2 });
  });

  it('breaks expenses down by category with shares within the currency', () => {
    expect(report.byCategory.map((c) => [c.currency, c.name, c.total])).toEqual([
      ['EUR', 'House', 4500],
      ['EUR', 'Food', 1500],
      ['USD', 'Food', 1000],
    ]);
    expect(report.byCategory[0].share).toBeCloseTo(0.75);
    expect(report.byCategory[2].share).toBe(1);
  });

  it('handles an empty list', () => {
    expect(buildReport([])).toMatchObject({ count: 0, months: [], byCategory: [] });
  });
});

describe('renderReportHtml', () => {
  const render = (input = rows, accountNames: string[] = []) =>
    renderReportHtml({
      report: buildReport(input),
      labels,
      periodLabel: '1 Sep – 31 Oct 2026',
      accountNames,
      numberLocale: 'en-US',
      dateLocale: enUS,
      now: new Date(2026, 9, 12, 9, 30),
    });

  it('contains summary, categories and every month', () => {
    const html = render();
    expect(html).toContain('[summary]');
    expect(html).toContain('September 2026');
    expect(html).toContain('October 2026');
    expect(html).toContain('€2,000.00');
    expect(html).toContain('−€15.00');
    expect(html).toContain('Cash → Bank');
    expect(html).toContain('[allAccounts]');
    expect(html).toContain('12 October 2026, 09:30');
  });

  it('shows separate totals for each currency', () => {
    const html = render();
    expect(html).toContain('<h3 class="currency">EUR</h3>');
    expect(html).toContain('<h3 class="currency">USD</h3>');
  });

  it('lists the chosen accounts and escapes user text', () => {
    const html = render(
      [tx(new Date(2026, 8, 1), 'expense', 100, { note: '<script>alert(1)</script> & co' })],
      ['Cash', 'R&D <card>'],
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; co');
    expect(html).toContain('Cash, R&amp;D &lt;card&gt;');
  });

  it('says there are no transactions when the report is empty', () => {
    expect(render([])).toContain('<p class="empty">[empty]</p>');
  });

  it('escapeHtml escapes every special character', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});
