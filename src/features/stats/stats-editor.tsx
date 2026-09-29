import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SortableList } from '@/components/ui/sortable-list';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { toggleHidden, type StatsLayout, type StatsSection } from '@/lib/stats-layout';
import { Radius, Spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<StatsSection, IconName> = {
  summary: 'counter',
  chart: 'chart-bar',
  categories: 'format-list-bulleted',
  budgets: 'gauge',
};

const ROW_HEIGHT = 56;

/** Riordina le sezioni delle Statistiche e sceglie quali mostrare. */
export function StatsEditor({
  layout,
  onChange,
  onDone,
}: {
  layout: StatsLayout;
  onChange: (layout: StatsLayout) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text color="textSecondary">{t('stats.editHint')}</Text>
      <Surface style={styles.card}>
        <SortableList
          data={layout.order}
          keyExtractor={(id) => id}
          rowHeight={ROW_HEIGHT}
          handleLabel={t('categories.reorderHandle')}
          onReorder={(order) => onChange({ ...layout, order: order as StatsSection[] })}
          renderItem={(id) => {
            const hidden = layout.hidden.includes(id);
            return (
              <View style={[styles.row, hidden && styles.faded]}>
                <MaterialCommunityIcons name={ICONS[id]} size={22} color={theme.textSecondary} />
                <Text style={styles.title} numberOfLines={1}>
                  {t(`stats.section.${id}`)}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onChange(toggleHidden(layout, id));
                  }}
                  hitSlop={10}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: !hidden }}
                  accessibilityLabel={t(hidden ? 'stats.show' : 'stats.hide')}>
                  <MaterialCommunityIcons
                    name={hidden ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={hidden ? theme.textSecondary : theme.primary}
                  />
                </Pressable>
              </View>
            );
          }}
        />
      </Surface>
      <Button title={t('stats.done')} filled onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: { borderRadius: Radius + 4, overflow: 'hidden' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },
  title: { flex: 1, fontWeight: '500' },
  faded: { opacity: 0.45 },
});
