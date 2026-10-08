import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { appVersion, CHANGELOG, releaseFor, type ChangeKind } from '@/features/about/changelog';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale } from '@/i18n';
import { Spacing } from '@/theme';

/** Novità della versione installata rispetto alla precedente. */
export default function WhatsNewSheet() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { version, build } = appVersion();
  const release = releaseFor(version) ?? CHANGELOG[0];
  const lang = i18n.language.startsWith('it') ? 'it' : 'en';
  const [y, m, d] = release.date.split('-').map(Number);

  const section = (
    kind: ChangeKind,
    title: string,
    icon: 'bug-check-outline' | 'star-four-points-outline',
  ) => {
    const items = release.changes.filter((c) => c.kind === kind);
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text variant="overline" color="textSecondary">
          {title}
        </Text>
        {items.map((c) => (
          <View key={c.en} style={styles.item}>
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={kind === 'fix' ? theme.income : theme.primary}
              style={styles.icon}
            />
            <Text style={styles.flex}>{c[lang]}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View>
        <Text variant="subtitle">{t('about.whatsNew', { version: release.version })}</Text>
        <Text variant="caption" color="textSecondary">
          {format(new Date(y, m - 1, d), 'd MMMM yyyy', { locale: dateLocale(i18n.language) })}
          {build ? ` · build ${build}` : ''}
        </Text>
      </View>
      {section('fix', t('about.fixes'), 'bug-check-outline')}
      {section('new', t('about.features'), 'star-four-points-outline')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  item: { flexDirection: 'row', gap: Spacing.two },
  icon: { marginTop: 3 },
  flex: { flex: 1 },
});
