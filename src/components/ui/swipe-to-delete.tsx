import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { useTheme } from '@/hooks/use-theme';

/** Swipe a sinistra oltre la soglia → onDelete (l'annullamento è a carico del chiamante). */
export function SwipeToDelete({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={80}
      overshootRight={false}
      onSwipeableOpen={onDelete}
      renderRightActions={() => (
        <View style={[styles.delete, { backgroundColor: theme.expense }]}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#FFFFFF" />
        </View>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  delete: { width: 88, alignItems: 'center', justifyContent: 'center' },
});
