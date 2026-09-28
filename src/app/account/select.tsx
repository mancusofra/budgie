import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Text } from '@/components/ui/text';
import { useAccountsWithBalance } from '@/features/accounts/hooks';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useUIStore } from '@/store/ui';
import { Spacing, TabularNums } from '@/theme';

/** Pannello per scegliere il conto da mostrare (o tutti). */
export default function AccountSelectSheet() {
  const { t } = useTranslation();
  const theme = useTheme();
  const rows = useAccountsWithBalance();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const setAccountFilter = useUIStore((s) => s.setAccountFilter);

  const choose = (id: string) => {
    setAccountFilter(id);
    router.back();
  };

  const row = (key: string, title: string, right: string | undefined, leading: React.ReactNode) => {
    const selected = accountFilter === key;
    return (
      <Pressable
        key={key}
        onPress={() => choose(key)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        {leading}
        <Text style={[styles.title, selected && styles.selected]} numberOfLines={1}>
          {title}
        </Text>
        {right ? (
          <Text color="textSecondary" style={styles.balance}>
            {right}
          </Text>
        ) : null}
        <MaterialCommunityIcons
          name="check"
          size={20}
          color={selected ? theme.primary : 'transparent'}
        />
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Text variant="subtitle">{t('accounts.select')}</Text>
      <View>
        {row(
          'all',
          t('accounts.all'),
          undefined,
          <CategoryIcon icon="wallet-bifold" color={theme.textSecondary} size={36} />,
        )}
        {rows.map(({ account, balance }) =>
          row(
            account.id,
            account.name,
            formatMoney(balance, account.currency, deviceLocale),
            <CategoryIcon
              icon={account.icon ?? 'wallet'}
              color={account.color ?? theme.textSecondary}
              size={36}
            />,
          ),
        )}
      </View>
      <Pressable
        onPress={() => {
          router.back();
          router.push('/account');
        }}
        accessibilityRole="button"
        style={styles.manage}>
        <MaterialCommunityIcons name="cog-outline" size={18} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: '600' }}>{t('accounts.manage')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: { flex: 1 },
  selected: { fontWeight: '600' },
  balance: { ...TabularNums },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
