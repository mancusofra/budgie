import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SnackbarHost } from '@/components/ui/snackbar-host';
import { DatabaseProvider } from '@/db/provider';
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
        </DatabaseProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
