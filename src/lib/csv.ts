/** A CSV cell: quoted if it contains the separator, quotes or a newline. */
function cell(value: string, separator: string): string {
  return /["\r\n]/.test(value) || value.includes(separator)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * CSV text with a UTF-8 BOM (so Excel recognizes accented letters) and CRLF lines.
 * `separator` ";" for languages with a decimal comma (e.g. Excel in Italian).
 */
export function toCsv(rows: string[][], separator = ','): string {
  const body = rows.map((r) => r.map((v) => cell(v, separator)).join(separator)).join('\r\n');
  return `﻿${body}\r\n`;
}
