import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ChangeKind = 'new' | 'fix';

export type Release = {
  version: string;
  /** Release date 'YYYY-MM-DD'. */
  date: string;
  changes: { kind: ChangeKind; it: string; en: string }[];
};

/**
 * What's new in each version, newest first. Update it for every beta:
 * a test checks that the version in app.json has its entry.
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.2.0',
    date: '2026-10-08',
    changes: [
      {
        kind: 'new',
        it: 'Spese, entrate e trasferimenti si possono inserire anche con data futura',
        en: 'Expenses, income and transfers can now have a future date',
      },
      {
        kind: 'new',
        it: 'Versione e novità in fondo alle Impostazioni',
        en: 'Version and release notes at the bottom of Settings',
      },
      {
        kind: 'fix',
        it: "L'ordine delle sezioni delle Statistiche si perdeva chiudendo l'app",
        en: 'The order of the Stats sections was lost after closing the app',
      },
      {
        kind: 'fix',
        it: 'Icona e schermata di avvio usavano ancora il vecchio disegno del pappagallino',
        en: 'App icon and launch screen still used the old budgie artwork',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-30',
    changes: [{ kind: 'new', it: 'Prima beta di Budgie', en: 'First Budgie beta' }],
  },
];

/** Installed version, e.g. "0.2.0", and build number (if available). */
export function appVersion() {
  const config = Constants.expoConfig;
  const build =
    Platform.OS === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode?.toString();
  return { version: config?.version ?? '0.0.0', build };
}

export function releaseFor(version: string) {
  return CHANGELOG.find((r) => r.version === version);
}
