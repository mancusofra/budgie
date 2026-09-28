import { useAddTransaction } from '@/features/transactions/hooks';
import { TransferForm } from '@/features/transactions/transfer-form';

export default function NewTransferScreen() {
  const addTransaction = useAddTransaction();
  return <TransferForm onSubmit={(values) => addTransaction({ type: 'transfer', ...values })} />;
}
