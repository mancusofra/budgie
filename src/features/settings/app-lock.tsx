import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { useSettingsState } from './hooks';

export type AuthResult = 'ok' | 'unavailable' | 'failed';

/** Errors meaning biometrics are not available at all (e.g. Face ID in Expo Go). */
const UNAVAILABLE = new Set([
  'not_available',
  'not_enrolled',
  'passcode_not_set',
  'invalid_context',
]);

/** Biometric authentication, falling back to the device passcode. */
export async function authenticate(
  promptMessage: string,
  cancelLabel: string,
): Promise<AuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel });
    if (result.success) return 'ok';
    return UNAVAILABLE.has(result.error) ? 'unavailable' : 'failed';
  } catch {
    return 'unavailable';
  }
}

/**
 * Lock screen: at launch and when returning from the background, if the lock is
 * enabled. If biometrics are not available it doesn't lock the user out.
 */
export function AppLock() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings, loaded } = useSettingsState();
  const enabled = settings.appLock === true;
  const [locked, setLocked] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const authenticating = useRef(false);

  const applyResult = useCallback((result: AuthResult) => {
    authenticating.current = false;
    if (result === 'ok') setLocked(false);
    else if (result === 'unavailable') {
      setUnavailable(true);
      setLocked(false);
    }
  }, []);

  const unlock = useCallback(() => {
    if (authenticating.current) return;
    authenticating.current = true;
    authenticate(t('lock.prompt'), t('common.cancel')).then(applyResult);
  }, [t, applyResult]);

  // Lock when the app goes to the background (and close any open sheet)
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (router.canDismiss()) router.dismissAll();
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const showLock = !loaded || (enabled && locked);

  // Ask for authentication as soon as the lock appears
  useEffect(() => {
    if (!loaded || !enabled || !locked || authenticating.current) return;
    authenticating.current = true;
    authenticate(t('lock.prompt'), t('common.cancel')).then(applyResult);
  }, [loaded, enabled, locked, t, applyResult]);

  if (!showLock) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.background }]}>
      {loaded && (
        <>
          <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
          <Text variant="subtitle">Budgie</Text>
          {unavailable && (
            <Text variant="caption" color="textSecondary" style={styles.center}>
              {t('lock.unavailable')}
            </Text>
          )}
          <Button title={t('lock.unlock')} filled onPress={unlock} style={styles.button} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, zIndex: 100 },
  center: { textAlign: 'center', paddingHorizontal: Spacing.five },
  button: { minWidth: 200 },
});
