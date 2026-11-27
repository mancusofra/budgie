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
    version: '0.3.0',
    date: '2026-11-27',
    changes: [
      {
        kind: 'new',
        it: 'Report PDF di un periodo e dei conti scelti: riepilogo, spese per categoria e tutte le transazioni mese per mese',
        en: 'PDF report of any period and accounts: summary, spending by category and every transaction month by month',
      },
      {
        kind: 'new',
        it: 'Gruppi di spesa: ogni categoria è un Bisogno, un Desiderio o un Risparmio, con quote regolabili (50/30/20) confrontate con le entrate',
        en: 'Spending groups: every category is a Need, a Want or Savings, with adjustable targets (50/30/20) compared with your income',
      },
      {
        kind: 'new',
        it: 'Sezione Gruppi nelle Statistiche e anello dei gruppi in Home, attivabile dalle Impostazioni',
        en: 'Groups section in Stats and a groups ring on Home, which can be turned on in Settings',
      },
      {
        kind: 'new',
        it: 'Versione web installabile, anche offline: mancusofra.github.io/budgie',
        en: 'Installable web version, offline too: mancusofra.github.io/budgie',
      },
      {
        kind: 'fix',
        it: 'Aggiornamento a Expo SDK 58',
        en: 'Updated to Expo SDK 58',
      },
    ],
  },
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
