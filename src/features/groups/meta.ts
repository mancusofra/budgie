import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { Group } from '@/lib/groups';
import type { ThemeColor } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Symbol and color of each spending group: color is never used without the symbol. */
export const GROUP_META: Record<Group, { icon: IconName; color: ThemeColor }> = {
  need: { icon: 'home-variant', color: 'groupNeed' },
  want: { icon: 'star-four-points', color: 'groupWant' },
  save: { icon: 'sprout', color: 'groupSave' },
};

/** i18n key of the group name. */
export const groupLabelKey = (group: Group) => `groups.${group}` as const;

/** Next group when tapping a category in the setup sheet. */
export const nextGroup = (group: Group): Group =>
  group === 'need' ? 'want' : group === 'want' ? 'save' : 'need';
