import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { isSameDay, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { Keypad } from '@/components/ui/keypad';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Category } from '@/db/schema';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency } from '@/features/settings/hooks';
import { useAddTransaction } from '@/features/transactions/hooks';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator, deviceLocale } from '@/i18n';
import { applyKey, evaluate, hasOperator, type KeypadKey } from '@/lib/expression';
import { formatMoney } from '@/lib/money';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; categoryId?: string }>();
  const type = params.type === 'income' ? 'income' : 'expense';
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const accounts = useAccounts();
  const categories = useCategories(type);
  const accountFilter = useUIStore((s) => s.accountFilter);
  const addTransaction = useAddTransaction();

  const [expr, setExpr] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [accountId, setAccountId] = useState<string>();
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const account =
    accounts.find((a) => a.id === accountId) ??
    accounts.find((a) => a.id === accountFilter) ??
    accounts[0];
  const category = categories.find((c) => c.id === params.categoryId);
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

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selected) => event.type === 'set' && selected && setDate(selected),
      });
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
      await addTransaction({
        type,
        amount,
        accountId: account.id,
        categoryId: target.id,
        date,
        note,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      setError(t('transaction.saveError'));
      setSaving(false);
    }
  };

  const today = new Date();
  const yesterday = subDays(today, 1);
  const dateChip = (label: string, value: Date) => {
    const selected = isSameDay(date, value);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => setDate(value)}>
        <Surface interactive tint={selected ? color : undefined} style={styles.chip}>
          <Text variant="caption" style={[styles.chipLabel, selected && { color }]}>
            {label}
          </Text>
        </Surface>
      </Pressable>
    );
  };
  const isCustomDate = !isSameDay(date, today) && !isSameDay(date, yesterday);

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
          {t(type === 'expense' ? 'transaction.newExpense' : 'transaction.newIncome')}
        </Text>
        <Pressable onPress={cycleAccount} accessibilityRole="button">
          <Surface interactive style={styles.chip}>
            <MaterialCommunityIcons name="wallet-outline" size={16} color={theme.textSecondary} />
            <Text variant="caption" style={styles.chipLabel}>
              {account?.name ?? '—'}
            </Text>
          </Surface>
        </Pressable>
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
              onPress={() => save(c)}
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
          <View style={styles.dates}>
            {dateChip(t('transaction.today'), today)}
            {dateChip(t('transaction.yesterday'), yesterday)}
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={date}
                mode="date"
                display="compact"
                maximumDate={today}
                onChange={(_, d) => d && setDate(d)}
              />
            ) : (
              <Pressable
                onPress={pickDate}
                accessibilityRole="button"
                accessibilityLabel={t('transaction.pickDate')}>
                <Surface interactive tint={isCustomDate ? color : undefined} style={styles.chip}>
                  <MaterialCommunityIcons
                    name="calendar-blank-outline"
                    size={16}
                    color={isCustomDate ? color : theme.textSecondary}
                  />
                  {isCustomDate && (
                    <Text variant="caption" style={[styles.chipLabel, { color }]}>
                      {date.toLocaleDateString(deviceLocale)}
                    </Text>
                  )}
                </Surface>
              </Pressable>
            )}
          </View>

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
  dates: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
