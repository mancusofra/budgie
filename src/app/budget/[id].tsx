import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { AmountField } from '@/components/ui/amount-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Budget } from '@/db/schema';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency, useSettings } from '@/features/settings/hooks';
import { budgetActions, useBudget } from '@/features/stats/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale, decimalSeparator } from '@/i18n';
import { budgetMonthKey } from '@/lib/budget';
import { withAlpha } from '@/lib/color';
import { applyKey, evaluate, minorToExpression } from '@/lib/expression';
import { Radius, Spacing } from '@/theme';

export default function BudgetScreen() {
  const { id, month } = useLocalSearchParams<{ id: string; month?: string }>();
  const isNew = id === 'new';
  const budget = useBudget(isNew ? undefined : id);
  const monthStartDay = useSettings().monthStartDay ?? 1;
  if (!isNew && !budget) return null;
  return (
    <BudgetForm
      key={budget?.id ?? 'new'}
      budget={budget ?? undefined}
      // Month the change applies to (the one shown in Stats)
      month={month ?? budgetMonthKey(new Date(), monthStartDay)}
    />
  );
}

function BudgetForm({ budget, month }: { budget?: Budget; month: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const header = useStackHeader(budget ? t('budget.edit') : t('budget.new'));
  const insets = useSafeAreaInsets();
  const categories = useCategories('expense');
  const [year, monthIndex] = month.split('-').map(Number);
  const monthLabel = format(new Date(year, monthIndex - 1, 1), 'LLLL yyyy', {
    locale: dateLocale(i18n.language),
  });
  const [categoryId, setCategoryId] = useState<string | null>(budget?.categoryId ?? null);
  const [expr, setExpr] = useState(budget ? minorToExpression(budget.amount, currency) : '');
  // The app's keypad (with built-in confirm): open right away for a new budget
  const [padOpen, setPadOpen] = useState(!budget);
  const [error, setError] = useState<string>();

  const save = async () => {
    const amount = evaluate(expr, currency);
    if (!amount || amount <= 0) {
      setError(t('budget.invalidAmount'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await budgetActions.set({ month, categoryId, amount });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const remove = () => {
    if (!budget) return;
    Alert.alert(t('budget.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await budgetActions.remove({ month, categoryId: budget.categoryId });
          router.back();
        },
      },
    ]);
  };

  const option = (id: string | null, label: string, icon: string, color: string) => {
    const selected = categoryId === id;
    return (
      <Pressable
        key={id ?? 'global'}
        disabled={!!budget}
        onPress={() => {
          setPadOpen(false);
          setCategoryId(id);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !!budget }}
        style={[
          styles.option,
          { backgroundColor: selected ? withAlpha(theme.primary, 0.14) : 'transparent' },
        ]}>
        <CategoryIcon icon={icon} color={color} size={32} filled={selected} />
        <Text numberOfLines={1} style={[styles.flex, selected && styles.selected]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => setPadOpen(false)}>
        <View style={styles.monthInfo}>
          <Text variant="overline" color="textSecondary">
            {monthLabel}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('budget.fromMonthHint')}
          </Text>
        </View>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('budget.amount')}
          </Text>
          <View style={styles.amountRow}>
            <AmountField
              expr={expr}
              active={padOpen}
              onPress={() => setPadOpen(true)}
              suffix={currency}
              size={26}
              accessibilityLabel={t('budget.amount')}
            />
          </View>
          {error && <Text style={{ color: theme.expense }}>{error}</Text>}
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('budget.category')}
          </Text>
          {budget
            ? option(
                categoryId,
                categories.find((c) => c.id === categoryId)?.name ?? t('budget.global'),
                categories.find((c) => c.id === categoryId)?.icon ?? 'wallet-outline',
                categories.find((c) => c.id === categoryId)?.color ?? theme.textSecondary,
              )
            : [
                option(null, t('budget.global'), 'wallet-outline', theme.textSecondary),
                ...categories.map((c) => option(c.id, c.name, c.icon, c.color)),
              ]}
          {!budget && (
            <Text variant="caption" color="textSecondary">
              {t('budget.replaceHint')}
            </Text>
          )}
        </Surface>

        {budget && <Button title={t('budget.delete')} color="expense" onPress={remove} />}
      </ScrollView>
      {/* At the bottom, always visible: the keypad (with built-in confirm)
          while typing the amount, otherwise Save */}
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
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.two },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius,
  },
  selected: { fontWeight: '600' },
  monthInfo: { gap: 2, paddingHorizontal: Spacing.one },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  flex: { flex: 1 },
});
