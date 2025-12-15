# Sistema Commissioning - Analisi e Specifiche

## Panoramica
Il **Commissioning** è un sistema di incentivazione economica legato alle vendite. I prodotti venduti da listino generano commissioni variabili che beneficiano sia le risorse/venditori che i dealer/imprenditori.

---

## Architettura Gare

### Distinzione Fondamentale: CONCETTI SLEGATI

| Tipo Gara | Creatore | Target | Driver Utilizzabili |
|-----------|----------|--------|---------------------|
| **Gare Brand** | WindTre (Brand) | Negozio / Ragione Sociale / Gruppo | Solo **Driver Brand** |
| **Gare Risorse** | Imprenditore (Dealer) | Singola Risorsa | **Driver Brand + Driver Custom** |

> **⚠️ IMPORTANTE**: Le Gare Brand e le Gare Risorse sono **concetti completamente slegati**.
> - **NON esiste uno split** fisso tra dealer e risorse
> - Le Gare Brand = commissioning per il dealer (negozio/ragione sociale)
> - Le Gare Risorse = commissioning per la risorsa (venditore)
> - Un configuratore di una Gara Risorse può lavorare sul fatturato di una Gara Brand, ma rimangono entità indipendenti

### 1. Gare Brand (WindTre → Dealer)
Gare create dal brand verso i dealer con target:
- **Negozio singolo** (store)
- **Ragione Sociale** (legal entity)
- **Gruppo** (più ragioni sociali)

### 2. Gare Imprenditore (Dealer → Risorse)
Gare create dall'imprenditore verso le proprie risorse/venditori:
- **Target**: Singola risorsa
- Possono usare driver brand E driver custom
- Possono basarsi su % del fatturato delle Gare Brand (ma restano slegate)

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

## Template Configuratore

### Definizione

Il **Template Configuratore** è uno schema vuoto/flessibile che definisce le "regole del gioco" di una gara.

### Struttura Template

```
TEMPLATE CONFIGURATORE
├── 1. VARIABILE DI LAVORO (cosa conteggiare)
│   ├── Valenze (numero valenze accumulate)
│   ├── Volumi (pezzi venduti)
│   ├── Moltiplicatore Canone (es. Soglia 1 = 1x canone, Soglia 2 = 2x)
│   └── Gettone Gara (€ per vendita)
│
├── 2. REGOLE (come calcolare)
│   ├── Soglie progressive/regressive
│   ├── Percentuali
│   ├── Gettoni fissi
│   └── Moltiplicatori
│
└── 3. PACCHETTO VALENZE (valori di riferimento)
    └── 1 Configuratore = 1 Pacchetto Valenze
```

### Esempi Configuratori su Variabili Diverse

| Variabile | Esempio Configuratore |
|-----------|----------------------|
| **Valenze** | Soglia 1: 0-50 valenze = €100, Soglia 2: 51-100 = €300 |
| **Volumi** | Vendi 20 pezzi = premio €50, Vendi 50 pezzi = premio €150 |
| **Moltiplicatore Canone** | Soglia 1: 1x canone (€9), Soglia 2: 2x canone (€18), Soglia 3: 3x canone (€27) |
| **Gettone Gara** | €5 fissi per ogni SIM venduta |
| **% Fatturato** | 3% del fatturato generato dalla Gara Brand X |

---

## Ereditarietà Automatica

### Meccanismo

Quando un **Template Gara** viene configurato su un **Cluster**, tutti i membri di quel cluster **ereditano automaticamente** la gara.

```
Template Gara "Sprint Q4"
├── Target: Cluster A (Franchising)
└── Quando configurato → EREDITA automaticamente a:

    STORE (negozi del Cluster A):
    ├── Store Milano
    ├── Store Torino
    └── Store Genova

    RISORSE (venditori del Cluster A):
    ├── Mario Rossi
    ├── Giulia Bianchi
    └── Luca Verdi
```

### Flusso Ereditarietà

```
1. Brand crea Template Gara con N Configuratori
2. Template assegnato a Canale → Cluster
3. Tutti gli Store del Cluster ereditano la gara
4. Tutte le Risorse del Cluster ereditano la gara
5. Ereditarietà è AUTOMATICA per appartenenza
```

---

## ⚠️ SISTEMA VALORI DINAMICI RETROATTIVI

### Concetto Fondamentale

**Il valore di una vendita NON è fisso**: cambia retroattivamente fino alla fine della gara!

