import { act, renderHook } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';

import { repos } from '@/db/client';
import { seedDatabase } from '@/db/seed';
import { useDataTransfer } from '@/features/settings/data-transfer';

jest.mock('@/db/client', () => {
  const { createTestDb } = require('../../test-utils/db');
  const ctx = createTestDb();
  return { db: ctx.db, repos: ctx.repos, expoDb: {} };
});
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove() {} }) }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

/** File system finto: ricorda cosa è stato scritto e cosa restituire al selettore. */
const mockFiles = new Map<string, string>();
const mockPick = { text: '' as string | null };
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    write(content: string) {
      mockFiles.set(this.uri, content);
    }
    static async pickFileAsync() {
      if (mockPick.text === null) return { canceled: true };
      return { canceled: false, result: { text: async () => mockPick.text } };
    }
  }
  return { File, Paths: { cache: { uri: 'cache' } } };
});

const lastShared = () => {
  const [uri] = (Sharing.shareAsync as jest.Mock).mock.lastCall!;
  return mockFiles.get(uri)!;
};

let cashId: string;
let foodId: string;

beforeAll(async () => {
  const { db } = jest.requireMock('@/db/client');
  await seedDatabase(db, { language: 'it', currency: 'EUR' });
  cashId = (await repos.accounts.list())[0].id;
  foodId = (await repos.categories.list({ type: 'expense' })).find((c) => c.name === 'Cibo')!.id;
  for (const [d, amount] of [
    [new Date(2026, 7, 10), 1000],
    [new Date(2026, 8, 5), 2550],
  ] as const) {
    await repos.transactions.create({
      type: 'expense',
      amount,
      accountId: cashId,
      categoryId: foodId,
      date: d,
    });
  }
});

async function transfer() {
  const { result } = await renderHook(() => useDataTransfer());
  return result.current;
}

describe('useDataTransfer', () => {
  it("esporta in JSON solo l'intervallo scelto", async () => {
    const { exportData } = await transfer();
    let count = 0;
    await act(async () => {
      count = await exportData({
        format: 'json',
        from: new Date(2026, 8, 1),
        to: new Date(2026, 9, 1),
      });
    });
    expect(count).toBe(1);
    const [uri] = (Sharing.shareAsync as jest.Mock).mock.lastCall!;
    expect(uri).toMatch(/\.json$/);
    expect(JSON.parse(lastShared())).toEqual([
      expect.objectContaining({ date: '2026-09-05', amount: -25.5 }),
    ]);
  });

  it('esporta tutto in CSV', async () => {
    const { exportData } = await transfer();
    await act(async () => {
      expect(await exportData({ format: 'csv' })).toBe(2);
    });
    const csv = lastShared();
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(3);
  });

  it("senza transazioni nell'intervallo non condivide nulla", async () => {
    const { exportData } = await transfer();
    (Sharing.shareAsync as jest.Mock).mockClear();
    await act(async () => {
      expect(
        await exportData({ format: 'csv', from: new Date(2020, 0, 1), to: new Date(2020, 1, 1) }),
      ).toBe(0);
    });
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('backup e ripristino tornano ai dati salvati', async () => {
    const { exportBackup, pickBackup, restore } = await transfer();
    await act(() => exportBackup());
    const backup = lastShared();

    await repos.transactions.create({
      type: 'expense',
      amount: 99,
      accountId: cashId,
      categoryId: foodId,
    });
    expect(await repos.transactions.list()).toHaveLength(3);

    mockPick.text = backup;
    const picked = await pickBackup();
    await act(async () => restore(picked!));
    expect(await repos.transactions.list()).toHaveLength(2);

    mockPick.text = null;
    expect(await pickBackup()).toBeNull();
    mockPick.text = '{"non":"un backup"}';
    await expect(pickBackup()).rejects.toThrow();
  });

  it('segnala se la condivisione non è disponibile', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    const { exportBackup } = await transfer();
    await expect(exportBackup()).rejects.toThrow();
  });
});
