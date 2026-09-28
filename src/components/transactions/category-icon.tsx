import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function CategoryIcon({
  icon,
  color,
  size = 48,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <MaterialCommunityIcons name={icon as IconName} size={size * 0.55} color="#FFFFFF" />
    </View>
  );
}
