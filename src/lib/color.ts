/** Aggiunge trasparenza a un colore esadecimale (#RGB o #RRGGBB): withAlpha('#FF0000', 0.2). */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${h.slice(0, 6)}${a}`.toUpperCase();
}

function channels(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Colore risultante di `fg` con opacità `alpha` sopra `bg` (entrambi opachi). */
export function blend(fg: string, bg: string, alpha: number): string {
  const [f, b] = [channels(fg), channels(bg)];
  return `#${f
    .map((c, i) =>
      Math.round(c * alpha + b[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG tra due colori opachi (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
