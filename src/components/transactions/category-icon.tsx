import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { GROUP_META } from '@/features/groups/meta';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import type { Group } from '@/lib/groups';
import { useUIStore } from '@/store/ui';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  icon: string;
  color: string;
  size?: number;
  /** Filled (colored background, white symbol) instead of tonal. */
  filled?: boolean;
  /** Spending group: shown as a badge in the corner when groups are on. */
  group?: Group | null;
};

export function CategoryIcon({ icon, color, size = 48, filled = false, group }: Props) {
  const groupsEnabled = useUIStore((s) => s.groupsEnabled);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: filled ? color : withAlpha(color, 0.16),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <MaterialCommunityIcons
        name={icon as IconName}
        size={size * 0.5}
        color={filled ? '#FFFFFF' : color}
      />
      {groupsEnabled && group ? <GroupBadge group={group} size={size} /> : null}
    </View>
  );
}

/** Small circle with the group symbol on the bottom-right corner of the icon. */
function GroupBadge({ group, size }: { group: Group; size: number }) {
  const theme = useTheme();
  const badge = Math.max(12, Math.round(size * 0.34));
  const border = badge > 16 ? 2 : 1.5;
  return (
    <View
      accessible={false}
      style={{
        position: 'absolute',
        right: -border - 1,
        bottom: -border - 1,
        width: badge + border * 2,
        height: badge + border * 2,
        borderRadius: badge,
        borderWidth: border,
        borderColor: theme.background,
        backgroundColor: theme[GROUP_META[group].color],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <MaterialCommunityIcons
        name={GROUP_META[group].icon}
        size={badge * 0.62}
        color={theme.textOnColor}
      />
    </View>
  );
}
