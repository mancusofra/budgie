import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { SortableList } from '@/components/ui/sortable-list';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { accountActions, useAccountsWithBalance } from '@/features/accounts/hooks';
import { useStackHeader } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { Radius, Spacing, TabularNums } from '@/theme';

const ROW_HEIGHT = 60;

export default function AccountsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useStackHeader(t('accounts.title'));
  const rows = useAccountsWithBalance({ includeArchived: true });
  const active = rows.filter((r) => !r.account.archived);
  const archived = rows.filter((r) => r.account.archived);

  const confirmPurge = async (id: string, name: string) => {
    const count = await accountActions.transactionCount(id);
    Alert.alert(
      t('accounts.purgeConfirm', { name }),
      count > 0 ? t('accounts.purgeMessage', { count }) : t('accounts.purgeEmpty'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.purgeAction'),
          style: 'destructive',
          onPress: () => {
            accountActions.purge(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const open = (id: string) => router.push({ pathname: '/account/[id]', params: { id } });
  const balanceText = (balance: number, currency: string) =>
    formatMoney(balance, currency, deviceLocale);

  return (
    <>
      <Stack.Screen options={header} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <Surface style={styles.card}>
          <SortableList
            data={active}
            keyExtractor={(r) => r.account.id}
            rowHeight={ROW_HEIGHT}
            handleLabel={t('categories.reorderHandle')}
            onReorder={accountActions.reorder}
            renderItem={({ account, balance }) => (
              <Pressable
                onPress={() => open(account.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                <CategoryIcon
                  icon={account.icon ?? 'wallet'}
                  color={account.color ?? theme.textSecondary}
                  size={36}
                />
                <View style={styles.texts}>
                  <Text numberOfLines={1} style={styles.name}>
                    {account.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {account.currency}
                  </Text>
                </View>
                <Text style={[styles.balance, { color: balance < 0 ? theme.expense : theme.text }]}>
                  {balanceText(balance, account.currency)}
                </Text>
              </Pressable>
            )}
          />
        </Surface>

        <Button
          title={t('accounts.new')}
          icon={<MaterialCommunityIcons name="plus" size={20} color={theme.primary} />}
          onPress={() => open('new')}
        />

        {archived.length > 0 && (
          <View style={styles.section}>
            <Text variant="overline" color="textSecondary">
              {t('accounts.archived')}
            </Text>
            <Surface style={styles.card}>
              {archived.map(({ account, balance }) => (
                <View key={account.id} style={[styles.row, { height: ROW_HEIGHT }]}>
                  <Text numberOfLines={1} color="textSecondary" style={styles.name}>
                    {account.name}
                  </Text>
                  <Text color="textSecondary" style={styles.balance}>
                    {balanceText(balance, account.currency)}
                  </Text>
                  <Pressable
                    onPress={() => accountActions.setArchived(account.id, false)}
                    accessibilityRole="button"
                    hitSlop={8}>
                    <Text style={[styles.restore, { color: theme.primary }]}>
                      {t('accounts.restore')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmPurge(account.id, account.name)}
                    accessibilityRole="button"
                    accessibilityLabel={t('accounts.purge')}
                    hitSlop={8}
                    style={styles.purge}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color={theme.expense} />
                  </Pressable>
                </View>
              ))}
            </Surface>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: Radius + 4, overflow: 'hidden' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  texts: { flex: 1 },
  name: { fontWeight: '500', flexShrink: 1 },
  balance: { fontWeight: '600', ...TabularNums },
  section: { gap: Spacing.two },
  restore: { fontWeight: '600', marginLeft: Spacing.two },
  purge: { paddingHorizontal: Spacing.two },
});
