# Architettura

## Principi

1. **Offline-first e privacy:** tutti i dati restano sul dispositivo in SQLite. Nessun account richiesto.
2. **Velocità di inserimento:** la home è ottimizzata per aggiungere una spesa in pochi tap.
3. **Un solo codebase:** iOS e Android da React Native con Expo, senza codice nativo custom (fino a prova contraria).
4. **Tipi end-to-end:** schema DB → repository → hook → componenti, tutto TypeScript.

## Perché queste scelte

| Scelta                             | Motivazione                                                                                  | Alternative scartate                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Expo** (managed + dev build)     | Build cloud con EAS, OTA update, niente Xcode/Android Studio obbligatori all'inizio          | React Native CLI "bare": più configurazione                                  |
| **Expo Router**                    | Routing file-based, deep link gratis, modali semplici                                        | React Navigation "puro" (Expo Router lo usa sotto)                           |
| **expo-sqlite + Drizzle**          | SQL vero per aggregazioni (somme per categoria/periodo), migrazioni, `useLiveQuery` reattivo | WatermelonDB (più complesso), AsyncStorage/MMKV (non adatti ad aggregazioni) |
| **Zustand**                        | Stato UI leggero (periodo selezionato, filtri); i dati veri stanno nel DB                    | Redux Toolkit (troppo per questo caso)                                       |
| **Importi in centesimi (INTEGER)** | Evita errori di arrotondamento dei float                                                     | `REAL` / float                                                               |
| **Grafici su `react-native-svg`**  | Ciambella e barre disegnate a mano: leggere, accessibili, animate con Reanimated             | victory-native, gifted-charts (più pesanti, meno controllo)                  |

## Livelli

```
┌─────────────────────────────────────────────┐
│  src/app/*          Schermate (Expo Router) │  ← solo composizione UI
├─────────────────────────────────────────────┤
│  src/components/*   Componenti riutilizzabili│  ← presentazionali, senza accesso al DB
├─────────────────────────────────────────────┤
│  src/features/*     Hook di dominio          │  ← useExpensesByCategory, useAddTransaction…
│  src/store/*        Stato UI (Zustand)       │
├─────────────────────────────────────────────┤
│  src/db/repositories  Query Drizzle          │  ← unico punto che parla col DB
│  src/db/schema.ts     Schema + migrazioni    │
├─────────────────────────────────────────────┤
│  expo-sqlite (file locale budgie.db)         │
└─────────────────────────────────────────────┘
```

Regole:

- Le schermate **non** importano da `db/` direttamente, ma usano gli hook in `features/`.
- `lib/` contiene solo funzioni pure (facili da testare): formattazione denaro, calcolo periodi, CSV.
- I componenti in `components/ui` non conoscono il dominio (niente "transaction" lì dentro).

## Flusso dei dati — esempio "aggiungi spesa"

1. L'utente preme **−** in home → `router.push('/transaction/new?type=expense')`
2. Il tastierino aggiorna uno stato locale (stringa espressione → valutata in centesimi da `lib/money.ts`)
3. Salva → `useAddTransaction()` → `transactionsRepo.create()` → INSERT in SQLite
4. La home usa `useLiveQuery` su `transactionsRepo.sumByCategory(period)` → si ri-renderizza da sola
5. `router.back()` + feedback aptico

## Stato globale (Zustand)

```ts
type UIState = {
  period: {
    kind: 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';
    anchor: Date;
    from?: Date;
    to?: Date;
  };
  accountFilter: string | 'all';
  setPeriod(p: UIState['period']): void;
  shiftPeriod(direction: -1 | 1): void;
  setAccountFilter(id: string | 'all'): void;
};
```

Le preferenze (tema, valuta, lingua) sono salvate nella tabella `settings` del DB e caricate
all'avvio in uno store dedicato.

## Testing

| Livello      | Strumento   | Cosa                                         |
| ------------ | ----------- | -------------------------------------------- |
| Unit         | Jest        | `lib/`, calcolo periodi, parsing tastierino  |
| Integrazione | Jest + RNTL | hook `features/` e componenti con DB di test |
| E2E          | Maestro     | flussi utente su emulatore (previsto)        |

## Build e ambienti

- **Sviluppo**: Expo Go o development build, con `npx expo start`.
- **Beta iOS**: il workflow `.github/workflows/ios-unsigned-ipa.yml` compila un `.ipa` non firmato
  (avvio manuale o tag `ios-build-*`), installabile con un Apple ID gratuito tramite sideload.
- **Store**: EAS Build / EAS Submit (Fase 8, profili `eas.json` ancora da creare).
