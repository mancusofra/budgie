import { resolveAccountScope } from '@/lib/account-scope';

const eur1 = { id: 'a', currency: 'EUR' };
const eur2 = { id: 'b', currency: 'EUR' };
const usd = { id: 'c', currency: 'USD' };

describe('resolveAccountScope', () => {
  it('tutti i conti nella stessa valuta → nessun filtro', () => {
    expect(resolveAccountScope('all', [eur1, eur2], 'EUR')).toEqual({
      scope: {},
      currency: 'EUR',
      partial: false,
    });
  });

  it('valute diverse → solo i conti nella valuta principale', () => {
    expect(resolveAccountScope('all', [eur1, usd, eur2], 'EUR')).toEqual({
      scope: { accountIds: ['a', 'b'] },
      currency: 'EUR',
      partial: true,
    });
  });

  it('conto selezionato → solo quello, nella sua valuta', () => {
    expect(resolveAccountScope('c', [eur1, usd], 'EUR')).toEqual({
      scope: { accountId: 'c' },
      currency: 'USD',
      partial: false,
    });
  });

  it('conto selezionato inesistente → come "tutti"', () => {
    expect(resolveAccountScope('zzz', [eur1], 'EUR').scope).toEqual({});
  });
});
