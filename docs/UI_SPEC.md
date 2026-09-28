# Specifica UI

Riferimento di stile: Monefy — interfaccia pulita, colori vivaci per categoria, pochissimi tap.

## Navigazione

```
Root Stack
├── (tabs)
│   ├── Home            /                 ciambella + bottoni +/-
│   ├── Transazioni     /transactions     lista per giorno
│   ├── Statistiche     /stats            barre, trend, budget
│   └── Impostazioni    /settings
├── transaction/new     (modal)           ?type=expense|income&categoryId=
├── transaction/[id]    (modal)           modifica
├── category/index      lista categorie
├── category/[id]       modifica categoria
├── account/index       lista conti
└── account/[id]        modifica conto
```

## Home

```
┌───────────────────────────────┐
│ ☰  Tutti i conti ▾      🔍    │
│   ◀   Settembre 2026   ▶      │  ← swipe orizzontale cambia periodo
│                               │
│  🍔      🏠      🚌      🎁   │  ← icone categoria (tap = aggiungi spesa lì)
│      ╭───────────────╮        │
│  💊  │   Saldo       │  🎬    │
│      │  € 1.234,50   │        │  ← ciambella spese per categoria
│  👕  │ Spese € 765   │  ⚽    │
│      ╰───────────────╯        │
│  🐶      📱      🚕      …    │
│                               │
│ ┌────────────┐ ┌────────────┐ │
│ │  − SPESA   │ │ + ENTRATA  │ │  ← rosso / verde
│ └────────────┘ └────────────┘ │
└───────────────────────────────┘
```

- Tap sul centro della ciambella → alterna Saldo / Spese / Entrate
- Tap su uno spicchio → lista transazioni filtrata per categoria

## Inserimento transazione (modal)

```
┌───────────────────────────────┐
│ ✕   Spesa      💳 Carta ▾     │
│                               │
│               € 12,50         │  ← display importo / espressione
│ 📝 Aggiungi nota…             │
│ 📅 Oggi ▾                     │
│ ┌─────┬─────┬─────┬─────┐     │
│ │  7  │  8  │  9  │  ÷  │     │
│ │  4  │  5  │  6  │  ×  │     │
│ │  1  │  2  │  3  │  −  │     │
│ │  ,  │  0  │  ⌫  │  +  │     │
│ └─────┴─────┴─────┴─────┘     │
│ [ SCEGLI CATEGORIA → ]        │  ← se categoria già scelta: "SALVA"
└───────────────────────────────┘
```

- Se si arriva da un'icona categoria in home → categoria preselezionata, pulsante diventa "Salva"
- Altrimenti dopo l'importo si apre la griglia categorie; tap su categoria = salva

## Lista transazioni

- Header sticky per giorno: "Lun 28 settembre — −€ 45,20"
- Riga: icona categoria colorata, nome categoria, nota (grigio), conto, importo (rosso/verde)
- Swipe a sinistra → elimina (con "Annulla")
- Tap → modifica

## Design tokens

| Token     | Chiaro    | Scuro     |
| --------- | --------- | --------- |
| `bg`      | `#FFFFFF` | `#121212` |
| `surface` | `#F5F6F8` | `#1E1E1E` |
| `text`    | `#1A1A1A` | `#F2F2F2` |
| `expense` | `#E5484D` | `#FF6369` |
| `income`  | `#30A46C` | `#4CC38A` |
| `primary` | `#3E63DD` | `#849DFF` |

Spaziatura base 4pt (4, 8, 12, 16, 24, 32). Raggio bordi 12. Font di sistema.

Palette categorie: 16 colori saturi distinguibili, definiti in `src/theme/categoryColors.ts`.
