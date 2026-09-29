import { useTranslation } from 'react-i18next';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { Text } from './text';

/** Da passare come `inputAccessoryViewID` ai TextInput numerici. */
export const KEYBOARD_DONE_ID = 'keyboard-done';

/**
 * Barra "Fine" sopra la tastiera (solo iOS): il tastierino decimale di iOS
 * non ha un tasto per chiudersi. Su Android c'è già il tasto di conferma.
 */
export function KeyboardDoneAccessory() {
  const { t } = useTranslation();
  const theme = useTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.done, { color: theme.primary }]}>{t('stats.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  done: { fontWeight: '600', fontSize: 17 },
});
