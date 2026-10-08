# Budgie 🦜

App mobile (iOS + Android) per la gestione delle spese personali, ispirata a **Monefy**:
inserimento di una spesa in 2 tap, grafico a ciambella per categoria al centro della home,
tutto offline-first.

> Stato: **Fasi 0–7 completate, più le transazioni ricorrenti** — in QA prima del merge.
> Vedi [`docs/PLAN.md`](docs/PLAN.md) per la roadmap.

## Funzionalità principali (MVP)

- ➕ / ➖ Aggiunta rapida di spese ed entrate con tastierino numerico dedicato
- 🍩 Home con grafico a ciambella per categoria e saldo del periodo
- 📅 Filtro per periodo: giorno, settimana, mese, anno, intervallo personalizzato
- 🏷️ Categorie personalizzabili (icona + colore)
- 💳 Più conti (contanti, carta, banca) con trasferimenti tra conti
- 📋 Lista transazioni raggruppate per giorno, modifica e cancellazione
- 🌍 Multi-valuta (valuta principale + valuta per conto)
- 🌙 Tema chiaro / scuro, lingua IT / EN
- 💾 Backup / ripristino locale ed esportazione CSV

## Stack tecnologico

| Ambito          | Scelta                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Framework       | [Expo](https://expo.dev) (React Native) + TypeScript                   |
| Navigazione     | Expo Router (file-based)                                               |
| Database locale | `expo-sqlite` + [Drizzle ORM](https://orm.drizzle.team)                |
| Stato UI        | Zustand                                                                |
| Grafici         | `react-native-svg` + `victory-native` (o `react-native-gifted-charts`) |
| Animazioni      | `react-native-reanimated` + `react-native-gesture-handler`             |
| i18n            | `i18next` + `react-i18next` + `expo-localization`                      |
| Date            | `date-fns`                                                             |
| Test            | Jest + React Native Testing Library, Maestro per E2E                   |
| Build / release | EAS Build + EAS Submit                                                 |

Dettagli e motivazioni in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Struttura del progetto

```
budgie/
├── src/
│   ├── app/                    # Schermate (Expo Router, file-based routing)
│   │   ├── _layout.tsx         # Root layout: provider, tema, DB, i18n
│   │   ├── (tabs)/             # Tab principali
│   │   │   ├── index.tsx       # Home: ciambella + bottoni +/-
│   │   │   ├── transactions.tsx
│   │   │   ├── stats.tsx
│   │   │   └── settings.tsx
│   │   ├── transaction/        # [id].tsx, new.tsx (modal)
│   │   ├── category/           # gestione categorie
│   │   └── account/            # gestione conti
│   ├── components/
│   │   ├── ui/                 # Button, Text, Card, Sheet, Keypad…
│   │   ├── charts/             # DonutChart, BarChart
│   │   └── transactions/       # TransactionRow, DayGroupHeader…
│   ├── features/               # Logica di dominio per feature (hooks, servizi)
│   │   ├── transactions/
│   │   ├── categories/
│   │   ├── accounts/
│   │   ├── budgets/
│   │   ├── stats/
│   │   └── settings/
│   ├── db/
│   │   ├── schema.ts           # Schema Drizzle
│   │   ├── client.ts           # Connessione SQLite
│   │   ├── seed.ts             # Categorie/conti di default
│   │   ├── migrations/         # Generate da drizzle-kit
│   │   └── repositories/       # Query tipizzate per entità
│   ├── store/                  # Zustand (periodo selezionato, filtri, preferenze)
│   ├── hooks/                  # Hook generici (useTheme, useCurrency…)
│   ├── lib/                    # Utility pure: money, date, csv, id
│   ├── i18n/                   # Setup i18next + locales/it.json, en.json
│   ├── theme/                  # Colori, spaziature, tipografia
│   └── types/                  # Tipi condivisi
├── assets/                     # Icone app, splash, font
├── __tests__/                  # Unit test
├── e2e/                        # Flussi Maestro
├── docs/                       # Piano, architettura, modello dati
└── .github/workflows/          # CI
```

## Avvio

Requisiti: Node.js 22 (es. `nvm install 22`) e l'app **Expo Go** sul telefono.

```bash
npm install
npx expo start      # scansiona il QR code con Expo Go
```

Comandi utili:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Jest
npx expo-doctor     # verifica dipendenze/config Expo
```

## Documentazione

- [`docs/PLAN.md`](docs/PLAN.md) — roadmap per fasi con checklist
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — scelte tecniche e flusso dei dati
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — schema del database
- [`docs/UI_SPEC.md`](docs/UI_SPEC.md) — schermate e interazioni

## Licenza

Copyright (C) 2026 Francesco Mancuso

Budgie è software libero: puoi ridistribuirlo e/o modificarlo secondo i termini
della [GNU General Public License versione 3](LICENSE) (GPL-3.0-only), come
pubblicata dalla Free Software Foundation.

In breve: puoi usare, studiare, modificare e condividere il codice; se distribuisci
una versione modificata devi renderne disponibile il codice sorgente con la stessa
licenza. Il programma è fornito **senza alcuna garanzia**: vedi il file
[`LICENSE`](LICENSE) per i termini completi.
