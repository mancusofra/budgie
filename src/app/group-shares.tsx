import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAccountScope } from '@/features/accounts/hooks';
import { useSuggestedShares } from '@/features/groups/hooks';
import { GROUP_META, groupLabelKey } from '@/features/groups/meta';
import { useCurrency, useSetSetting, useSettingsState } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { deviceLocale } from '@/i18n';
import {
  GROUPS,
  moveHandle,
  normalizeShares,
  sameShares,
  SHARE_PRESETS,
  type Shares,
} from '@/lib/groups';
import { formatMoney } from '@/lib/money';
import { Radius, Spacing, TabularNums } from '@/theme';

const HANDLE = 28;

/** "Split" sheet: target shares of the three groups, always adding up to 100. */
export default function GroupSharesSheet() {
  const { settings, loaded } = useSettingsState();
  if (!loaded) return null;
  return <SharesForm initial={normalizeShares(settings.groupShares)} />;
}

function SharesForm({ initial }: { initial: Shares }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const setSetting = useSetSetting();
  const currency = useCurrency();
  const { settings } = useSettingsState();
  const { mainScope } = useAccountScope();
  const suggested = useSuggestedShares(mainScope);
  const [shares, setShares] = useState<Shares>(initial);
  const [active, setActive] = useState<0 | 1 | null>(null);
  // Shared values, not state: the gesture callbacks must see the latest values mid-drag
  const latest = useSharedValue<Shares>(initial);
  const dragging = useSharedValue<0 | 1 | null>(null);
  const width = useSharedValue(1);
  const reference = settings.referenceIncome ?? null;

  const update = (next: Shares) => {
    if (!sameShares(latest.get(), next)) Haptics.selectionAsync();
    latest.set(next);
    setShares(next);
  };

  // One gesture over the whole bar: it moves the handle closest to the touch
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      const x = (e.x / width.get()) * 100;
      const [a, b] = latest.get();
      // Handles on top of each other: going left moves the first, right the second
      const handle = Math.abs(x - a) < Math.abs(x - (a + b)) || x < a ? 0 : 1;
      dragging.set(handle);
      setActive(handle);
    })
    .onUpdate((e) => {
      const handle = dragging.get();
      if (handle === null) return;
      update(moveHandle(latest.get(), handle, (e.x / width.get()) * 100));
    })
    .onFinalize(() => {
      dragging.set(null);
      setActive(null);
    });

  const save = async () => {
    await setSetting('groupShares', shares);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const showSuggested = suggested && !sameShares(suggested, shares);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.titles}>
        <Text variant="subtitle">{t('groups.split')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('groups.splitHint')}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.barArea}
          onLayout={(e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width || 1)}>
          <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
            {GROUPS.map((g, i) => (
              <View
                key={g}
                style={{ width: `${shares[i]}%`, backgroundColor: theme[GROUP_META[g].color] }}
              />
            ))}
          </View>
          {([0, 1] as const).map((h) => {
            const at = h === 0 ? shares[0] : shares[0] + shares[1];
            const size = active === h ? HANDLE + 6 : HANDLE;
            return (
              <View
                key={h}
                pointerEvents="none"
                style={[
                  styles.handle,
                  {
                    left: `${at}%`,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    borderRadius: size / 2,
                    borderColor: active === h ? theme.primary : theme.border,
                  },
                ]}
              />
            );
          })}
        </View>
      </GestureDetector>

      <View style={styles.values}>
        {GROUPS.map((g, i) => (
          <ShareValue
            key={g}
            label={t(groupLabelKey(g))}
            icon={GROUP_META[g].icon}
            color={theme[GROUP_META[g].color]}
            value={shares[i]}
            amount={
              reference
                ? formatMoney(Math.round((reference * shares[i]) / 100), currency, deviceLocale)
                : undefined
            }
            // Fine adjustment ±1 for screen readers: moves the handle on its right (or left for Savings)
            onAdjust={(delta) =>
              update(
                i < 2
                  ? moveHandle(
                      shares,
                      i as 0 | 1,
                      (i === 0 ? shares[0] : shares[0] + shares[1]) + delta,
                      1,
                    )
                  : moveHandle(shares, 1, shares[0] + shares[1] - delta, 1),
              )
            }
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text variant="overline" color="textSecondary">
          {t('groups.presets')}
        </Text>
        <View style={styles.chips}>
          {SHARE_PRESETS.map((p) => (
            <Chip
              key={p.join()}
              label={p.join(' / ')}
              selected={sameShares(p, shares)}
              onPress={() => update(p)}
            />
          ))}
          {showSuggested && (
            <Chip
              label={`✦ ${t('groups.suggested')} ${suggested.join(' / ')}`}
              accent
              onPress={() => update(suggested)}
            />
          )}
        </View>
        {showSuggested && (
          <Text variant="caption" color="textSecondary">
            {t('groups.suggestedHint')}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/reference-income')}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.reference,
          { backgroundColor: theme.surface },
          pressed && { opacity: 0.6 },
        ]}>
        <Text style={styles.flex}>{t('groups.referenceIncome')}</Text>
        <Text color="textSecondary">
          {reference
            ? formatMoney(reference, currency, deviceLocale)
            : t('groups.referenceIncomeNone')}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Button title={t('common.save')} filled onPress={save} />
    </ScrollView>
  );
}

function ShareValue({
  label,
  icon,
  color,
  value,
  amount,
  onAdjust,
}: {
  label: string;
  icon: (typeof GROUP_META)['need']['icon'];
  color: string;
  value: number;
  amount?: string;
  onAdjust: (delta: 1 | -1) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={styles.value}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onAdjust(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <View style={[styles.dot, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={13} color={theme.textOnColor} />
      </View>
      <Text style={[styles.percent, TabularNums]}>{value}%</Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      {amount ? (
        <Text variant="caption" color="textSecondary" style={TabularNums} numberOfLines={1}>
          {amount}
        </Text>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  accent,
  onPress,
}: {
  label: string;
  selected?: boolean;
  accent?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.primary
            : accent
              ? theme.backgroundSelected
              : theme.surface,
        },
        pressed && { opacity: 0.6 },
      ]}>
      <Text
        style={[
          styles.chipLabel,
          TabularNums,
          { color: selected ? theme.textOnColor : accent ? theme.primary : theme.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  titles: { gap: Spacing.one },
  barArea: { height: HANDLE + 16, justifyContent: 'center' },
  bar: { height: 18, borderRadius: 9, overflow: 'hidden', flexDirection: 'row' },
  handle: {
    position: 'absolute',
    top: '50%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  values: { flexDirection: 'row', gap: Spacing.two },
  value: { flex: 1, alignItems: 'center', gap: 2 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius },
  chipLabel: { fontSize: 14, fontWeight: '600' },
  reference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius,
  },
  flex: { flex: 1 },
});
