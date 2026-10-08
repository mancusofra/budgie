# Architecture

## Principles

1. **Offline-first and private:** all data stays on the device in SQLite. No account required.
2. **Fast entry:** the home screen is optimized for logging an expense in a couple of taps.
3. **One codebase:** iOS and Android from React Native with Expo, with no custom native code.
4. **End-to-end types:** DB schema → repositories → hooks → components, all in TypeScript.

## Why these choices

| Choice                               | Reason                                                                         | Alternatives considered                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Expo** (managed + dev build)       | Cloud builds, OTA updates, no Xcode/Android Studio needed to get started       | Bare React Native CLI: more configuration                                   |
| **Expo Router**                      | File-based routing, free deep links, simple modals and sheets                  | Plain React Navigation (Expo Router uses it under the hood)                 |
| **expo-sqlite + Drizzle**            | Real SQL for aggregations (sums by category/period), migrations, typed queries | WatermelonDB (more complex), AsyncStorage/MMKV (not suited to aggregations) |
| **Zustand**                          | Light UI state (selected period, filters); the real data lives in the DB       | Redux Toolkit (too much for this case)                                      |
| **Amounts in minor units (INTEGER)** | Avoids floating-point rounding errors                                          | `REAL` / float                                                              |
| **Charts on `react-native-svg`**     | Hand-drawn donut and bars: light, accessible, animated with Reanimated         | victory-native, gifted-charts (heavier, less control)                       |

## Layers

```
┌──────────────────────────────────────────────┐
│  src/app/*          Screens (Expo Router)    │  ← UI composition only
├──────────────────────────────────────────────┤
│  src/components/*   Reusable components      │  ← presentational, no DB access
├──────────────────────────────────────────────┤
│  src/features/*     Domain hooks             │  ← useCategoryTotals, useAddTransaction…
│  src/store/*        UI state (Zustand)       │
├──────────────────────────────────────────────┤
│  src/db/repositories  Drizzle queries        │  ← the only place that talks to the DB
│  src/db/schema.ts     Schema + migrations    │
├──────────────────────────────────────────────┤
│  expo-sqlite (local file budgie.db)          │
└──────────────────────────────────────────────┘
```

Rules:

- Screens do **not** import from `db/` directly; they use the hooks in `features/`.
- `lib/` contains only pure functions (easy to test): money formatting, periods, recurrence, CSV.
- Components in `components/ui` know nothing about the domain (no "transaction" in there).

## Data flow — example "add an expense"

1. The user taps **−** on the home screen → `router.push('/transaction/new?type=expense')`.
2. The keypad updates local state (an expression string, evaluated to minor units by
   `lib/expression.ts`).
3. Save → `useAddTransaction()` → `transactions.create()` → INSERT into SQLite.
4. Screens use live queries (`db/live-query.ts`): SQLite change notifications are batched and the
   affected queries re-run, so the home screen updates by itself.
5. `router.back()` + haptic feedback.

## Live queries

Drizzle's `useLiveQuery` is replaced by `db/live-query.ts`, which keeps the same API and adds:

- `useLiveQueryOn(query, tables)` to re-run a query when any of several tables changes (joins);
- batching of SQLite notifications (one per row), so bulk writes trigger a single refresh;
- `refreshLiveQueries()` after operations that SQLite does not report (e.g. `DELETE` without
  `WHERE` on reset and restore, synchronous transactions).

## Global UI state (Zustand)

`store/ui.ts` holds the selected period (`day | week | month | year | all | custom`), the account
filter and transient UI flags. Preferences (theme, currency, language, first day of the
week/month, stats layout…) are stored in the `settings` table and read through live queries.

## Testing

| Level       | Tool        | What                                                    |
| ----------- | ----------- | ------------------------------------------------------- |
| Unit        | Jest        | `lib/`: periods, keypad expressions, recurrence, colors |
| Integration | Jest + RNTL | repositories and `features/` hooks on in-memory SQLite  |
| E2E         | Maestro     | user flows on an emulator (planned)                     |

The CI fails if coverage of `lib/`, `db/` and `features/` drops below 70% (lines).

## Builds and environments

- **Development**: Expo Go or a development build, with `npx expo start`.
- **iOS beta**: the `.github/workflows/ios-unsigned-ipa.yml` workflow builds an unsigned `.ipa`
  (manual run or `ios-build-*` tag) that can be sideloaded with a free Apple ID.
- **Stores**: EAS Build / EAS Submit (phase 8; `eas.json` profiles not created yet).
