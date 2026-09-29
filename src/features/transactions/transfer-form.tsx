import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateChips } from '@/components/transactions/date-chips';
import { Button } from '@/components/ui/button';
import { KEYBOARD_DONE_ID, KeyboardDoneAccessory } from '@/components/ui/keyboard-done';
import { Keypad } from '@/components/ui/keypad';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Account } from '@/db/schema';
import { useAccounts } from '@/features/accounts/hooks';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator, deviceLocale } from '@/i18n';
import { withAlpha } from '@/lib/color';
import {
  applyKey,
  evaluate,
  hasOperator,
  minorToExpression,
  type KeypadKey,
} from '@/lib/expression';
import { formatMoney, parseAmount } from '@/lib/money';
import { Radius, Spacing } from '@/theme';

export type TransferValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  toAmount: number | null;
  date: Date;
  note: string;
};

type Props = {
  initial?: Partial<Omit<TransferValues, 'note'>> & { note?: string | null };
  onSubmit: (values: TransferValues) => Promise<unknown>;
  onDelete?: () => void;
};

/** Trasferimento tra due conti; con valute diverse chiede l'importo accreditato. */
export function TransferForm({ initial, onSubmit, onDelete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const accounts = useAccounts();

  const [fromId, setFromId] = useState(initial?.accountId);
  const [toId, setToId] = useState(initial?.toAccountId);
  const from = accounts.find((a) => a.id === fromId) ?? accounts[0];
  const to = accounts.find((a) => a.id === toId) ?? accounts.find((a) => a.id !== from?.id);
  const currency = from?.currency ?? 'EUR';

  const [expr, setExpr] = useState(() =>
    initial?.amount ? minorToExpression(initial.amount, currency) : '',
  );
  const [toAmountText, setToAmountText] = useState(() =>
    initial?.toAmount && to
      ? minorToExpression(initial.toAmount, to.currency).replace(',', decimalSeparator)
      : '',
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(() => initial?.date ?? new Date());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const amount = evaluate(expr, currency);
  const differentCurrency = !!from && !!to && from.currency !== to.currency;
  const color = theme.primary;

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

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const save = async () => {
    if (!from || !to) return;
    if (from.id === to.id) return fail(t('transfer.sameAccount'));
    if (!amount || amount <= 0) return fail(t('transaction.invalidAmount'));
    let toAmount: number | null = null;
    if (differentCurrency) {
      toAmount = parseAmount(toAmountText, to.currency);
      if (!toAmount || toAmount <= 0) return fail(t('accounts.invalidAmount'));
    }
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit({ amount, accountId: from.id, toAccountId: to.id, toAmount, date, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      setSaving(false);
      fail(t('transaction.saveError'));
    }
  };

  const accountChips = (selected: Account | undefined, onSelect: (id: string) => void) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}>
      {accounts.map((a) => {
        const isSelected = a.id === selected?.id;
        return (
          <Pressable
            key={a.id}
            onPress={() => {
              onSelect(a.id);
              setError(undefined);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.chip,
              { backgroundColor: isSelected ? withAlpha(color, 0.18) : theme.surface },
            ]}>
            <Text variant="caption" style={[styles.chipLabel, isSelected && { color }]}>
              {a.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (accounts.length > 0 && accounts.length < 2) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name="swap-horizontal" size={40} color={theme.textSecondary} />
        <Text color="textSecondary" style={styles.centerText}>
          {t('transfer.needTwoAccounts')}
        </Text>
        <Button
          title={t('transfer.addAccount')}
          filled
          onPress={() => {
            router.back();
            router.push({ pathname: '/account/[id]', params: { id: 'new' } });
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
        <Text variant="subtitle">{t('transfer.title')}</Text>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}>
            <Surface interactive style={styles.round}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={theme.expense} />
            </Surface>
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>

      <View style={styles.accounts}>
        <Text variant="overline" color="textSecondary">
          {t('transfer.from')}
        </Text>
        {accountChips(from, setFromId)}
        <Text variant="overline" color="textSecondary">
          {t('transfer.to')}
        </Text>
        {accountChips(to, setToId)}
      </View>

      <View style={styles.display}>
        <Text style={[styles.amount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {expr ? expr.replaceAll(',', decimalSeparator) : formatMoney(0, currency, deviceLocale)}
        </Text>
        {hasOperator(expr) && amount !== null && (
          <Text color="textSecondary">= {formatMoney(amount, currency, deviceLocale)}</Text>
        )}
        {error && <Text style={{ color: theme.expense }}>{error}</Text>}
      </View>

      <View style={styles.form}>
        {differentCurrency && to && (
          <Surface style={styles.inputBox}>
            <Text variant="caption" color="textSecondary">
              {t('transfer.received')} ({to.currency})
            </Text>
            <TextInput
              value={toAmountText}
              onChangeText={(v) => {
                setToAmountText(v);
                setError(undefined);
              }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              inputAccessoryViewID={KEYBOARD_DONE_ID}
              placeholder={`0${decimalSeparator}00`}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
            />
          </Surface>
        )}
        <Surface style={styles.noteBox}>
          <MaterialCommunityIcons name="text" size={18} color={theme.textSecondary} />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('transaction.note')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, styles.flex, { color: theme.text }]}
            maxLength={200}
          />
        </Surface>
        <DateChips value={date} onChange={setDate} color={color} />
        <Keypad
          onKey={(key: KeypadKey) => {
            setError(undefined);
            setExpr((e) => applyKey(e, key, currency));
          }}
          labels={keyLabels}
          decimalSeparator={decimalSeparator}
        />
        <Button title={t('common.save')} filled onPress={save} disabled={saving} />
      </View>
      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accounts: { gap: Spacing.one + 2 },
  chips: { gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 3, borderRadius: 999 },
  chipLabel: { fontWeight: '500' },
  display: { alignItems: 'flex-end', minHeight: 72, justifyContent: 'center' },
  amount: { fontSize: 44, lineHeight: 52, fontWeight: '600', letterSpacing: -1 },
  form: { flex: 1, justifyContent: 'flex-end', gap: Spacing.two + 4 },
  inputBox: { borderRadius: Radius, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
  },
  input: { paddingVertical: Spacing.two + 2, fontSize: 16 },
  flex: { flex: 1 },
});
