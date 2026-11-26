import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { GroupsSummary, Shares } from '@/lib/groups';
import { TabularNums } from '@/theme';

import { GROUP_META, groupLabelKey } from './meta';

/** Space the ring takes around the donut: gap + stroke. */
export const GROUPS_RING_SPACE = 10;
const STROKE = 5;
const GAP_TURNS = 0.008;

/**
 * Thin ring around the Home donut: one arc per group over the income (or the
 * reference income), with marks at the target shares.
 */
export function GroupsRing({
  size,
  summary,
  shares,
}: {
  /** Outer diameter (donut + GROUPS_RING_SPACE on each side). */
  size: number;
  summary: GroupsSummary;
  shares: Shares;
}) {
  const theme = useTheme();
  const r = size / 2 - STROKE / 2;
  const c = 2 * Math.PI * r;
  const total = summary.groups.reduce((a, g) => a + g.amount, 0);
  const scale = Math.max(summary.base ?? 0, total);
  if (scale <= 0) return null;

  // Each arc starts where the previous groups end
  const fractions = summary.groups.map((g) => g.amount / scale);
  const arcs = summary.groups
    .map((g, i) => ({
      key: g.group,
      start: fractions.slice(0, i).reduce((x, f) => x + f, 0),
      length: fractions[i],
    }))
    .filter((a) => a.length > 0);
  const marks = summary.base
    ? [shares[0], shares[0] + shares[1]].map((p) => (summary.base! * p) / 100 / scale)
    : [];
  const mid = size / 2;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${mid}, ${mid}`}>
          <Circle cx={mid} cy={mid} r={r} stroke={theme.surface} strokeWidth={STROKE} fill="none" />
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={mid}
              cy={mid}
              r={r}
              stroke={theme[GROUP_META[a.key].color]}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${Math.max(a.length - (arcs.length > 1 ? GAP_TURNS : 0), 0.002) * c} ${c}`}
              strokeDashoffset={-(a.start + (arcs.length > 1 ? GAP_TURNS / 2 : 0)) * c}
            />
          ))}
        </G>
        {marks.map((turns, i) => {
          const angle = turns * 2 * Math.PI;
          const [inner, outer] = [r - STROKE - 2, r + STROKE / 2 + 1];
          return (
            <Line
              key={i}
              x1={mid + inner * Math.sin(angle)}
              y1={mid - inner * Math.cos(angle)}
              x2={mid + outer * Math.sin(angle)}
              y2={mid - outer * Math.cos(angle)}
              stroke={theme.text}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </View>
  );
}

/** Donut center in "groups" mode: spent / target share per group. */
export function GroupsCenter({ summary }: { summary: GroupsSummary }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const total = summary.groups.reduce((a, g) => a + g.amount, 0);
  return (
    <View style={styles.centerContent}>
      <Text variant="overline" color="textSecondary" numberOfLines={1} style={styles.title}>
        {t(summary.base ? 'groups.homeTitle' : 'groups.homeTitleNoBase')}
      </Text>
      {summary.groups.map((g) => {
        const share = g.share ?? (total > 0 ? (g.amount / total) * 100 : 0);
        const color =
          g.level === 'over' ? theme.expense : g.level === 'reached' ? theme.income : theme.text;
        return (
          <View key={g.group} style={styles.line}>
            <View style={[styles.dot, { backgroundColor: theme[GROUP_META[g.group].color] }]} />
            <Text variant="caption" numberOfLines={1} style={styles.name}>
              {t(groupLabelKey(g.group))}
            </Text>
            <Text variant="caption" style={[styles.value, TabularNums, { color }]}>
              {summary.base ? `${Math.round(share)}/${g.targetShare}%` : `${Math.round(share)}%`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', marginBottom: 2 },
  centerContent: { alignItems: 'stretch', gap: 3, minWidth: 140 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { flex: 1 },
  value: { fontWeight: '700' },
});
