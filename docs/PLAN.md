# Piano di sviluppo

Roadmap in fasi incrementali. Ogni fase termina con un'app funzionante e testabile
su dispositivo (Expo Go o development build). Le stime assumono 1 sviluppatore part-time.

| Fase | Obiettivo                                  | Stima       |
| ---- | ------------------------------------------ | ----------- |
| 0    | Setup progetto e tooling                   | 1–2 giorni  |
| 1    | Database e modello dati                    | 2–3 giorni  |
| 2    | Home + inserimento rapido (cuore dell'app) | 1 settimana |
| 3    | Lista transazioni, modifica, periodi       | 4–5 giorni  |
| 4    | Categorie e conti                          | 4–5 giorni  |
| 5    | Statistiche e budget                       | 1 settimana |
| 6    | Impostazioni, valute, backup/CSV           | 4–5 giorni  |
| 7    | Rifinitura, accessibilità, test            | 1 settimana |
| 8    | Build e pubblicazione store                | 3–5 giorni  |
| 9    | Post-MVP (opzionale)                       | —           |

---

## Fase 0 — Setup progetto

- [x] Creare il progetto Expo con template TypeScript + Expo Router
  ```bash
  npx create-expo-app@latest . --template default
  ```
  Spostare la cartella `app/` in `src/app/` (Expo Router la supporta nativamente).
- [x] Rimuovere il codice demo del template
- [x] Configurare alias `@/*` → `src/*` in `tsconfig.json`
- [x] ESLint (`eslint-config-expo`) + Prettier + `lint-staged` / `husky` pre-commit
- [x] Installare le dipendenze core:
  ```bash
  npx expo install expo-sqlite react-native-reanimated react-native-gesture-handler \
    react-native-svg react-native-safe-area-context expo-localization expo-haptics \
    expo-file-system expo-sharing expo-document-picker
  npm i drizzle-orm zustand date-fns i18next react-i18next
  npm i -D drizzle-kit babel-plugin-inline-import jest-expo @testing-library/react-native
  ```
- [x] Configurare `app.json`: nome, `slug`, `bundleIdentifier` (iOS), `package` (Android), icona, splash
- [x] Attivare la CI GitHub Actions (lint + typecheck + test) — già predisposta in `.github/workflows/ci.yml`
- [ ] Configurare EAS: `npx eas-cli init` e `eas build:configure`

**Definition of done:** `npx expo start` apre una schermata vuota con le 4 tab; la CI è verde.

## Fase 1 — Database e modello dati

- [x] Definire lo schema Drizzle in `src/db/schema.ts` (vedi [`DATA_MODEL.md`](DATA_MODEL.md))
- [x] Configurare `drizzle.config.ts` (driver `expo`) e generare la prima migrazione
- [x] `src/db/client.ts`: apertura DB + `useMigrations` nel root layout
- [x] `src/db/seed.ts`: categorie di default (spesa ed entrata) e un conto "Contanti"
- [x] Repository tipizzati: `transactions`, `categories`, `accounts`
- [x] Utility denaro in `src/lib/money.ts`: importi salvati come **interi in centesimi** (mai float)
- [x] Unit test per repository e utility (SQLite in-memory o mock)

**DoD:** al primo avvio il DB viene creato e popolato; i test dei repository passano.

## Fase 2 — Home e inserimento rapido ⭐

È la feature che definisce l'esperienza "tipo Monefy": deve essere velocissima.

- [x] Home: grafico a ciambella con le spese per categoria del periodo corrente
- [x] Al centro della ciambella: saldo (entrate − spese) del periodo
- [x] Icone categoria attorno/sotto al grafico: tap su una categoria → apre direttamente l'inserimento con quella categoria preselezionata
- [x] Due grandi pulsanti in basso: **− Spesa** (rosso) e **+ Entrata** (verde)
- [x] Schermata/modale di inserimento:
  - [x] Tastierino numerico custom (con operazioni `+ − × ÷` come Monefy)
  - [x] Selettore categoria a griglia
  - [x] Selettore conto, data (default oggi), nota opzionale
  - [ ] Salvataggio con feedback aptico e animazione (aptico fatto, animazione da fare)
- [x] Selettore periodo in alto (swipe sinistra/destra per cambiare giorno/settimana/mese…)
- [x] Hook reattivo `useLiveQuery` (Drizzle) per aggiornare la home automaticamente

**DoD:** si inserisce una spesa in ≤ 3 tap e la ciambella si aggiorna in tempo reale.

## Fase 3 — Lista transazioni e periodi

- [x] Tab "Transazioni": lista raggruppata per giorno con totale giornaliero (`SectionList`; `FlashList` se servirà per le prestazioni)
- [x] Tap su categoria nella home → lista filtrata per quella categoria
- [x] Dettaglio / modifica / eliminazione (swipe-to-delete con undo tramite snackbar)
- [x] Ricerca per nota e filtro per categoria (filtro per conto: con la gestione conti, Fase 4)
- [x] Periodi: giorno, settimana, mese, anno, tutto, intervallo personalizzato
- [x] Impostazione "primo giorno della settimana" e "giorno di inizio mese" (per chi riceve lo stipendio il 27)

## Fase 4 — Categorie e conti

- [x] CRUD categorie: nome, icona (set di icone vettoriali), colore, tipo (spesa/entrata)
- [x] Riordino categorie con drag & drop (anche per i conti)
- [x] Archiviazione categoria (non cancellazione se ha transazioni); eliminazione se non usata
- [x] CRUD conti: nome, valuta, saldo iniziale, icona, colore; archiviazione/eliminazione
- [x] Trasferimenti tra conti (non contano come spesa/entrata), con importo accreditato per valute diverse
- [x] Filtro globale "tutti i conti" / conto singolo
- [x] Totali con conti in valute diverse: "Tutti i conti" somma solo quelli nella valuta principale (conversione con tassi di cambio: Fase 9)

## Fase 5 — Statistiche e budget

- [x] Tab "Statistiche": grafico a barre spese per giorno/mese, trend vs periodo precedente
- [x] Classifica categorie con percentuale
- [x] Budget mensile globale e per categoria con barra di avanzamento
- [x] Avviso visivo al superamento dell'80% / 100% del budget (icona + etichetta)

## Fase 6 — Impostazioni, valute, backup

- [x] Valuta principale, formato numeri secondo locale (con "Tutti i conti" solo i conti nella valuta principale)
- [x] Tema: sistema / chiaro / scuro
- [x] Lingua: automatica / IT / EN (i18next, testi in `src/i18n/locales`)
- [x] Esportazione CSV o JSON con intervallo di date (con `expo-sharing`; `;` e virgola decimale per l'italiano)
- [x] Backup completo (JSON) e ripristino (`File.pickFileAsync` di expo-file-system)
- [x] Blocco app con riconoscimento biometrico (`expo-local-authentication`) — Face ID non provabile in Expo Go su iOS

## Fase 7 — Rifinitura e qualità

- [ ] Accessibilità: label per screen reader, contrasto, dimensioni font dinamiche
- [x] Empty state e onboarding di 3 schermate (riappare dopo "Azzera dati")
- [x] Performance: test con 10.000+ transazioni, indici SQL (notifiche delle live query raggruppate, lista per categoria a pagine, dati demo in Sviluppo)
- [ ] Test E2E con Maestro per i flussi principali (aggiungi spesa, modifica, elimina, cambio periodo)
- [ ] Copertura unit test ≥ 70% su `lib/`, `db/`, `features/`
- [ ] Sentry (`@sentry/react-native`) per crash reporting

## Fase 8 — Build e pubblicazione

- [ ] Icona e splash definitivi, screenshot per gli store
- [ ] `eas build --platform all --profile production`
- [ ] TestFlight (iOS) e Internal testing (Google Play)
- [ ] Privacy policy (anche se i dati restano sul dispositivo è richiesta)
- [ ] `eas submit` su App Store e Google Play
- [ ] OTA update con `expo-updates` per fix rapidi

## Fase 9 — Post-MVP (idee)

- Transazioni ricorrenti (abbonamenti, affitto) con promemoria
- Sync cloud opzionale tra dispositivi (Supabase o iCloud/Google Drive per i backup)
- Widget home screen iOS/Android per inserimento rapido
- Tassi di cambio automatici
- Allegare foto dello scontrino
- Tag multipli oltre alla categoria

---

## Convenzioni di lavoro

- **Branch:** `main` protetto; feature branch `feat/<nome>`, `fix/<nome>`
- **Commit:** [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`…)
- **PR:** una per task della checklist, CI verde obbligatoria
- **Issue:** ogni fase diventa una milestone su GitHub, ogni checkbox un'issue
