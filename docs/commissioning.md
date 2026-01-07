# Sistema Commissioning - Analisi e Specifiche

## Panoramica
Il **Commissioning** è un sistema di incentivazione economica legato alle vendite. I prodotti venduti da listino generano commissioni variabili che beneficiano sia le risorse/venditori che i dealer/imprenditori.

---

## ⚠️ CONCETTI FONDAMENTALI - DISTINZIONI CRITICHE

### Struttura Gerarchica: GARA → CONFIGURATORI

```
GARA (contenitore)
├── Info dedicate (nome, descrizione, tipo, operatore, canale)
├── Validità (dal - al, evergreen)
│
└── CONFIGURATORI (N per gara = regole del gioco)
    │
    ├── CONFIGURATORE 1
    │   ├── Cluster (chi partecipa)
    │   ├── Driver (subset filtrato dal cluster!)
    │   ├── Scope (da dove conto le variabili)
    │   ├── Pacchetto Variabili
    │   ├── Paletti (condizioni)
    │   └── Regole (soglie, %, moltiplicatori)
    │
    ├── CONFIGURATORE 2 ...
    └── CONFIGURATORE N ...

═══════════════════════════════════════════════════
ECONOMIA TOTALE GARA = Σ counting di TUTTI i configuratori
```

### Cluster vs Scope (NON confondere!)

| Concetto | Definizione | Livello | Esempio |
|----------|-------------|---------|---------|
| **Cluster** | **CHI partecipa** alla gara | CONFIGURATORE | Cluster "Team Nord" = Mario, Giulia, Luca |
| **Scope** | **DA DOVE conto** le variabili | CONFIGURATORE | Scope = RS "TEC Mobile" → conto da tutti i PDV figli |

### Cluster = Raggruppamento Omogeneo + Driver FK

Il Cluster è un **contenitore etichettato** di entità **omogenee** (mai ibride!) con relazione N:M verso i driver:

```
CLUSTER
├── TIPO: RS | PDV | RISORSA (esclusivo, MAI ibrido!)
│
├── ENTITÀ (tutte dello stesso tipo):
│   ├── Se RS: [TEC Mobile, ABC Srl, XYZ SpA]
│   ├── Se PDV: [Milano Centro, Torino Centrale, Genova Porto]
│   └── Se RISORSA: [Mario Rossi, Giulia Bianchi, Luca Verdi]
│
└── DRIVER (FK logico N:M, multiselect):
    ├── Driver SIM Voce
    ├── Driver Fisso
    └── Driver Custom XYZ
```

> **⚠️ REGOLA FONDAMENTALE**: Un cluster contiene SOLO entità dello stesso tipo. Mai mix RS + PDV + Risorse!

### Driver nel Configuratore = Subset del Cluster

Quando si configura un configuratore:
1. Si seleziona un **Cluster** (che ha già i suoi driver associati)
2. Si seleziona un **subset di Driver** tra quelli disponibili nel cluster
3. Il counting avviene solo per quel subset di driver

### Scope = Perimetro Counting Variabili

Lo Scope definisce **DA DOVE** prendere i dati per calcolare le variabili (Valenza, Gettone, Canone):

| Tipo Gara | Scope Disponibili |
|-----------|-------------------|
| **Gare Operatore** | PDV singolo / Ragione Sociale / Multi-RS |
| **Gare Interne** | PDV singolo / RS / Multi-RS / **Singolo User** / **Multi-User** |

---

## 🔒 Pattern RLS Gare (Stesso di action_definitions)

Le gare seguono lo stesso pattern RLS delle action_definitions:

| Tipo Gara | Origine | tenant_id | Permessi UI |
|-----------|---------|-----------|-------------|
| **Gare Interne** | Sempre Custom | UUID (RLS) | Full CRUD |
| **Gare Operatore - Custom** | Creata dal Tenant | UUID (RLS) | Full CRUD |
| **Gare Operatore - Brand** | Pushata da WindTre | NULL | Solo View (🔒 lock) |

### Query Pattern RLS

```sql
-- Gare visibili al tenant
SELECT * FROM commissioning_races 
WHERE tenant_id = current_setting('app.tenant_id')::uuid  -- Custom
   OR tenant_id IS NULL;                                   -- Brand-pushed

-- Blocco modifica brand-pushed (backend)
IF race.tenant_id IS NULL THEN
  RETURN 403 Forbidden;
END IF;
```

