# Sistema Commissioning - Analisi e Specifiche

## Panoramica
Il **Commissioning** è un sistema di incentivazione economica legato alle vendite. I prodotti venduti da listino generano commissioni variabili che beneficiano sia le risorse/venditori che i dealer/imprenditori.

---

## Architettura Gare

### Distinzione Fondamentale

| Tipo Gara | Creatore | Target | Driver Utilizzabili |
|-----------|----------|--------|---------------------|
| **Gare Brand** | WindTre (Brand) | Negozio / Ragione Sociale / Gruppo | Solo **Driver Brand** |
| **Gare Risorse** | Imprenditore (Dealer) | Singola Risorsa | **Driver Brand + Driver Custom** |

> **Nota UI/UX**: Le due tipologie sono distinte a livello interfaccia ma utilizzano gli **stessi configuratori**.

### 1. Gare Brand (WindTre → Dealer)
Gare create dal brand verso i dealer con target:
- **Negozio singolo** (store)
- **Ragione Sociale** (legal entity)
- **Gruppo** (più ragioni sociali)

### 2. Gare Imprenditore (Dealer → Risorse)
Gare create dall'imprenditore verso le proprie risorse/venditori:
- **Target**: Singola risorsa
- Possono usare driver brand E driver custom

---

## Anatomia Completa di una Gara

```
GARA
├── VALIDITÀ
│   ├── Data Inizio
│   └── Data Fine
│
├── TIPO
│   ├── Brand (WindTre → Dealer)
│   └── Risorse (Dealer → Venditore)
│
├── TARGET
│   ├── Store (singolo negozio)
│   ├── Legal Entity (ragione sociale)
│   ├── Gruppo (più legal entities)
│   └── Risorsa (singolo venditore)
│
├── DRIVER
│   ├── Brand (obbligatori per gare brand)
│   └── Custom (solo gare risorse)
│
├── PRODOTTI/LISTINI
│   └── Quali prodotti/listini triggerano la gara
│
├── VARIABILI (da prodotto/listino)
│   ├── Valenza
│   ├── Gettone Contrattuale
│   ├── Gettone Gara
│   └── Canone Canvass
│
├── CONFIGURATORI (UI dinamica ciascuno)
│   ├── Soglie
│   ├── Gettone
│   └── % Fatturato
│
├── PALETTI (condizioni)
│   ├── Produttività Negozio
│   ├── Produttività Multi-Negozio
│   └── Produttività Risorsa
│
└── STATO
    ├── Bozza
    ├── Attiva
    ├── Conclusa
    └── Annullata
```

---

## Variabili Configuratori (da Prodotto/Listino)

Le variabili utilizzabili nei configuratori sono legate al prodotto/listino:

| # | Variabile | Descrizione |
|---|-----------|-------------|
| 1 | **Valenza** | Valore/peso del prodotto nel contesto gara |
| 2 | **Gettone Contrattuale** | Importo fisso definito da contratto |
| 3 | **Gettone Gara** | Importo fisso specifico per questa gara |
| 4 | **Canone Offerta Canvass** | Canone dell'offerta canvass |

---

## Pacchetto Valenze

### Definizione

Il **Pacchetto Valenze** è l'entità che assegna i valori delle variabili ai prodotti/listini. Viene richiamato dai configuratori per calcolare le commissioni.

### Struttura Pacchetto Valenze

```
Pacchetto Valenze "Q4 2025"
├── ORIGINE
│   ├── Brand (pushato da WindTre)
│   └── Custom (creato dal tenant)
│
├── SCOPE (dove si applica)
│   ├── Overall Canale + Overall Cluster
│   └── OPPURE Canale/Cluster specifici (multiselect)
│
├── VALIDITÀ
│   ├── Data Inizio
│   └── Data Fine
│
├── LISTINI INCLUSI
│   ├── Listino Retail Q4 (Driver: SIM)
│   └── Listino Business Q4 (Driver: Fisso)
│
└── PRODOTTI VALORIZZATI
    ├── SIM Gold → Valenza: 5, Gettone C.: €10, Gettone G.: €8, Canone: €29
    ├── SIM Silver → Valenza: 3, Gettone C.: €6, Gettone G.: €5, Canone: €19
    └── Fibra Home → Valenza: 8, Gettone C.: €25, Gettone G.: €20, Canone: €35
```

### Relazione con Configuratori

