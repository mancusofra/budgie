import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { KeypadKey } from '@/lib/expression';
import { Radius, Spacing } from '@/theme';

import { Text } from './text';

const ROWS: KeypadKey[][] = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  [',', '0', 'backspace', '+'],
];

type Props = {
  onKey: (key: KeypadKey) => void;
  /** Etichette per screen reader dei tasti non numerici. */
  labels: Partial<Record<KeypadKey, string>>;
  /** Simbolo mostrato sul tasto decimale (il tasto emette sempre ","). */
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
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSelected
                      : isOp
                        ? theme.backgroundElement
                        : theme.surface,
                  },
                ]}>
                {key === 'backspace' ? (
                  <MaterialCommunityIcons name="backspace-outline" size={26} color={theme.text} />
                ) : (
                  <Text style={[styles.label, isOp && { color: theme.primary }]}>
                    {key === ',' ? decimalSeparator : key}
                  </Text>
                )}
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
  key: {
    flex: 1,
    height: 56,
    borderRadius: Radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 26, lineHeight: 32, fontWeight: '500' },
});
