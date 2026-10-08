import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { ColorPicker, IconPicker } from '@/components/ui/pickers';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { Category, CategoryType } from '@/db/schema';
import { categoryActions, useCategory } from '@/features/categories/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_ICONS, PICKER_COLORS } from '@/theme/palette';
import { Radius, Spacing } from '@/theme';

export default function CategoryScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const isNew = id === 'new';
  const category = useCategory(isNew ? undefined : id);

  // Wait for the category before initializing the form
  if (!isNew && !category) return null;
  return (
    <CategoryForm
      key={category?.id ?? 'new'}
      category={category ?? undefined}
      initialType={type === 'income' ? 'income' : 'expense'}
    />
  );
}

function CategoryForm({
  category,
  initialType,
}: {
  category?: Category;
  initialType: CategoryType;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(category ? t('categories.edit') : t('categories.new'));
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? initialType);
  const [color, setColor] = useState<string>(category?.color ?? PICKER_COLORS[0]);
  const [icon, setIcon] = useState<string>(category?.icon ?? CATEGORY_ICONS[0]);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (!name.trim()) {
      setError(t('categories.nameRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (category) await categoryActions.update(category.id, { name, color, icon });
    else await categoryActions.create({ name, type, color, icon });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const removeOrArchive = async () => {
    if (!category) return;
    const count = await categoryActions.transactionCount(category.id);
    if (count === 0) {
      Alert.alert(t('categories.deleteConfirm'), category.name, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await categoryActions.remove(category.id);
            router.back();
          },
        },
      ]);
    } else {
      Alert.alert(t('categories.archiveConfirm'), t('categories.archiveMessage', { count }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('categories.archive'),
          onPress: async () => {
            await categoryActions.setArchived(category.id, true);
            router.back();
          },
        },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.preview}>
          <CategoryIcon icon={icon} color={color} size={72} filled />
          <Text variant="subtitle" numberOfLines={1}>
            {name.trim() || t('categories.namePlaceholder')}
          </Text>
        </View>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('categories.name')}
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(undefined);
            }}
            placeholder={t('categories.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            maxLength={40}
            autoFocus={!category}
            returnKeyType="done"
          />
          {error && <Text style={{ color: theme.expense }}>{error}</Text>}
          {!category && (
            <>
              <Text variant="overline" color="textSecondary">
                {t('categories.type')}
              </Text>
              <SegmentedControl
                options={[
                  { value: 'expense', label: t('home.expenses') },
                  { value: 'income', label: t('home.income') },
                ]}
                value={type}
                onChange={setType}
              />
            </>
          )}
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('categories.color')}
          </Text>
          <ColorPicker colors={PICKER_COLORS} value={color} onChange={setColor} />
        </Surface>

        <Surface style={styles.card}>
          <Text variant="overline" color="textSecondary">
            {t('categories.icon')}
          </Text>
          <IconPicker icons={CATEGORY_ICONS} value={icon} color={color} onChange={setIcon} />
        </Surface>

        <Button title={t('common.save')} filled onPress={save} />
        {category && (
          <Button title={t('categories.delete')} color="expense" onPress={removeOrArchive} />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  preview: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.two + 2 },
  input: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
