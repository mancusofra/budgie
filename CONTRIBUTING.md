# Contribuire a Budgie

Grazie dell'interesse! Budgie è un progetto personale aperto: il codice è pubblico e i contributi
sono benvenuti, ma ogni modifica viene **rivista e approvata dal maintainer** prima di entrare.

## Prima di scrivere codice

- **Bug**: apri una issue con il modello "Segnala un bug".
- **Idee e funzionalità nuove**: apri prima una issue "Proponi un'idea" e aspetta un riscontro:
  non tutte le proposte rientrano negli obiettivi dell'app (semplice, offline, senza account) e
  così eviti lavoro che potrebbe non essere accettato.
- **Sicurezza**: segui [SECURITY.md](SECURITY.md), non aprire issue pubbliche.

## Flusso di lavoro

1. Fai un **fork** del repository e crea un branch dal `main`:
   `feat/<nome>` per le funzionalità, `fix/<nome>` per le correzioni.
2. Installa e avvia: `npm install`, poi `npx expo start` (vedi il [README](README.md)).
3. Fai le modifiche con commit piccoli e descrittivi in stile
   [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…).
4. Prima di aprire la PR controlla che passino:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
5. Apri una **Pull Request verso `main`** compilando il modello. La CI parte dopo l'approvazione
   del maintainer; potrebbero esserti chieste modifiche prima del merge.

## Linee guida

- Segui lo stile del codice esistente; Prettier ed ESLint girano anche al commit.
- Logica nuova = test nuovi (`__tests__/`). Il database si prova su SQLite in memoria
  (`test-utils/db.ts`).
- Ogni testo visibile va in `src/i18n/locales/it.json` **ed** `en.json`.
- Database: modifica `src/db/schema.ts` e genera una nuova migrazione con `npm run db:generate`;
  non modificare mai migrazioni esistenti.
- Expo cambia spesso: prima di usare un'API controlla la documentazione della versione in uso
  (SDK 57).
- Interfaccia: animazioni sobrie (250 ms), contrasto AA (c'è un test), etichette per lo screen
  reader.

## Licenza dei contributi

Inviando una Pull Request accetti che il tuo contributo sia rilasciato con la licenza del
progetto, la [GPL-3.0-only](LICENSE). Nome e grafica di Budgie hanno una licenza a parte
([assets/LICENSE.md](assets/LICENSE.md)): non proporre modifiche all'icona o al marchio.

## Comportamento

Partecipando accetti il [Codice di condotta](CODE_OF_CONDUCT.md).
