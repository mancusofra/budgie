import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { accountActions, useAccounts } from '@/features/accounts/hooks';
import { useCurrency, useSetSetting } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import { COMMON_CURRENCIES } from '@/lib/currencies';
import { Spacing, TabularNums } from '@/theme';

/** Currency symbol in the device language (e.g. "€", "US$"). */
function currencySymbol(code: string): string {
  try {
    return (
      new Intl.NumberFormat(deviceLocale, { style: 'currency', currency: code })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? code
    );
  } catch {
    return code;
  }
}

/** Sheet to choose the main currency. */
export default function CurrencySheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const current = useCurrency();
  const accounts = useAccounts();
  const setSetting = useSetSetting();
  const codes = COMMON_CURRENCIES.includes(current as (typeof COMMON_CURRENCIES)[number])
    ? COMMON_CURRENCIES
    : [current, ...COMMON_CURRENCIES];

  const choose = async (code: string) => {
    if (code === current) return router.back();
    const apply = async (alsoAccounts: boolean) => {
      await setSetting('currency', code);
      if (alsoAccounts) {
        for (const a of accounts.filter((acc) => acc.currency === current)) {
          await accountActions.update(a.id, { currency: code });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    };
    const inOld = accounts.filter((a) => a.currency === current);
    if (inOld.length === 0) return apply(false);
    // Accounts still empty (e.g. "Cash" just created, during onboarding): no
    // amounts to reinterpret, so they follow the new currency without asking
    const counts = await Promise.all(inOld.map((a) => accountActions.transactionCount(a.id)));
    const untouched = inOld.every((a, i) => counts[i] === 0 && a.initialBalance === 0);
    if (untouched) return apply(true);
    Alert.alert(
      t('currency.changeTitle', { code }),
      t('currency.changeMessage', { count: inOld.length, old: current, code }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('currency.onlyMain'), onPress: () => apply(false) },
        { text: t('currency.alsoAccounts', { code }), onPress: () => apply(true) },
      ],
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('currency.title')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('currency.hint')}
      </Text>
      {codes.map((code) => {
        const selected = code === current;
        return (
          <Pressable
            key={code}
            onPress={() => choose(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.code, TabularNums, selected && { color: theme.primary }]}>
              {code}
            </Text>
            <Text color="textSecondary" style={styles.flex}>
              {currencySymbol(code)}
            </Text>
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={theme.primary}
              // Hidden but present, for alignment (color 'transparent' doesn't work on Android)
              style={{ opacity: selected ? 1 : 0 }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  code: { width: 56, fontWeight: '600' },
  flex: { flex: 1 },
});
