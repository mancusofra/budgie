import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { withAlpha } from '@/lib/color';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  icon: string;
  color: string;
  size?: number;
  /** Pieno (sfondo colorato, simbolo bianco) invece che tonale. */
  filled?: boolean;
};

export function CategoryIcon({ icon, color, size = 48, filled = false }: Props) {
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
    </View>
  );
}
