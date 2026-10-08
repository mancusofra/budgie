import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useSetSetting, useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TabularNums } from '@/theme';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const COLUMNS = 7;

/**
 * Day the "month" starts on (1–28), chosen from a calendar-like grid.
 * It stops at 28: not every month has 29–31 days.
 */
export default function MonthStartSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const current = useSettings().monthStartDay ?? 1;
  const setSetting = useSetSetting();

  const choose = async (day: number) => {
    if (day !== current) {
      Haptics.selectionAsync();
      await setSetting('monthStartDay', day);
    }
    router.back();
  };

  const rows = Array.from({ length: DAYS.length / COLUMNS }, (_, r) =>
    DAYS.slice(r * COLUMNS, (r + 1) * COLUMNS),
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('settings.monthStart')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('settings.monthStartHint')}
      </Text>
      <View style={styles.grid}>
        {rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((day) => {
              const selected = day === current;
              return (
                <Pressable
                  key={day}
                  onPress={() => choose(day)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={String(day)}
                  style={({ pressed }) => [
                    styles.day,
                    {
                      backgroundColor: selected
                        ? theme.primary
                        : pressed
                          ? theme.backgroundSelected
                          : theme.surface,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.dayLabel,
                      TabularNums,
                      { color: selected ? theme.textOnColor : theme.text },
                    ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  grid: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 16, fontWeight: '600' },
});
