import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { recurringActions, repeatLabel } from '@/features/recurring/hooks';
import { useAddTransaction } from '@/features/transactions/hooks';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { useSnackbar } from '@/store/snackbar';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; categoryId?: string }>();
  const type = params.type === 'income' ? 'income' : 'expense';
  const addTransaction = useAddTransaction();
  const { t } = useTranslation();
  const showSnackbar = useSnackbar((s) => s.show);

  return (
    <TransactionForm
      type={type}
      initial={{ categoryId: params.categoryId }}
      onSubmit={async ({ repeat, date, ...values }) => {
        if (!repeat) return addTransaction({ type, date, ...values });
        // La prima occorrenza è la data scelta: viene registrata subito se è già passata
        await recurringActions.create({ type, startDate: date, ...repeat, ...values });
        recurringActions.materialize();
        showSnackbar({
          message: t('recurring.created', {
            label: repeatLabel(t, repeat.frequency, repeat.interval),
          }),
        });
      }}
    />
  );
}
