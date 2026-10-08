<p align="center">
  <img src="assets/images/icon.png" width="96" alt="" />
</p>

<h1 align="center">Budgie</h1>

<p align="center">
  App per le spese personali, semplice e veloce: una spesa in due tocchi,<br />
  tutto sul telefono, niente account.
</p>

<p align="center">
  <img src="docs/screenshots/home.png" width="190" alt="Home con il grafico a ciambella per categoria" />
  <img src="docs/screenshots/transactions.png" width="190" alt="Lista delle transazioni raggruppate per categoria" />
  <img src="docs/screenshots/stats.png" width="190" alt="Statistiche con le spese per categoria" />
  <img src="docs/screenshots/settings.png" width="190" alt="Impostazioni" />
</p>

> **Stato: beta (0.2.0).** L'app è in prova su iOS e Android; non è ancora negli store.

## Funzionalità

- **Inserimento rapido**: tocca una categoria attorno alla ciambella, digita l'importo, fatto. Il
  tastierino fa anche i calcoli (`12+3×2`).
- **Home a ciambella** con le spese per categoria e il saldo del periodo.
- **Periodi**: giorno, settimana, mese, anno, sempre o intervallo personalizzato; primo giorno della
  settimana e giorno di inizio del mese configurabili (per chi riceve lo stipendio il 27).
- **Conti** multipli, anche in valute diverse, con trasferimenti.
- **Categorie** personalizzabili (icona, colore, ordine), archiviabili.
- **Transazioni ricorrenti**: affitto, abbonamenti, stipendio vengono registrati da soli.
- **Statistiche** con andamento, confronto con il periodo precedente, classifica per categoria e
  **budget** mensili con avvisi; sezioni riordinabili.
- **Dati tuoi**: tutto resta sul dispositivo. Backup e ripristino in JSON, esportazione CSV o JSON
  per intervallo di date, blocco con riconoscimento biometrico.
- Tema chiaro e scuro, italiano e inglese, accessibilità (screen reader, caratteri grandi,
  contrasto AA).

## Tecnologie

[Expo](https://expo.dev) SDK 57 (React Native) con TypeScript ed Expo Router · SQLite locale con
[Drizzle ORM](https://orm.drizzle.team) · Zustand · Reanimated e Gesture Handler · grafici su
`react-native-svg` · i18next · Jest e React Native Testing Library.

Approfondimenti: [architettura](docs/ARCHITECTURE.md), [modello dati](docs/DATA_MODEL.md),
[interfaccia](docs/UI_SPEC.md), [roadmap](docs/PLAN.md).

## Provarla in sviluppo

Servono [Node.js 22](https://nodejs.org) e l'app **Expo Go** sul telefono (oppure un emulatore
Android / simulatore iOS).

```bash
git clone https://github.com/mancusofra/budgie.git
cd budgie
npm install
npx expo start        # poi scansiona il QR code con Expo Go
```

Controlli usati anche dalla CI:

```bash
npm run lint
npm run typecheck
npm test              # oppure npm run test:coverage
npx expo-doctor
```

## Struttura

```
src/
├── app/          schermate e navigazione (Expo Router)
├── components/   componenti UI, grafici, righe delle transazioni
├── features/     logica per area: transazioni, conti, categorie, statistiche, ricorrenti…
├── db/           schema Drizzle, migrazioni, repository, backup
├── lib/          funzioni pure: denaro, periodi, ricorrenze, CSV, colori
├── i18n/         traduzioni (it, en)
├── store/        stato dell'interfaccia (Zustand)
└── theme/        colori e misure
__tests__/        test (Jest)
docs/             documentazione e screenshot
```

## Contribuire

Segnalazioni e proposte sono benvenute: leggi [CONTRIBUTING.md](CONTRIBUTING.md). Le modifiche
arrivano solo tramite Pull Request e vengono riviste dal maintainer prima di essere unite. Per le
vulnerabilità di sicurezza vedi [SECURITY.md](SECURITY.md).

## Licenza

Copyright (C) 2026 Francesco Mancuso

Budgie è software libero: puoi ridistribuirlo e/o modificarlo secondo i termini
della [GNU General Public License versione 3](LICENSE) (GPL-3.0-only), come
pubblicata dalla Free Software Foundation.

In breve: puoi usare, studiare, modificare e condividere il codice; se distribuisci
una versione modificata devi renderne disponibile il codice sorgente con la stessa
licenza. Il programma è fornito **senza alcuna garanzia**: vedi il file
[`LICENSE`](LICENSE) per i termini completi.

**Nome e grafica sono esclusi dalla GPL.** Il nome "Budgie" e il pappagallino
(icone, schermata di avvio, file in `assets/`) sono rilasciati con licenza
[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.it): chi
distribuisce una versione modificata deve usare un nome e un'icona propri. Dettagli in
[`assets/LICENSE.md`](assets/LICENSE.md).
