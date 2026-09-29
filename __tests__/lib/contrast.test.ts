import { blend, contrastRatio } from '@/lib/color';
import { Colors } from '@/theme';

/** WCAG AA per testo normale. */
const AA = 4.5;
const accents = ['text', 'textSecondary', 'primary', 'expense', 'income', 'warning'] as const;

describe('contrastRatio', () => {
  it('calcola i valori di riferimento', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('blend mescola un colore sopra uno sfondo', () => {
    expect(blend('#FF0000', '#FFFFFF', 0.5)).toBe('#FF8080');
  });
});

describe.each(Object.entries(Colors))('tema %s', (_, theme) => {
  it.each(accents)('%s è leggibile su sfondo, superficie e sul proprio fondo tenue', (name) => {
    const color = theme[name];
    expect(contrastRatio(color, theme.background)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(color, theme.surface)).toBeGreaterThanOrEqual(AA);
    // Surface con `tint` e icone di categoria: fondo al 14–16% del colore
    expect(contrastRatio(color, blend(color, theme.background, 0.16))).toBeGreaterThanOrEqual(AA);
  });

  it.each(['primary', 'expense', 'income'] as const)(
    'textOnColor è leggibile sui pulsanti pieni %s',
    (name) => {
      expect(contrastRatio(theme.textOnColor, theme[name])).toBeGreaterThanOrEqual(AA);
    },
  );
});
