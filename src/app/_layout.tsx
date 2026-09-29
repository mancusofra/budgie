import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SnackbarHost } from '@/components/ui/snackbar-host';
import { DatabaseProvider } from '@/db/provider';
import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { AppLock } from '@/features/settings/app-lock';
import { SettingsSync } from '@/features/settings/settings-sync';
import '@/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hideSplash = useCallback(() => SplashScreen.hideAsync(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DatabaseProvider onReady={hideSplash}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="transfer/new" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="currency"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.6, 0.95],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="language"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.4],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="month-start"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="export"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.65, 0.9],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="account/select"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5, 0.9],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="period"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.55],
                sheetGrabberVisible: true,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack>
          <SnackbarHost />
          <SettingsSync />
          <OnboardingGate />
          <AppLock />
        </DatabaseProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
