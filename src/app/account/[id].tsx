import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { AmountField } from '@/components/ui/amount-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { ColorPicker, IconPicker } from '@/components/ui/pickers';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Account } from '@/db/schema';
import { accountActions, useAccount, useAccounts } from '@/features/accounts/hooks';
import { useSettingsState } from '@/features/settings/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { decimalSeparator } from '@/i18n';
import { withAlpha } from '@/lib/color';
import { COMMON_CURRENCIES } from '@/lib/currencies';
import { applyKey, evaluate, minorToExpression } from '@/lib/expression';
import { ACCOUNT_ICONS, PICKER_COLORS } from '@/theme/palette';
import { Radius, Spacing } from '@/theme';

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const account = useAccount(isNew ? undefined : id);
  const { settings, loaded } = useSettingsState();

  // Wait for the account and settings: the form is initialized only once
  if ((!isNew && !account) || !loaded) return null;
  return (
    <AccountForm
      key={account?.id ?? 'new'}
      account={account ?? undefined}
      defaultCurrency={settings.currency ?? 'EUR'}
    />
  );
}

function AccountForm({ account, defaultCurrency }: { account?: Account; defaultCurrency: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(account ? t('accounts.edit') : t('accounts.new'));
  const activeAccounts = useAccounts();

  const initial = account?.initialBalance ?? 0;
  const [name, setName] = useState(account?.name ?? '');
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [negative, setNegative] = useState(initial < 0);
  const [balanceExpr, setBalanceExpr] = useState(
    initial ? minorToExpression(Math.abs(initial), currency) : '',
  );
  // The app's keypad for the balance (built-in confirm, no system keyboard)
  const [padOpen, setPadOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [color, setColor] = useState<string>(account?.color ?? PICKER_COLORS[5]);
  const [icon, setIcon] = useState<string>(account?.icon ?? 'wallet');
  const [error, setError] = useState<string>();

  const currencies = COMMON_CURRENCIES.includes(currency as (typeof COMMON_CURRENCIES)[number])
    ? COMMON_CURRENCIES
    : [currency, ...COMMON_CURRENCIES];
  const isLastActive = !!account && !account.archived && activeAccounts.length <= 1;

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const save = async () => {
    if (!name.trim()) return fail(t('accounts.nameRequired'));
    const parsed = balanceExpr ? evaluate(balanceExpr, currency) : 0;
    if (parsed === null || parsed < 0) return fail(t('accounts.invalidAmount'));
    const initialBalance = negative ? -parsed : parsed;
    if (account) {
      await accountActions.update(account.id, { name, currency, initialBalance, color, icon });
    } else {
      await accountActions.create({ name, currency, initialBalance, color, icon });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const removeOrArchive = async () => {
    if (!account) return;
    if (isLastActive) return Alert.alert(t('accounts.lastAccount'));
    const count = await accountActions.transactionCount(account.id);
    if (count === 0) {
      Alert.alert(t('accounts.deleteConfirm'), account.name, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await accountActions.remove(account.id);
            router.back();
          },
        },
      ]);
    } else {
      Alert.alert(t('accounts.archiveConfirm'), t('accounts.archiveMessage', { count }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.archive'),
          onPress: async () => {
            await accountActions.setArchived(account.id, true);
            router.back();
          },
        },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.preview}>
          <CategoryIcon icon={icon} color={color} size={72} filled />
          <Text variant="subtitle" numberOfLines={1}>
            {name.trim() || t('accounts.namePlaceholder')}
          </Text>
        </View>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('accounts.name')}
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(undefined);
            }}
            placeholder={t('accounts.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            maxLength={40}
            autoFocus={!account}
            onFocus={() => setPadOpen(false)}
          />

          <Text variant="overline" color="textSecondary">
            {t('accounts.initialBalance')}
          </Text>
          <View style={styles.amountRow}>
            <Pressable
              onPress={() => setNegative((n) => !n)}
              accessibilityRole="button"
              accessibilityLabel={t('accounts.toggleSign')}
              hitSlop={8}>
              <Surface
                interactive
                tint={negative ? theme.expense : undefined}
                style={styles.signButton}>
                <MaterialCommunityIcons
                  name={negative ? 'minus' : 'plus'}
                  size={18}
                  color={negative ? theme.expense : theme.text}
                />
              </Surface>
            </Pressable>
            <AmountField
              expr={balanceExpr}
              active={padOpen}
              onPress={() => {
                Keyboard.dismiss();
                setPadOpen(true);
              }}
              suffix={currency}
              color={negative ? theme.expense : theme.text}
              accessibilityLabel={t('accounts.initialBalance')}
            />
          </View>
          {error && <Text style={{ color: theme.expense }}>{error}</Text>}
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('accounts.currency')}
          </Text>
          <View style={styles.chips}>
            {currencies.map((c) => {
              const selected = c === currency;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? withAlpha(theme.primary, 0.18) : theme.background,
                    },
                  ]}>
                  <Text
                    variant="caption"
                    style={[styles.chipLabel, selected && { color: theme.primary }]}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('accounts.icon')}
          </Text>
          <IconPicker icons={ACCOUNT_ICONS} value={icon} color={color} onChange={setIcon} />
          <Text variant="overline" color="textSecondary">
            {t('accounts.color')}
          </Text>
          <ColorPicker colors={PICKER_COLORS} value={color} onChange={setColor} />
        </Surface>

        <Button title={t('common.save')} filled onPress={save} />
        {account && (
          <Button
            title={t('accounts.delete')}
            color="expense"
            disabled={isLastActive}
            onPress={removeOrArchive}
          />
        )}
        {isLastActive && (
          <Text variant="caption" color="textSecondary" style={styles.center}>
            {t('accounts.lastAccount')}
          </Text>
        )}
      </ScrollView>
      {padOpen && (
        <View
          style={[
            styles.padFooter,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
          ]}>
          <AmountPad
            onKey={(key) => {
              setError(undefined);
              setBalanceExpr((e) => applyKey(e, key, currency));
            }}
            onDone={() => setPadOpen(false)}
            decimalSeparator={decimalSeparator}
            labels={{
              backspace: t('keypad.backspace'),
              comma: t('keypad.comma'),
              done: t('stats.done'),
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  preview: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.two + 2 },
  input: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  signButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 3, borderRadius: 999 },
  chipLabel: { fontWeight: '600' },
  center: { textAlign: 'center' },
  padFooter: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
});
