import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addMonths, startOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { AmountField } from '@/components/ui/amount-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { RowSeparator } from '@/components/ui/nav-row';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Recurring } from '@/db/schema';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import {
  recurringActions,
  REPEAT_OPTIONS,
  repeatLabel,
  useRecurring,
} from '@/features/recurring/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator } from '@/i18n';
import { withAlpha } from '@/lib/color';
import { applyKey, evaluate, minorToExpression } from '@/lib/expression';
import { nextOccurrence } from '@/lib/recurrence';
import { Radius, Spacing } from '@/theme';

export default function RecurringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useRecurring(id);
  if (!item) return null;
  return <RecurringForm key={item.id} item={item} />;
}

function RecurringForm({ item }: { item: Recurring }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(t('recurring.edit'));
  const insets = useSafeAreaInsets();
  const account = useAccounts().find((a) => a.id === item.accountId);
  const category = useCategories(undefined, { includeArchived: true }).find(
    (c) => c.id === item.categoryId,
  );
  const currency = account?.currency ?? 'EUR';

  const initialNext = nextOccurrence(item) ?? startOfDay(new Date());
  const [expr, setExpr] = useState(minorToExpression(item.amount, currency));
  const [padOpen, setPadOpen] = useState(false);
  const [frequency, setFrequency] = useState(item.frequency);
  const [interval, setInterval] = useState(item.interval);
  const [next, setNext] = useState(initialNext);
  const [endDate, setEndDate] = useState(item.endDate);
  const [note, setNote] = useState(item.note ?? '');
  const [paused, setPaused] = useState(item.paused);
  const [error, setError] = useState<string>();

  const color =
    item.type === 'expense' ? theme.expense : item.type === 'income' ? theme.income : theme.primary;

  const save = async () => {
    const amount = evaluate(expr, currency);
    if (!amount || amount <= 0) {
      setError(t('transaction.invalidAmount'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const scheduleChanged =
      frequency !== item.frequency ||
      interval !== item.interval ||
      +startOfDay(next) !== +startOfDay(initialNext);
    try {
      await recurringActions.update(item.id, {
        amount,
        note,
        frequency,
        interval,
        endDate,
        paused,
        // Nuovo calendario: la prossima data scelta diventa l'inizio
        ...(scheduleChanged ? { startDate: next } : {}),
      });
      recurringActions.materialize();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = () =>
    Alert.alert(t('recurring.deleteConfirm'), t('recurring.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await recurringActions.remove(item.id);
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setPadOpen(false)}>
        <View style={styles.summary}>
          <CategoryIcon
            icon={item.type === 'transfer' ? 'swap-horizontal' : (category?.icon ?? 'help')}
            color={category?.color ?? theme.textSecondary}
            size={44}
          />
          <View style={styles.flex}>
            <Text style={styles.name}>{category?.name ?? t('transactions.transfer')}</Text>
            <Text variant="caption" color="textSecondary">
              {account?.name}
            </Text>
          </View>
        </View>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('csv.amount')}
          </Text>
          <AmountField
            expr={expr}
            active={padOpen}
            onPress={() => setPadOpen(true)}
            suffix={currency}
            color={color}
            size={26}
            accessibilityLabel={t('csv.amount')}
          />
          {error && <Text style={{ color: theme.expense }}>{error}</Text>}
          <TextInput
            value={note}
            onChangeText={setNote}
            onFocus={() => setPadOpen(false)}
            placeholder={t('transaction.note')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.note, { color: theme.text, borderColor: theme.border }]}
            maxLength={200}
          />
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('recurring.frequency')}
          </Text>
          {REPEAT_OPTIONS.map((o) => {
            const selected = o.frequency === frequency && o.interval === interval;
            return (
              <Pressable
                key={`${o.frequency}${o.interval}`}
                onPress={() => {
                  setPadOpen(false);
                  setFrequency(o.frequency);
                  setInterval(o.interval);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.option,
                  { backgroundColor: selected ? withAlpha(theme.primary, 0.14) : 'transparent' },
                ]}>
                <Text style={[styles.flex, selected && styles.selected]}>
                  {repeatLabel(t, o.frequency, o.interval)}
                </Text>
                {selected && (
                  <MaterialCommunityIcons name="check" size={20} color={theme.primary} />
                )}
              </Pressable>
            );
          })}
          <RowSeparator />
          <DateField label={t('recurring.nextDate')} value={next} onChange={setNext} />
          <View style={styles.switchRow}>
            <Text style={styles.flex}>{t('recurring.noEnd')}</Text>
            <Switch
              value={!endDate}
              onValueChange={(v) => setEndDate(v ? null : addMonths(next, 12))}
              accessibilityLabel={t('recurring.noEnd')}
            />
          </View>
          {endDate && (
            <DateField label={t('recurring.endDate')} value={endDate} onChange={setEndDate} />
          )}
          <Text variant="caption" color="textSecondary">
            {t('recurring.futureHint')}
          </Text>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.switchRow}>
            <MaterialCommunityIcons name="pause-circle-outline" size={22} color={theme.primary} />
            <Text style={styles.flex}>{t('recurring.pause')}</Text>
            <Switch
              value={paused}
              onValueChange={setPaused}
              accessibilityLabel={t('recurring.pause')}
            />
          </View>
          <Text variant="caption" color="textSecondary">
            {t('recurring.pauseHint')}
          </Text>
        </Surface>

        <Button title={t('recurring.delete')} color="expense" onPress={remove} />
      </ScrollView>
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        {padOpen ? (
          <AmountPad
            onKey={(key) => {
              setError(undefined);
              setExpr((e) => applyKey(e, key, currency));
            }}
            onDone={() => setPadOpen(false)}
            decimalSeparator={decimalSeparator}
            labels={{
              backspace: t('keypad.backspace'),
              comma: t('keypad.comma'),
              done: t('stats.done'),
            }}
          />
        ) : (
          <Button title={t('common.save')} filled onPress={save} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { fontWeight: '600', fontSize: 17 },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.two },
  note: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two + 2,
    borderRadius: Radius,
  },
  selected: { fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  flex: { flex: 1 },
});