```
GARA
├── Configuratore (es. Soglie)
│   └── Richiama → Pacchetto Valenze
│       └── Legge → Valori variabili per prodotto/listino
└── Calcola commissioning usando i valori del pacchetto
```

### UI Wizard Creazione Pacchetto Valenze

**STEP 1: Setup Base**
```
├── Nome pacchetto
├── Origine: Brand / Custom
├── Scope: Canale (multiselect) + Cluster (multiselect)
└── Data validità: Inizio → Fine
```

**STEP 2: Selezione Listini**
```
├── Filtri: Driver | Tipo Prodotto
├── Lista listini disponibili (checkbox multiselect)
└── Preview: "Hai selezionato 3 listini, 127 prodotti"
```

**STEP 3: Valorizzazione Prodotti**
```
├── Vista: Griglia raggruppata per Listino → Driver → Tipo
│
├── AZIONI BULK (per semplificare):
│   ├── "Applica a tutti": Valenza=X a tutti i prodotti
│   ├── "Applica per tipo": Tutti i "SIM" = Valenza 5
│   ├── "Applica per driver": Tutti del driver X = Gettone €10
│   └── "Modifica singolo": Click su riga → edit valori
│
└── Tabella:
    | Prodotto | Listino | Driver | Tipo | Valenza | Gettone C. | Gettone G. | Canone |
    |----------|---------|--------|------|---------|------------|------------|--------|
    | SIM Gold | Retail  | SIM    | Voce | [input] | [input]    | [input]    | [input]|
```

**STEP 4: Riepilogo e Conferma**
```
└── Preview pacchetto completo → Salva
```

### Gestione Aggiornamento Listino

Quando un listino viene aggiornato (nuovi prodotti o modifiche):

| Evento | Comportamento |
|--------|---------------|
| **Nuovo prodotto** | Ereditato nel pacchetto SENZA valori (da valorizzare) |
| **Modifica prodotto** | Notifica che il prodotto è cambiato |
| **Valori variabili** | NON ereditati, sempre da inserire manualmente |

**Sistema di Notifica:**
```
⚠️ Alert: "3 prodotti non valorizzati nel pacchetto Q4"
   └── Click → Apre Step 3 con solo i prodotti da valorizzare
```

### Dashboard Gestione Pacchetti Valenze

```
Dashboard Pacchetti Valenze
├── Lista pacchetti (attivi, scaduti, bozze)
├── Filtri: Origine | Canale | Cluster | Stato
├── Alert prodotti non valorizzati
└── Azioni: Crea | Modifica | Duplica | Archivia
```

---

## Configuratori

I configuratori definiscono le regole del "gioco" della gara. Sono **mixabili** tra loro.

### Configuratori Identificati

| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| **Soglie** | Progressive o regressive | Vendi 10 = €100, Vendi 20 = €250 |
| **Gettone** | Pay-per-item fisso | €5 per ogni SIM venduta |
| **% Fatturato** | Percentuale sul ricavato | 3% del fatturato prodotti X |

### Altri Configuratori (da valutare)
- [ ] Configuratore a obiettivo (raggiungi X = premio Y)
- [ ] Configuratore mix prodotti (vendi A + B = bonus)
- [ ] Configuratore tempo (primi X a raggiungere = premio extra)
- [ ] Configuratore ranking (top 3 = premi diversi)

---

## UI/UX Dinamica Configuratori

### Principio: Componenti Modulari

Ogni configuratore ha la propria **UI/UX dedicata**. La dashboard della gara si **compone dinamicamente** in base ai configuratori attivi.

### Widget per Configuratore

| Configuratore | Widget UI | Visualizzazione |
|---------------|-----------|-----------------|
| **Soglie** | Grafico a barre progressive | Soglie evidenziate, progress bar verso prossima soglia |
| **Gettone** | Counter animato | Totale pezzi venduti e € accumulati |
| **% Fatturato** | Gauge/Meter | Percentuale raggiunta e € generati |

### Architettura Frontend Dashboard

```
GaraDashboard
├── Header
│   ├── Nome gara
│   ├── Periodo validità
│   └── Stato (attiva/conclusa)
│
├── KPI Summary
│   ├── Totale € maturato
│   ├── % completamento
│   └── TTM (proiezione)
│
└── ConfiguratoriGrid (DINAMICO)
    ├── <SoglieWidget />      ← se configuratore attivo
    ├── <GettoneWidget />     ← se configuratore attivo
    └── <PercentualeWidget /> ← se configuratore attivo
```

