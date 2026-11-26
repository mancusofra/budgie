import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/ui/amount-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCurrency, useSetSetting, useSettingsState } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator } from '@/i18n';
import { applyKey, evaluate, minorToExpression } from '@/lib/expression';
import { Spacing } from '@/theme';

/** Monthly income used for the group targets when a period has no income. */
export default function ReferenceIncomeSheet() {
  const { settings, loaded } = useSettingsState();
  if (!loaded) return null;
  return <ReferenceIncomeForm initial={settings.referenceIncome ?? null} />;
}

function ReferenceIncomeForm({ initial }: { initial: number | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const setSetting = useSetSetting();
  const insets = useSafeAreaInsets();
  const [expr, setExpr] = useState(initial ? minorToExpression(initial, currency) : '');
  const [error, setError] = useState<string>();

  const save = async () => {
    const amount = expr ? evaluate(expr, currency) : null;
    if (expr && (!amount || amount <= 0)) {
      setError(t('budget.invalidAmount'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await setSetting('referenceIncome', amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const remove = async () => {
    await setSetting('referenceIncome', null);
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
      ]}>
      <Text variant="subtitle">{t('groups.referenceIncome')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('groups.referenceIncomeHint')}
      </Text>
      <View style={styles.amountRow}>
        <AmountField
          expr={expr}
          active
          onPress={() => {}}
          suffix={currency}
          size={26}
          accessibilityLabel={t('groups.referenceIncome')}
        />
      </View>
      {error && <Text style={{ color: theme.expense }}>{error}</Text>}
      <AmountPad
        onKey={(key) => {
          setError(undefined);
          setExpr((e) => applyKey(e, key, currency));
        }}
        onDone={save}
        decimalSeparator={decimalSeparator}
        labels={{
          backspace: t('keypad.backspace'),
          comma: t('keypad.comma'),
          done: t('common.save'),
        }}
      />
      {initial ? (
        <Button title={t('groups.referenceIncomeRemove')} color="expense" onPress={remove} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
});
