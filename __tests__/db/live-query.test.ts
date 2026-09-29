import { act, renderHook } from '@testing-library/react-native';

import { useLiveQueryOn } from '@/db/live-query';
import { accounts, transactions } from '@/db/schema';

type Listener = (event: { tableName: string }) => void;
const mockListeners = new Set<Listener>();

jest.mock('expo-sqlite', () => ({
  addDatabaseChangeListener: (listener: Listener) => {
    mockListeners.add(listener);
    return { remove: () => mockListeners.delete(listener) };
  },
}));

const emit = (tableName: string) => mockListeners.forEach((l) => l({ tableName }));

/** Query finta che conta quante volte viene eseguita. */
function countingQuery() {
  let runs = 0;
  const query: PromiseLike<number> & { readonly runs: number } = {
    get runs() {
      return runs;
    },
    then(onFulfilled, onRejected) {
      runs += 1;
      return Promise.resolve(runs).then(onFulfilled, onRejected);
    },
  };
  return query;
}

describe('useLiveQueryOn', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('raggruppa una raffica di notifiche in una sola riesecuzione', async () => {
    const query = countingQuery();
    const { result, unmount } = await renderHook(() => useLiveQueryOn(query, [transactions]));
    await act(async () => {});
    expect(query.runs).toBe(1);

    // Un inserimento in blocco: una notifica per riga
    await act(async () => {
      for (let i = 0; i < 1000; i++) emit('transactions');
      jest.advanceTimersByTime(100);
    });
    expect(query.runs).toBe(2);
    expect(result.current.data).toBe(2);
    await unmount();
    expect(mockListeners.size).toBe(0);
  });

  it('ignora le tabelle non osservate', async () => {
    const query = countingQuery();
    const { unmount } = await renderHook(() => useLiveQueryOn(query, [transactions]));
    await act(async () => {
      emit('categories');
      jest.advanceTimersByTime(100);
    });
    expect(query.runs).toBe(1);
    await unmount();
  });

  it('durante una raffica lunga aggiorna comunque ogni tanto', async () => {
    const query = countingQuery();
    const { unmount } = await renderHook(() => useLiveQueryOn(query, [transactions, accounts]));
    await act(async () => {
      // Una notifica ogni 20 ms per 1,2 s: senza tetto non si aggiornerebbe mai
      for (let i = 0; i < 60; i++) {
        emit(i % 2 ? 'accounts' : 'transactions');
        jest.advanceTimersByTime(20);
      }
    });
    expect(query.runs).toBeGreaterThanOrEqual(3);
    expect(query.runs).toBeLessThan(10);
    await unmount();
  });
});