```
SISTEMA REGRESSIVO: Quando si sale di soglia, TUTTE le vendite precedenti
                    nella stessa gara vengono rivalorizzate.
```

### Timeline Esempio

```
VENDITA #123 - SIM Premium

Giorno 1 (vendita effettuata):
├── Soglia attuale: 1 (0-10 vendite)
├── Valore commissioning: €10
└── DB: vendita_123.valore_corrente = €10

Giorno 20 (dopo altre vendite):
├── Soglia attuale: 3 (30-50 vendite) ← cresciuti in soglia!
├── Sistema REGRESSIVO: rivalorizza tutte le vendite
├── Valore commissioning: €100 ← RICALCOLATO
└── DB: vendita_123.valore_corrente = €100

Fine Gara:
└── Valore definitivo consolidato (non più modificabile)
```

### Implicazioni

| Aspetto | Comportamento |
|---------|---------------|
| **Valore vendita** | Dinamico, cambia fino a fine gara |
| **Report real-time** | Devono ricalcolare in base alla soglia attuale |
| **Storico** | Serve tracciare SIA valore corrente SIA storico variazioni |
| **Storno** | Usa il **valore ATTUALE** (non quello originale) |

---

## Trigger Ricalcolo (3 Livelli)

Il sistema richiede **tre livelli** di ricalcolo per bilanciare performance e accuratezza:

### 1. REAL-TIME (Ogni Vendita/KO)

```
Trigger: Nuova vendita o vendita in KO
Azione:  Ricalcola TUTTE le vendite della gara impattata
Sfida:   Performance su migliaia di vendite
```

### 2. JOB CRON (Periodico)

```
Trigger: Schedulazione (es. ogni ora, ogni notte)
Azione:  Ricalcola avanzamenti totali, consolida snapshot
Scopo:   Garantire consistenza, recuperare eventuali discrepanze
```

### 3. ON-DEMAND (Apertura Report)

```
Trigger: Utente apre dashboard/report
Azione:  Ricalcolo fresh per visualizzazione
Scopo:   Dati sempre aggiornati alla consultazione
```

---

## Architettura DB per Performance

### Sfida Principale

Con sistema **regressivo**, ogni nuova vendita può modificare il valore di **TUTTE** le vendite precedenti nella stessa gara. Serve un'architettura efficiente.

### Approccio Consigliato: Ibrido

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA IBRIDA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TABELLA VENDITE (source of truth)                          │
│     ├── id, prodotto, timestamp, stato                         │
│     ├── valore_corrente (ultimo valore calcolato)              │
│     └── soglia_corrente (soglia al momento del calcolo)        │
│                                                                 │
│  2. EVENT LOG (audit trail)                                    │
│     ├── vendita_id, timestamp_evento                           │
│     ├── valore_precedente → valore_nuovo                       │
│     ├── soglia_precedente → soglia_nuova                       │
│     └── trigger (vendita/ko/cron/manual)                       │
│                                                                 │
│  3. SNAPSHOT PERIODICI (performance lettura)                   │
│     ├── gara_id, timestamp_snapshot                            │
│     ├── totale_economia                                        │
│     ├── conteggio_per_soglia                                   │
│     └── stato_avanzamento                                      │
│                                                                 │
│  4. CACHE REAL-TIME (Redis/Memory)                             │
│     ├── gara:{id}:economia_corrente                            │
│     ├── gara:{id}:soglia_corrente                              │
│     └── gara:{id}:last_recalc                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flusso Ricalcolo

```
NUOVA VENDITA
    │
    ▼
┌───────────────────┐
│ 1. Inserisci      │
│    vendita in DB  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 2. Identifica     │
│    gare impattate │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 3. Per ogni gara: │
│    - Conta totale │
│    - Trova soglia │
│    - Ricalcola    │
│      tutte le     │
│      vendite      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 4. Aggiorna:      │
│    - valore_corr. │
│    - event_log    │
│    - cache        │
└───────────────────┘
```

### Ottimizzazioni Performance

| Tecnica | Descrizione |
|---------|-------------|
| **Batch Updates** | Aggiorna vendite in blocchi (es. 1000 per batch) |
| **Indici Ottimizzati** | Indici su gara_id + stato + timestamp |
| **Materializzazione** | Snapshot pre-calcolati per dashboard |
| **Invalidazione Cache** | Invalida cache solo per gare modificate |
| **Calcolo Incrementale** | Se soglia non cambia, skip rivalorizzazione |

