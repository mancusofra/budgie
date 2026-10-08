import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-line note field. While typing it shows a clearly visible "Done"
 * button that dismisses the keyboard; the Return key becomes "Done" too.
 */
export function NoteField({ value, onChangeText, placeholder, onFocus, onBlur, style }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Surface style={[styles.box, style]}>
      <MaterialCommunityIcons name="text" size={18} color={theme.textSecondary} />
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        maxLength={200}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      {focused && (
        <Pressable
          onPress={() => input.current?.blur()}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.done,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.75 },
          ]}>
          <MaterialCommunityIcons name="check" size={16} color={theme.textOnColor} />
          <Text variant="caption" style={[styles.doneLabel, { color: theme.textOnColor }]}>
            {t('common.done')}
          </Text>
        </Pressable>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  input: { flex: 1, paddingVertical: Spacing.two + 4, fontSize: 16 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  doneLabel: { fontWeight: '600' },
});
