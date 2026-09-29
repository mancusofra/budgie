import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/features/transactions/hooks';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { TransferForm } from '@/features/transactions/transfer-form';
import { useTheme } from '@/hooks/use-theme';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const transaction = useTransaction(id);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  // Eliminata altrove (o id non valido): chiudi
  useEffect(() => {
    if (transaction === null) router.back();
  }, [transaction]);

  if (!transaction) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  if (transaction.type === 'transfer') {
    return (
      <TransferForm
        initial={{
          ...transaction,
          toAccountId: transaction.toAccountId ?? undefined,
        }}
        onSubmit={(values) => updateTransaction(transaction.id, values)}
        onDelete={async () => {
          router.back();
          await deleteTransaction(transaction);
        }}
      />
    );
  }

  return (
    <TransactionForm
      type={transaction.type}
      initial={transaction}
      recurringId={transaction.recurringId}
      // In modifica "Ripeti" non c'è: repeat è sempre null
      onSubmit={({ repeat: _, ...values }) => updateTransaction(transaction.id, values)}
      onDelete={async () => {
        router.back();
        await deleteTransaction(transaction);
      }}
    />
  );
}
