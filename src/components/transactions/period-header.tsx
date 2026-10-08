import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PeriodSelector } from '@/components/ui/period-selector';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useSelectedPeriod } from '@/features/transactions/hooks';
import type { PeriodKind } from '@/lib/period';
import { useUIStore } from '@/store/ui';
import { Spacing } from '@/theme';

const PERIOD_KINDS: Exclude<PeriodKind, 'custom'>[] = ['day', 'week', 'month', 'year', 'all'];

/**
 * Period picker shared between screens: period type, arrows and
 * label (tap = sheet with a custom range).
 */
export function PeriodHeader() {
  const { t } = useTranslation();
  const { period, label } = useSelectedPeriod();
  const setPeriodKind = useUIStore((s) => s.setPeriodKind);
  const shift = useUIStore((s) => s.shiftPeriod);
  const canShift = period.kind !== 'all';

  return (
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
        onPressLabel={() => router.push('/period')}
        previousLabel={t('period.previous')}
        nextLabel={t('period.next')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three },
});
