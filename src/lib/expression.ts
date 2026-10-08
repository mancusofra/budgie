import { currencyDecimals } from './money';

/**
 * Keypad expression: numbers and the operators + − × ÷,
 * e.g. "12,5+3×2". The typed decimal separator is always ",".
 */

export type Operator = '+' | '−' | '×' | '÷';
export type KeypadKey = `${number}` | ',' | 'backspace' | Operator;

export const OPERATORS: Operator[] = ['+', '−', '×', '÷'];
const MAX_INTEGER_DIGITS = 9;

const isOperator = (c: string | undefined): c is Operator =>
  !!c && OPERATORS.includes(c as Operator);

/** Applies a key to the expression, ignoring invalid input. */
export function applyKey(expr: string, key: KeypadKey, currency = 'EUR'): string {
  const last = expr.at(-1);
  const current = expr.split(/[+−×÷]/).at(-1) ?? '';

  if (key === 'backspace') return expr.slice(0, -1);

  if (isOperator(key)) {
    if (!expr) return expr;
    if (isOperator(last)) return expr.slice(0, -1) + key;
    if (last === ',') return expr.slice(0, -1) + key;
    return expr + key;
  }

  if (key === ',') {
    if (currencyDecimals(currency) === 0 || current.includes(',')) return expr;
    return expr + (current === '' ? '0,' : ',');
  }

  // cifra
  const [intPart, fracPart] = current.split(',');
  if (fracPart !== undefined) {
    return fracPart.length >= currencyDecimals(currency) ? expr : expr + key;
  }
  if (intPart === '0') return expr.slice(0, -1) + key; // no leading zeros
  if (intPart.length >= MAX_INTEGER_DIGITS) return expr;
  return expr + key;
}

export function hasOperator(expr: string): boolean {
  return /[+−×÷]/.test(expr.replace(/[+−×÷]$/, ''));
}

/**
 * Evaluates the expression in minor units, with × and ÷ taking precedence.
 * Trailing operators are ignored. Returns null if empty or invalid (e.g. ÷ 0).
 */
export function evaluate(expr: string, currency = 'EUR'): number | null {
  const scale = 10 ** currencyDecimals(currency);
  const tokens = expr.replace(/[+−×÷,]+$/, '').match(/[+−×÷]|[\d,]+/g);
  if (!tokens) return null;

  const toMinor = (n: string) => {
    const [i, f = ''] = n.split(',');
    return Number(i || '0') * scale + Number(f.padEnd(Math.log10(scale), '0') || '0');
  };

  // First × and ÷ (values in minor units, rounded at each step), then + and −
  const terms: number[] = [toMinor(tokens[0])];
  const signs: number[] = [1];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as Operator;
    const value = toMinor(tokens[i + 1]);
    if (op === '×') terms[terms.length - 1] = Math.round((terms.at(-1)! * value) / scale);
    else if (op === '÷') {
      if (value === 0) return null;
      terms[terms.length - 1] = Math.round((terms.at(-1)! * scale) / value);
    } else {
      terms.push(value);
      signs.push(op === '+' ? 1 : -1);
    }
  }
  return terms.reduce((sum, t, i) => sum + signs[i] * t, 0);
}

/** Keypad expression for an amount in minor units: 1250 → "12,5", 1200 → "12". */
export function minorToExpression(minor: number, currency = 'EUR'): string {
  const decimals = currencyDecimals(currency);
  const abs = Math.abs(Math.round(minor));
  const int = Math.floor(abs / 10 ** decimals);
  const frac = String(abs % 10 ** decimals)
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  return `${minor < 0 ? '−' : ''}${int}${frac ? `,${frac}` : ''}`;
}
