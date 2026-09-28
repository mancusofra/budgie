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

  it.each(['', 'abc', '1,2,3', '1,234', '.'])('rifiuta "%s"', (input) => {
    expect(parseAmount(input, 'EUR')).toBeNull();
  });

  it('accetta il separatore finale mentre si digita', () => {
    expect(parseAmount('12,', 'EUR')).toBe(1200);
  });

  it('rispetta i decimali della valuta', () => {
    expect(parseAmount('500', 'JPY')).toBe(500);
    expect(parseAmount('500,5', 'JPY')).toBeNull();
  });

  it('evita gli errori dei float', () => {
    expect(parseAmount('0,1')! + parseAmount('0,2')!).toBe(30);
    expect(parseAmount('1,15')).toBe(115);
  });
});

describe('currencyDecimals / fromMinor', () => {
  it('conosce le valute senza decimali', () => {
    expect(currencyDecimals('EUR')).toBe(2);
    expect(currencyDecimals('JPY')).toBe(0);
    expect(fromMinor(1250, 'EUR')).toBe(12.5);
    expect(fromMinor(1250, 'JPY')).toBe(1250);
  });
});

describe('formatMoney', () => {
  it('formatta secondo la locale', () => {
    expect(formatMoney(123456, 'EUR', 'it-IT')).toBe('1234,56 €');
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
  });
});
