import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { addDays, format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale } from '@/i18n';
import { periodRange } from '@/lib/period';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

/** Pannello periodo: torna a oggi o scegli un intervallo personalizzato. */
export default function PeriodSheet() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const period = useUIStore((s) => s.period);
  const setCustomPeriod = useUIStore((s) => s.setCustomPeriod);
  const resetPeriod = useUIStore((s) => s.resetPeriod);

  // Parte dall'intervallo attuale (o dal mese corrente per "Sempre")
  const current = periodRange(period);
  const [from, setFrom] = useState(current.from ?? startOfMonth(new Date()));
  const [to, setTo] = useState(current.to ? addDays(current.to, -1) : new Date());

  const dateField = (label: string, value: Date, onChange: (d: Date) => void) => (
    <View style={styles.field}>
      <Text color="textSecondary">{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          onChange={(_, d) => d && onChange(d)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode: 'date',
              onChange: (e, d) => e.type === 'set' && d && onChange(d),
            })
          }>
          <Surface interactive style={styles.dateButton}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={16}
              color={theme.textSecondary}
            />
            <Text style={styles.dateText}>
              {format(value, 'd MMM yyyy', { locale: dateLocale(i18n.language) })}
            </Text>
          </Surface>
        </Pressable>
      )}
    </View>
  );

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
        {dateField(t('period.from'), from, setFrom)}
        {dateField(t('period.to'), to, setTo)}
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
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  dateText: { fontWeight: '500' },
});
