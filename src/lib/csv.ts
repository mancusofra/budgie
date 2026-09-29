/** Una cella CSV: tra virgolette se contiene separatore, virgolette o a capo. */
function cell(value: string, separator: string): string {
  return /["\r\n]/.test(value) || value.includes(separator)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * Testo CSV con BOM UTF-8 (così Excel riconosce gli accenti) e righe CRLF.
 * `separator` ";" per le lingue con la virgola decimale (Excel italiano).
 */
export function toCsv(rows: string[][], separator = ','): string {
  const body = rows.map((r) => r.map((v) => cell(v, separator)).join(separator)).join('\r\n');
  return `﻿${body}\r\n`;
}
