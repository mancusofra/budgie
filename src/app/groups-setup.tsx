import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { categoryActions, useCategories } from '@/features/categories/hooks';
import { GROUP_META, groupLabelKey, nextGroup } from '@/features/groups/meta';
import { useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { GROUPS, normalizeShares } from '@/lib/groups';
import { Radius, Spacing } from '@/theme';

/**
 * Shown once, when spending groups are turned on: the default assignment of
 * the expense categories, one block per group. Tapping a category moves it
 * to the next group.
 */
export default function GroupsSetupSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const categories = useCategories('expense');
  const shares = normalizeShares(useSettings().groupShares);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('groups.setupTitle')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('groups.setupHint')}
      </Text>

      {GROUPS.map((group, i) => {
        const color = theme[GROUP_META[group].color];
        const members = categories.filter((c) => (c.spendingGroup ?? 'need') === group);
        return (
          <View key={group} style={styles.block}>
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: color }]}>
                <MaterialCommunityIcons
                  name={GROUP_META[group].icon}
                  size={13}
                  color={theme.textOnColor}
                />
              </View>
              <Text style={[styles.flex, styles.title]}>{t(groupLabelKey(group))}</Text>
              <Text color="textSecondary">{shares[i]}%</Text>
            </View>
            <View style={styles.chips}>
              {members.length === 0 && (
                <Text variant="caption" color="textSecondary">
                  {t('groups.setupEmpty')}
                </Text>
              )}
              {members.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    categoryActions.update(c.id, { spendingGroup: nextGroup(group) });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  accessibilityHint={t('groups.moveHint', {
                    group: t(groupLabelKey(nextGroup(group))),
                  })}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: withAlpha(color, pressed ? 0.3 : 0.16) },
                  ]}>
                  <MaterialCommunityIcons name={c.icon as never} size={15} color={c.color} />
                  <Text style={styles.chipLabel}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      <Text variant="caption" color="textSecondary">
        {t('groups.setupShares', { shares: shares.join(' / ') })}
      </Text>
      <Button title={t('groups.setupDone')} filled onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  block: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '600' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius,
  },
  chipLabel: { fontSize: 14 },
});
