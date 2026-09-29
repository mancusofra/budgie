import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { createBackup, parseBackup, restoreBackup, type Backup } from '@/db/backup';
import { db, repos } from '@/db/client';
import { refreshLiveQueries } from '@/db/live-query';
import { decimalSeparator } from '@/i18n';

import { transactionsCsv, transactionsJson } from './csv-export';

export type ExportFormat = 'csv' | 'json';
export type ExportOptions = { format: ExportFormat; from?: Date; to?: Date };

/** Scrive un file temporaneo e apre il foglio di condivisione di sistema. */
async function shareFile(name: string, content: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Condivisione non disponibile');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

const today = () => format(new Date(), 'yyyy-MM-dd');

export function useDataTransfer() {
  const { t } = useTranslation();

  /** Esporta le transazioni dell'intervallo [from, to) nel formato scelto; restituisce quante. */
  const exportData = useCallback(
    async ({ format: kind, from, to }: ExportOptions) => {
      const rows = await repos.transactions.listDetailed({ from, to });
      if (rows.length === 0) return 0;
      const name = `moneta-${today()}.${kind}`;
      if (kind === 'json') {
        await shareFile(name, transactionsJson(rows), 'application/json', 'public.json');
        return rows.length;
      }
      const csv = transactionsCsv(
        rows,
        {
          headers: [
            t('csv.date'),
            t('csv.type'),
            t('csv.category'),
            t('csv.account'),
            t('csv.toAccount'),
            t('csv.amount'),
            t('csv.currency'),
            t('csv.note'),
          ],
          types: {
            expense: t('transaction.newExpense'),
            income: t('transaction.newIncome'),
            transfer: t('transactions.transfer'),
          },
        },
        decimalSeparator,
      );
      await shareFile(name, csv, 'text/csv', 'public.comma-separated-values-text');
      return rows.length;
    },
    [t],
  );

  const exportBackup = useCallback(async () => {
    const backup = await createBackup(db);
    await shareFile(
      `moneta-backup-${today()}.json`,
      JSON.stringify(backup),
      'application/json',
      'public.json',
    );
  }, []);

  /** Sceglie e legge un backup; null se annullato. Il ripristino va confermato a parte. */
  const pickBackup = useCallback(async (): Promise<Backup | null> => {
    // Il selettore di expo-file-system restituisce un File già leggibile (con
    // expo-document-picker la lettura della copia veniva rifiutata per permessi)
    const picked = await File.pickFileAsync({
      mimeTypes: ['application/json', 'text/plain', '*/*'],
    });
    if (picked.canceled) return null;
    return parseBackup(await picked.result.text());
  }, []);

  const restore = useCallback((backup: Backup) => {
    restoreBackup(db, backup);
    refreshLiveQueries();
  }, []);

  return { exportData, exportBackup, pickBackup, restore };
}
