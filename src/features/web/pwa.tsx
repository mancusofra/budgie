import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/theme';

import { useWideWeb } from './web-frames';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// --- Install ---------------------------------------------------------------

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

// The browser offers installation once, early: keep the event for later
let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
}

/** Opened from the icon on the home screen / as an installed app. */
export function isStandalone(): boolean {
  if (!isWeb) return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Installation of the web app: `canPrompt` when the browser has its own
 * install dialog (Chrome, Edge, Android); otherwise (Safari on iPhone)
 * instructions are needed.
 */
export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(() => deferredPrompt !== null);
  useEffect(() => {
    const update = () => setCanPrompt(deferredPrompt !== null);
    installListeners.add(update);
    return () => {
      installListeners.delete(update);
    };
  }, []);
  const prompt = async () => {
    const event = deferredPrompt;
    deferredPrompt = null;
    setCanPrompt(false);
    await event?.prompt();
  };
  return { installed: isStandalone(), canPrompt, prompt };
}

// --- Updates ---------------------------------------------------------------

/**
 * A new version has been downloaded by the service worker and is waiting:
 * `apply` activates it and reloads the page.
 */
export function useServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!isWeb || !('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const check = () => {
      // Waiting with a page already controlled = an update (not the first install)
      if (registration?.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting);
      }
    };
    const onFound = () => {
      const worker = registration?.installing;
      worker?.addEventListener('statechange', () => worker.state === 'installed' && check());
    };
    // Look for new versions when the app comes back to the foreground
    const onVisible = () => document.visibilityState === 'visible' && registration?.update();

    navigator.serviceWorker.getRegistration().then((reg) => {
      registration = reg;
      if (!reg) return;
      check();
      reg.addEventListener('updatefound', onFound);
    });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      registration?.removeEventListener('updatefound', onFound);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const apply = () => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    waiting.postMessage('SKIP_WAITING');
  };

  return { available: waiting !== null, apply };
}

/** "New version available · Update", above the tab bar (web only). */
export function UpdateBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const wide = useWideWeb();
  const { available, apply } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  if (!available || dismissed) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        wide
          ? styles.wide
          : { bottom: insets.bottom + 72, left: Spacing.three, right: Spacing.three },
      ]}>
      <View style={styles.banner} accessibilityRole="alert">
        <MaterialCommunityIcons name="update" size={20} color="#FFFFFF" />
        <Text style={styles.text} numberOfLines={2}>
          {t('web.updateAvailable')}
        </Text>
        <Pressable onPress={apply} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.action}>{t('web.update')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setDismissed(true)}
          accessibilityRole="button"
          accessibilityLabel={t('web.later')}
          hitSlop={8}>
          <MaterialCommunityIcons name="close" size={18} color="#C7C7CC" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 10 },
  wide: { right: Spacing.four, bottom: Spacing.four, width: 380 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius + 4,
    backgroundColor: '#1C1C1E',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  text: { flex: 1, color: '#FFFFFF' },
  action: { color: '#8FA2F0', fontWeight: '700' },
});
