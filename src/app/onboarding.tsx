import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/transactions/category-icon';
import { Button } from '@/components/ui/button';
import { NavRow } from '@/components/ui/nav-row';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useSetSetting, useSettings } from '@/features/settings/hooks';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Three-page onboarding: how it works, currency, privacy. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const pages: {
    icon: IconName;
    color: ThemeColor;
    title: string;
    body: string;
    extra?: ReactNode;
  }[] = [
    {
      icon: 'lightning-bolt',
      color: 'primary',
      title: t('onboarding.welcomeTitle'),
      body: t('onboarding.welcomeBody'),
      extra: (
        <View style={styles.demo}>
          <CategoryIcon icon="food-apple" color="#5B9A5D" size={44} />
          <MaterialCommunityIcons name="arrow-right" size={20} color={theme.textSecondary} />
          <Surface style={styles.demoPad}>
            <Text style={styles.demoAmount}>12,50</Text>
          </Surface>
          <MaterialCommunityIcons name="arrow-right" size={20} color={theme.textSecondary} />
          <CategoryIcon icon="check" color={theme.income} size={44} filled />
        </View>
      ),
    },
    {
      icon: 'cash-multiple',
      color: 'income',
      title: t('onboarding.currencyTitle'),
      body: t('onboarding.currencyBody'),
      extra: (
        <Surface style={styles.currency}>
          <NavRow
            title={t('settings.mainCurrency')}
            value={settings.currency ?? 'EUR'}
            onPress={() => router.push('/currency')}
          />
        </Surface>
      ),
    },
    {
      icon: 'shield-lock-outline',
      color: 'warning',
      title: t('onboarding.privacyTitle'),
      body: t('onboarding.privacyBody'),
    },
  ];
  const last = page === pages.length - 1;

  const finish = async () => {
    await setSetting('onboardingDone', true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const goTo = (index: number) => {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.top}>
        {!last && (
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            hitSlop={12}
            style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text color="textSecondary" style={styles.skip}>
              {t('onboarding.skip')}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}>
        {pages.map((p, i) => (
          <View
            key={p.title}
            style={[styles.page, { width }]}
            accessibilityElementsHidden={i !== page}
            importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
            <CategoryIcon icon={p.icon} color={theme[p.color]} size={96} />
            <Text variant="title" style={styles.center} accessibilityRole="header">
              {p.title}
            </Text>
            <Text color="textSecondary" style={[styles.center, styles.body]}>
              {p.body}
            </Text>
            {p.extra}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={t('onboarding.page', { page: page + 1, total: pages.length })}>
          {pages.map((p, i) => (
            <View
              key={p.title}
              style={[
                styles.dot,
                {
                  backgroundColor: i === page ? theme.primary : theme.backgroundSelected,
                  width: i === page ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Button
          title={last ? t('onboarding.start') : t('onboarding.next')}
          filled
          onPress={() => (last ? finish() : goTo(page + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  skip: { fontWeight: '600' },
  pager: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four + Spacing.two,
  },
  // Full width: on Android "fit to content" centered text was getting cut off
  center: { textAlign: 'center', alignSelf: 'stretch' },
  body: { fontSize: 17, lineHeight: 24 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  demoPad: {
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  demoAmount: { fontSize: 18, fontWeight: '600' },
  currency: {
    alignSelf: 'stretch',
    borderRadius: Radius + 4,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  bottom: { padding: Spacing.four, gap: Spacing.four },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dot: { height: 8, borderRadius: 4 },
});
