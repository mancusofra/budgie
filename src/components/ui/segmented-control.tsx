import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { Spacing } from '@/theme';

import { hasGlass, Surface } from './surface';
import { Text } from './text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  /** Valore selezionato; se non è tra le opzioni nessuna risulta selezionata. */
  value: string;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const selectedBg = hasGlass ? withAlpha(theme.text, 0.1) : theme.background;

  return (
    <Surface style={styles.container}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && { backgroundColor: selectedBg }]}>
            <Text
              variant="caption"
              numberOfLines={1}
              // Con caratteri molto grandi rimpicciolisce invece di troncare
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              color={selected ? 'text' : 'textSecondary'}
              style={selected ? styles.selected : styles.label}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one + 3,
    borderRadius: 999,
  },
  label: { fontWeight: '500' },
  selected: { fontWeight: '600' },
});
