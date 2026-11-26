import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GROUP_META, groupLabelKey } from '@/features/groups/meta';
import { useTheme } from '@/hooks/use-theme';
import { GROUPS, type Group } from '@/lib/groups';
import { Radius, Spacing } from '@/theme';

import { Text } from './text';

/** Three buttons (symbol + name) to choose the spending group. */
export function GroupPicker({ value, onChange }: { value: Group; onChange: (g: Group) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {GROUPS.map((group) => {
        const selected = group === value;
        const color = theme[GROUP_META[group].color];
        return (
          <Pressable
            key={group}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(group);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(groupLabelKey(group))}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected
                  ? color
                  : pressed
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
              },
            ]}>
            <View style={[styles.dot, { backgroundColor: selected ? 'transparent' : color }]}>
              <MaterialCommunityIcons
                name={GROUP_META[group].icon}
                size={selected ? 20 : 13}
                color={theme.textOnColor}
              />
            </View>
            <Text
              variant="caption"
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? theme.textOnColor : theme.textSecondary },
                selected && styles.selected,
              ]}>
              {t(groupLabelKey(group))}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius,
  },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13 },
  selected: { fontWeight: '600' },
});
