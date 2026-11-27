import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { Spacing } from '@/theme';

/** How to install the web version where the browser has no install button (Safari on iPhone). */
export default function InstallSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const step = (n: number, icon: 'export-variant' | 'plus-box-outline', text: string) => (
    <View style={styles.step}>
      <View style={[styles.number, { backgroundColor: withAlpha(theme.primary, 0.14) }]}>
        <Text style={[styles.numberText, { color: theme.primary }]}>{n}</Text>
      </View>
      <Text style={styles.flex}>{text}</Text>
      <MaterialCommunityIcons name={icon} size={22} color={theme.primary} />
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('web.installTitle')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('web.installIosIntro')}
      </Text>
      {step(1, 'export-variant', t('web.installIosStep1'))}
      {step(2, 'plus-box-outline', t('web.installIosStep2'))}
      <Text variant="caption" color="textSecondary">
        {t('web.installOther')}
      </Text>
      <Text variant="caption" color="textSecondary">
        {t('web.installOffline')}
      </Text>
      <Button title={t('web.gotIt')} filled onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontWeight: '700' },
  flex: { flex: 1 },
});
