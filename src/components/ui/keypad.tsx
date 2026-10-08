import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { KeypadKey } from '@/lib/expression';
import { Radius, Spacing } from '@/theme';

import { Surface } from './surface';
import { Text } from './text';

const ROWS: KeypadKey[][] = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  [',', '0', 'backspace', '+'],
];

type Props = {
  onKey: (key: KeypadKey) => void;
  /** Screen reader labels for the non-numeric keys. */
  labels: Partial<Record<KeypadKey, string>>;
  /** Symbol shown on the decimal key (the key always emits ","). */
  decimalSeparator?: string;
};

export function Keypad({ onKey, labels, decimalSeparator = ',' }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            const isOp = ['÷', '×', '−', '+'].includes(key);
            return (
              <Pressable
                key={key}
                testID={`key-${key}`}
                accessibilityRole="button"
                accessibilityLabel={labels[key] ?? key}
                onPress={() => {
                  Haptics.selectionAsync();
                  onKey(key);
                }}
                style={({ pressed }) => [styles.flex, pressed && { opacity: 0.6 }]}>
                <Surface interactive style={styles.key}>
                  {key === 'backspace' ? (
                    <MaterialCommunityIcons name="backspace-outline" size={24} color={theme.text} />
                  ) : (
                    <Text style={[styles.label, isOp && { color: theme.primary }]}>
                      {key === ',' ? decimalSeparator : key}
                    </Text>
                  )}
                </Surface>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  key: {
    height: 54,
    borderRadius: Radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 24, lineHeight: 30, fontWeight: '400' },
});
