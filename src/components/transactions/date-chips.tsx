import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { isSameDay, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import { Spacing } from '@/theme';

/** Scelta rapida della data: Oggi, Ieri o calendario (date future escluse). */
export function DateChips({
  value,
  onChange,
  color,
}: {
  value: Date;
  onChange: (date: Date) => void;
  color: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const today = new Date();
  const yesterday = subDays(today, 1);
  const isCustom = !isSameDay(value, today) && !isSameDay(value, yesterday);

  const chip = (label: string, day: Date) => {
    const selected = isSameDay(value, day);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(day)}>
        <Surface interactive tint={selected ? color : undefined} style={styles.chip}>
          <Text variant="caption" style={[styles.label, selected && { color }]}>
            {label}
          </Text>
        </Surface>
      </Pressable>
    );
  };

  return (
    <View style={styles.row}>
      {chip(t('transaction.today'), today)}
      {chip(t('transaction.yesterday'), yesterday)}
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          maximumDate={today}
          onValueChange={(_, d) => onChange(d)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('transaction.pickDate')}
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode: 'date',
              maximumDate: new Date(),
              onValueChange: (_, d) => onChange(d),
            })
          }>
          <Surface interactive tint={isCustom ? color : undefined} style={styles.chip}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={16}
              color={isCustom ? color : theme.textSecondary}
            />
            {isCustom && (
              <Text variant="caption" style={[styles.label, { color }]}>
                {value.toLocaleDateString(deviceLocale)}
              </Text>
            )}
          </Surface>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  label: { fontWeight: '500' },
});
