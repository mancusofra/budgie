import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { appVersion } from '@/features/about/changelog';
import { useWideWeb } from '@/features/web/web-frames';
import { useTheme } from '@/hooks/use-theme';
import { useUIStore } from '@/store/ui';
import { Radius, Spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Maximum width of the content next to the sidebar. */
const CONTENT_MAX_WIDTH = 960;

const TABS: {
  name: string;
  href: '/' | '/transactions' | '/stats' | '/settings';
  icon: IconName;
  label: string;
}[] = [
  { name: 'index', href: '/', icon: 'chart-donut', label: 'tabs.home' },
  {
    name: 'transactions',
    href: '/transactions',
    icon: 'receipt-text-outline',
    label: 'tabs.transactions',
  },
  { name: 'stats', href: '/stats', icon: 'chart-bar', label: 'tabs.stats' },
  { name: 'settings', href: '/settings', icon: 'cog-outline', label: 'tabs.settings' },
];

/**
 * Tabs on the web: a bottom bar like the app on narrow screens, a sidebar on
 * wide ones (the native layout uses the system tab bar instead).
 */
export default function WebTabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // From 768 px the tabs become a sidebar and the content gets wider
  const wide = useWideWeb();
  // While editing the Stats layout the bar makes room for the "Done" button
  const editingLayout = useUIStore((s) => s.editingLayout);

  const list = (
    <TabList
      style={
        wide
          ? [styles.sidebar, { backgroundColor: theme.surface, borderColor: theme.border }]
          : [
              styles.bottomBar,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingBottom: insets.bottom + Spacing.one,
              },
              editingLayout && styles.hidden,
            ]
      }>
      {wide && <Brand />}
      {TABS.map((tab) => (
        <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
          <TabButton icon={tab.icon} label={t(tab.label)} wide={wide} />
        </TabTrigger>
      ))}
      {wide && (
        <Text variant="caption" color="textSecondary" style={styles.version}>
          Budgie {appVersion().version} · web
        </Text>
      )}
    </TabList>
  );

  return (
    <Tabs
      style={[
        styles.root,
        { flexDirection: wide ? 'row' : 'column', backgroundColor: theme.background },
      ]}>
      {wide && list}
      <View style={[styles.content, wide && styles.contentWide]}>
        <TabSlot style={[styles.slot, wide && { maxWidth: CONTENT_MAX_WIDTH }]} />
      </View>
      {!wide && list}
    </Tabs>
  );
}

function Brand() {
  return (
    <View style={styles.brand}>
      <Image source={require('@/../assets/images/icon.png')} style={styles.logo} />
      <Text style={styles.brandName}>Budgie</Text>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string; wide: boolean };

const TabButton = forwardRef<ComponentRef<typeof View>, TabButtonProps>(function TabButton(
  { icon, label, wide, isFocused, ...props },
  ref,
) {
  const theme = useTheme();
  const color = isFocused ? theme.text : theme.textSecondary;
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      // `hovered` exists on the web only (react-native-web), not in the shared types
      style={(state) => [
        wide ? styles.sideItem : styles.barItem,
        wide &&
          (isFocused || (state as { hovered?: boolean }).hovered || state.pressed) && {
            backgroundColor: isFocused ? theme.background : theme.backgroundSelected,
          },
      ]}>
      <View
        style={[
          !wide && styles.barIcon,
          !wide && isFocused && { backgroundColor: theme.backgroundSelected },
        ]}>
        <MaterialCommunityIcons name={icon} size={wide ? 20 : 22} color={color} />
      </View>
      <Text
        numberOfLines={1}
        style={[wide ? styles.sideLabel : styles.barLabel, { color }, isFocused && styles.focused]}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  contentWide: { alignItems: 'center' },
  slot: { flex: 1, width: '100%' },
  hidden: { display: 'none' },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  barItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.one },
  barIcon: { paddingHorizontal: Spacing.three + 2, paddingVertical: 3, borderRadius: 16 },
  barLabel: { fontSize: 11 },
  sidebar: {
    width: 220,
    flexDirection: 'column',
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.three,
  },
  logo: { width: 32, height: 32, borderRadius: 8 },
  brandName: { fontSize: 20, fontWeight: '800' },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius,
  },
  sideLabel: { fontSize: 15 },
  focused: { fontWeight: '700' },
  version: { marginTop: 'auto', paddingHorizontal: Spacing.two },
});
