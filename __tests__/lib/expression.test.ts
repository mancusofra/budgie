import {
  applyKey,
  evaluate,
  hasOperator,
  minorToExpression,
  type KeypadKey,
} from '@/lib/expression';

const type = (keys: string, currency = 'EUR') =>
  [...keys].reduce(
    (expr, k) => applyKey(expr, (k === '<' ? 'backspace' : k) as KeypadKey, currency),
    '',
  );

describe('applyKey', () => {
  it('builds numbers and operators', () => {
    expect(type('12,5+3')).toBe('12,5+3');
    expect(type('12<')).toBe('1');
  });

  it('ignores invalid input', () => {
    expect(type('+')).toBe('');
    expect(type('0005')).toBe('5');
    expect(type('1,2,3')).toBe('1,23');
    expect(type('1,234')).toBe('1,23');
    expect(type('1+×')).toBe('1×');
    expect(type('1,+')).toBe('1+');
    expect(type(',5')).toBe('0,5');
    expect(type('1234567890')).toBe('123456789');
    expect(type('5,5', 'JPY')).toBe('55');
  });
});

describe('evaluate', () => {
  it.each([
    ['', null],
    ['12', 1200],
    ['12,5', 1250],
    ['12,5+3', 1550],
    ['10−2,5', 750],
    ['2+3×4', 1400],
    ['12,50×3', 3750],
    ['10÷3', 333],
    ['10÷0', null],
    ['5+', 500],
    ['5,', 500],
    ['1−5', -400],
  ])('%s → %s', (expr, expected) => {
    expect(evaluate(expr)).toBe(expected);
  });

  it('uses the currency decimals', () => {
    expect(evaluate('500×2', 'JPY')).toBe(1000);
  });
});

describe('hasOperator', () => {
  it('ignores a trailing operator', () => {
    expect(hasOperator('12')).toBe(false);
    expect(hasOperator('12+')).toBe(false);
    expect(hasOperator('12+3')).toBe(true);
  });
});

describe('minorToExpression', () => {
  it.each([
    [1250, 'EUR', '12,5'],
    [1200, 'EUR', '12'],
    [1205, 'EUR', '12,05'],
    [5, 'EUR', '0,05'],
    [500, 'JPY', '500'],
  ])('%d %s → %s', (minor, currency, expected) => {
    expect(minorToExpression(minor, currency)).toBe(expected);
    expect(evaluate(expected, currency)).toBe(minor);
  });
});
