import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/features/transactions/hooks';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
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
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text color="textSecondary" style={styles.text}>
          {t('transactions.editTransferUnsupported')}
        </Text>
        <Button
          title={t('common.delete')}
          color="expense"
          onPress={async () => {
            router.back();
            await deleteTransaction(transaction);
          }}
        />
      </View>
    );
  }

  return (
    <TransactionForm
      type={transaction.type}
      initial={transaction}
      onSubmit={(values) => updateTransaction(transaction.id, values)}
      onDelete={async () => {
        router.back();
        await deleteTransaction(transaction);
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  text: { textAlign: 'center' },
});
