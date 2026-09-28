import { currencyDecimals } from './money';

/**
 * Espressione del tastierino tipo Monefy: numeri e operatori + − × ÷,
 * es. "12,5+3×2". Il separatore decimale digitato è sempre ",".
 */

export type Operator = '+' | '−' | '×' | '÷';
export type KeypadKey = `${number}` | ',' | 'backspace' | Operator;

export const OPERATORS: Operator[] = ['+', '−', '×', '÷'];
const MAX_INTEGER_DIGITS = 9;

const isOperator = (c: string | undefined): c is Operator =>
  !!c && OPERATORS.includes(c as Operator);

/** Applica un tasto all'espressione, ignorando gli input non validi. */
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
  if (intPart === '0') return expr.slice(0, -1) + key; // niente zeri iniziali
  if (intPart.length >= MAX_INTEGER_DIGITS) return expr;
  return expr + key;
}

export function hasOperator(expr: string): boolean {
  return /[+−×÷]/.test(expr.replace(/[+−×÷]$/, ''));
}

/**
 * Valuta l'espressione in unità minori, con precedenza di × e ÷.
 * Gli operatori finali sono ignorati. Restituisce null se vuota o non valida (es. ÷ 0).
 */
export function evaluate(expr: string, currency = 'EUR'): number | null {
  const scale = 10 ** currencyDecimals(currency);
  const tokens = expr.replace(/[+−×÷,]+$/, '').match(/[+−×÷]|[\d,]+/g);
  if (!tokens) return null;

  const toMinor = (n: string) => {
    const [i, f = ''] = n.split(',');
    return Number(i || '0') * scale + Number(f.padEnd(Math.log10(scale), '0') || '0');
  };

  // Prima × e ÷ (valori in unità minori, arrotondati a ogni passo), poi + e −
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
