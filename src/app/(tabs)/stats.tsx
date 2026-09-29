import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart } from '@/components/charts/bar-chart';
import { CategoryIcon } from '@/components/transactions/category-icon';
import { PeriodHeader } from '@/components/transactions/period-header';
import { Button } from '@/components/ui/button';
import { ReorderableStack } from '@/components/ui/reorderable-stack';
import { Screen, useTabBarSpace } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency, useSetSetting, useSettings } from '@/features/settings/hooks';
import {
  useBudgetProgress,
  useExpenseSeries,
  usePreviousExpense,
  type BudgetProgress,
} from '@/features/stats/hooks';
import {
  useCategoryStats,
  usePeriodTotals,
  useSelectedPeriod,
} from '@/features/transactions/hooks';
import { useTheme } from '@/hooks/use-theme';
import { dateLocale, deviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { percentChange } from '@/lib/series';
import {
  normalizeStatsLayout,
  toggleHidden,
  visibleSections,
  withVisibleOrder,
  type StatsLayout,
  type StatsSection,
} from '@/lib/stats-layout';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing, TabularNums } from '@/theme';

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const locale = dateLocale(i18n.language);
  const money = (minor: number) => formatMoney(minor, currency, deviceLocale);
  const tabBarSpace = useTabBarSpace();

  // Layout personalizzabile (ordine e sezioni nascoste), salvato nelle impostazioni
  const settings = useSettings();
  const setSetting = useSetSetting();
  const layout = useMemo(() => normalizeStatsLayout(settings.statsLayout), [settings.statsLayout]);
  const saveLayout = (next: StatsLayout) => setSetting('statsLayout', next);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollOffset(scrollRef);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const startEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(true);
  };

  const { period, range } = useSelectedPeriod();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const setOpenCategory = useUIStore((s) => s.setOpenCategory);
  const totals = usePeriodTotals(range, accountFilter);
  const previousExpense = usePreviousExpense(period, accountFilter);
  const change = previousExpense === null ? null : percentChange(totals.expense, previousExpense);

  // Grafico
  const { window, points } = useExpenseSeries(period, range, accountFilter);
  const [selection, setSelectedKey] = useState<string>();
  // Cambiando periodo la barra selezionata può non esistere più: ignorala
  const selectedKey = points.some((p) => p.key === selection) ? selection : undefined;
  const bars = points.map((p) => ({
    key: p.key,
    value: p.value,
    label: format(p.date, window.bucket === 'day' ? 'd' : 'LLL', { locale }),
  }));
  const selected = points.find((p) => p.key === selectedKey);
  const fullLabel = (d: Date) =>
    format(d, window.bucket === 'day' ? 'EEE d MMM' : 'LLLL yyyy', { locale });
  const chartTotal = points.reduce((sum, p) => sum + p.value, 0);
  const average = points.length > 0 ? Math.round(chartTotal / points.length) : 0;

  // Classifica categorie
  const categories = useCategories('expense', { includeArchived: true });
  const stats = useCategoryStats(range, accountFilter);
  const ranking = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const rows = stats.flatMap((s) => {
      const category = s.type === 'expense' && s.categoryId ? byId.get(s.categoryId) : undefined;
      return category ? [{ category, total: s.total }] : [];
    });
    const sum = rows.reduce((a, r) => a + r.total, 0);
    return rows.map((r) => ({ ...r, share: sum > 0 ? r.total / sum : 0 }));
  }, [stats, categories]);

  // Budget
  const { month, progress } = useBudgetProgress();
  const monthLabel = month.from ? format(month.from, 'LLLL', { locale }) : '';

  const tile = (label: string, value: number, color: string, footnote?: React.ReactNode) => (
    <Surface style={styles.tile}>
      <Text variant="overline" color="textSecondary">
        {label}
      </Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)}
      </Text>
      {footnote}
    </Surface>
  );

  const sections: Record<StatsSection, ReactNode> = {
    summary: (
      <View style={styles.tiles}>
        {tile(
          t('home.expenses'),
          totals.expense,
          theme.expense,
          change !== null && (
            <View style={styles.change}>
              <MaterialCommunityIcons
                name={change > 0 ? 'arrow-up' : change < 0 ? 'arrow-down' : 'equal'}
                size={12}
                color={theme.textSecondary}
              />
              <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.flex}>
                {Math.round(change) === 0
                  ? t('stats.samePrevious')
                  : t('stats.vsPrevious', { value: `${Math.abs(Math.round(change))}%` })}
              </Text>
            </View>
          ),
        )}
        {tile(t('home.income'), totals.income, theme.income)}
      </View>
    ),
    chart: (
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="overline" color="textSecondary">
            {t('stats.chartTitle')}
          </Text>
          <Text style={[styles.chartValue, TabularNums]}>
            {selected ? money(selected.value) : money(chartTotal)}
          </Text>
          <Text variant="caption" color="textSecondary">
            {selected
              ? fullLabel(selected.date)
              : t(window.bucket === 'day' ? 'stats.averageDay' : 'stats.averageMonth', {
                  value: money(average),
                })}
          </Text>
        </View>
        <BarChart
          data={bars}
          color={theme.expense}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          accessibilityLabelFor={(d) => {
            const p = points.find((x) => x.key === d.key)!;
            return t('stats.barLabel', { label: fullLabel(p.date), value: money(p.value) });
          }}
        />
      </Surface>
    ),
    categories: (
      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('stats.byCategory')}
        </Text>
        {ranking.length === 0 && <Text color="textSecondary">{t('stats.empty')}</Text>}
        {ranking.map(({ category, total, share }) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => {
              setOpenCategory(category.id);
              router.navigate('/transactions');
            }}
            style={({ pressed }) => [styles.rankRow, pressed && { opacity: 0.6 }]}>
            <CategoryIcon icon={category.icon} color={category.color} size={32} />
            <View style={styles.flex}>
              <View style={styles.rankTop}>
                <Text numberOfLines={1} style={[styles.flex, styles.rankName]}>
                  {category.name}
                </Text>
                <Text variant="caption" color="textSecondary" style={TabularNums}>
                  {Math.round(share * 100)}%
                </Text>
                <Text style={[styles.rankAmount, TabularNums]}>{money(total)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.max(share * 100, 1)}%`, backgroundColor: category.color },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </Surface>
    ),
    budgets: (
      <Surface style={styles.card}>
        <Text variant="overline" color="textSecondary">
          {t('stats.budgets', { month: monthLabel })}
        </Text>
        {progress.length === 0 && <Text color="textSecondary">{t('stats.noBudgets')}</Text>}
        {progress.map((b) => (
          <BudgetRow key={b.id} budget={b} money={money} />
        ))}
        <Button
          title={t('stats.addBudget')}
          icon={<MaterialCommunityIcons name="plus" size={20} color={theme.primary} />}
          onPress={() => router.push({ pathname: '/budget/[id]', params: { id: 'new' } })}
        />
      </Surface>
    ),
  };

  const visible = visibleSections(layout);
  const hidden = layout.order.filter((id) => layout.hidden.includes(id));

  // Il "−" in modifica nasconde la sezione
  const withHideButton = (id: StatsSection, node: ReactNode) => (
    <View>
      {node}
      {editing && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            saveLayout(toggleHidden(layout, id));
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${t('stats.hide')}: ${t(`stats.section.${id}`)}`}
          style={[styles.hideButton, { backgroundColor: theme.backgroundSelected }]}>
          <MaterialCommunityIcons name="minus" size={18} color={theme.text} />
        </Pressable>
      )}
    </View>
  );

  return (
    <Screen scrolls>
      <Animated.ScrollView
        ref={scrollRef}
        // A tutta larghezza: il margine è nel contenuto, così i badge "−" possono uscire dal riquadro
        style={styles.scroll}
        scrollEnabled={!dragging}
        contentContainerStyle={[
          styles.content,
          // In modifica anche lo spazio del pulsante "Fine" fluttuante
          { paddingBottom: Spacing.four + tabBarSpace + (editing ? 72 : 0) },
        ]}
        scrollIndicatorInsets={{ bottom: tabBarSpace }}
        showsVerticalScrollIndicator={false}>
        <PeriodHeader />

        <ReorderableStack
          items={visible.map((id) => ({ key: id, node: withHideButton(id, sections[id]) }))}
          gap={Spacing.three}
          scrollRef={scrollRef}
          scrollY={scrollY}
          autoScrollEdges={{
            top: insets.top + 120,
            bottom: windowHeight - Math.max(tabBarSpace, 80) - 80,
          }}
          onDragStart={() => {
            setDragging(true);
            setEditing(true);
          }}
          onDragEnd={() => setDragging(false)}
          onReorder={(keys) => saveLayout(withVisibleOrder(layout, keys as StatsSection[]))}
        />

        {editing && (
          <Text variant="caption" color="textSecondary" style={styles.center}>
            {t('stats.editHint')}
          </Text>
        )}

        {editing && hidden.length > 0 && (
          <View style={styles.hiddenSection}>
            <Text variant="overline" color="textSecondary">
              {t('stats.hiddenSections')}
            </Text>
            <View style={styles.hiddenChips}>
              {hidden.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    saveLayout(toggleHidden(layout, id));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('stats.show')}: ${t(`stats.section.${id}`)}`}>
                  <Surface interactive style={styles.hiddenChip}>
                    <MaterialCommunityIcons name="plus" size={16} color={theme.primary} />
                    <Text variant="caption" style={styles.hiddenChipLabel}>
                      {t(`stats.section.${id}`)}
                    </Text>
                  </Surface>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!editing && (
          <Pressable
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityHint={t('stats.longPressHint')}
            style={({ pressed }) => [styles.customize, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="tune-variant" size={18} color={theme.textSecondary} />
            <Text color="textSecondary">{t('stats.customize')}</Text>
          </Pressable>
        )}
      </Animated.ScrollView>

      {/* "Fine" fluttuante: non sposta il contenuto mentre si trascina */}
      {editing && (
        <View
          pointerEvents="box-none"
          style={[
            styles.doneFloating,
            { bottom: Math.max(tabBarSpace, Spacing.three) + Spacing.three },
          ]}>
          <Button
            title={t('stats.done')}
            filled
            onPress={() => setEditing(false)}
            style={styles.doneButton}
          />
        </View>
      )}
    </Screen>
  );
}

function BudgetRow({ budget, money }: { budget: BudgetProgress; money: (m: number) => string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const categories = useCategories('expense', { includeArchived: true });
  const category = budget.categoryId
    ? categories.find((c) => c.id === budget.categoryId)
    : undefined;

  const statusColor =
    budget.level === 'over'
      ? theme.expense
      : budget.level === 'warning'
        ? theme.warning
        : theme.income;
  const status =
    budget.level === 'over'
      ? {
          icon: 'alert-octagon' as const,
          text: t('stats.statusOver', { amount: money(-budget.remaining) }),
        }
      : budget.level === 'warning'
        ? {
            icon: 'alert' as const,
            text: t('stats.statusWarning', { percent: Math.round(budget.ratio * 100) }),
          }
        : {
            icon: 'check-circle-outline' as const,
            text: t('stats.statusOk', { amount: money(budget.remaining) }),
          };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/budget/[id]', params: { id: budget.id } })}
      style={({ pressed }) => [styles.budgetRow, pressed && { opacity: 0.6 }]}>
      <View style={styles.rankTop}>
        {category ? (
          <CategoryIcon icon={category.icon} color={category.color} size={28} />
        ) : (
          <CategoryIcon icon="wallet-outline" color={theme.textSecondary} size={28} />
        )}
        <Text numberOfLines={1} style={[styles.flex, styles.rankName]}>
          {category?.name ?? t('stats.globalBudget')}
        </Text>
        <Text variant="caption" color="textSecondary" style={TabularNums}>
          {t('stats.spentOf', { spent: money(budget.spent), amount: money(budget.amount) })}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(Math.max(budget.ratio * 100, 1), 100)}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>
      <View style={styles.change}>
        <MaterialCommunityIcons name={status.icon} size={14} color={statusColor} />
        <Text variant="caption" color="textSecondary">
          {status.text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -Spacing.three },
  content: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.one },
  tileValue: { fontSize: 22, lineHeight: 28, fontWeight: '700', ...TabularNums },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
  cardHeader: { gap: 2 },
  chartValue: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rankTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rankName: { fontWeight: '500' },
  rankAmount: { fontWeight: '600', minWidth: 72, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, borderRadius: 3 },
  budgetRow: { gap: 2 },
  doneFloating: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  doneButton: { minWidth: 160 },
  center: { textAlign: 'center' },
  // Badge nell'angolo in alto a sinistra, a cavallo del bordo (come iOS)
  hideButton: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenSection: { gap: Spacing.two },
  hiddenChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  hiddenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  hiddenChipLabel: { fontWeight: '500' },
  customize: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  flex: { flex: 1 },
});
