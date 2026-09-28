import { useLocalSearchParams } from 'expo-router';

import { useAddTransaction } from '@/features/transactions/hooks';
import { TransactionForm } from '@/features/transactions/transaction-form';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; categoryId?: string }>();
  const type = params.type === 'income' ? 'income' : 'expense';
  const addTransaction = useAddTransaction();

  return (
    <TransactionForm
      type={type}
      initial={{ categoryId: params.categoryId }}
      onSubmit={(values) => addTransaction({ type, ...values })}
    />
  );
}