---

## Storno su Valore Attuale

### Regola

Quando una vendita va in **KO**, lo storno avviene sul **valore ATTUALE** del commissioning, non sul valore originale.

### Esempio

```
T0 (15/12/2025):
├── Vendita SIM Premium
├── Soglia: 1
└── Valore commissioning: €10

T+30 (14/01/2026):
├── Soglia salita a 3 (sistema regressivo)
└── Valore commissioning ricalcolato: €100

T+90 (15/03/2026):
├── Vendita va in KO
├── Storno: -€100 (valore attuale, non €10 originale)
└── Event log: storno €100 per KO
```

---

## Variabili Configuratori (da Prodotto/Listino)

Le variabili utilizzabili nei configuratori sono legate al prodotto/listino:

| # | Variabile | Descrizione | Esempio Uso |
|---|-----------|-------------|-------------|
| 1 | **Valenza** | Peso del prodotto nel contesto gara | Soglia valenze |
| 2 | **Gettone Contrattuale** | Importo fisso da contratto | Pay-per-sale |
| 3 | **Gettone Gara** | Importo specifico per questa gara | Bonus gara |
| 4 | **Canone Offerta Canvass** | Canone dell'offerta | Moltiplicatore soglie |

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

**Regola fondamentale: 1 Configuratore = 1 Pacchetto Valenze**

```
GARA "Sprint Natalizio"
│
├── Configuratore Soglie ──────→ Pacchetto Valenze "Q4 Retail"
│   └── Economia generata: €250
│
├── Configuratore Gettone ─────→ Pacchetto Valenze "Q4 Accessori"
│   └── Economia generata: €80
│
└── Configuratore % Fatturato ─→ Pacchetto Valenze "Q4 Servizi"
    └── Economia generata: €45

═══════════════════════════════════════════════════
ECONOMIA TOTALE GARA = SUM(economie configuratori) = €375
```

**Riepilogo:**
- Ogni **Configuratore** lavora su **1 solo Pacchetto Valenze**
- Una **Gara** può avere **N Configuratori** (mixabili)
- L'**Economia della Gara** = Σ delle economie di ogni configuratore
- I configuratori sono le "**regole del gioco**"
- I pacchetti valenze sono i "**valori in campo**"

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

I configuratori definiscono le regole del "gioco" della gara. Sono **mixabili** tra loro e **flessibili** sulla variabile di lavoro.

### Configuratori Identificati

| Tipo | Variabile | Descrizione | Esempio |
|------|-----------|-------------|---------|
| **Soglie** | Valenze/Volumi/Canone | Progressive o regressive | Vendi 10 = €100, Vendi 20 = €250 |
| **Gettone** | Gettone Gara | Pay-per-item fisso | €5 per ogni SIM venduta |
| **% Fatturato** | Canone/Fattura | Percentuale sul ricavato | 3% del fatturato prodotti X |
| **Moltiplicatore Canone** | Canone Canvass | Soglie con moltiplicatore | Soglia 1=1x, Soglia 2=2x, Soglia 3=3x |

### Flessibilità Configuratori

Ogni configuratore può lavorare su **qualsiasi variabile** definita nel template:

```
Configuratore Soglie (Template)
├── Variabile: [seleziona]
│   ├── Valenze
│   ├── Volumi
│   ├── Gettone Gara
│   └── Canone Canvass
│
├── Tipo Soglia: [seleziona]
│   ├── Progressivo (il valore cresce con le soglie)
│   └── Regressivo (retroattivo su vendite precedenti)
│
└── Definizione Soglie:
    ├── Soglia 1: 0-10 → €X o Xn canoni
    ├── Soglia 2: 11-20 → €Y o Yn canoni
    └── Soglia 3: 21+ → €Z o Zn canoni
```

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
│   ├── Totale € maturato (DINAMICO - valore corrente)
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

### Scopo Cluster: Gare Template con Ereditarietà Automatica

I cluster servono per creare **gare template riutilizzabili** con ereditarietà automatica:

