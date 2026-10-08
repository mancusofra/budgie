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

/** Fake query that counts how many times it runs. */
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

  it('batches a burst of notifications into a single re-run', async () => {
    const query = countingQuery();
    const { result, unmount } = await renderHook(() => useLiveQueryOn(query, [transactions]));
    await act(async () => {});
    expect(query.runs).toBe(1);

    // A bulk insert: one notification per row
    await act(async () => {
      for (let i = 0; i < 1000; i++) emit('transactions');
      jest.advanceTimersByTime(100);
    });
    expect(query.runs).toBe(2);
    expect(result.current.data).toBe(2);
    await unmount();
    expect(mockListeners.size).toBe(0);
  });

  it('ignores tables that are not watched', async () => {
    const query = countingQuery();
    const { unmount } = await renderHook(() => useLiveQueryOn(query, [transactions]));
    await act(async () => {
      emit('categories');
      jest.advanceTimersByTime(100);
    });
    expect(query.runs).toBe(1);
    await unmount();
  });

  it('during a long burst it still updates every now and then', async () => {
    const query = countingQuery();
    const { unmount } = await renderHook(() => useLiveQueryOn(query, [transactions, accounts]));
    await act(async () => {
      // One notification every 20 ms for 1.2 s: without a cap it would never update
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
