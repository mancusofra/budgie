/** Aggiunge trasparenza a un colore esadecimale (#RGB o #RRGGBB): withAlpha('#FF0000', 0.2). */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${h.slice(0, 6)}${a}`.toUpperCase();
}
