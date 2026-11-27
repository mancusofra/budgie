import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, type ComponentProps } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SnackbarHost } from '@/components/ui/snackbar-host';
import { DatabaseProvider } from '@/db/provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { RecurringSync } from '@/features/recurring/recurring-sync';
import { installWebAlert } from '@/features/web/alert-polyfill';
import { UpdateBanner } from '@/features/web/pwa';
import { useWideWeb, WebDialog, WebPage } from '@/features/web/web-frames';
import { AppLock } from '@/features/settings/app-lock';
import { SettingsSync } from '@/features/settings/settings-sync';
import '@/i18n';

/** Screens shown as sheets or modals: windows in the middle of the page on a wide web screen. */
const DIALOGS = new Set<string>();

type ScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack.Screen>['options']>,
  (...args: never[]) => unknown
>;

SplashScreen.preventAutoHideAsync();
installWebAlert();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hideSplash = useCallback(() => SplashScreen.hideAsync(), []);
  const wideWeb = useWideWeb();
  // Native presentation, or a centered dialog on a wide web screen
  const sheet = (name: string, options: ScreenOptions): ScreenOptions => {
    DIALOGS.add(name);
    return wideWeb
      ? { presentation: 'transparentModal' as const, animation: 'fade' as const }
      : options;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DatabaseProvider onReady={hideSplash}>
          <Stack
            screenOptions={{ headerShown: false }}
            screenLayout={({ children, route }) =>
              !wideWeb || route.name === '(tabs)' || route.name === 'onboarding' ? (
                children
              ) : DIALOGS.has(route.name) ? (
                <WebDialog>{children}</WebDialog>
              ) : (
                <WebPage>{children}</WebPage>
              )
            }>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="transaction/new"
              options={sheet('transaction/new', { presentation: 'modal' })}
            />
            <Stack.Screen
              name="transaction/[id]"
              options={sheet('transaction/[id]', { presentation: 'modal' })}
            />
            <Stack.Screen
              name="transfer/new"
              options={sheet('transfer/new', { presentation: 'modal' })}
            />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="currency"
              options={sheet('currency', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.6, 0.95],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="report"
              options={sheet('report', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.7, 0.95],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="whats-new"
              options={sheet('whats-new', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5, 0.9],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="language"
              options={sheet('language', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.4],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="groups-setup"
              options={sheet('groups-setup', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.85],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="group-shares"
              options={sheet('group-shares', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.75, 0.95],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="reference-income"
              options={sheet('reference-income', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.75],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="install"
              options={sheet('install', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.6],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="month-start"
              options={sheet('month-start', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="export"
              options={sheet('export', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.65, 0.9],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="account/select"
              options={sheet('account/select', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5, 0.9],
                sheetGrabberVisible: true,
              })}
            />
            <Stack.Screen
              name="period"
              options={sheet('period', {
                presentation: 'formSheet',
                sheetAllowedDetents: [0.55],
                sheetGrabberVisible: true,
                contentStyle: { backgroundColor: 'transparent' },
              })}
            />
          </Stack>
          <SnackbarHost />
          {Platform.OS === 'web' && <UpdateBanner />}
          <SettingsSync />
          <RecurringSync />
          <OnboardingGate />
          <AppLock />
        </DatabaseProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
