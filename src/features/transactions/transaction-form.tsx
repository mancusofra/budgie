import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { DateChips } from '@/components/transactions/date-chips';
import { Button } from '@/components/ui/button';
import { Keypad } from '@/components/ui/keypad';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Category } from '@/db/schema';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator, deviceLocale } from '@/i18n';
import {
  applyKey,
  evaluate,
  hasOperator,
  minorToExpression,
  type KeypadKey,
} from '@/lib/expression';
import { formatMoney } from '@/lib/money';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

export type TransactionFormValues = {
  amount: number;
  accountId: string;
  categoryId: string;
  date: Date;
  note: string;
};

type Props = {
  type: 'expense' | 'income';
  initial?: {
    amount?: number;
    note?: string | null;
    date?: Date;
    accountId?: string;
    categoryId?: string | null;
  };
  onSubmit: (values: TransactionFormValues) => Promise<unknown>;
  /** Presente in modifica: mostra il pulsante elimina. */
  onDelete?: () => void;
};

/**
 * Inserimento e modifica di spese/entrate: importo col tastierino, nota, data,
 * conto e categoria. In inserimento il tap su una categoria della griglia salva
 * subito; in modifica la seleziona soltanto.
 */
export function TransactionForm({ type, initial, onSubmit, onDelete }: Props) {
  const editing = !!onDelete;
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const accounts = useAccounts();
  const categories = useCategories(type);
  const accountFilter = useUIStore((s) => s.accountFilter);

  const [expr, setExpr] = useState(() =>
    initial?.amount ? minorToExpression(initial.amount, currency) : '',
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(() => initial?.date ?? new Date());
  const [accountId, setAccountId] = useState(initial?.accountId);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? undefined);
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const account =
    accounts.find((a) => a.id === accountId) ??
    accounts.find((a) => a.id === accountFilter) ??
    accounts[0];
  const category = categories.find((c) => c.id === categoryId);
  const amount = evaluate(expr, currency);
  const color = type === 'expense' ? theme.expense : theme.income;
  const money = (minor: number) => formatMoney(minor, currency, deviceLocale);

  const keyLabels = useMemo(
    () => ({
      backspace: t('keypad.backspace'),
      '+': t('keypad.plus'),
      '−': t('keypad.minus'),
      '×': t('keypad.times'),
      '÷': t('keypad.divide'),
      ',': t('keypad.comma'),
    }),
    [t],
  );

  const onKey = (key: KeypadKey) => {
    setError(undefined);
    setExpr((e) => applyKey(e, key, currency));
  };

  const cycleAccount = () => {
    if (accounts.length < 2 || !account) return;
    const i = accounts.findIndex((a) => a.id === account.id);
    setAccountId(accounts[(i + 1) % accounts.length].id);
  };

  const pickCategory = (c: Category) => {
    if (editing) {
      setCategoryId(c.id);
      setChoosingCategory(false);
    } else {
      setCategoryId(c.id);
      save(c);
    }
  };

  const save = async (chosen?: Category) => {
    const target = chosen ?? category;
    if (!amount || amount <= 0) {
      setChoosingCategory(false);
      setError(t('transaction.invalidAmount'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!target) {
      setChoosingCategory(true);
      return;
    }
    if (!account || saving) return;

    setSaving(true);
    try {
      await onSubmit({ amount, accountId: account.id, categoryId: target.id, date, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      setError(t('transaction.saveError'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('transaction.close')}>
          <Surface interactive style={styles.round}>
            <MaterialCommunityIcons name="close" size={22} color={theme.text} />
          </Surface>
        </Pressable>
        <Text variant="subtitle">
          {editing
            ? t('transaction.edit')
            : t(type === 'expense' ? 'transaction.newExpense' : 'transaction.newIncome')}
        </Text>
        <View style={styles.headerRight}>
          {onDelete && (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}>
              <Surface interactive style={styles.round}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={theme.expense} />
              </Surface>
            </Pressable>
          )}
          <Pressable onPress={cycleAccount} accessibilityRole="button">
            <Surface interactive style={styles.chip}>
              <MaterialCommunityIcons name="wallet-outline" size={16} color={theme.textSecondary} />
              <Text variant="caption" style={styles.chipLabel}>
                {account?.name ?? '—'}
              </Text>
            </Surface>
          </Pressable>
        </View>
      </View>

      {/* Importo */}
      <View style={styles.display}>
        <Text
          testID="amount-display"
          style={[styles.amount, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {expr ? expr.replaceAll(',', decimalSeparator) : money(0)}
        </Text>
        {hasOperator(expr) && amount !== null && (
          <Text color="textSecondary">= {money(amount)}</Text>
        )}
        {error && <Text style={{ color: theme.expense }}>{error}</Text>}
      </View>

      {choosingCategory ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => pickCategory(c)}
              style={({ pressed }) => [styles.gridItem, pressed && { opacity: 0.6 }]}>
              <CategoryIcon icon={c.icon} color={c.color} size={52} filled />
              <Text variant="caption" numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.form}>
          <Surface style={styles.noteBox}>
            <MaterialCommunityIcons name="text" size={18} color={theme.textSecondary} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('transaction.note')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.note, { color: theme.text }]}
              maxLength={200}
            />
          </Surface>
          <DateChips value={date} onChange={setDate} color={color} />

          <Keypad onKey={onKey} labels={keyLabels} decimalSeparator={decimalSeparator} />

          {category ? (
            <View style={styles.footer}>
              <Pressable
                onPress={() => setChoosingCategory(true)}
                style={styles.selected}
                accessibilityRole="button">
                <CategoryIcon icon={category.icon} color={category.color} size={40} filled />
                <Text numberOfLines={1} style={styles.selectedName}>
                  {category.name}
                </Text>
              </Pressable>
              <Button
                title={t('common.save')}
                color={type}
                filled
                onPress={() => save()}
                disabled={saving}
                style={styles.flex}
              />
            </View>
          ) : (
            <Button
              title={t('transaction.chooseCategory')}
              color={type}
              filled
              onPress={() => save()}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  display: { alignItems: 'flex-end', minHeight: 96, justifyContent: 'center' },
  amount: { fontSize: 52, lineHeight: 60, fontWeight: '600', letterSpacing: -1 },
  form: { flex: 1, justifyContent: 'flex-end', gap: Spacing.three },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
  },
  note: { flex: 1, paddingVertical: Spacing.two + 4, fontSize: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  chipLabel: { fontWeight: '500' },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.half,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  selected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, maxWidth: '45%' },
  selectedName: { flexShrink: 1, fontWeight: '600' },
  flex: { flex: 1 },
});
