# Modello dati

Database SQLite locale (`moneta.db`) gestito con Drizzle ORM.
ID: stringhe UUID/cuid generate lato app (utile per un eventuale sync futuro).
Date: `INTEGER` (timestamp ms UTC). Importi: `INTEGER` in **unità minori** (centesimi).

## Diagramma

```
accounts 1 ──< transactions >── 1 categories
    │                                  │
    └──< transactions (to_account) ────┘ (solo per i trasferimenti)

categories 1 ──< budgets
settings (chiave/valore)
```

## Tabelle

### `accounts`
| Colonna | Tipo | Note |
| --- | --- | --- |
| id | TEXT PK | |
| name | TEXT NOT NULL | "Contanti", "Carta"… |
| currency | TEXT NOT NULL | ISO 4217, es. `EUR` |
| initial_balance | INTEGER NOT NULL DEFAULT 0 | centesimi |
| icon | TEXT | nome icona |
| color | TEXT | hex |
| sort_order | INTEGER NOT NULL DEFAULT 0 | |
| archived | INTEGER NOT NULL DEFAULT 0 | boolean |
| created_at | INTEGER NOT NULL | |

### `categories`
| Colonna | Tipo | Note |
| --- | --- | --- |
| id | TEXT PK | |
| name | TEXT NOT NULL | |
| type | TEXT NOT NULL | `expense` \| `income` |
| icon | TEXT NOT NULL | |
| color | TEXT NOT NULL | hex |
| sort_order | INTEGER NOT NULL DEFAULT 0 | |
| archived | INTEGER NOT NULL DEFAULT 0 | |
| created_at | INTEGER NOT NULL | |

### `transactions`
| Colonna | Tipo | Note |
| --- | --- | --- |
| id | TEXT PK | |
| type | TEXT NOT NULL | `expense` \| `income` \| `transfer` |
| amount | INTEGER NOT NULL | sempre positivo, il segno dipende da `type` |
| account_id | TEXT NOT NULL FK → accounts | conto di origine |
| to_account_id | TEXT FK → accounts | solo per `transfer` |
| to_amount | INTEGER | per trasferimenti tra valute diverse |
| category_id | TEXT FK → categories | NULL per `transfer` |
| date | INTEGER NOT NULL | data della transazione |
| note | TEXT | |
| created_at | INTEGER NOT NULL | |
| updated_at | INTEGER NOT NULL | |

Indici: `(date)`, `(category_id, date)`, `(account_id, date)`.

### `budgets`
| Colonna | Tipo | Note |
| --- | --- | --- |
| id | TEXT PK | |
| category_id | TEXT FK → categories | NULL = budget globale |
| amount | INTEGER NOT NULL | |
| period | TEXT NOT NULL | `month` \| `week` \| `year` |
| created_at | INTEGER NOT NULL | |

### `settings`
| Colonna | Tipo | Note |
| --- | --- | --- |
| key | TEXT PK | `currency`, `theme`, `language`, `week_start`, `month_start_day`… |
| value | TEXT NOT NULL | JSON serializzato |

## Categorie di default (seed)

**Spese:** Cibo, Casa, Trasporti, Auto, Bollette, Salute, Svago, Ristoranti, Abbigliamento,
Regali, Sport, Animali, Igiene, Comunicazioni, Taxi, Altro.

**Entrate:** Stipendio, Risparmi, Regali, Altro.

## Query principali

- **Spese per categoria nel periodo** (ciambella):
  `SELECT category_id, SUM(amount) FROM transactions WHERE type='expense' AND date BETWEEN ? AND ? [AND account_id=?] GROUP BY category_id`
- **Saldo del periodo:** somma entrate − somma spese
- **Saldo conto:** `initial_balance + entrate − spese − trasferimenti in uscita + trasferimenti in entrata`
- **Totali giornalieri** per la lista: `GROUP BY date(date/1000, 'unixepoch', 'localtime')`

## Bozza schema Drizzle

```ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  initialBalance: integer('initial_balance').notNull().default(0),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    amount: integer('amount').notNull(),
    accountId: text('account_id').notNull().references(() => accounts.id),
    toAccountId: text('to_account_id').references(() => accounts.id),
    toAmount: integer('to_amount'),
    categoryId: text('category_id').references(() => categories.id),
    date: integer('date', { mode: 'timestamp_ms' }).notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('tx_date_idx').on(t.date),
    index('tx_category_date_idx').on(t.categoryId, t.date),
    index('tx_account_date_idx').on(t.accountId, t.date),
  ],
);
```
