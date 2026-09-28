import { createId } from '@/lib/id';

import { createSettingsRepo } from './repositories/settings';
import { accounts, categories, type Category, type CategoryType } from './schema';
import type { AppDatabase } from './types';

/** Incrementare quando si aggiungono nuovi dati di default. */
export const SEED_VERSION = 1;

type Language = 'it' | 'en';

type DefaultCategory = {
  key: string;
  type: CategoryType;
  icon: string;
  color: string;
  name: Record<Language, string>;
};

// Icone: nomi MaterialCommunityIcons (@expo/vector-icons)
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    key: 'food',
    type: 'expense',
    icon: 'food-apple',
    color: '#43A047',
    name: { it: 'Cibo', en: 'Food' },
  },
  {
    key: 'home',
    type: 'expense',
    icon: 'home',
    color: '#8D6E63',
    name: { it: 'Casa', en: 'House' },
  },
  {
    key: 'transport',
    type: 'expense',
    icon: 'bus',
    color: '#1E88E5',
    name: { it: 'Trasporti', en: 'Transport' },
  },
  { key: 'car', type: 'expense', icon: 'car', color: '#3949AB', name: { it: 'Auto', en: 'Car' } },
  {
    key: 'bills',
    type: 'expense',
    icon: 'flash',
    color: '#FDD835',
    name: { it: 'Bollette', en: 'Bills' },
  },
  {
    key: 'health',
    type: 'expense',
    icon: 'hospital-box',
    color: '#E53935',
    name: { it: 'Salute', en: 'Health' },
  },
  {
    key: 'entertainment',
    type: 'expense',
    icon: 'gamepad-variant',
    color: '#8E24AA',
    name: { it: 'Svago', en: 'Entertainment' },
  },
  {
    key: 'restaurants',
    type: 'expense',
    icon: 'silverware-fork-knife',
    color: '#FB8C00',
    name: { it: 'Ristoranti', en: 'Eating out' },
  },
  {
    key: 'clothes',
    type: 'expense',
    icon: 'tshirt-crew',
    color: '#D81B60',
    name: { it: 'Abbigliamento', en: 'Clothes' },
  },
  {
    key: 'gifts',
    type: 'expense',
    icon: 'gift',
    color: '#F4511E',
    name: { it: 'Regali', en: 'Gifts' },
  },
  {
    key: 'sports',
    type: 'expense',
    icon: 'basketball',
    color: '#00ACC1',
    name: { it: 'Sport', en: 'Sports' },
  },
  {
    key: 'pets',
    type: 'expense',
    icon: 'paw',
    color: '#6D4C41',
    name: { it: 'Animali', en: 'Pets' },
  },
  {
    key: 'toiletry',
    type: 'expense',
    icon: 'toothbrush',
    color: '#26A69A',
    name: { it: 'Igiene', en: 'Toiletry' },
  },
  {
    key: 'communications',
    type: 'expense',
    icon: 'cellphone',
    color: '#5E35B1',
    name: { it: 'Comunicazioni', en: 'Communications' },
  },
  {
    key: 'taxi',
    type: 'expense',
    icon: 'taxi',
    color: '#FFB300',
    name: { it: 'Taxi', en: 'Taxi' },
  },
  {
    key: 'other-expense',
    type: 'expense',
    icon: 'dots-horizontal',
    color: '#757575',
    name: { it: 'Altro', en: 'Other' },
  },
  {
    key: 'salary',
    type: 'income',
    icon: 'cash',
    color: '#2E7D32',
    name: { it: 'Stipendio', en: 'Salary' },
  },
  {
    key: 'savings',
    type: 'income',
    icon: 'piggy-bank',
    color: '#00897B',
    name: { it: 'Risparmi', en: 'Savings' },
  },
  {
    key: 'gifts-income',
    type: 'income',
    icon: 'gift',
    color: '#F4511E',
    name: { it: 'Regali', en: 'Gifts' },
  },
  {
    key: 'other-income',
    type: 'income',
    icon: 'dots-horizontal',
    color: '#757575',
    name: { it: 'Altro', en: 'Other' },
  },
];

export type SeedOptions = { language: string; currency: string };

/**
 * Popola il DB al primo avvio con categorie, conto "Contanti" e impostazioni di base.
 * Idempotente: non fa nulla se il seed è già stato applicato.
 */
export async function seedDatabase(db: AppDatabase, { language, currency }: SeedOptions) {
  const settingsRepo = createSettingsRepo(db);
  if (((await settingsRepo.get('seedVersion')) ?? 0) >= SEED_VERSION) return false;

  const lang: Language = language.startsWith('it') ? 'it' : 'en';
  const now = new Date();
  const sortByType: Record<CategoryType, number> = { expense: 0, income: 0 };

  const categoryRows: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    id: createId(),
    name: c.name[lang],
    type: c.type,
    icon: c.icon,
    color: c.color,
    sortOrder: sortByType[c.type]++,
    archived: false,
    createdAt: now,
  }));

  db.transaction((tx) => {
    tx.insert(categories).values(categoryRows).run();
    tx.insert(accounts)
      .values({
        id: createId(),
        name: lang === 'it' ? 'Contanti' : 'Cash',
        currency,
        icon: 'cash',
        color: '#43A047',
        createdAt: now,
      })
      .run();
  });

  await settingsRepo.set('currency', currency);
  await settingsRepo.set('seedVersion', SEED_VERSION);
  return true;
}
