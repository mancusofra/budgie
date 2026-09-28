import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line } from 'react-native-svg';

import { donutArcs, DonutChart } from '@/components/charts/donut-chart';
import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { PeriodSelector } from '@/components/ui/period-selector';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import type { Category } from '@/db/schema';
import { useCategories } from '@/features/categories/hooks';
import { useCurrency } from '@/features/settings/hooks';
import {
  useCategoryTotals,
  usePeriodTotals,
  useSelectedPeriod,
} from '@/features/transactions/hooks';
import {
  alignRotation,
  connectors,
  ringGeometry,
  sortByIconAngle,
  type Point,
} from '@/features/transactions/ring-layout';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import type { PeriodKind } from '@/lib/period';
import { formatMoney } from '@/lib/money';
import { useUIStore } from '@/store/ui';
import { Spacing } from '@/theme';

type CenterMode = 'balance' | 'expense' | 'income';
const NEXT_MODE: Record<CenterMode, CenterMode> = {
  balance: 'expense',
  expense: 'income',
  income: 'balance',
};
const PERIOD_KINDS: PeriodKind[] = ['day', 'week', 'month', 'year', 'all'];
const ICON_SIZE = 48;
const CELL = ICON_SIZE + Spacing.three;

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const currency = useCurrency();
  const accountFilter = useUIStore((s) => s.accountFilter);
  const setPeriodKind = useUIStore((s) => s.setPeriodKind);
  const shift = useUIStore((s) => s.shiftPeriod);
  const resetPeriod = useUIStore((s) => s.resetPeriod);

  const { period, range, label } = useSelectedPeriod();
  const [mode, setMode] = useState<CenterMode>('balance');
  const chartType = mode === 'income' ? 'income' : 'expense';

  const expenseCategories = useCategories('expense');
  const chartCategories = useCategories(chartType);
  const categoryTotals = useCategoryTotals(range, chartType, accountFilter);
  const totals = usePeriodTotals(range, accountFilter);

  const [area, setArea] = useState({ width: width - Spacing.three * 2, height: 0 });
  const geometry = useMemo(
    () => ringGeometry({ width: area.width, height: area.height, cell: CELL, gap: Spacing.two }),
    [area.width, area.height],
  );
  const ringCategories = expenseCategories.slice(0, geometry.slots.length);
  const iconPositions = useMemo(
    () => new Map<string, Point>(ringCategories.map((c, i) => [c.id, geometry.slots[i]])),
    [ringCategories, geometry.slots],
  );

  // Le icone attorno sono le categorie di spesa: le linee hanno senso solo per quelle
  const showConnectors = chartType === 'expense';
  const segments = useMemo(() => {
    const byId = new Map(chartCategories.map((c) => [c.id, c]));
    const base = categoryTotals.map((row) => ({
      key: row.categoryId ?? 'none',
      value: row.total,
      color: byId.get(row.categoryId ?? '')?.color ?? theme.textSecondary,
    }));
    return showConnectors ? sortByIconAngle(base, iconPositions, geometry.center) : base;
  }, [
    chartCategories,
    categoryTotals,
    theme.textSecondary,
    showConnectors,
    iconPositions,
    geometry.center,
  ]);

  const arcs = donutArcs(segments);
  const rotation = showConnectors ? alignRotation(arcs, iconPositions, geometry.center) : 0;
  const lines = showConnectors
    ? connectors(
        arcs,
        iconPositions,
        geometry.center,
        geometry.donutSize / 2,
        ICON_SIZE / 2 + Spacing.one,
        rotation,
      )
    : [];

  const canShift = period.kind !== 'all';
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => canShift && shift(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => canShift && shift(-1)),
  );

  const openNew = (type: 'expense' | 'income', category?: Category) =>
    router.push({ pathname: '/transaction/new', params: { type, categoryId: category?.id } });

  const money = (minor: number) => formatMoney(minor, currency, deviceLocale);
  const centerAmount =
    mode === 'balance' ? totals.balance : mode === 'expense' ? totals.expense : totals.income;
  const centerLabel = t(
    mode === 'balance' ? 'home.balance' : mode === 'expense' ? 'home.expenses' : 'home.income',
  );

  const renderIcon = (c: Category, i: number) => {
    const slot = geometry.slots[i];
    return (
      <Pressable
        key={c.id}
        accessibilityRole="button"
        accessibilityLabel={t('home.addTo', { category: c.name })}
        onPress={() => openNew('expense', c)}
        style={({ pressed }) => [
          styles.cell,
          { left: slot.x - CELL / 2, top: slot.y - CELL / 2 },
          pressed && { opacity: 0.6 },
        ]}>
        <CategoryIcon icon={c.icon} color={c.color} size={ICON_SIZE} />
      </Pressable>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <SegmentedControl
          options={PERIOD_KINDS.map((k) => ({ value: k, label: t(`period.${k}`) }))}
          value={period.kind}
          onChange={setPeriodKind}
        />
        <PeriodSelector
          label={label}
          onPrevious={canShift ? () => shift(-1) : undefined}
          onNext={canShift ? () => shift(1) : undefined}
          onPressLabel={resetPeriod}
          previousLabel={t('period.previous')}
          nextLabel={t('period.next')}
        />
      </View>

      <GestureDetector gesture={swipe}>
        <View
          style={styles.ring}
          collapsable={false}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w !== area.width || h !== area.height) setArea({ width: w, height: h });
          }}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {lines.map((l) => (
              <Line
                key={l.key}
                x1={l.from.x}
                y1={l.from.y}
                x2={l.to.x}
                y2={l.to.y}
                stroke={l.color}
                strokeOpacity={0.45}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}
          </Svg>

          <Pressable
            onPress={() => setMode(NEXT_MODE[mode])}
            accessibilityRole="button"
            accessibilityLabel={`${centerLabel} ${money(centerAmount)}`}
            style={{
              position: 'absolute',
              left: geometry.center.x - geometry.donutSize / 2,
              top: geometry.center.y - geometry.donutSize / 2,
            }}>
            <DonutChart
              segments={segments}
              size={geometry.donutSize}
              trackColor={theme.surface}
              rotation={rotation}>
              <Text color="textSecondary">{centerLabel}</Text>
              <Text
                variant="subtitle"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color:
                    mode === 'expense'
                      ? theme.expense
                      : mode === 'income' || centerAmount > 0
                        ? theme.income
                        : centerAmount < 0
                          ? theme.expense
                          : theme.text,
                }}>
                {money(centerAmount)}
              </Text>
              {mode === 'balance' && (
                <>
                  <Text variant="caption" style={{ color: theme.expense }} numberOfLines={1}>
                    − {money(totals.expense)}
                  </Text>
                  <Text variant="caption" style={{ color: theme.income }} numberOfLines={1}>
                    + {money(totals.income)}
                  </Text>
                </>
              )}
            </DonutChart>
          </Pressable>

          {ringCategories.map(renderIcon)}
        </View>
      </GestureDetector>

      <View style={styles.actions}>
        <Button
          title={`− ${t('home.addExpense')}`}
          color="expense"
          style={styles.action}
          onPress={() => openNew('expense')}
        />
        <Button
          title={`+ ${t('home.addIncome')}`}
          color="income"
          style={styles.action}
          onPress={() => openNew('income')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three },
  ring: { flex: 1, marginVertical: Spacing.two },
  cell: {
    position: 'absolute',
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.three, paddingBottom: Spacing.three },
  action: { flex: 1 },
});