> **Nota**: Il layout si adatta automaticamente al numero di configuratori attivi nella gara.

---

## TTM - Time To Market

### Definizione

Il **TTM** è una metrica **predittiva intelligente** che stima quando verrà raggiunto il target, considerando:

1. **Giorni rimanenti** della gara
2. **Calendario store** (orari di apertura)
3. **Ore effettive lavorabili**
4. **Produttività lineare attuale** (vendite/giorno)

### Calcolo TTM

```
INPUT
├── Giorni rimanenti gara
├── Calendario store (orari apertura, festivi, ferie)
├── Ore effettive lavorabili
└── Produttività attuale (vendite ÷ giorni lavorati)

CALCOLO
├── Produttività Lineare = vendite totali ÷ giorni lavorati
├── Gap Target = target - valore attuale
├── Giorni Stimati = gap ÷ produttività lineare
└── TTM = data odierna + giorni stimati (solo lavorativi)

OUTPUT
├── Data stimata raggiungimento
├── Giorni lavorativi mancanti
└── Alert se target non raggiungibile
```

### TTM per Configuratore

| Configuratore | TTM Esempio |
|---------------|-------------|
| **Soglie** | "Prossima soglia (20 pz) tra 3 giorni lavorativi" |
| **Gettone** | "A questo ritmo: €450 totali a fine gara" |
| **% Fatturato** | "Proiezione: 3.2% sul fatturato finale" |

### Fattori Considerati

- Giorni di chiusura (festivi, domeniche)
- Orari ridotti
- Ferie programmate
- Trend accelerazione/decelerazione vendite

### Alert TTM

| Stato | Messaggio |
|-------|-----------|
| 🟢 **On Track** | "Raggiungi target con 5 giorni di anticipo" |
| 🟡 **A Rischio** | "Devi aumentare produttività del 15% per raggiungere target" |
| 🔴 **Fuori Target** | "Al ritmo attuale non raggiungi la soglia minima" |

---

## Paletti (Condizioni)

I paletti sono condizioni che devono essere soddisfatte per maturare l'incentivo:

| Paletto | Descrizione |
|---------|-------------|
| **Produttività Negozio** | Basato su performance singolo store |
| **Produttività Multi-Negozio** | Basato su performance totale più negozi |
| **Produttività Risorsa** | Basato su performance personale del venditore |

---

## Clusterizzazione

### Gerarchia: Canale → Cluster → Store/Risorse

```
CANALE (attributo dello Store, definito in creazione sede)
├── Franchising
├── Multi-brand
├── GDO/GDS
└── [altri canali brand]

CANALE
└── CLUSTER (figli del canale, naming: A, B, C... o 1, 2, 3...)
    └── STORE / RISORSE (membri del cluster)
```

### Chi Ha Cluster

| Entità | Ha Cluster? | Note |
|--------|-------------|------|
| **Store (Negozi)** | ✅ Sì | Clusterizzati per canale |
| **Risorse (Venditori)** | ✅ Sì | Clusterizzati per canale |
| **Ragione Sociale** | ❌ No | Target diretto, senza cluster |

### Esempio Struttura Completa

```
Canale: Franchising
├── Cluster A
│   ├── Store Milano Centro
│   ├── Store Torino
│   └── Store Genova
├── Cluster B
│   ├── Store Roma
│   └── Store Napoli
└── Cluster C
    └── Store Firenze

Canale: GDO/GDS
├── Cluster 1
│   └── Store MediaWorld Milano
└── Cluster 2
    └── Store Unieuro Roma
```

### Modalità Cluster

Ogni cluster può essere:

| Modalità | Descrizione |
|----------|-------------|
| **Overall** | Vale per TUTTI i driver |
| **Per Driver** | Attivo solo per driver specifici |

### Scopo Cluster: Gare Template

I cluster servono per creare **gare template riutilizzabili**:

```
Gara Template "Sprint Q4"
├── Target: Canale Franchising → Cluster A
├── Modalità: Per Driver "SIM Voce"
└── Quando istanziata → applica a:
    ├── Store Milano Centro
    ├── Store Torino
    └── Store Genova
    (solo per driver SIM Voce)
```

```
Gara Template "Bonus Accessori"
├── Target: Canale GDO/GDS → Cluster 1
├── Modalità: Overall (tutti i driver)
└── Quando istanziata → applica a tutti i driver
```

### Cluster Risorse

