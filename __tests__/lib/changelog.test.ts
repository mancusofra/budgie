import appJson from '../../app.json';
import { CHANGELOG, releaseFor } from '@/features/about/changelog';

describe('changelog', () => {
  it('ha la voce della versione in app.json, in cima', () => {
    expect(releaseFor(appJson.expo.version)).toBeDefined();
    expect(CHANGELOG[0].version).toBe(appJson.expo.version);
  });

  it('ogni voce è tradotta in italiano e inglese', () => {
    for (const r of CHANGELOG) {
      expect(r.changes.length).toBeGreaterThan(0);
      for (const c of r.changes) {
        expect(c.it.trim()).not.toBe('');
        expect(c.en.trim()).not.toBe('');
      }
    }
  });
});