```
Gara Template "Sprint Q4"
├── Target: Canale Franchising → Cluster A
├── Modalità: Per Driver "SIM Voce"
└── Quando configurata → EREDITA AUTOMATICAMENTE a:
    
    STORE:
    ├── Store Milano Centro
    ├── Store Torino
    └── Store Genova
    
    RISORSE (venditori del cluster):
    ├── Mario Rossi (lavora a Milano)
    ├── Giulia Bianchi (lavora a Torino)
    └── Luca Verdi (lavora a Genova)
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
- **Ogni vendita può triggerare il ricalcolo di TUTTE le vendite precedenti** (sistema regressivo)

### Storno: Vendita in KO

Lo storno è legato allo **stato della vendita** e usa il **valore ATTUALE**:
- Se una vendita passa in stato **KO** (anche mesi dopo T0), genera uno storno
- Lo storno è pari al **valore euro ATTUALE** del commissioning (non quello originale!)
- Il sistema deve tracciare ogni commissioning generato per poterlo stornare

**Timeline esempio:**
```
T0 (15/12/2025): Vendita SIM Premium
├── Soglia: 1
└── Commissioning: €10 maturato

T+30 (14/01/2026): Altre vendite, soglia sale
├── Soglia: 3 (sistema regressivo)
└── Commissioning rivalorizzato: €100

T+90 (15/03/2026): Vendita va in KO
├── Storno: €100 (valore ATTUALE, non €10 originale)
└── Event log: storno €100 per KO vendita #123
```

---

## Doppio Valore della Vendita

Ogni vendita genera **due valori distinti**:

| Tipo Valore | Descrizione | Destinazione |
|-------------|-------------|--------------|
| **Valore Fattura** | € pagato dal cliente (scontrino) | Contabilità, fatturazione |
| **Valore Commissioning** | € generato dal sistema gare (DINAMICO!) | Incentivi, CRM |

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
├── Valore Fattura: €29.90 (fisso)
│
├── Valore Commissioning CORRENTE: €100.00 (dinamico!)
│   ├── Soglia corrente: 3
│   ├── Gara Brand "Sprint Natalizio": €60.00
│   └── Gara Risorse "Top Seller": €40.00
│
├── Storico Variazioni (Event Log)
│   ├── 2025-12-15: Valore €10 (Soglia 1, trigger: vendita)
│   ├── 2025-12-25: Valore €50 (Soglia 2, trigger: vendita)
│   └── 2026-01-05: Valore €100 (Soglia 3, trigger: vendita)
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

### Completati ✅
1. ~~Variabili configuratori~~ ✅ Definite: Valenza, Gettone Contrattuale, Gettone Gara, Canone Canvass
2. ~~Mix configuratori~~ ✅ 1 Configuratore = 1 Pacchetto Valenze, Economia Gara = Σ economie configuratori
3. ~~Trigger maturazione~~ ✅ Vendita prodotto/listino è il trigger
4. ~~Gestione storni~~ ✅ Vendita in KO genera storno del valore commissioning ATTUALE
5. ~~Doppio valore vendita~~ ✅ Fattura + Commissioning, integrazione CRM
6. ~~Split commissioni~~ ✅ NON ESISTE - Gare Brand e Risorse sono SLEGATE
7. ~~UI/UX configuratori~~ ✅ Componenti modulari dinamici per ogni configuratore
8. ~~TTM~~ ✅ Time To Market predittivo con calendario store
9. ~~Anatomia gara~~ ✅ Struttura completa documentata
10. ~~Clusterizzazione~~ ✅ Gerarchia Canale → Cluster → Store/Risorse, modalità Overall/Per Driver
11. ~~Pacchetto Valenze~~ ✅ Entità che assegna valori variabili, UI wizard, gestione aggiornamenti listino
12. ~~Template Configuratore~~ ✅ Schema vuoto: variabile + regole + pacchetto valenze
13. ~~Ereditarietà automatica~~ ✅ Cluster → Store/Risorse automatica
14. ~~Valori dinamici retroattivi~~ ✅ Sistema regressivo, valore cambia fino a fine gara
15. ~~Storico variazioni~~ ✅ Event log per audit + valore corrente per operazioni
16. ~~Trigger ricalcolo~~ ✅ Real-time + Cron + On-demand
17. ~~Architettura DB performance~~ ✅ Approccio ibrido: tabelle + event log + snapshot + cache

### Da Approfondire
- [ ] Dettaglio algoritmo ricalcolo ottimizzato
- [ ] Schema DB definitivo con indici
- [ ] API endpoints per ricalcolo
- [ ] Gestione concorrenza (lock durante ricalcolo)

---

*Ultimo aggiornamento: Template Configuratore, Ereditarietà Automatica, Valori Dinamici Retroattivi, Trigger Ricalcolo 3 Livelli, Architettura DB Performance*
