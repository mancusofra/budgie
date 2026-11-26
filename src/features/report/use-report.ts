import { addDays, format, isSameYear } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { repos } from '@/db/client';
import { dateLocale, deviceLocale } from '@/i18n';

import { renderReportHtml, type ReportLabels } from './html';
import { REPORT_LOGO } from './logo';
import { buildReport } from './report';

export type ReportOptions = {
  /** Half-open range [from, to); both undefined = all time. */
  from?: Date;
  to?: Date;
  /** Selected accounts; undefined = all accounts. */
  accounts?: { id: string; name: string }[];
};

export type ReportFile = { uri: string; name: string; count: number };

/** A4 at 72 dpi (expo-print defaults to US Letter). */
const A4 = { width: 595, height: 842 };

/** "1 – 30 Sep 2026", "28 Dec 2025 – 3 Jan 2026" (last day inclusive). */
function rangeLabel(first: Date, last: Date, locale: ReturnType<typeof dateLocale>) {
  const f = (d: Date, p: string) => format(d, p, { locale });
  return isSameYear(first, last)
    ? `${f(first, 'd MMM')} – ${f(last, 'd MMM yyyy')}`
    : `${f(first, 'd MMM yyyy')} – ${f(last, 'd MMM yyyy')}`;
}

export function useReport() {
  const { t, i18n } = useTranslation();

  /** Builds the PDF; null if there are no transactions in the period and accounts. */
  const build = useCallback(
    async ({ from, to, accounts }: ReportOptions): Promise<ReportFile | null> => {
      const rows = await repos.transactions.listDetailed({
        from,
        to,
        accountIds: accounts?.map((a) => a.id),
      });
      if (rows.length === 0) return null;

      const locale = dateLocale(i18n.language);
      const dates = rows.map((r) => +r.transaction.date);
      const first = from ?? new Date(Math.min(...dates));
      const last = to ? addDays(to, -1) : new Date(Math.max(...dates));
      const labels: ReportLabels = {
        title: t('report.pdfTitle'),
        generatedOn: t('report.generatedOn'),
        accounts: t('report.accounts'),
        allAccounts: t('accounts.all'),
        summary: t('report.summary'),
        income: t('home.income'),
        expenses: t('home.expenses'),
        balance: t('home.balance'),
        transactions: t('transactions.title'),
        byCategory: t('stats.byCategory'),
        share: '%',
        monthDetail: t('report.monthDetail'),
        date: t('csv.date'),
        category: t('csv.category'),
        note: t('csv.note'),
        account: t('csv.account'),
        amount: t('csv.amount'),
        transfer: t('transactions.transfer'),
        monthTotal: t('report.monthTotal'),
        empty: t('report.empty'),
      };

      const html = renderReportHtml({
        report: buildReport(rows),
        labels,
        periodLabel: rangeLabel(first, last, locale),
        accountNames: accounts?.map((a) => a.name) ?? [],
        numberLocale: deviceLocale,
        dateLocale: locale,
        logo: REPORT_LOGO,
      });

      const { base64 } = await Print.printToFileAsync({
        html,
        ...A4,
        base64: true,
        // iOS only; on Android the @page margins of the HTML apply
        margins: { top: 40, bottom: 40, left: 36, right: 36 },
      });

      // Written to the app's own cache with a readable name: expo-print saves to a folder
      // that, in Expo Go, the app can't move, rename or share from
      const name = `budgie-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(base64 ?? '', { encoding: 'base64' });
      return { uri: file.uri, name, count: rows.length };
    },
    [t, i18n.language],
  );

  /** Opens the system share sheet (save to Files, mail, messages…). */
  const share = useCallback(async ({ uri, name }: ReportFile) => {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: name,
    });
  }, []);

  /** Opens the system print preview (print or save as PDF). */
  const preview = useCallback(({ uri }: ReportFile) => Print.printAsync({ uri }), []);

  return { build, share, preview };
}
