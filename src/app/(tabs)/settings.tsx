import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useResetDatabase } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const resetDatabase = useResetDatabase();

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
    <Screen>
      <View style={styles.content}>
        <Text variant="title">{t('settings.title')}</Text>
        <Text color="textSecondary">{t('settings.comingSoon')}</Text>

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.two },
  section: { marginTop: Spacing.four, gap: Spacing.two },
});
