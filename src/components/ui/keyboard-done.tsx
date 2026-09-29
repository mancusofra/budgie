import { useTranslation } from 'react-i18next';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

/** Da passare come `inputAccessoryViewID` ai TextInput numerici. */
export const KEYBOARD_DONE_ID = 'keyboard-done';

/**
 * Pulsante "Fine" sopra la tastiera (solo iOS): il tastierino decimale di iOS
 * non ha un tasto per chiudersi. Niente barra grigia di sistema: una capsula
 * di vetro fluttuante, come gli altri controlli dell'app. Su Android la
 * tastiera ha già il tasto di conferma.
 */
export function KeyboardDoneAccessory() {
  const { t } = useTranslation();
  const theme = useTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID} backgroundColor="transparent">
      <View style={styles.row} pointerEvents="box-none">
        <Pressable
          onPress={Keyboard.dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('stats.done')}>
          <Surface interactive tint={theme.primary} style={styles.pill}>
            <Text style={[styles.label, { color: theme.primary }]}>{t('stats.done')}</Text>
          </Surface>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: 'transparent',
  },
  pill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: 999,
  },
  label: { fontWeight: '600', fontSize: 16 },
});
