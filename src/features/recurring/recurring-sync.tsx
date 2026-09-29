import { useEffect } from 'react';
import { AppState } from 'react-native';

import { recurringActions } from './hooks';

/** Registra le ricorrenze scadute all'avvio e ogni volta che l'app torna in primo piano. */
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
