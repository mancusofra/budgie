import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAccounts, useAccountScope } from '@/features/accounts/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useUIStore } from '@/store/ui';
import { Spacing } from '@/theme';

/** Filtro conto ("Tutti i conti ▾") e pulsante trasferimento. */
export function AccountBar() {
  const { t } = useTranslation();
  const theme = useTheme();
  const accounts = useAccounts();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const current = accounts.find((a) => a.id === accountFilter);
  const { partial, currency } = useAccountScope();
  // Con conti in valute diverse "tutti" include solo quelli nella valuta principale
  const label =
    current?.name ?? (partial ? `${t('accounts.all')} · ${currency}` : t('accounts.all'));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push('/account/select')}
        accessibilityRole="button"
        accessibilityLabel={`${t('accounts.select')}: ${label}`}>
        <Surface interactive style={styles.pill}>
          <MaterialCommunityIcons
            name={current ? 'wallet-outline' : 'wallet-bifold-outline'}
            size={18}
            color={theme.textSecondary}
          />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
        </Surface>
      </Pressable>
      <Pressable
        onPress={() => router.push('/transfer/new')}
        accessibilityRole="button"
        accessibilityLabel={t('transfer.new')}
        hitSlop={8}>
        <Surface interactive style={styles.round}>
          <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.text} />
        </Surface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    maxWidth: 260,
  },
  label: { fontWeight: '600', flexShrink: 1 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
