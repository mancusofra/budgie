import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { KeypadKey } from '@/lib/expression';
import { Radius, Spacing } from '@/theme';

import { hasGlass, Surface } from './surface';
import { Text } from './text';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
];

const KEY_HEIGHT = 50;

type Props = {
  onKey: (key: KeypadKey) => void;
  /** Confirm key, built into the keypad. */
  onDone: () => void;
  labels: { backspace: string; comma: string; done: string };
  decimalSeparator?: string;
};

/**
 * Keypad to enter an amount, with the confirm key inside the grid
 * (instead of the system keyboard, which on iOS has no key to dismiss it).
 */
export function AmountPad({ onKey, onDone, labels, decimalSeparator = ',' }: Props) {
  const theme = useTheme();
  const check = <MaterialCommunityIcons name="check" size={28} color="#FFFFFF" />;

  return (
    <View style={styles.pad}>
      <View style={styles.grid}>
        {ROWS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={
                  key === 'backspace' ? labels.backspace : key === ',' ? labels.comma : key
                }
                onPress={() => {
                  Haptics.selectionAsync();
                  onKey(key);
                }}
                style={({ pressed }) => [styles.flex, pressed && { opacity: 0.6 }]}>
                <Surface interactive style={styles.key}>
                  {key === 'backspace' ? (
                    <MaterialCommunityIcons name="backspace-outline" size={24} color={theme.text} />
                  ) : (
                    <Text style={styles.label}>{key === ',' ? decimalSeparator : key}</Text>
                  )}
                </Surface>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.done}
        onPress={() => {
          Haptics.selectionAsync();
          onDone();
        }}
        style={({ pressed }) => [styles.doneColumn, pressed && { opacity: 0.75 }]}>
        {hasGlass ? (
          <GlassView isInteractive tintColor={theme.primary} style={styles.done}>
            {check}
          </GlassView>
        ) : (
          <View style={[styles.done, { backgroundColor: theme.primary }]}>{check}</View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', gap: Spacing.two },
  grid: { flex: 3, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  key: { height: KEY_HEIGHT, borderRadius: Radius, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 24, lineHeight: 30, fontWeight: '400' },
  doneColumn: { flex: 1 },
  done: {
    flex: 1,
    borderRadius: Radius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
