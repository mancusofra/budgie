import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GlassView } from 'expo-glass-effect';
import { useTranslation } from 'react-i18next';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { hasGlass } from './surface';

/** Da passare come `inputAccessoryViewID` ai TextInput numerici. */
export const KEYBOARD_DONE_ID = 'keyboard-done';

const SIZE = 44;

/**
 * Conferma sopra la tastiera (solo iOS, dove il tastierino decimale non ha un
 * tasto per chiudersi): cerchio con la spunta nello stile dei pulsanti di
 * conferma di iOS 26 (vetro "prominente" tinto). Su Android la tastiera ha
 * già il tasto di conferma.
 */
export function KeyboardDoneAccessory() {
  const { t } = useTranslation();
  const theme = useTheme();
  if (Platform.OS !== 'ios') return null;

  const check = <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID} backgroundColor="transparent">
      <View style={styles.row} pointerEvents="box-none">
        <Pressable
          onPress={Keyboard.dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('stats.done')}>
          {hasGlass ? (
            <GlassView isInteractive tintColor={theme.primary} style={styles.circle}>
              {check}
            </GlassView>
          ) : (
            <View style={[styles.circle, { backgroundColor: theme.primary }]}>{check}</View>
          )}
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
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
