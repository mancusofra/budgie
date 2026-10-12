import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDays, startOfDay, startOfMonth } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { RowSeparator } from '@/components/ui/nav-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAccountsWithBalance } from '@/features/accounts/hooks';
import { useReport } from '@/features/report/use-report';
import { useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { periodRange, type PeriodRange } from '@/lib/period';
import { Radius, Spacing } from '@/theme';

type RangeKind = 'month' | 'year' | 'custom' | 'all';
type AccountMode = 'all' | 'some';

/** PDF report sheet: period and accounts. */
export default function ReportSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const settings = useSettings();
  const { build, share, preview } = useReport();
  const accounts = useAccountsWithBalance({ includeArchived: true }).map((r) => r.account);

  const [rangeKind, setRangeKind] = useState<RangeKind>('month');
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => new Date());
  const [accountMode, setAccountMode] = useState<AccountMode>('all');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const range = (): PeriodRange => {
    const opts = { monthStartDay: settings.monthStartDay ?? 1 };
    switch (rangeKind) {
      case 'month':
      case 'year':
        return periodRange({ kind: rangeKind, anchor: new Date() }, opts);
      case 'custom': {
        // "To" is an inclusive day: the range ends at the start of the next day
        const [a, b] = [from, to].sort((x, y) => x.getTime() - y.getTime());
        return { from: startOfDay(a), to: addDays(startOfDay(b), 1) };
      }
      case 'all':
        return {};
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const noAccounts = accountMode === 'some' && selected.size === 0;

  const submit = async (action: 'share' | 'preview') => {
    setBusy(true);
    try {
      const chosen =
        accountMode === 'some'
          ? accounts.filter((a) => selected.has(a.id)).map(({ id, name }) => ({ id, name }))
          : undefined;
      const file = await build({ ...range(), accounts: chosen });
      if (!file) {
        Alert.alert(t('report.noTransactions'));
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await (action === 'share' ? share(file) : preview(file));
    } catch (e) {
      console.error(e);
      Alert.alert(t('report.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="subtitle">{t('report.title')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('report.hint')}
        </Text>
      </View>

      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('export.range')}
        </Text>
        <SegmentedControl
          options={[
            { value: 'month', label: t('export.month') },
            { value: 'year', label: t('export.year') },
            { value: 'custom', label: t('export.custom') },
            { value: 'all', label: t('export.all') },
          ]}
          value={rangeKind}
          onChange={setRangeKind}
        />
        {rangeKind === 'custom' && (
          <>
            <DateField label={t('period.from')} value={from} onChange={setFrom} />
            <DateField label={t('period.to')} value={to} onChange={setTo} />
          </>
        )}
      </Surface>

      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('report.accounts')}
        </Text>
        <SegmentedControl
          options={[
            { value: 'all', label: t('accounts.all') },
            { value: 'some', label: t('report.someAccounts') },
          ]}
          value={accountMode}
          onChange={setAccountMode}
        />
        {accountMode === 'some' && (
          <View>
            {accounts.map((a, i) => {
              const checked = selected.has(a.id);
              return (
                <View key={a.id}>
                  {i > 0 && <RowSeparator />}
                  <Pressable
                    onPress={() => toggle(a.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={({ pressed }) => [styles.account, pressed && { opacity: 0.6 }]}>
                    <CategoryIcon
                      icon={a.icon ?? 'wallet'}
                      color={a.color ?? theme.textSecondary}
                      size={32}
                    />
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.accountName}>
                        {a.name}
                      </Text>
                      <Text variant="caption" color="textSecondary">
                        {a.archived ? `${a.currency} · ${t('report.archived')}` : a.currency}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={24}
                      color={checked ? theme.primary : theme.textSecondary}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
        <Text variant="caption" color="textSecondary">
          {t('report.currencyHint')}
        </Text>
      </Surface>

      <Button
        title={busy ? t('report.generating') : t('report.submit')}
        filled
        disabled={busy || noAccounts}
        icon={<MaterialCommunityIcons name="share-variant" size={20} color={theme.textOnColor} />}
        onPress={() => submit('share')}
      />
      <Button
        title={t('report.preview')}
        disabled={busy || noAccounts}
        icon={<MaterialCommunityIcons name="printer-outline" size={20} color={theme.primary} />}
        onPress={() => submit('preview')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { gap: Spacing.one },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  accountName: { fontWeight: '500' },
  flex: { flex: 1 },
});
