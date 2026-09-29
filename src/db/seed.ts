import { and, eq, inArray } from 'drizzle-orm';

import { createId } from '@/lib/id';

import type { SettingKey } from './repositories/settings';
import {
  accounts,
  budgetMonths,
  budgets,
  categories,
  recurring,
  settings,
  transactions,
  type Category,
  type CategoryType,
} from './schema';
import type { AppDatabase } from './types';

/**
 * Incrementare quando cambiano i dati di default.
 * v2: palette categorie più sobria.
 */
export const SEED_VERSION = 2;

type Language = 'it' | 'en';

type DefaultCategory = {
  /** Colori usati dalle versioni precedenti del seed, da aggiornare se invariati. */
  legacyColors?: string[];
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
    legacyColors: ['#43A047'],
    type: 'expense',
    icon: 'food-apple',
    color: '#6E9E7B',
    name: { it: 'Cibo', en: 'Food' },
  },
  {
    key: 'home',
    legacyColors: ['#8D6E63'],
    type: 'expense',
    icon: 'home',
    color: '#9C8878',
    name: { it: 'Casa', en: 'House' },
  },
  {
    key: 'transport',
    legacyColors: ['#1E88E5'],
    type: 'expense',
    icon: 'bus',
    color: '#6887AB',
    name: { it: 'Trasporti', en: 'Transport' },
  },
  {
    key: 'car',
    legacyColors: ['#3949AB'],
    type: 'expense',
    icon: 'car',
    color: '#626F96',
    name: { it: 'Auto', en: 'Car' },
  },
  {
    key: 'bills',
    legacyColors: ['#FDD835'],
    type: 'expense',
    icon: 'flash',
    color: '#C4A35E',
    name: { it: 'Bollette', en: 'Bills' },
  },
  {
    key: 'health',
    legacyColors: ['#E53935'],
    type: 'expense',
    icon: 'hospital-box',
    color: '#BF6B66',
    name: { it: 'Salute', en: 'Health' },
  },
  {
    key: 'entertainment',
    legacyColors: ['#8E24AA'],
    type: 'expense',
    icon: 'gamepad-variant',
    color: '#8B7BAA',
    name: { it: 'Svago', en: 'Entertainment' },
  },
  {
    key: 'restaurants',
    legacyColors: ['#FB8C00'],
    type: 'expense',
    icon: 'silverware-fork-knife',
    color: '#C98B5E',
    name: { it: 'Ristoranti', en: 'Eating out' },
  },
  {
    key: 'clothes',
    legacyColors: ['#D81B60'],
    type: 'expense',
    icon: 'tshirt-crew',
    color: '#B07189',
    name: { it: 'Abbigliamento', en: 'Clothes' },
  },
  {
    key: 'gifts',
    legacyColors: ['#F4511E'],
    type: 'expense',
    icon: 'gift',
    color: '#C47F68',
    name: { it: 'Regali', en: 'Gifts' },
  },
  {
    key: 'sports',
    legacyColors: ['#00ACC1'],
    type: 'expense',
    icon: 'basketball',
    color: '#5E9AA3',
    name: { it: 'Sport', en: 'Sports' },
  },
  {
    key: 'pets',
    legacyColors: ['#6D4C41'],
    type: 'expense',
    icon: 'paw',
    color: '#8A7766',
    name: { it: 'Animali', en: 'Pets' },
  },
  {
    key: 'toiletry',
    legacyColors: ['#26A69A'],
    type: 'expense',
    icon: 'toothbrush',
    color: '#6EA398',
    name: { it: 'Igiene', en: 'Toiletry' },
  },
  {
    key: 'communications',
    legacyColors: ['#5E35B1'],
    type: 'expense',
    icon: 'cellphone',
    color: '#7A7DB0',
    name: { it: 'Comunicazioni', en: 'Communications' },
  },
  {
    key: 'taxi',
    legacyColors: ['#FFB300'],
    type: 'expense',
    icon: 'taxi',
    color: '#C9A961',
    name: { it: 'Taxi', en: 'Taxi' },
  },
  {
    key: 'other-expense',
    legacyColors: ['#757575'],
    type: 'expense',
    icon: 'dots-horizontal',
    color: '#8E8E93',
    name: { it: 'Altro', en: 'Other' },
  },
  {
    key: 'salary',
    legacyColors: ['#2E7D32'],
    type: 'income',
    icon: 'cash',
    color: '#5E9A77',
    name: { it: 'Stipendio', en: 'Salary' },
  },
  {
    key: 'savings',
    legacyColors: ['#00897B'],
    type: 'income',
    icon: 'piggy-bank',
    color: '#4F9690',
    name: { it: 'Risparmi', en: 'Savings' },
  },
  {
    key: 'gifts-income',
    legacyColors: ['#F4511E'],
    type: 'income',
    icon: 'gift',
    color: '#C47F68',
    name: { it: 'Regali', en: 'Gifts' },
  },
  {
    key: 'other-income',
    legacyColors: ['#757575'],
    type: 'income',
    icon: 'dots-horizontal',
    color: '#8E8E93',
    name: { it: 'Altro', en: 'Other' },
  },
];