Le risorse seguono la stessa logica:
- Appartengono a un **Canale** (tramite lo store dove lavorano)
- Si raggruppano in **Cluster** (A, B, C...)
- Cluster può essere **Overall** o **Per Driver**

---

## Trigger e Storno

### Trigger: La Vendita

Ogni **vendita** di un prodotto in un **listino specifico** è il trigger del sistema commissioning:
- La vendita attiva automaticamente tutte le gare collegate a quel prodotto/listino
- Non è l'attivazione successiva, ma la **vendita stessa** che genera il commissioning
- Una vendita può "muovere" più gare contemporaneamente

### Storno: Vendita in KO

Lo storno è legato allo **stato della vendita**:
- Se una vendita passa in stato **KO** (anche mesi dopo T0), genera uno storno
- Lo storno è pari al **valore euro del commissioning** già maturato su quella vendita
- Il sistema deve tracciare ogni commissioning generato per poterlo stornare

**Timeline esempio:**
```
T0 (15/12/2025): Vendita SIM Premium → Commissioning €15 maturato
T+90 (15/03/2026): Vendita va in KO → Storno €15 generato
```

---

## Doppio Valore della Vendita

Ogni vendita genera **due valori distinti**:

| Tipo Valore | Descrizione | Destinazione |
|-------------|-------------|--------------|
| **Valore Fattura** | € pagato dal cliente (scontrino) | Contabilità, fatturazione |
| **Valore Commissioning** | € generato dal sistema gare | Incentivi, CRM |

### Struttura Dati Vendita

Ogni vendita deve memorizzare:

```
Vendita #12345
├── Dati Base
│   ├── Prodotto: SIM Premium
│   ├── Listino: Listino Retail Q4
│   ├── Timestamp: 2025-12-15 14:30:22
│   └── Stato: OK | KO
│
├── Valore Fattura: €29.90
│
├── Valore Commissioning: €15.00
│   ├── Gara Brand "Sprint Natalizio": €8.00
│   └── Gara Risorse "Top Seller": €7.00
│
└── Link CRM
    ├── Deal: #1234
    └── Customer: #567
```

### Integrazione CRM

Il **Valore Commissioning** alimenta il CRM:
- Si aggrega sul **Customer** per calcolare il valore totale generato dal cliente
- Si aggrega sul **Deal** per valutare la profittabilità della trattativa
- Un cliente con alto commissioning = cliente di alto valore anche per il dealer

> **Insight**: Il valore di un cliente non è solo quanto paga (fattura), ma anche quanto genera in commissioni per il dealer!

---

## Relazioni con Entità Esistenti

| Entità | Relazione |
|--------|-----------|
| `stores` | Partecipanti (solo type=store) |
| `legal_entities` | Target gare brand |
| `users` | Risorse beneficiarie |
| `products` | Prodotti che generano commissioni |
| `price_lists` | Listini collegati alle gare |
| `channels` | Canali per clusterizzazione |
| `drivers` | Driver brand e custom |

---

## Task Confermati per Sviluppo

> Questa sezione viene aggiornata man mano che confermiamo le specifiche

| # | Task | Stato | Note |
|---|------|-------|------|
| - | *Nessun task confermato ancora* | - | - |

---

## Note Sessione Brainstorming

### Da Approfondire
1. ~~Variabili configuratori~~ ✅ Definite: Valenza, Gettone Contrattuale, Gettone Gara, Canone Canvass
2. Come si combinano più configuratori nella stessa gara
3. ~~Trigger maturazione~~ ✅ Vendita prodotto/listino è il trigger
4. ~~Gestione storni~~ ✅ Vendita in KO genera storno del valore commissioning
5. ~~Doppio valore vendita~~ ✅ Fattura + Commissioning, integrazione CRM
6. Split commissioni venditore/dealer
7. ~~UI/UX configuratori~~ ✅ Componenti modulari dinamici per ogni configuratore
8. ~~TTM~~ ✅ Time To Market predittivo con calendario store
9. ~~Anatomia gara~~ ✅ Struttura completa documentata
10. ~~Clusterizzazione~~ ✅ Gerarchia Canale → Cluster → Store/Risorse, modalità Overall/Per Driver
11. ~~Pacchetto Valenze~~ ✅ Entità che assegna valori variabili, UI wizard, gestione aggiornamenti listino
12. Dettaglio calcolo per ogni tipo di configuratore con le 4 variabili

---

*Ultimo aggiornamento: Pacchetto Valenze con UI wizard, gestione aggiornamenti listino e notifiche*
