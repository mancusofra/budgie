import { useEffect } from 'react';
import { AppState } from 'react-native';

import { recurringActions } from './hooks';

/** Logs due recurring transactions at launch and whenever the app returns to the foreground. */
export function RecurringSync() {
  useEffect(() => {
    const run = () => {
      try {
        recurringActions.materialize();
      } catch (e) {
        console.error(e);
      }
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => sub.remove();
  }, []);
  return null;
}