export type SeedOptions = { language: string; currency: string };

const CASH_COLOR = '#6E9E7B';
const LEGACY_CASH_COLORS = ['#43A047'];

/**
 * Popola il DB al primo avvio con categorie, conto "Contanti" e impostazioni di base.
 * Sui DB già esistenti applica solo gli aggiornamenti delle versioni successive.
 *
 * Tutto avviene in un'unica transazione sincrona (lettura della versione compresa):
 * due chiamate ravvicinate, es. effetti eseguiti due volte in sviluppo, non possono
 * interlacciarsi e inserire i dati di default due volte.
 */
export async function seedDatabase(db: AppDatabase, { language, currency }: SeedOptions) {
  return db.transaction((tx) => {
    const row = tx.select().from(settings).where(eq(settings.key, 'seedVersion')).get();
    const current: number = row ? JSON.parse(row.value) : 0;
    if (current >= SEED_VERSION) return false;

    if (current === 0) {
      insertDefaults(tx, language, currency);
      setSetting(tx, 'currency', currency);
    } else if (current < 2) {
      recolorDefaults(tx);
    }
    setSetting(tx, 'seedVersion', SEED_VERSION);
    return true;
  });
}

/** Cancella tutti i dati e riapplica il seed (solo per sviluppo). */
export async function resetDatabase(db: AppDatabase, options: SeedOptions) {
  db.transaction((tx) => {
    tx.delete(transactions).run();
    tx.delete(recurring).run();
    tx.delete(budgets).run();
    tx.delete(budgetMonths).run();
    tx.delete(categories).run();
    tx.delete(accounts).run();
    tx.delete(settings).run();
  });
  return seedDatabase(db, options);
}

type Tx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

function setSetting(tx: Tx, key: SettingKey, value: unknown) {
  const json = JSON.stringify(value);
  tx.insert(settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } })
    .run();
}

function insertDefaults(tx: Tx, language: string, currency: string) {
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

  tx.insert(categories).values(categoryRows).run();
  tx.insert(accounts)
    .values({
      id: createId(),
      name: lang === 'it' ? 'Contanti' : 'Cash',
      currency,
      icon: 'cash',
      color: CASH_COLOR,
      createdAt: now,
    })
    .run();
}

/** v2: nuova palette. Aggiorna solo i colori rimasti quelli di default. */
function recolorDefaults(tx: Tx) {
  for (const c of DEFAULT_CATEGORIES) {
    if (!c.legacyColors?.length) continue;
    tx.update(categories)
      .set({ color: c.color })
      .where(and(eq(categories.type, c.type), inArray(categories.color, c.legacyColors)))
      .run();
  }
  tx.update(accounts)
    .set({ color: CASH_COLOR })
    .where(inArray(accounts.color, LEGACY_CASH_COLORS))
    .run();
}
