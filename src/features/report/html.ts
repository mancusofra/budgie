import { format, type Locale } from 'date-fns';

import { formatMoney } from '@/lib/money';
import { Colors } from '@/theme';

import type { Report, ReportTransaction, Totals } from './report';

export type ReportLabels = {
  title: string;
  generatedOn: string;
  accounts: string;
  allAccounts: string;
  summary: string;
  income: string;
  expenses: string;
  balance: string;
  transactions: string;
  byCategory: string;
  share: string;
  monthDetail: string;
  date: string;
  category: string;
  note: string;
  account: string;
  amount: string;
  transfer: string;
  monthTotal: string;
  empty: string;
};

export type ReportOptions = {
  report: Report;
  labels: ReportLabels;
  /** Readable period, e.g. "1 Sep – 30 Sep 2026". */
  periodLabel: string;
  /** Names of the selected accounts; empty = all accounts. */
  accountNames: string[];
  /** BCP 47 locale for numbers, e.g. "it-IT". */
  numberLocale: string;
  /** date-fns locale for dates and month names. */
  dateLocale?: Locale;
  logo?: string;
  now?: Date;
};

/** Printed reports always use the light theme. */
const c = Colors.light;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes user text (notes, names) before it goes into the HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Self-contained HTML of the report, ready for expo-print (A4, light theme). */
export function renderReportHtml({
  report,
  labels: l,
  periodLabel,
  accountNames,
  numberLocale,
  dateLocale,
  logo,
  now = new Date(),
}: ReportOptions): string {
  const money = (minor: number, currency: string) => formatMoney(minor, currency, numberLocale);
  const signed = (minor: number, currency: string) =>
    minor < 0 ? `−${money(-minor, currency)}` : `+${money(minor, currency)}`;
  const date = (d: Date, pattern: string) => format(d, pattern, { locale: dateLocale });

  const summaryCards = (currency: string, t: Totals) => {
    const balance = t.income - t.expense;
    return `
      <div class="cards">
        <div class="card"><div class="label">${escapeHtml(l.income)}</div>
          <div class="value income">${money(t.income, currency)}</div></div>
        <div class="card"><div class="label">${escapeHtml(l.expenses)}</div>
          <div class="value expense">${money(t.expense, currency)}</div></div>
        <div class="card"><div class="label">${escapeHtml(l.balance)}</div>
          <div class="value ${balance < 0 ? 'expense' : 'income'}">${signed(balance, currency)}</div></div>
        <div class="card"><div class="label">${escapeHtml(l.transactions)}</div>
          <div class="value">${t.count}</div></div>
      </div>`;
  };

  const multiCurrency = report.totals.size > 1;
  const summary = [...report.totals]
    .map(
      ([currency, t]) =>
        (multiCurrency ? `<h3 class="currency">${escapeHtml(currency)}</h3>` : '') +
        summaryCards(currency, t),
    )
    .join('');

  // Bars relative to the largest category of the same currency (a 7% share would be a dot)
  const maxByCurrency = new Map<string, number>();
  for (const cat of report.byCategory) {
    maxByCurrency.set(cat.currency, Math.max(maxByCurrency.get(cat.currency) ?? 0, cat.total));
  }
  const categoryRows = report.byCategory
    .map(
      (cat) => `
      <tr>
        <td><span class="dot" style="background:${escapeHtml(cat.color)}"></span>${escapeHtml(cat.name)}</td>
        <td class="bar-cell"><div class="bar" style="width:${((cat.total / (maxByCurrency.get(cat.currency) || 1)) * 100).toFixed(1)}%;background:${escapeHtml(cat.color)}"></div></td>
        <td class="num muted">${Math.round(cat.share * 100)}%</td>
        <td class="num">${money(cat.total, cat.currency)}</td>
      </tr>`,
    )
    .join('');

  const row = ({ transaction: tx, category, account, toAccount }: ReportTransaction) => {
    const isTransfer = tx.type === 'transfer';
    const amount = isTransfer
      ? money(tx.amount, account.currency)
      : signed(tx.type === 'expense' ? -tx.amount : tx.amount, account.currency);
    const accountText = isTransfer ? `${account.name} → ${toAccount?.name ?? '—'}` : account.name;
    return `
      <tr>
        <td class="nowrap">${date(tx.date, 'd MMM')}</td>
        <td>${escapeHtml(isTransfer ? l.transfer : (category?.name ?? '—'))}</td>
        <td class="muted">${escapeHtml(tx.note ?? '')}</td>
        <td class="muted">${escapeHtml(accountText)}</td>
        <td class="num ${isTransfer ? 'muted' : tx.type}">${amount}</td>
      </tr>`;
  };

  const monthTotals = (totals: Map<string, Totals>) =>
    [...totals]
      .map(
        ([currency, t]) =>
          `${escapeHtml(l.income)} <b class="income">${money(t.income, currency)}</b> · ` +
          `${escapeHtml(l.expenses)} <b class="expense">${money(t.expense, currency)}</b> · ` +
          `${escapeHtml(l.balance)} <b>${signed(t.income - t.expense, currency)}</b>`,
      )
      .join('<br/>');

  const months = report.months
    .map(
      (m) => `
      <section class="month">
        <h3>${escapeHtml(capitalize(date(m.start, 'LLLL yyyy')))}</h3>
        <table class="detail">
          <thead><tr>
            <th>${escapeHtml(l.date)}</th><th>${escapeHtml(l.category)}</th><th>${escapeHtml(l.note)}</th>
            <th>${escapeHtml(l.account)}</th><th class="num">${escapeHtml(l.amount)}</th>
          </tr></thead>
          <tbody>${m.rows.map(row).join('')}</tbody>
        </table>
        <div class="month-total"><span>${escapeHtml(l.monthTotal)}</span><span>${monthTotals(m.totals)}</span></div>
      </section>`,
    )
    .join('');

  const accounts = accountNames.length ? accountNames.join(', ') : l.allAccounts;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
    color: ${c.text}; font-size: 10.5pt; line-height: 1.4; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px;
    border-bottom: 2px solid ${c.primary}; margin-bottom: 18px; }
  header img { width: 44px; height: 44px; border-radius: 11px; }
  h1 { font-size: 18pt; margin: 0; letter-spacing: -0.2px; }
  h2 { font-size: 12pt; margin: 22px 0 10px; color: ${c.primary}; text-transform: uppercase;
    letter-spacing: 0.6px; }
  h3 { font-size: 11.5pt; margin: 0 0 8px; }
  h3.currency { color: ${c.textSecondary}; margin-top: 12px; }
  .meta { color: ${c.textSecondary}; font-size: 9.5pt; }
  .cards { display: flex; flex-wrap: wrap; gap: 8px; }
  .card { flex: 1 1 110px; background: ${c.surface}; border-radius: 12px; padding: 10px 12px; }
  .label { font-size: 8pt; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
    color: ${c.textSecondary}; }
  .value { font-size: 13pt; font-weight: 700; margin-top: 2px; }
  .income { color: ${c.income}; }
  .expense { color: ${c.expense}; }
  .muted { color: ${c.textSecondary}; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px;
    color: ${c.textSecondary}; font-weight: 600; padding: 6px 6px; border-bottom: 1px solid ${c.border}; }
  td { padding: 5px 6px; border-bottom: 1px solid ${c.border}; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 7px; }
  .bar-cell { width: 34%; }
  .bar { height: 7px; border-radius: 4px; min-width: 2px; }
  .month { margin-top: 18px; }
  .month h3 { page-break-after: avoid; }
  .month-total { display: flex; justify-content: space-between; gap: 12px; background: ${c.surface};
    border-radius: 10px; padding: 8px 10px; margin-top: 6px; font-size: 9.5pt; page-break-inside: avoid; }
  .month-total span:last-child { text-align: right; }
  .empty { color: ${c.textSecondary}; padding: 24px 0; text-align: center; }
  footer { margin-top: 24px; color: ${c.textSecondary}; font-size: 8pt; text-align: center; }
</style></head>
<body>
  <header>
    ${logo ? `<img src="${logo}" alt="" />` : ''}
    <div>
      <h1>${escapeHtml(l.title)}</h1>
      <div class="meta">${escapeHtml(periodLabel)} · ${escapeHtml(l.accounts)}: ${escapeHtml(accounts)}</div>
    </div>
  </header>
  ${
    report.count === 0
      ? `<p class="empty">${escapeHtml(l.empty)}</p>`
      : `<h2>${escapeHtml(l.summary)}</h2>${summary}
  ${report.byCategory.length ? `<h2>${escapeHtml(l.byCategory)}</h2><table><tbody>${categoryRows}</tbody></table>` : ''}
  <h2>${escapeHtml(l.monthDetail)}</h2>${months}`
  }
  <footer>${escapeHtml(l.generatedOn)} ${date(now, 'd MMMM yyyy, HH:mm')} · Budgie</footer>
</body></html>`;
}
