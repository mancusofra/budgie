import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { NavRow, RowSeparator } from '@/components/ui/nav-row';
import { Screen, useTabBarSpace } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Backup } from '@/db/backup';
import { authenticate } from '@/features/settings/app-lock';
import { useDataTransfer } from '@/features/settings/data-transfer';
import { useResetDatabase, useSetSetting, useSettings } from '@/features/settings/hooks';
import { deviceLocale } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TabularNums } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const resetDatabase = useResetDatabase();
  const { exportCsv, exportBackup, pickBackup, restore } = useDataTransfer();

  const run = async (action: () => Promise<unknown>, errorMessage: string) => {
    try {
      await action();
    } catch (e) {
      console.error(e);
      Alert.alert(errorMessage);
    }
  };

  // Attivare o disattivare il blocco richiede la conferma biometrica
  const toggleLock = async (value: boolean) => {
    const result = await authenticate(t('lock.prompt'), t('common.cancel'));
    if (result === 'ok') return setSetting('appLock', value);
    if (result === 'unavailable')
      Alert.alert(t('settings.appLock'), t('settings.appLockUnavailable'));
  };

  const askRestore = async () => {
    let backup: Backup | null;
    try {
      backup = await pickBackup();
    } catch (e) {
      Alert.alert(t('settings.restoreError'), e instanceof Error ? e.message : undefined);
      return;
    }
    if (!backup) return;
    const chosen = backup;
    Alert.alert(
      t('settings.restoreConfirmTitle'),
      t('settings.restoreConfirmMessage', {
        date: new Date(chosen.exportedAt).toLocaleString(deviceLocale),
        count: chosen.data.transactions.length,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.restore'),
          style: 'destructive',
          onPress: () => {
            restore(chosen);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('settings.restoreDone'));
          },
        },
      ],
    );
  };
  const tabBarSpace = useTabBarSpace();
  const weekStart = settings.weekStart ?? 1;
  const monthStartDay = settings.monthStartDay ?? 1;

  const changeMonthStart = (delta: number) => {
    const next = Math.min(Math.max(monthStartDay + delta, 1), 28);
    if (next === monthStartDay) return;
    Haptics.selectionAsync();
    setSetting('monthStartDay', next);
  };

  const confirmReset = () =>
    Alert.alert(t('settings.resetConfirmTitle'), t('settings.resetConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetData'),
        style: 'destructive',
        onPress: async () => {
          await resetDatabase();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t('settings.resetDone'));
        },
      },
    ]);

  const stepButton = (icon: 'minus' | 'plus', delta: number, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => changeMonthStart(delta)}
      style={{ opacity: disabled ? 0.35 : 1 }}>
      <Surface interactive style={styles.step}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.text} />
      </Surface>
    </Pressable>
  );

  return (
    <Screen scrolls>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + tabBarSpace }]}
        scrollIndicatorInsets={{ bottom: tabBarSpace }}>
        <Text variant="title">{t('settings.title')}</Text>

        <View style={styles.section}>
          <Text variant="overline" color="textSecondary">
            {t('settings.manage')}
          </Text>
          <Surface style={styles.listCard}>
            <NavRow
              title={t('categories.title')}
              onPress={() => router.push('/category')}
              leading={
                <MaterialCommunityIcons name="shape-outline" size={22} color={theme.primary} />
              }
            />
            <RowSeparator />
            <NavRow
              title={t('accounts.title')}
              onPress={() => router.push('/account')}
              leading={
                <MaterialCommunityIcons name="wallet-outline" size={22} color={theme.primary} />
              }
            />
          </Surface>
        </View>

        <View style={styles.section}>
          <Text variant="overline" color="textSecondary">
            {t('settings.preferences')}
          </Text>
          <Surface style={styles.card}>
            <NavRow
              title={t('settings.mainCurrency')}
              value={settings.currency ?? 'EUR'}
              onPress={() => router.push('/currency')}
              leading={
                <MaterialCommunityIcons name="cash-multiple" size={22} color={theme.primary} />
              }
            />
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
            <Text>{t('settings.theme')}</Text>
            <SegmentedControl
              options={[
                { value: 'system', label: t('settings.themeSystem') },
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
              ]}
              value={settings.theme ?? 'system'}
              onChange={(v) => setSetting('theme', v)}
            />
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
            <Text>{t('settings.language')}</Text>
            <SegmentedControl
              options={[
                { value: 'system', label: t('settings.languageSystem') },
                { value: 'it', label: 'Italiano' },
                { value: 'en', label: 'English' },
              ]}
              value={settings.language ?? 'system'}
              onChange={(v) => setSetting('language', v)}
            />
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <Text style={styles.flex}>{t('settings.appLock')}</Text>
              <Switch
                value={settings.appLock === true}
                onValueChange={toggleLock}
                accessibilityLabel={t('settings.appLock')}
              />
            </View>
          </Surface>
        </View>
        <View style={styles.section}>
          <Text variant="overline" color="textSecondary">
            {t('settings.periods')}
          </Text>
          <Surface style={styles.card}>
            <Text>{t('settings.weekStart')}</Text>
            <SegmentedControl
              options={[
                { value: '1', label: t('settings.monday') },
                { value: '0', label: t('settings.sunday') },
              ]}
              value={String(weekStart)}
              onChange={(v) => setSetting('weekStart', v === '0' ? 0 : 1)}
            />
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <Text style={styles.flex}>{t('settings.monthStart')}</Text>
              {stepButton('minus', -1, t('settings.decrease'), monthStartDay <= 1)}
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.stepValue, { color: theme.text }]}>
                {monthStartDay}
              </Text>
              {stepButton('plus', 1, t('settings.increase'), monthStartDay >= 28)}
            </View>
            <Text variant="caption" color="textSecondary">
              {t('settings.monthStartHint')}
            </Text>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text variant="overline" color="textSecondary">
            {t('settings.data')}
          </Text>
          <Surface style={styles.listCard}>
            <NavRow
              title={t('settings.exportCsv')}
              onPress={() => run(exportCsv, t('settings.exportError'))}
              leading={
                <MaterialCommunityIcons
                  name="file-delimited-outline"
                  size={22}
                  color={theme.primary}
                />
              }
            />
            <RowSeparator />
            <NavRow
              title={t('settings.exportBackup')}
              onPress={() => run(exportBackup, t('settings.exportError'))}
              leading={
                <MaterialCommunityIcons
                  name="cloud-upload-outline"
                  size={22}
                  color={theme.primary}
                />
              }
            />
            <RowSeparator />
            <NavRow
              title={t('settings.restoreBackup')}
              onPress={askRestore}
              leading={
                <MaterialCommunityIcons
                  name="cloud-download-outline"
                  size={22}
                  color={theme.primary}
                />
              }
            />
          </Surface>
          <Text variant="caption" color="textSecondary">
            {t('settings.dataHint')}
          </Text>
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text variant="overline" color="textSecondary">
              {t('settings.developer')}
            </Text>
            <Button
              title={t('settings.resetData')}
              color="expense"
              icon={
                <MaterialCommunityIcons name="delete-outline" size={20} color={theme.expense} />
              }
              onPress={confirmReset}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
  section: { gap: Spacing.two },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
  listCard: { borderRadius: Radius + 4, paddingHorizontal: Spacing.three },
  separator: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    ...TabularNums,
  },
});
