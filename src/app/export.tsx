import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDays, startOfDay, startOfMonth } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useDataTransfer, type ExportFormat } from '@/features/settings/data-transfer';
import { useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { periodRange, type PeriodRange } from '@/lib/period';
import { Radius, Spacing } from '@/theme';

type RangeKind = 'all' | 'month' | 'year' | 'custom';

/** Pannello di esportazione delle transazioni: formato (CSV/JSON) e intervallo. */
export default function ExportSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const settings = useSettings();
  const { exportData } = useDataTransfer();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [rangeKind, setRangeKind] = useState<RangeKind>('all');
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => new Date());
  const [busy, setBusy] = useState(false);

  const range = (): PeriodRange => {
    const now = new Date();
    const opts = { monthStartDay: settings.monthStartDay ?? 1 };
    switch (rangeKind) {
      case 'all':
        return {};
      case 'month':
      case 'year':
        return periodRange({ kind: rangeKind, anchor: now }, opts);
      case 'custom': {
        // "Al" è un giorno incluso: l'intervallo si chiude a inizio del giorno dopo
        const [a, b] = [from, to].sort((x, y) => x.getTime() - y.getTime());
        return { from: startOfDay(a), to: addDays(startOfDay(b), 1) };
      }
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const count = await exportData({ format, ...range() });
      if (count === 0) {
        Alert.alert(t('export.empty'));
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert(t('settings.exportError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('export.title')}</Text>

      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('export.format')}
        </Text>
        <SegmentedControl
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'json', label: 'JSON' },
          ]}
          value={format}
          onChange={setFormat}
        />
        <Text variant="caption" color="textSecondary">
          {t(format === 'csv' ? 'export.csvHint' : 'export.jsonHint')}
        </Text>
      </Surface>

      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('export.range')}
        </Text>
        <SegmentedControl
          options={[
            { value: 'all', label: t('export.all') },
            { value: 'month', label: t('export.month') },
            { value: 'year', label: t('export.year') },
            { value: 'custom', label: t('export.custom') },
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

      <Button
        title={t('export.submit')}
        filled
        disabled={busy}
        icon={<MaterialCommunityIcons name="export-variant" size={20} color={theme.textOnColor} />}
        onPress={submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
});
