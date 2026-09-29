import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSettingsState } from '@/features/settings/hooks';

/** Apre la presentazione iniziale finché non è stata vista (anche dopo un azzeramento). */
export function OnboardingGate() {
  const { settings, loaded } = useSettingsState();
  const shown = useRef(false);
  const needed = loaded && settings.onboardingDone !== true;

  useEffect(() => {
    if (!needed) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;
    router.push('/onboarding');
  }, [needed]);

  return null;
}
