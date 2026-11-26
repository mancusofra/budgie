import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import type { GroupsSummary, GroupSummary, Shares } from '@/lib/groups';
import { Radius, Spacing, TabularNums } from '@/theme';

import { GROUP_META, groupLabelKey } from './meta';

type Props = {
  summary: GroupsSummary;
  shares: Shares;
  money: (minor: number) => string;
};

/** Stats section: stacked bar over the income with target marks, one row per group. */
export function GroupsCard({ summary, shares, money }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const openShares = () => router.push('/group-shares');
  const { base, baseSource, groups } = summary;
  const total = groups.reduce((a, g) => a + g.amount, 0);
  // Bar scale: the base, or more when spending goes beyond it
  const scale = Math.max(base ?? 0, total, 1);
  const frac = (v: number) => v / scale;
  const overIncome = baseSource === 'income' && summary.overspent > 0;
  const marks = base
    ? [
        { at: (base * shares[0]) / 100, label: String(shares[0]) },
        { at: (base * (shares[0] + shares[1])) / 100, label: String(shares[0] + shares[1]) },
      ]
    : [];

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <Text variant="overline" color="textSecondary" style={styles.flex}>
          {t('groups.title')}
        </Text>
        <Pressable onPress={openShares} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.link, { color: theme.primary }]}>{t('groups.edit')}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={openShares}
        accessibilityRole="button"
        accessibilityLabel={t('groups.barLabel', {
          parts: groups.map((g) => `${t(groupLabelKey(g.group))} ${money(g.amount)}`).join(', '),
        })}>
        <View style={[styles.barArea, overIncome && styles.barAreaTwoRows]}>
          <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
            {groups.map((g) =>
              g.amount > 0 ? (
                <View
                  key={g.group}
                  style={{
                    width: `${frac(g.amount) * 100}%`,
                    backgroundColor: theme[GROUP_META[g.group].color],
                  }}
                />
              ) : null,
            )}
          </View>
          {marks.map((m) => (
            <Mark key={m.label} at={frac(m.at)} label={m.label} color={theme.text} />
          ))}
          {overIncome && base ? (
            <Mark
              at={frac(base)}
              label={t('groups.incomeMark')}
              color={theme.expense}
              strong
              row={1}
            />
          ) : null}
        </View>
      </Pressable>

      {base ? (
        <Text variant="caption" color="textSecondary">
          {t(baseSource === 'income' ? 'groups.baseIncome' : 'groups.baseReference', {
            amount: money(base),
          })}
        </Text>
      ) : (
        <Pressable onPress={() => router.push('/reference-income')} accessibilityRole="button">
          <Text variant="caption" color="textSecondary">
            {t('groups.noBase')}{' '}
            <Text variant="caption" style={{ color: theme.primary }}>
              {t('groups.setReference')}
            </Text>
          </Text>
        </Pressable>
      )}

      {overIncome && (
        <View style={[styles.alert, { backgroundColor: withAlpha(theme.expense, 0.12) }]}>
          <MaterialCommunityIcons name="alert-octagon" size={16} color={theme.expense} />
          <Text variant="caption" style={[styles.flex, { color: theme.expense }]}>
            {t('groups.overIncome', { amount: money(summary.overspent) })}
          </Text>
        </View>
      )}

      {groups.map((g) => (
        <GroupRow key={g.group} group={g} total={total} money={money} />
      ))}
    </Surface>
  );
}

function Mark({
  at,
  label,
  color,
  strong,
  row = 0,
}: {
  /** Position on the bar, 0–1. */
  at: number;
  label: string;
  color: string;
  strong?: boolean;
  /** Label on the first or second line under the bar (to avoid overlaps). */
  row?: 0 | 1;
}) {
  // Near the edges the label grows inward, so it's never cut by the card
  const align = at > 0.85 ? 'end' : at < 0.15 ? 'start' : 'center';
  return (
    <View pointerEvents="none" style={[styles.mark, { left: `${at * 100}%` }]}>
      <View style={[styles.markLine, { backgroundColor: color, height: row ? 34 : 20 }]} />
      <Text
        variant="caption"
        numberOfLines={1}
        style={[
          styles.markLabel,
          { color, top: row ? 34 : 20 },
          align === 'end'
            ? styles.labelEnd
            : align === 'start'
              ? styles.labelStart
              : styles.labelCenter,
          strong && styles.markStrong,
        ]}>
        {label}
      </Text>
    </View>
  );
}

function GroupRow({
  group: g,
  total,
  money,
}: {
  group: GroupSummary;
  total: number;
  money: (minor: number) => string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const color = theme[GROUP_META[g.group].color];

  const status =
    g.level === 'over'
      ? {
          icon: 'alert-octagon' as const,
          color: theme.expense,
          text: t('groups.over', { amount: money(-(g.remaining ?? 0)) }),
        }
      : g.level === 'warning'
        ? {
            icon: 'alert' as const,
            color: theme.warning,
            text: t('groups.warning', { percent: Math.round((g.amount / (g.target || 1)) * 100) }),
          }
        : g.level === 'reached'
          ? {
              icon: 'check-circle-outline' as const,
              color: theme.income,
              text: t('groups.reached'),
            }
          : g.level === 'short'
            ? {
                icon: null,
                color: theme.textSecondary,
                text: t('groups.short', { amount: money(g.remaining ?? 0) }),
              }
            : g.level === 'ok'
              ? {
                  icon: null,
                  color: theme.textSecondary,
                  text: t('groups.left', { amount: money(g.remaining ?? 0) }),
                }
              : null;

  const detail =
    g.share !== null
      ? t('groups.shareOfTarget', { share: Math.round(g.share), target: g.targetShare })
      : t('groups.shareOfSpending', {
          share: total > 0 ? Math.round((g.amount / total) * 100) : 0,
        });
  const progress = g.target ? Math.min(g.amount / g.target, 1) : 0;
  const barColor = g.level === 'over' ? theme.expense : color;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[t(groupLabelKey(g.group)), money(g.amount), detail, status?.text]
        .filter(Boolean)
        .join(', ')}>
      <View style={styles.rowTop}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <MaterialCommunityIcons
            name={GROUP_META[g.group].icon}
            size={15}
            color={theme.textOnColor}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{t(groupLabelKey(g.group))}</Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {detail}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, TabularNums]}>{money(g.amount)}</Text>
          {status && (
            <View style={styles.status}>
              {status.icon && (
                <MaterialCommunityIcons name={status.icon} size={13} color={status.color} />
              )}
              <Text variant="caption" style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          )}
        </View>
      </View>
      {g.target !== null && (
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(progress * 100, 1)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius + 4, padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center' },
  link: { fontWeight: '600', fontSize: 15 },
  flex: { flex: 1 },
  barArea: { paddingTop: 4, paddingBottom: 18 },
  barAreaTwoRows: { paddingBottom: 32 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  // Zero-width anchor on the mark position: line and label are placed around it
  mark: { position: 'absolute', top: 0, bottom: 0, width: 0 },
  markLine: { position: 'absolute', left: -1, width: 2, borderRadius: 1 },
  markLabel: { position: 'absolute', width: 120, fontSize: 11, lineHeight: 13 },
  labelCenter: { left: -60, textAlign: 'center' },
  labelEnd: { right: -1, textAlign: 'right' },
  labelStart: { left: -1, textAlign: 'left' },
  markStrong: { fontWeight: '700' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius,
  },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
