# Roadmap

Incremental phases. Each phase ends with a working app that can be tested on a device (Expo Go
or a development build).

| Phase | Goal                                    | Status      |
| ----- | --------------------------------------- | ----------- |
| 0     | Project setup and tooling               | done        |
| 1     | Database and data model                 | done        |
| 2     | Home screen + quick entry (core of app) | done        |
| 3     | Transactions list, editing, periods     | done        |
| 4     | Categories and accounts                 | done        |
| 5     | Stats and budgets                       | done        |
| 6     | Settings, currencies, backup/export     | done        |
| 7     | Polish, accessibility, tests            | mostly done |
| 8     | Store builds and release                | to do       |
| 9     | Post-MVP (optional)                     | in progress |

---

## Phase 0 — Project setup

- [x] Expo project with the TypeScript + Expo Router template, routes in `src/app/`
- [x] Template demo code removed
- [x] `@/*` → `src/*` alias in `tsconfig.json`
- [x] ESLint (`eslint-config-expo`) + Prettier + `lint-staged` / `husky` pre-commit
- [x] Core dependencies (expo-sqlite, Reanimated, Gesture Handler, react-native-svg, Drizzle,
      Zustand, date-fns, i18next…)
- [x] `app.json`: name, `slug`, `bundleIdentifier` (iOS), `package` (Android), icon, splash
- [x] GitHub Actions CI (lint + typecheck + tests)
- [ ] EAS configuration (`eas init`, `eas build:configure`)

## Phase 1 — Database and data model

- [x] Drizzle schema in `src/db/schema.ts` (see [`DATA_MODEL.md`](DATA_MODEL.md))
- [x] `drizzle.config.ts` (driver `expo`) and first migration
- [x] `src/db/client.ts`: open the DB + migrations in the root layout
- [x] `src/db/seed.ts`: default categories (expense and income) and a "Cash" account
- [x] Typed repositories: `transactions`, `categories`, `accounts`
- [x] Money helpers in `src/lib/money.ts`: amounts stored as **integers in minor units**
- [x] Unit tests for repositories and helpers (in-memory SQLite)

## Phase 2 — Home screen and quick entry ⭐

The feature that defines the experience: it has to be very fast.

- [x] Home: donut chart of spending by category for the current period
- [x] Balance (income − expenses) in the middle of the donut
- [x] Category icons around the chart: tapping one opens entry with that category preselected
- [x] Two large buttons at the bottom: **− Expense** (red) and **+ Income** (green)
- [x] Entry modal: custom keypad with `+ − × ÷`, category grid, account, date, optional note
- [ ] Save with haptic feedback and animation (haptics done, animation to do)
- [x] Period selector at the top (swipe left/right to change day/week/month…)
- [x] Reactive live queries so the home screen updates by itself

## Phase 3 — Transactions list and periods

- [x] "Transactions" tab grouped by category, search results grouped by day
- [x] Tap a category on the home screen → list opened on that category
- [x] Edit / delete (full swipe to delete with "Undo" in a snackbar)
- [x] Search by note and category
- [x] Periods: day, week, month, year, all time, custom range
- [x] "First day of the week" and "month starts on day" settings (for people paid on the 27th)

## Phase 4 — Categories and accounts

- [x] Categories: name, icon, color, type (expense/income), drag & drop reordering
- [x] Archive a category in use, delete one that is not
- [x] Accounts: name, currency, initial balance, icon, color; archive, delete, permanently delete
      an archived account with its transactions
- [x] Transfers between accounts (not counted as expense/income), with received amount for
      different currencies
- [x] Global filter "all accounts" / single account
- [x] With accounts in different currencies "All accounts" sums only those in the main currency
      (exchange rates: phase 9)

## Phase 5 — Stats and budgets

- [x] "Stats" tab: spending bar chart by day/month, trend vs previous period
- [x] Category ranking with percentages
- [x] Monthly overall and per-category budgets with progress bars, inherited month to month
- [x] Visual warning at 80% / 100% of the budget (icon + label)
- [x] Sections can be reordered and hidden

## Phase 6 — Settings, currencies, backup

- [x] Main currency, number format by locale
- [x] Theme: system / light / dark
- [x] Language: automatic / English / Italian (i18next, strings in `src/i18n/locales`)
- [x] CSV or JSON export by date range (via `expo-sharing`; `;` and decimal comma for Italian)
- [x] Full backup (JSON) and restore
- [x] App lock with biometrics (`expo-local-authentication`)
- [x] Version number and release notes at the bottom of Settings

## Phase 7 — Polish and quality

- [x] Accessibility: screen reader labels, headings, AA contrast checked by a test, dynamic type
      (tested at 2×)
- [x] Empty states and a 3-screen onboarding
- [x] Performance with 10,000+ transactions: SQL indexes, batched live query notifications, paged
      category lists, demo data generator in the developer menu
- [ ] Maestro E2E tests for the main flows (add, edit, delete, change period)
- [x] Unit test coverage ≥ 70% on `lib/`, `db/`, `features/` (threshold enforced in CI)
- [ ] Crash reporting (Sentry or similar), to be decided given the no-cloud promise

## Phase 8 — Builds and release

- [x] Final icon and launch screen
- [ ] Store screenshots
- [ ] `eas build --platform all --profile production`
- [ ] TestFlight (iOS) and internal testing (Google Play)
- [ ] Privacy policy (required even though data stays on the device)
- [ ] `eas submit` to the App Store and Google Play
- [ ] OTA updates with `expo-updates` for quick fixes

## Phase 9 — Post-MVP (ideas)

- [x] Recurring transactions (subscriptions, rent, salary); reminders with notifications still
      to do
- [ ] Automatic backup to Google Drive, then optional sync between devices
- [ ] Web version / PWA
- [ ] Home screen widgets on iOS/Android for quick entry
- [ ] Automatic exchange rates
- [ ] Receipt photos
- [ ] Multiple tags besides the category

---

## Working conventions

- **Branches:** `main` is protected; feature branches `feat/<name>`, `fix/<name>`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`,
  `chore:`…).
- **Pull requests:** green CI required, reviewed by the maintainer (see
  [CONTRIBUTING.md](../CONTRIBUTING.md)).
