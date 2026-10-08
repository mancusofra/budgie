import appJson from '../../app.json';
import { CHANGELOG, releaseFor } from '@/features/about/changelog';

describe('changelog', () => {
  it('has the entry for the version in app.json, at the top', () => {
    expect(releaseFor(appJson.expo.version)).toBeDefined();
    expect(CHANGELOG[0].version).toBe(appJson.expo.version);
  });

  it('every entry is translated into Italian and English', () => {
    for (const r of CHANGELOG) {
      expect(r.changes.length).toBeGreaterThan(0);
      for (const c of r.changes) {
        expect(c.it.trim()).not.toBe('');
        expect(c.en.trim()).not.toBe('');
      }
    }
  });
});
