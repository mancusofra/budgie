import { currencyDecimals, formatMoney, fromMinor, parseAmount } from '@/lib/money';

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0,01', 1],
    [',99', 99],
    ['1 234,56', 123456],
    ['-3,20', -320],
  ])('%s → %d centesimi', (input, expected) => {
    expect(parseAmount(input, 'EUR')).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '1,234', '.'])('rejects "%s"', (input) => {
    expect(parseAmount(input, 'EUR')).toBeNull();
  });

  it('accepts a trailing separator while typing', () => {
    expect(parseAmount('12,', 'EUR')).toBe(1200);
  });

  it('respects the currency decimals', () => {
    expect(parseAmount('500', 'JPY')).toBe(500);
    expect(parseAmount('500,5', 'JPY')).toBeNull();
  });

  it('avoids floating-point errors', () => {
    expect(parseAmount('0,1')! + parseAmount('0,2')!).toBe(30);
    expect(parseAmount('1,15')).toBe(115);
  });
});

describe('currencyDecimals / fromMinor', () => {
  it('knows currencies without decimals', () => {
    expect(currencyDecimals('EUR')).toBe(2);
    expect(currencyDecimals('JPY')).toBe(0);
    expect(fromMinor(1250, 'EUR')).toBe(12.5);
    expect(fromMinor(1250, 'JPY')).toBe(1250);
  });
});

describe('formatMoney', () => {
  it('formats according to the locale', () => {
    expect(formatMoney(123456, 'EUR', 'it-IT')).toBe('1234,56 €');
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
  });
});
