import { withAlpha } from '@/lib/color';

describe('withAlpha', () => {
  it('aggiunge il canale alfa', () => {
    expect(withAlpha('#ff0000', 0.2)).toBe('#FF000033');
    expect(withAlpha('#abc', 1)).toBe('#AABBCCFF');
    expect(withAlpha('#123456', -1)).toBe('#12345600');
  });
});
