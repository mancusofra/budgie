import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import type { SettingsMap } from '@/db/repositories';
import { useSetSetting, useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

type LanguagePreference = SettingsMap['language'];

/** Sheet to choose the app language. */
export default function LanguageSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const current = useSettings().language ?? 'system';
  const setSetting = useSetSetting();

  // Language names stay in their own language, as in the system settings
  const options: { value: LanguagePreference; label: string; hint?: string }[] = [
    { value: 'system', label: t('settings.languageSystem'), hint: t('language.systemHint') },
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' },
  ];

  const choose = async (value: LanguagePreference) => {
    if (value !== current) {
      await setSetting('language', value);
      Haptics.selectionAsync();
    }
    router.back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('settings.language')}</Text>
      {options.map((o) => {
        const selected = o.value === current;
        return (
          <Pressable
            key={o.value}
            onPress={() => choose(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.label, selected && { color: theme.primary }]}>{o.label}</Text>
            {o.hint ? (
              <Text variant="caption" color="textSecondary" style={styles.flex}>
                {o.hint}
              </Text>
            ) : (
              <Text style={styles.flex} />
            )}
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={theme.primary}
              // Hidden but present, for alignment (color 'transparent' doesn't work on Android)
              style={{ opacity: selected ? 1 : 0 }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
  },
  label: { fontWeight: '500' },
  flex: { flex: 1 },
});
