import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { dateLocale } from '@/i18n';
import { Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

/** "Label + date" row: compact picker on iOS, system dialog on Android. */
export function DateField({ label, value, onChange, maximumDate }: Props) {
  const { i18n } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Text color="textSecondary">{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          maximumDate={maximumDate}
          onValueChange={(_, d) => onChange(d)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode: 'date',
              maximumDate,
              onValueChange: (_, d) => onChange(d),
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
}

const styles = StyleSheet.create({
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
