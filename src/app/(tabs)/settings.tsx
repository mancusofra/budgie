import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

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
import { Radius, Spacing } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const resetDatabase = useResetDatabase();
  const { exportBackup, pickBackup, restore } = useDataTransfer();

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
  const languageLabel = {
    system: t('settings.languageSystem'),
    it: 'Italiano',
    en: 'English',
  }[settings.language ?? 'system'];

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
          <Surface style={styles.listCard}>
            <NavRow
              title={t('settings.mainCurrency')}
              value={settings.currency ?? 'EUR'}
              onPress={() => router.push('/currency')}
              leading={
                <MaterialCommunityIcons name="cash-multiple" size={22} color={theme.primary} />
              }
            />
            <RowSeparator />
            <NavRow
              title={t('settings.language')}
              value={languageLabel}
              onPress={() => router.push('/language')}
              leading={<MaterialCommunityIcons name="translate" size={22} color={theme.primary} />}
            />
            <RowSeparator />
            <View style={styles.block}>
              <Text style={styles.label}>{t('settings.theme')}</Text>
              <SegmentedControl
                options={[
                  { value: 'system', label: t('settings.themeSystem') },
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                ]}
                value={settings.theme ?? 'system'}
                onChange={(v) => setSetting('theme', v)}
              />
            </View>
            <RowSeparator />
            <View style={styles.row}>
              <MaterialCommunityIcons name="fingerprint" size={22} color={theme.primary} />
              <Text style={[styles.label, styles.flex]}>{t('settings.appLock')}</Text>
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
          <Surface style={styles.listCard}>
            <View style={styles.block}>
              <Text style={styles.label}>{t('settings.weekStart')}</Text>
              <SegmentedControl
                options={[
                  { value: '1', label: t('settings.monday') },
                  { value: '0', label: t('settings.sunday') },
                ]}
                value={String(weekStart)}
                onChange={(v) => setSetting('weekStart', v === '0' ? 0 : 1)}
              />
            </View>
            <RowSeparator />
            <NavRow
              title={t('settings.monthStart')}
              value={String(settings.monthStartDay ?? 1)}
              onPress={() => router.push('/month-start')}
              leading={
                <MaterialCommunityIcons name="calendar-start" size={22} color={theme.primary} />
              }
            />
          </Surface>
          <Text variant="caption" color="textSecondary">
            {t('settings.monthStartHint')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="overline" color="textSecondary">
            {t('settings.data')}
          </Text>
          <Surface style={styles.listCard}>
            <NavRow
              title={t('settings.exportData')}
              onPress={() => router.push('/export')}
              leading={
                <MaterialCommunityIcons
                  name="file-export-outline"
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
  listCard: { borderRadius: Radius + 4, paddingHorizontal: Spacing.three },
  // Stesse misure di NavRow, per allineare righe e blocchi nella stessa card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 6,
  },
  block: { gap: Spacing.two, paddingVertical: Spacing.three },
  label: { fontWeight: '500' },
  flex: { flex: 1 },
});
