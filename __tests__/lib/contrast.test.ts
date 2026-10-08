import { blend, contrastRatio } from '@/lib/color';
import { Colors } from '@/theme';

/** WCAG AA for normal text. */
const AA = 4.5;
const accents = ['text', 'textSecondary', 'primary', 'expense', 'income', 'warning'] as const;

describe('contrastRatio', () => {
  it('computes the reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('blend mixes a color over a background', () => {
    expect(blend('#FF0000', '#FFFFFF', 0.5)).toBe('#FF8080');
  });
});

describe.each(Object.entries(Colors))('tema %s', (_, theme) => {
  it.each(accents)('%s is readable on background, surface and its own light tint', (name) => {
    const color = theme[name];
    expect(contrastRatio(color, theme.background)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(color, theme.surface)).toBeGreaterThanOrEqual(AA);
    // Surface with `tint` and category icons: background at 14–16% of the color
    expect(contrastRatio(color, blend(color, theme.background, 0.16))).toBeGreaterThanOrEqual(AA);
  });

  it.each(['primary', 'expense', 'income'] as const)(
    'textOnColor è leggibile sui pulsanti pieni %s',
    (name) => {
      expect(contrastRatio(theme.textOnColor, theme[name])).toBeGreaterThanOrEqual(AA);
    },
  );
});