### UI Azioni per Tipo

| Origine | Icone Azioni DataTable |
|---------|------------------------|
| **Brand-pushed** (NULL) | 👁️ View + 🔒 Lock |
| **Custom** (UUID) | 👁️ View + ✏️ Modifica + 📋 Duplica + 📦 Archivia + 🗑️ Elimina |

---

## Architettura Gare

### Tipologie Gare (Tab UI)

| Tab | Tipo Gara | Creatore | Target | RLS |
|-----|-----------|----------|--------|-----|
| **Gare Operatore** | Brand → Dealer | WindTre (brand-pushed) o Tenant (custom) | PDV / RS / Multi-RS | NULL o UUID |
| **Gare Interne** | Dealer → Risorse | Solo Tenant (sempre custom) | User / Multi-User / PDV / RS | UUID sempre |

> **⚠️ IMPORTANTE**: Le Gare Operatore e le Gare Interne sono **concetti slegati**.
> - Le Gare Operatore = commissioning per il dealer (negozio/ragione sociale)
> - Le Gare Interne = commissioning per la risorsa (venditore)
> - Un configuratore di una Gara Interna può lavorare sul fatturato di una Gara Operatore, ma rimangono entità indipendenti

### Campi Gara per Tipo

**GARA (contenitore) - Campi Comuni:**
- Nome gara
- Descrizione
- Validità dal - al
- Evergreen (sì/no)

**Gare Operatore - Campi Specifici:**
- Operatore (WindTre, VeryMobile, etc.)
- Canale (obbligatorio)

**Gare Interne - Campi Specifici:**
- Canale (opzionale)

---

## Anatomia Completa di una Gara

```
GARA (contenitore)
├── DATI BASE
│   ├── Nome
│   ├── Descrizione
│   ├── Validità (dal - al)
│   ├── Evergreen (sì/no)
│   └── Tipo (Operatore / Interna)
│
├── OPERATORE (solo Gare Operatore)
│   └── WindTre / VeryMobile / etc.
│
├── CANALE
│   └── Franchising / GDO / etc. (obbligatorio per Operatore, opzionale per Interne)
│
├── CONFIGURATORI (N configuratori per gara)
│   │
│   ├── CONFIGURATORE 1
│   │   ├── Cluster: chi partecipa (entità omogenee)
│   │   ├── Driver: subset filtrato dal cluster
│   │   ├── Scope: PDV/RS/Multi-RS/User/Multi-User
│   │   ├── Variabile: Valenza/Gettone/Canone
│   │   ├── Pacchetto Valenze
│   │   ├── Paletti: condizioni da soddisfare
│   │   └── Regole: soglie, %, moltiplicatori
│   │
│   └── CONFIGURATORE N...
│
└── STATO
    ├── Bozza
    ├── Attiva
    ├── Conclusa
    └── Annullata

═══════════════════════════════════════════════════
ECONOMIA TOTALE GARA = Σ counting di TUTTI i configuratori
```

---

## Schema DB Commissioning

### Tabelle Principali

