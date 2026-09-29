import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { hasGlass, Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAccountScope } from '@/features/accounts/hooks';
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
  type StatsLayout,
  type StatsSection,
} from '@/lib/stats-layout';
import { useUIStore } from '@/store/ui';
import { HiddenTabBarTouchArea, Radius, Spacing, TabularNums } from '@/theme';

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const locale = dateLocale(i18n.language);
  // Importi nella valuta del conto mostrato; i budget nella valuta principale
  const money = (minor: number) => formatMoney(minor, displayCurrency, deviceLocale);
  const mainMoney = (minor: number) => formatMoney(minor, currency, deviceLocale);
  const tabBarSpace = useTabBarSpace();

  // Layout personalizzabile (ordine e sezioni nascoste), salvato nelle impostazioni
  const settings = useSettings();
  const setSetting = useSetSetting();
  const layout = useMemo(() => normalizeStatsLayout(settings.statsLayout), [settings.statsLayout]);
  const saveLayout = (next: StatsLayout) => setSetting('statsLayout', next);
  const editing = useUIStore((s) => s.editingLayout);
  const setEditing = useUIStore((s) => s.setEditingLayout);
  // Lasciando la schermata la modifica si chiude sempre (la tab bar deve tornare)
  useFocusEffect(useCallback(() => () => setEditing(false), [setEditing]));
  const [dragging, setDragging] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollOffset(scrollRef);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const { period, range } = useSelectedPeriod();
  const { scope, currency: displayCurrency, mainScope } = useAccountScope();
  const setOpenCategory = useUIStore((s) => s.setOpenCategory);
  const totals = usePeriodTotals(range, scope);
  const previousExpense = usePreviousExpense(period, scope);
  const change = previousExpense === null ? null : percentChange(totals.expense, previousExpense);

  // Grafico
  const { window, points } = useExpenseSeries(period, range, scope);
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
  const stats = useCategoryStats(range, scope);
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
  const { month, monthKey, progress } = useBudgetProgress(period, range, mainScope);
  const monthLabel = month.from ? format(month.from, 'LLLL yyyy', { locale }) : '';

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
          {chartTotal > 0 && (
            <Text variant="caption" color="textSecondary">
              {selected
                ? fullLabel(selected.date)
                : t(window.bucket === 'day' ? 'stats.averageDay' : 'stats.averageMonth', {
                    value: money(average),
                  })}
            </Text>
          )}
        </View>
        {chartTotal === 0 ? (
          <View style={styles.chartEmpty}>
            <MaterialCommunityIcons name="chart-bar" size={32} color={theme.textSecondary} />
            <Text color="textSecondary" style={styles.chartEmptyText}>
              {t('stats.chartEmpty')}
            </Text>
          </View>
        ) : (
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
        )}
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
          <BudgetRow key={b.id} budget={b} money={mainMoney} monthKey={monthKey} />
        ))}
        <Button
          title={t('stats.addBudget')}
          icon={<MaterialCommunityIcons name="plus" size={20} color={theme.primary} />}
          onPress={() =>
            router.push({ pathname: '/budget/[id]', params: { id: 'new', month: monthKey } })
          }
        />
      </Surface>
    ),
  };

  // In modifica si vedono tutte le sezioni: prima le visibili, poi le nascoste
  // (in fondo, così entrando in modifica le visibili non si spostano)
  const visible = visibleSections(layout);
  const hiddenSections = layout.order.filter((id) => layout.hidden.includes(id));
  const stack = editing ? [...visible, ...hiddenSections] : visible;

  const withVisibilityToggle = (id: StatsSection, node: ReactNode) => {
    const isHidden = layout.hidden.includes(id);
    return (
      <View>
        {/* In modifica il contenuto non risponde ai tocchi (niente navigazione):
            restano solo il trascinamento, gestito dal contenitore, e l'occhio */}
        <View
          pointerEvents={editing ? 'none' : 'auto'}
          style={editing && isHidden ? styles.hiddenCard : undefined}>
          {node}
        </View>
        {editing && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              saveLayout(toggleHidden(layout, id));
            }}
            hitSlop={10}
            accessibilityRole="switch"
            accessibilityState={{ checked: !isHidden }}
            accessibilityLabel={`${t(isHidden ? 'stats.show' : 'stats.hide')}: ${t(`stats.section.${id}`)}`}
            style={styles.eyeButton}>
            <Surface interactive style={styles.eye}>
              <MaterialCommunityIcons
                name={isHidden ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isHidden ? theme.textSecondary : theme.primary}
              />
            </Surface>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Screen scrolls>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        scrollEnabled={!dragging}
        contentContainerStyle={[
          styles.content,
          // In modifica la tab bar lascia il posto al pulsante "Fine"
          {
            paddingBottom:
              Spacing.four + (editing ? insets.bottom + HiddenTabBarTouchArea + 72 : tabBarSpace),
          },
        ]}
        scrollIndicatorInsets={{ bottom: tabBarSpace }}
        showsVerticalScrollIndicator={false}>
        <PeriodHeader />

        <ReorderableStack
          items={stack.map((id) => ({ key: id, node: withVisibilityToggle(id, sections[id]) }))}
          gap={Spacing.three}
          scrollRef={scrollRef}
          scrollY={scrollY}
          autoScrollEdges={{
            top: insets.top + 120,
            bottom: windowHeight - Math.max(tabBarSpace, insets.bottom + 72) - 60,
          }}
          onDragStart={() => {
            setDragging(true);
            setEditing(true);
          }}
          onDragEnd={() => setDragging(false)}
          dragImmediately={editing}
          onReorder={(keys) =>
            saveLayout(normalizeStatsLayout({ ...layout, order: keys as StatsSection[] }))
          }
        />

        {/* Tutto nascosto: senza riquadri non ci sarebbe niente da tenere premuto */}
        {!editing && visible.length === 0 && (
          <Pressable
            onLongPress={() => setEditing(true)}
            delayLongPress={300}
            accessibilityHint={t('stats.allHiddenHint')}>
            <Surface style={styles.allHidden}>
              <MaterialCommunityIcons
                name="eye-off-outline"
                size={32}
                color={theme.textSecondary}
              />
              <Text color="textSecondary" style={styles.center}>
                {t('stats.allHidden')}
              </Text>
              <Button
                title={t('stats.chooseSections')}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEditing(true);
                }}
              />
            </Surface>
          </Pressable>
        )}

        {editing && (
          <Text variant="caption" color="textSecondary" style={styles.center}>
            {t('stats.editHint')}
          </Text>
        )}
      </Animated.ScrollView>

      {/* "Fine" al posto della tab bar: finché non si preme non si cambia schermata */}
      {editing && (
        <View
          pointerEvents="box-none"
          style={[styles.doneBar, { bottom: insets.bottom + HiddenTabBarTouchArea + Spacing.two }]}>
          {/* Tonale: su iOS è Liquid Glass tinto; altrove sotto c'è uno sfondo
              pieno, altrimenti la tinta trasparente sopra i riquadri non si legge */}
          <View style={!hasGlass && [styles.doneBackdrop, { backgroundColor: theme.background }]}>
            <Button
              title={t('stats.done')}
              onPress={() => {
                Haptics.selectionAsync();
                setEditing(false);
              }}
              style={styles.doneButton}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

function BudgetRow({
  budget,
  money,
  monthKey,
}: {
  budget: BudgetProgress;
  money: (m: number) => string;
  monthKey: string;
}) {
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
      onPress={() =>
        router.push({ pathname: '/budget/[id]', params: { id: budget.id, month: monthKey } })
      }
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
  chartEmpty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  chartEmptyText: { textAlign: 'center', alignSelf: 'stretch' },
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
  doneBar: { position: 'absolute', left: Spacing.three, right: Spacing.three },
  doneButton: { alignSelf: 'stretch' },
  doneBackdrop: { borderRadius: Radius + 4 },
  center: { textAlign: 'center' },
  allHidden: {
    borderRadius: Radius + 4,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  hiddenCard: { opacity: 0.4 },
  eyeButton: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  eye: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
