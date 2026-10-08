import { resolveAccountScope } from '@/lib/account-scope';

const eur1 = { id: 'a', currency: 'EUR' };
const eur2 = { id: 'b', currency: 'EUR' };
const usd = { id: 'c', currency: 'USD' };

describe('resolveAccountScope', () => {
  it('all accounts in the same currency → no filter', () => {
    expect(resolveAccountScope('all', [eur1, eur2], 'EUR')).toEqual({
      scope: {},
      currency: 'EUR',
      partial: false,
    });
  });

  it('different currencies → only accounts in the main currency', () => {
    expect(resolveAccountScope('all', [eur1, usd, eur2], 'EUR')).toEqual({
      scope: { accountIds: ['a', 'b'] },
      currency: 'EUR',
      partial: true,
    });
  });

  it('selected account → only that one, in its currency', () => {
    expect(resolveAccountScope('c', [eur1, usd], 'EUR')).toEqual({
      scope: { accountId: 'c' },
      currency: 'USD',
      partial: false,
    });
  });

  it('missing selected account → same as "all"', () => {
    expect(resolveAccountScope('zzz', [eur1], 'EUR').scope).toEqual({});
  });
});