```sql
-- CLUSTER: Raggruppamento omogeneo di entità
commissioning_clusters (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,              -- RLS sempre
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) NOT NULL,     -- 'RS' | 'PDV' | 'RISORSA' (esclusivo!)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- CLUSTER → ENTITÀ (N:M)
commissioning_cluster_entities (
  id UUID PRIMARY KEY,
  cluster_id UUID REFERENCES commissioning_clusters(id),
  entity_id UUID NOT NULL,              -- ID della RS/PDV/User
  entity_type VARCHAR(20) NOT NULL,     -- Ridondante per sicurezza
  created_at TIMESTAMP
)

-- CLUSTER → DRIVER (N:M, FK a tabella drivers esistente)
commissioning_cluster_drivers (
  id UUID PRIMARY KEY,
  cluster_id UUID REFERENCES commissioning_clusters(id),
  driver_id UUID NOT NULL,              -- FK logico a drivers.id
  created_at TIMESTAMP
)

-- GARE: Contenitore con info base e validità
commissioning_races (
  id UUID PRIMARY KEY,
  tenant_id UUID,                       -- NULL = brand-pushed, UUID = custom
  race_type VARCHAR(20) NOT NULL,       -- 'operatore' | 'interna'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_evergreen BOOLEAN DEFAULT false,
  operator_id UUID,                     -- Solo per Gare Operatore
  channel_id UUID,                      -- Obbligatorio per Operatore, opzionale per Interne
  status VARCHAR(20) DEFAULT 'draft',   -- 'draft' | 'active' | 'completed' | 'cancelled'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- CONFIGURATORI: Regole del gioco per ogni gara
commissioning_configurators (
  id UUID PRIMARY KEY,
  race_id UUID REFERENCES commissioning_races(id),
  name VARCHAR(255) NOT NULL,
  
  -- Chi partecipa
  cluster_id UUID REFERENCES commissioning_clusters(id),
  driver_ids UUID[],                    -- Subset dei driver del cluster
  
  -- Da dove conto
  scope_type VARCHAR(20) NOT NULL,      -- 'PDV' | 'RS' | 'MULTI_RS' | 'USER' | 'MULTI_USER'
  scope_entity_ids UUID[],              -- Array di ID entità per lo scope
  
  -- Cosa conto
  variable_type VARCHAR(30) NOT NULL,   -- 'valenza' | 'gettone_contrattuale' | 'gettone_gara' | 'canone'
  value_package_id UUID,                -- FK a pacchetto valenze
  
  -- Condizioni e regole
  paletti JSONB,                        -- Condizioni da soddisfare
  rules JSONB,                          -- Configurazione regole (soglie, %, etc.)
  
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Indici Performance

```sql
CREATE INDEX idx_races_tenant ON commissioning_races(tenant_id);
CREATE INDEX idx_races_status ON commissioning_races(status);
CREATE INDEX idx_races_valid ON commissioning_races(valid_from, valid_to);
CREATE INDEX idx_races_type ON commissioning_races(race_type);
CREATE INDEX idx_clusters_tenant ON commissioning_clusters(tenant_id);
CREATE INDEX idx_cluster_entities ON commissioning_cluster_entities(cluster_id);
CREATE INDEX idx_cluster_drivers ON commissioning_cluster_drivers(cluster_id);
CREATE INDEX idx_configurators_race ON commissioning_configurators(race_id);
CREATE INDEX idx_configurators_cluster ON commissioning_configurators(cluster_id);
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

## Template Configuratore

### Definizione

Il **Template Configuratore** è uno schema vuoto/flessibile che definisce le "regole del gioco" di una gara.

### Struttura Template

```
TEMPLATE CONFIGURATORE
├── 1. CLUSTER (chi partecipa)
│   └── Selezione cluster esistente
│
├── 2. DRIVER (subset del cluster)
│   └── Multiselect tra driver del cluster
│
├── 3. SCOPE (da dove conteggiare)
│   ├── PDV singolo
│   ├── Ragione Sociale (tutti PDV figli)
│   ├── Multi-RS
│   ├── Singolo User (solo Gare Interne)
│   └── Multi-User (solo Gare Interne)
│
├── 4. VARIABILE DI LAVORO (cosa conteggiare)
│   ├── Valenze (numero valenze accumulate)
│   ├── Volumi (pezzi venduti)
│   ├── Moltiplicatore Canone
│   └── Gettone Gara (€ per vendita)
│
├── 5. PACCHETTO VALENZE (valori di riferimento)
│   └── 1 Configuratore = 1 Pacchetto Valenze
│
├── 6. PALETTI (condizioni da soddisfare)
│   ├── Produttività Negozio
│   ├── Produttività Multi-Negozio
│   └── Produttività Risorsa
│
└── 7. REGOLE (come calcolare)
    ├── Soglie progressive/regressive
    ├── Percentuali
    ├── Gettoni fissi
    └── Moltiplicatori
```

### Esempi Configuratori

