import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SortableList } from '@/components/ui/sortable-list';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { CategoryType } from '@/db/schema';
import { categoryActions, useCategories } from '@/features/categories/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

const ROW_HEIGHT = 56;

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(t('categories.title'));
  const [type, setType] = useState<CategoryType>('expense');
  const all = useCategories(type, { includeArchived: true });
  const active = all.filter((c) => !c.archived);
  const archived = all.filter((c) => c.archived);

  const open = (id: string) => router.push({ pathname: '/category/[id]', params: { id, type } });

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <SegmentedControl
          options={[
            { value: 'expense', label: t('home.expenses') },
            { value: 'income', label: t('home.income') },
          ]}
          value={type}
          onChange={setType}
        />

        <Surface style={styles.card}>
          <SortableList
            data={active}
            keyExtractor={(c) => c.id}
            rowHeight={ROW_HEIGHT}
            handleLabel={t('categories.reorderHandle')}
            onReorder={categoryActions.reorder}
            renderItem={(c) => (
              <Pressable
                onPress={() => open(c.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                <CategoryIcon icon={c.icon} color={c.color} size={36} />
                <Text numberOfLines={1} style={styles.name}>
                  {c.name}
                </Text>
              </Pressable>
            )}
          />
        </Surface>

        <Button
          title={t('categories.new')}
          icon={<MaterialCommunityIcons name="plus" size={20} color={theme.primary} />}
          onPress={() => open('new')}
        />

        {archived.length > 0 && (
          <View style={styles.section}>
            <Text variant="overline" color="textSecondary">
              {t('categories.archived')}
            </Text>
            <Surface style={styles.card}>
              {archived.map((c) => (
                <View key={c.id} style={[styles.row, { height: ROW_HEIGHT }]}>
                  <View style={styles.faded}>
                    <CategoryIcon icon={c.icon} color={c.color} size={36} />
                  </View>
                  <Text numberOfLines={1} color="textSecondary" style={styles.name}>
                    {c.name}
                  </Text>
                  <Pressable
                    onPress={() => categoryActions.setArchived(c.id, false)}
                    accessibilityRole="button"
                    hitSlop={8}>
                    <Text style={[styles.restore, { color: theme.primary }]}>
                      {t('categories.restore')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Surface>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: Radius + 4, overflow: 'hidden' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
  },
  name: { flex: 1, fontWeight: '500' },
  section: { gap: Spacing.two },
  faded: { opacity: 0.5 },
  restore: { fontWeight: '600' },
});
