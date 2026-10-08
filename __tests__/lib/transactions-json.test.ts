import { transactionsJson, type CsvTransaction } from '@/features/settings/csv-export';

const row = (over: Partial<CsvTransaction['transaction']>, extra: Partial<CsvTransaction> = {}) =>
  ({
    transaction: {
      date: new Date(2026, 8, 3, 14),
      type: 'expense',
      amount: 1250,
      note: null,
      ...over,
    },
    category: { name: 'Cibo' },
    account: { name: 'Contanti', currency: 'EUR' },
    toAccount: null,
    ...extra,
  }) as CsvTransaction;

describe('transactionsJson', () => {
  it('exports signed decimal amounts with fixed keys', () => {
    const json = JSON.parse(
      transactionsJson([
        row({ note: 'Pizza' }),
        row({ type: 'income', amount: 100000 }, { category: { name: 'Stipendio' } }),
        row({ type: 'transfer', amount: 5000 }, { category: null, toAccount: { name: 'Banca' } }),
      ]),
    );
    expect(json).toEqual([
      {
        date: '2026-09-03',
        type: 'expense',
        category: 'Cibo',
        account: 'Contanti',
        toAccount: null,
        amount: -12.5,
        currency: 'EUR',
        note: 'Pizza',
      },
      expect.objectContaining({ type: 'income', category: 'Stipendio', amount: 1000 }),
      expect.objectContaining({ type: 'transfer', category: null, toAccount: 'Banca', amount: 50 }),
    ]);
  });

  it('respects the currency decimals', () => {
    const [item] = JSON.parse(
      transactionsJson([row({ amount: 1500 }, { account: { name: 'Yen', currency: 'JPY' } })]),
    );
    expect(item.amount).toBe(-1500);
  });

  it('returns an empty array without transactions', () => {
    expect(JSON.parse(transactionsJson([]))).toEqual([]);
  });
});
