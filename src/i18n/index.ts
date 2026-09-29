import { enUS, it as itLocale } from 'date-fns/locale';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import it from './locales/it.json';

export const SUPPORTED_LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const device = getLocales()[0];
const deviceLanguage: Language = device?.languageCode === 'it' ? 'it' : 'en';

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en } },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Locale per Intl (formato numeri/valuta), es. "it-IT". */
export const deviceLocale = device?.languageTag ?? deviceLanguage;

/** Separatore decimale del dispositivo ("," o "."), per tastierino e display. */
export const decimalSeparator = device?.decimalSeparator ?? ',';

/** Lingua dell'app: quella scelta nelle impostazioni o quella del dispositivo. */
export function applyLanguage(preference: 'system' | Language = 'system') {
  const language = preference === 'system' ? deviceLanguage : preference;
  if (i18n.language !== language) i18n.changeLanguage(language);
}

export function dateLocale(language = i18n.language) {
  return language === 'it' ? itLocale : enUS;
}

export default i18n;