| Variabile | Esempio Configuratore |
|-----------|----------------------|
| **Valenze** | Soglia 1: 0-50 valenze = €100, Soglia 2: 51-100 = €300 |
| **Volumi** | Vendi 20 pezzi = premio €50, Vendi 50 pezzi = premio €150 |
| **Moltiplicatore Canone** | Soglia 1: 1x canone (€9), Soglia 2: 2x canone (€18) |
| **Gettone Gara** | €5 fissi per ogni SIM venduta |
| **% Fatturato** | 3% del fatturato generato dalla Gara Brand X |

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
```

### 2. JOB CRON (Periodico)
```
Trigger: Schedulazione (es. ogni ora, ogni notte)
Azione:  Ricalcola avanzamenti totali, consolida snapshot
```

### 3. ON-DEMAND (Apertura Report)
```
Trigger: Utente apre dashboard/report
Azione:  Ricalcolo fresh per visualizzazione
```

---

## Storno su Valore Attuale

Quando una vendita va in **KO**, lo storno avviene sul **valore ATTUALE** del commissioning, non sul valore originale.

```
T0:   Vendita → Soglia 1 → Commissioning €10
T+30: Soglia sale a 3 → Commissioning ricalcolato €100
T+90: Vendita in KO → Storno €100 (valore ATTUALE, non €10)
```

---

## Pacchetto Valenze

### Definizione

Il **Pacchetto Valenze** è l'entità che assegna i valori delle variabili ai prodotti/listini.

### Struttura

```
Pacchetto Valenze "Q4 2025"
├── ORIGINE: Brand (pushato) / Custom (tenant)
├── VALIDITÀ: dal - al
├── LISTINI INCLUSI: [Listino Retail Q4, Listino Business Q4]
└── PRODOTTI VALORIZZATI:
    ├── SIM Gold → Valenza: 5, Gettone C.: €10, Gettone G.: €8, Canone: €29
    └── Fibra Home → Valenza: 8, Gettone C.: €25, Gettone G.: €20, Canone: €35
```

### Relazione con Configuratori

**Regola: 1 Configuratore = 1 Pacchetto Valenze**

```
GARA "Sprint Natalizio"
├── Configuratore Soglie → Pacchetto "Q4 Retail" → €250
├── Configuratore Gettone → Pacchetto "Q4 Accessori" → €80
└── Configuratore % Fatturato → Pacchetto "Q4 Servizi" → €45
═══════════════════════════════════════════════════
ECONOMIA TOTALE GARA = €375
```

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

### Struttura Cluster

```
CLUSTER (raggruppamento omogeneo)
├── Tipo: RS | PDV | RISORSA (esclusivo!)
├── Entità: [lista omogenea]
└── Driver: [FK N:M a drivers esistente]
```

### Esempio

```
Cluster "Top Performers Nord" (tipo: RISORSA)
├── Entità: [Mario Rossi, Giulia Bianchi, Luca Verdi]
└── Driver: [SIM Voce, Fisso]

Cluster "Negozi Premium Milano" (tipo: PDV)
├── Entità: [PDV Milano Centro, PDV Milano Duomo]
└── Driver: [Tutti]
```

---

## UI/UX

### Tab Gare Operatore
- KPI Cards: Gare Attive, In Scadenza, Obiettivi Completati
- DataTable con colonne: Nome, Operatore, Canale, Validità, Stato, Azioni
- Azioni per Custom: View, Modifica, Duplica, Archivia, Elimina
- Azioni per Brand-pushed: View, Lock (no modifica)
- Modal "Nuova Gara" → poi wizard configuratori

### Tab Gare Interne
- KPI Cards: Gare Attive, Partecipanti, Premi Erogati
- DataTable con colonne: Nome, Canale, Validità, Stato, Azioni
- Tutte le azioni disponibili (sempre custom)
- Modal "Nuova Gara" con scope user/multi-user

### Tab Impostazioni → Card Cluster
- DataTable cluster con filtri (tipo, data, ricerca)
- Modal creazione cluster: entity_type selector → entità → driver

---

## Relazioni con Entità Esistenti

| Entità | Relazione |
|--------|-----------|
| `stores` | Entità per cluster tipo PDV |
| `organization_entities` | Entità per cluster tipo RS |
| `users` | Entità per cluster tipo RISORSA |
| `drivers` | FK N:M per cluster (tabella esistente!) |
| `products` | Prodotti che generano commissioni |
| `price_lists` | Listini collegati alle gare |
| `channels` | Canali per filtro gare |
| `operators` | Operatori per Gare Operatore |

---

## Task Sviluppo

| # | Task | Stato |
|---|------|-------|
| 1 | Schema DB Cluster + Races + Configurators | 🔄 In corso |
| 2 | UI Gare Operatore | ⏳ Pending |
| 3 | UI Gare Interne | ⏳ Pending |
| 4 | UI Cluster (Impostazioni) | ⏳ Pending |
| 5 | Backend API con RLS | ⏳ Pending |

---

*Ultimo aggiornamento: Gennaio 2026 - GARA=contenitore, CONFIGURATORE=Cluster+Driver(subset)+Scope+Pacchetto+Paletti+Regole, Economia=Σ configuratori*
