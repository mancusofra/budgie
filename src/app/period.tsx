import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDays, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { periodRange } from '@/lib/period';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

/** Pannello periodo: torna a oggi o scegli un intervallo personalizzato. */
export default function PeriodSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const period = useUIStore((s) => s.period);
  const setCustomPeriod = useUIStore((s) => s.setCustomPeriod);
  const resetPeriod = useUIStore((s) => s.resetPeriod);

  // Parte dall'intervallo attuale (o dal mese corrente per "Sempre")
  const current = periodRange(period);
  const [from, setFrom] = useState(current.from ?? startOfMonth(new Date()));
  const [to, setTo] = useState(current.to ? addDays(current.to, -1) : new Date());

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <Text variant="subtitle">{t('period.title')}</Text>

      <Button
        title={t('period.today')}
        icon={<MaterialCommunityIcons name="calendar-today" size={20} color={theme.primary} />}
        onPress={() => {
          resetPeriod();
          router.back();
        }}
      />

      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('period.custom')}
        </Text>
        <DateField label={t('period.from')} value={from} onChange={setFrom} />
        <DateField label={t('period.to')} value={to} onChange={setTo} />
      </Surface>

      <Button
        title={t('period.apply')}
        filled
        onPress={() => {
          setCustomPeriod(from, to);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
});
