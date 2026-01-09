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

## 🏗️ ARCHITETTURA 3 LIVELLI (L1 → L2 → L3)

Il sistema commissioning si basa su **tre livelli** di configurazione che lavorano insieme:

```
┌─────────────────────────────────────────────────────────────────┐
│                        L1 - VARIABLE MAPPINGS                    │
│                    (Mappature Variabili Globali)                 │
│─────────────────────────────────────────────────────────────────│
│  • Definizioni variabili di sistema disponibili                 │
│  • Codice + Nome + Tipo dato + Descrizione                      │
│  • Esempi: valenza, gettone_contrattuale, gettone_gara, canone  │
│  • Gestione: Brand-pushed (NULL) o Custom (tenant_id)           │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      L2 - VALUE PACKAGES                         │
│                  (Pacchetti Valori per Prodotti)                 │
│─────────────────────────────────────────────────────────────────│
│  • Contenitore che associa MULTIPLI LISTINI                     │
│  • Ogni listino → griglia prodotti con valori commissioning     │
│  • Valori per prodotto: valenza, gettone_contrattuale,          │
│    gettone_gara, canone (solo canvas)                           │
│  • Wizard 3 step: Dati base → Selezione listini → Griglie       │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                       L3 - FUNCTIONS                             │
│                   (Funzioni di Calcolo Gara)                     │
│─────────────────────────────────────────────────────────────────│
│  • Logica di calcolo applicata ai valori L2                     │
│  • Soglie progressive/regressive                                │
│  • Moltiplicatori, percentuali, bonus                           │
│  • Condizioni e paletti                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## L1 - VARIABLE MAPPINGS (Mappature Variabili)

### Definizione

Le **Variable Mappings** definiscono le variabili di sistema disponibili per il commissioning. Sono le "colonne" che possono essere valorizzate nei pacchetti L2.

### Variabili Standard di Sistema

| Codice | Nome | Tipo | Descrizione |
|--------|------|------|-------------|
| `valenza` | Valenza | number | Peso/punteggio del prodotto nel contesto gara |
| `gettone_contrattuale` | Gettone Contrattuale | currency | Importo fisso da contratto base |
| `gettone_gara` | Gettone Gara | currency | Importo specifico per la gara in corso |
| `canone` | Canone | currency | Canone mensile (solo per offerte Canvas) |
| `volumi` | Volumi | number | Quantità pezzi venduti |
| `valore_prodotto` | Valore € Prodotto | currency | Valore economico del prodotto |
| `valore_vendita` | Valore € Vendita | currency | Valore economico della vendita |

### Pattern RLS

```sql
-- Variabili visibili al tenant
SELECT * FROM commissioning_variable_mappings 
WHERE tenant_id = current_setting('app.tenant_id')::uuid  -- Custom
   OR tenant_id IS NULL;                                   -- Brand-pushed (globali)
```

---

## L2 - VALUE PACKAGES (Pacchetti Valori)

### Definizione

I **Value Packages** sono contenitori che associano **MULTIPLI LISTINI** e definiscono i valori commissioning per ogni prodotto di ogni listino.

### Struttura Multi-Listino

```
VALUE PACKAGE "Gara Q1 2026"
├── DATI BASE
│   ├── Codice: PKG_GARA_Q1_2026
│   ├── Nome: Pacchetto Gara Q1 2026
│   ├── Validità: 01/01/2026 - 31/03/2026
│   └── Stato: Attivo
│
├── LISTINI ASSOCIATI (N listini per pacchetto)
│   │
│   ├── LISTINO CANVAS "WindTre Consumer Q1"
│   │   └── GRIGLIA PRODOTTI:
│   │       ├── SIM Gold → valenza: 5, gett.contr: €10, gett.gara: €8, canone: €29
│   │       ├── SIM Silver → valenza: 3, gett.contr: €6, gett.gara: €5, canone: €19
│   │       └── Fibra Home → valenza: 8, gett.contr: €25, gett.gara: €20, canone: €35
│   │
│   ├── LISTINO CANVAS "VeryMobile Business Q1"
│   │   └── GRIGLIA PRODOTTI:
│   │       ├── Very Unlimited → valenza: 4, gett.contr: €8, gett.gara: €6, canone: €14.99
│   │       └── Very Business → valenza: 6, gett.contr: €12, gett.gara: €10, canone: €24.99
│   │
│   └── LISTINO PRODOTTI "Accessori Q1" (no canone!)
│       └── GRIGLIA PRODOTTI:
│           ├── Cover Premium → valenza: 1, gett.contr: €2, gett.gara: €1
│           └── Caricatore Fast → valenza: 1, gett.contr: €1.5, gett.gara: €1
│
└── ORIGINE: Custom (tenant_id = UUID)
```

### Differenze Canvas vs Prodotti

| Tipo Listino | Campi Griglia | Filtro Selezione |
|--------------|---------------|------------------|
| **Canvas** (offerte) | valenza, gettone_contrattuale, gettone_gara, **canone** | Operatore |
| **Prodotti** (fisico/servizio/digitale) | valenza, gettone_contrattuale, gettone_gara | Fornitore + Tipo (standard/promo) |

### Logica Canone

Per i listini **Canvas**:
- Il campo `canone` è **ereditato** automaticamente dal listino (`monthly_fee` di `price_list_items_canvas`)
- L'utente può **sovrascrivere** il canone con un valore custom
- Flag `canone_inherited`: `true` = usa valore listino, `false` = usa valore override

```
PRODOTTO CANVAS
├── canone_listino: €29.99 (da price_list_items_canvas.monthly_fee)
├── canone_inherited: true/false
└── canone_override: €24.99 (valore custom se inherited=false)
```

### Wizard UI (3 Step)

```
STEP 1: DATI BASE
├── Codice pacchetto
├── Nome pacchetto
├── Descrizione
├── Validità (dal - al)
└── Stato (bozza/attivo/archiviato)

STEP 2: SELEZIONE LISTINI
├── Toggle: [Canvas] [Prodotti]
├── FILTRI CANVAS:
│   └── Operatore (WindTre, VeryMobile, etc.)
├── FILTRI PRODOTTI:
│   ├── Fornitore
│   └── Tipo listino (standard/promo)
├── Ricerca libera
├── Checkbox multi-select listini
└── Chip listini selezionati con rimozione

STEP 3: GRIGLIE PRODOTTI
├── TABS (una per listino selezionato)
│   ├── Tab "WindTre Consumer Q1" [12 prodotti] ●
│   ├── Tab "VeryMobile Business Q1" [8 prodotti]
│   └── Tab "Accessori Q1" [25 prodotti]
│
└── GRIGLIA PRODOTTO (per tab attiva):
    ├── Colonne: Prodotto | SKU | Valenza | Gett.Contr. | Gett.Gara | Canone*
    ├── Input editabili per ogni cella
    ├── Indicatore modifiche pendenti (●)
    └── Bulk actions toolbar
    
    * Colonna Canone visibile SOLO per listini Canvas
```

### Tabelle Database L2

```sql
-- Pacchetti valori (header)
commissioning_value_packages (
  id UUID PRIMARY KEY,
  tenant_id UUID,                       -- NULL = brand-pushed, UUID = custom
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  list_type VARCHAR(30),                -- deprecated, ora multi-listino
  operator_id UUID,                     -- deprecated
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(20) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  base_package_id UUID,                 -- per versionamento
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Ponte pacchetto ↔ listini (N:M)
commissioning_value_package_price_lists (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES commissioning_value_packages(id),
  price_list_id UUID REFERENCES price_lists(id),
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMP,
  UNIQUE(package_id, price_list_id)
)

-- Valori commissioning per prodotto/listino
commissioning_value_package_items (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES commissioning_value_packages(id),
  price_list_id UUID REFERENCES price_lists(id),   -- quale listino
  product_id VARCHAR(100) NOT NULL,                -- FK logica a products
  product_version_id UUID,
  price_list_item_id UUID,                         -- FK a items specifico
  
  -- Valori commissioning
  valenza NUMERIC(10,2),
  gettone_contrattuale NUMERIC(12,2),
  gettone_gara NUMERIC(12,2),
  canone NUMERIC(12,2),                            -- override (solo canvas)
  canone_inherited BOOLEAN DEFAULT true,           -- usa valore listino?
  
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(package_id, price_list_id, product_id)
)
```

### API Endpoints L2

```
GET  /api/commissioning/value-packages                              # Lista pacchetti
GET  /api/commissioning/value-packages/:id                          # Dettaglio pacchetto
POST /api/commissioning/value-packages                              # Crea pacchetto
PUT  /api/commissioning/value-packages/:id                          # Aggiorna pacchetto
DELETE /api/commissioning/value-packages/:id                        # Elimina pacchetto

GET  /api/commissioning/value-packages/:id/price-lists              # Listini associati
POST /api/commissioning/value-packages/:id/price-lists              # Aggiungi listino
DELETE /api/commissioning/value-packages/:id/price-lists/:plId      # Rimuovi listino

GET  /api/commissioning/value-packages/:id/price-lists/:plId/products      # Prodotti griglia
POST /api/commissioning/value-packages/:id/price-lists/:plId/products/bulk # Bulk update
```

---

## L3 - FUNCTIONS (Funzioni di Calcolo)

### Definizione

Le **Functions** sono condizioni logiche riutilizzabili che restituiscono **TRUE** o **FALSE**. Non contengono operazioni sui valori - quelle sono definite nei Configuratori.

### Struttura ruleBundle

```json
{
  "conditions": [
    { "variable": "@sconto", "operator": ">", "value": 20, "logic": "AND" },
    { "variable": "@giacenza", "operator": "<", "value": 10 }
  ]
}
```

### Operatori Condizioni Disponibili

| Operatore | Descrizione | Esempio |
|-----------|-------------|---------|
| `>` | Maggiore di | `@valenza > 100` |
| `<` | Minore di | `@sconto < 50` |
| `=` | Uguale a | `@categoria = "premium"` |
| `!=` | Diverso da | `@stato != "annullato"` |
| `>=` | Maggiore o uguale | `@quantita >= 10` |
| `<=` | Minore o uguale | `@prezzo <= 999` |
| `%+` | Scostamento positivo % | `@margine %+ 20` (margine +20%) |
| `%-` | Scostamento negativo % | `@costo %- 10` (costo -10%) |
| `contains` | Contiene testo | `@nome contains "Gold"` |
| `startsWith` | Inizia con | `@codice startsWith "SIM"` |
| `isEmpty` | È vuoto/nullo | `@note isEmpty` (unario) |
| `isNotEmpty` | Non è vuoto | `@telefono isNotEmpty` (unario) |

### Logic Connector

- `AND` = tutte le condizioni devono essere TRUE
- `OR` = almeno una condizione deve essere TRUE

---

## 🏗️ ARCHITETTURA CONFIGURATORI (3 LIVELLI)

Il sistema Configuratori è strutturato su **tre livelli** distinti:

```
┌─────────────────────────────────────────────────────────────────┐
│              LIVELLO 0 - CONFIGURATORE TIPO (Backend)           │
│                    (Costruito da Sviluppatori)                   │
│─────────────────────────────────────────────────────────────────│
│  • Codice tipo: "soglie", "gettone", "bonus_malus"              │
│  • Schema variabili disponibili per quel tipo                   │
│  • Logica di calcolo specifica (progressivo/regressivo)         │
│  • UI/UX proprietaria (componente React dedicato)               │
│  • API endpoints dedicati per quel tipo                         │
│  • NON modificabile da utenti - è il "motore"                   │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│            LIVELLO 1 - TEMPLATE CONFIGURATORE (Frontend)        │
│                    (Creato da Utente Admin)                      │
│─────────────────────────────────────────────────────────────────│
│  • Seleziona un TIPO dal livello 0                              │
│  • Configura: paletti, CAP, driver disponibili                  │
│  • Imposta valori default e struttura soglie                    │
│  • Riutilizzabile in più gare                                   │
│  • Salvato nel tab "Configuratori"                              │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              LIVELLO 2 - ISTANZA GARA (Frontend)                 │
│                    (Creato quando importi in Gara)               │
│─────────────────────────────────────────────────────────────────│
│  • Importa un TEMPLATE dal livello 1                            │
│  • Definisce CLUSTER con membri specifici                       │
│  • Personalizza valori per ogni cluster                         │
│  • Assegna pacchetti valenze                                    │
│  • Imposta validità gara (date reset)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 LIVELLO 0 - CONFIGURATORI TIPO (Backend)

### Definizione

I **Configuratori Tipo** sono costruiti da sviluppatori nel backend. Ogni tipo ha:
- Schema dati specifico
- Variabili disponibili
- Logica di calcolo
- Componente UI/UX proprietario

### Tipi Disponibili

| Tipo | Codice | Descrizione | Logica |
|------|--------|-------------|--------|
| **Soglie** | `soglie` | Range con moltiplicatori | Progressivo/Regressivo |
| **Gettone** | `gettone` | Bonus fisso per vendita | Fisso per evento |
| **Bonus/Malus** | `bonus_malus` | Operazioni condizionali | +/- su valori |

### Struttura Tipo (Backend)

```typescript
interface ConfiguratorType {
  code: string;                    // "soglie", "gettone", etc.
  name: string;                    // "Configuratore a Soglie"
  description: string;
  
  // Schema variabili disponibili per questo tipo
  availableVariables: VariableSchema[];
  
  // Configurazione UI
  uiComponent: string;             // Nome componente React
  wizardSteps: WizardStep[];       // Step del wizard
  
  // Logica
  calculationModes: string[];      // ["progressive", "regressive"]
  supportsMultipleThresholds: boolean;
  
  // Validazione
  validationRules: ValidationRule[];
}
```

### API Endpoints (Read-Only per Frontend)

```
GET  /api/commissioning/configurator-types           # Lista tipi disponibili
GET  /api/commissioning/configurator-types/:code     # Dettaglio tipo con schema
```

---

## 📋 LIVELLO 1 - TEMPLATE CONFIGURATORE

### Definizione

I **Template** sono creati dagli utenti admin nel tab "Configuratori". Basandosi su un TIPO, configurano paletti, CAP, e driver.

### Struttura Template

```
TEMPLATE CONFIGURATORE
├── Info Base
│   ├── Codice template
│   ├── Nome
│   ├── Descrizione
│   └── Tipo (FK a configurator_types)
│
├── Layer Principale
│   └── RS | PdV | User
│
├── Driver Disponibili
│   └── [FK a drivers esistenti] (multiselect)
│
├── Struttura Soglie (se tipo=soglie)
│   ├── Numero soglie
│   ├── Driver per soglia (valenza/fatturato/vendite)
│   └── Modalità: progressivo | regressivo
│
├── PALETTI[]
│   ├── Funzione FK
│   ├── Layer Override (opzionale)
│   └── Descrizione
│
└── CAP[]
    ├── Funzione FK
    ├── Layer Override (opzionale)
    ├── Comportamento: blocco | scala
    └── Valore limite
```

### Tabella Database

```sql
commissioning_configurator_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,                     -- NULL = brand-pushed
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Riferimento al tipo (Livello 0)
  type_code VARCHAR(30) NOT NULL,     -- "soglie", "gettone", etc.
  
  -- Layer principale
  primary_layer VARCHAR(20) NOT NULL, -- 'RS' | 'PDV' | 'USER'
  
  -- Driver disponibili (FK array)
  available_driver_ids UUID[],
  
  -- Configurazione specifica del tipo (JSON)
  type_config JSONB,                  -- Struttura soglie, modalità, etc.
  
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Paletti del template
commissioning_template_paletti (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES commissioning_configurator_templates(id),
  function_id UUID REFERENCES commissioning_functions(id),
  layer_override VARCHAR(20),         -- NULL = usa layer template
  description TEXT,
  sort_order SMALLINT DEFAULT 0
)

-- CAP del template
commissioning_template_caps (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES commissioning_configurator_templates(id),
  function_id UUID REFERENCES commissioning_functions(id),
  layer_override VARCHAR(20),
  behavior VARCHAR(20) NOT NULL,      -- 'block' | 'scale'
  limit_value NUMERIC(12,2),
  description TEXT,
  sort_order SMALLINT DEFAULT 0
)
```

---

## 🎯 LIVELLO 2 - ISTANZA GARA

### Definizione

L'**Istanza** viene creata quando si importa un template in una gara. Contiene i valori specifici per quella gara.

### Struttura Istanza

```
ISTANZA IN GARA
├── Template FK
├── Gara FK
├── Validità (date gara = periodo reset)
│
└── CLUSTER[] (array di cluster con valori specifici)
    │
    ├── CLUSTER A
    │   ├── Nome cluster
    │   ├── Membri (User[] o RS[] - tipo omogeneo!)
    │   ├── Driver ATTIVI (subset dei disponibili nel template)
    │   ├── Pacchetti Valenze abbinati (per driver)
    │   ├── Valori Soglie specifici (override)
    │   └── Funzioni + Operazioni (per driver)
    │
    └── CLUSTER B
        ├── Membri diversi
        └── Valori soglie DIVERSI da Cluster A!
```

### Esempio Concreto

```
Template "Soglie Canvas" (tipo: soglie)
├── Layer: User
├── Driver disponibili: [Valenza, Fatturato]
├── Soglie: 3

ISTANZA GARA GENNAIO 2026:
│
├── CLUSTER "Top Seller"
│   ├── Membri: [Marco, Filippo]
│   ├── Driver attivi: [Valenza]
│   ├── Soglie Valenza:
│   │   ├── 10-20 → 2.0× canoni
│   │   ├── 21-30 → 3.0× canoni
│   │   └── 31+   → 4.0× canoni
│   └── Pacchetto Valenze: PKG_CANVAS_Q1
│
└── CLUSTER "Junior"
    ├── Membri: [Maria, Andrea]
    ├── Driver attivi: [Valenza, Fatturato]
    ├── Soglie Valenza:
    │   ├── 10-20 → 1.5× canoni   ← DIVERSO!
    │   ├── 21-30 → 2.0× canoni
    │   └── 31+   → 2.5× canoni
    ├── Soglie Fatturato:
    │   ├── 0-1000€     → 1.0×
    │   └── 1001-5000€  → 1.5×
    └── Pacchetto Valenze: PKG_CANVAS_Q1
```

### Tabelle Database Istanza

```sql
-- Istanza configuratore in gara
commissioning_configurator_instances (
  id UUID PRIMARY KEY,
  race_id UUID REFERENCES commissioning_races(id),
  template_id UUID REFERENCES commissioning_configurator_templates(id),
  
  -- Configurazione istanza (override template)
  instance_config JSONB,
  
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Cluster dell'istanza
commissioning_instance_clusters (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES commissioning_configurator_instances(id),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) NOT NULL,   -- 'RS' | 'PDV' | 'USER'
  
  -- Driver attivi per questo cluster (subset del template)
  active_driver_ids UUID[],
  
  -- Valori specifici per questo cluster
  cluster_config JSONB,               -- Soglie, operazioni, etc.
  
  -- Pacchetti valenze abbinati
  value_package_ids UUID[],
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Membri del cluster
commissioning_instance_cluster_members (
  id UUID PRIMARY KEY,
  cluster_id UUID REFERENCES commissioning_instance_clusters(id),
  entity_id UUID NOT NULL,            -- ID RS/PDV/User
  entity_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP
)
```

---

## 📊 LAYER DI CALCOLO

### Definizione

Il **Layer** determina il livello di aggregazione per il counting delle vendite.

### Livelli Disponibili

| Layer | Aggregazione | Esempio |
|-------|--------------|---------|
| `RS` | Ragione Sociale | Somma vendite di tutti i PdV della RS |
| `PdV` | Punto Vendita | Somma vendite del singolo PdV |
| `User` | Utente | Conteggio individuale per utente |

### Layer Multipli

Il sistema supporta layer diversi per componenti diversi:

```
CONFIGURATORE
├── Layer PRINCIPALE: User (ogni utente ha il suo conteggio)
│
├── PALETTO "Sblocco Bonus Team"
│   └── Layer Override: RS
│   └── "Si sblocca quando la RS supera 1000 valenza totale"
│
└── CAP "Limite PdV"
    └── Layer Override: PdV
    └── "Max 500 valenza per singolo PdV"
```

### Logica di Valutazione

1. Il **configuratore** calcola sul suo layer principale
2. Ogni **paletto/CAP** con layer override calcola sul proprio layer
3. Il risultato del paletto/CAP influenza il calcolo principale

---

## 👥 CLUSTER (Doppia Funzione)

### Definizione

I **Cluster** hanno una doppia funzione:

| Funzione | Descrizione |
|----------|-------------|
| **Chi Gioca** | Definisce quali entità partecipano |
| **Valori Specifici** | Ogni cluster può avere soglie/parametri diversi |

### Tipologie Membri

| Tipo | Entità | Note |
|------|--------|------|
| `RS` | Ragioni Sociali | `organization_entities` |
| `PdV` | Punti Vendita | `stores` |
| `User` | Utenti | `users` |

> **⚠️ REGOLA**: Un cluster contiene SOLO entità dello stesso tipo. Mai mix RS + PdV + User!

### Esempio Valori Differenziati

```
Stesso Configuratore, Cluster diversi:

CLUSTER A (Marco, Filippo)
├── Soglia 1: 10-20 → 2.0× canoni
├── Soglia 2: 21-30 → 3.0× canoni
└── Soglia 3: 31+   → 4.0× canoni

CLUSTER B (Maria, Andrea)
├── Soglia 1: 10-20 → 1.5× canoni  ← DIVERSO!
├── Soglia 2: 21-30 → 2.0× canoni
└── Soglia 3: 31+   → 2.5× canoni
```

---

## 🎯 DRIVER

### Definizione

I **Driver** sono le metriche target su cui si basa il counting. Sono già definiti nel sistema (pushati da Brand o custom tenant).

### Caratteristiche

- **Già esistenti**: NON si creano nel configuratore
- **Solo FK/Select**: Il configuratore li referenzia
- **Filtrati per compatibilità**: Con il layer scelto

### Modello Ibrido

```
TEMPLATE
├── Driver DISPONIBILI: [Valenza, Fatturato, N.Vendite]
│   └── Definiti a livello template

CLUSTER (in istanza gara)
├── Driver ATTIVI: [Valenza]
│   └── Subset selezionato dal template
│   └── Valori specifici per questo cluster/driver
```

### Metriche Comuni

| Driver | Tipo | Descrizione |
|--------|------|-------------|
| `valenza` | number | Punti valenza accumulati |
| `fatturato` | currency | Fatturato € generato |
| `n_vendite` | number | Numero vendite effettuate |
| `canone` | currency | Canoni mensili |
| `margine` | currency | Margine € |

---

## 🚧 PALETTI vs CAP

### Paletti (Condizioni di Sblocco)

I **Paletti** sono funzioni che **sbloccano** soglie, bonus o gettoni.

```
PALETTO "Produttività Minima"
├── Funzione: @vendite_mese >= 50
├── Layer: User
└── Effetto: Se TRUE → sblocca accesso al bonus
```

### CAP (Limiti di Counting)

I **CAP** sono funzioni che **limitano** il counting di un prodotto.

```
CAP "Limite Valenza Prodotto"
├── Funzione: @valenza_prodotto > 200
├── Layer: PdV
├── Comportamento: blocco | scala
└── Effetto: Se TRUE → stop counting oltre 200 valenza
```

### Comportamento CAP

| Tipo | Descrizione |
|------|-------------|
| `blocco` | Stop counting, non conta oltre il limite |
| `scala` | Riduce proporzionalmente il valore |

---

## 📈 MODALITÀ SOGLIE

### Progressive

Ogni soglia ha il suo valore. Il totale è la **somma** di tutte le fasce.

```
Soglia 1 (10-20): 10 vendite × 1.5× = 15 canoni
Soglia 2 (21-30): 5 vendite × 2.5× = 12.5 canoni
Soglia 3 (31+):   3 vendite × 3.5× = 10.5 canoni
─────────────────────────────────────────────
TOTALE PROGRESSIVO = 38 canoni
```

### Regressive

Raggiunta la soglia massima, **tutto** viene commissionato al valore più alto.

```
Raggiungo Soglia 3 (31+ vendite)
→ TUTTE le 18 vendite × 3.5× = 63 canoni
```

### Reset

Le soglie si resettano in base alla **validità della gara**.

```
Gara Q1 2026: 01/01 - 31/03
├── Reset automatico a fine periodo
└── Nuovo conteggio da zero per Q2
```

---

## 🔧 STRUTTURA OPERAZIONI (Configuratore)

Le **operazioni** sono definite nel configuratore (non nella funzione) e si applicano quando la funzione restituisce TRUE.

### Struttura JSON

```json
{
  "operations": [
    { "target": "gettone_contrattuale", "operator": "multiply", "value": 0.7 },
    { "target": "valenza", "operator": "add", "value": 50 },
    { "target": "canone", "operator": "percentage", "value": 10 }
  ]
}
```

### Operatori Disponibili

| Operatore | Simbolo | Esempio |
|-----------|---------|---------|
| `multiply` | × | `gettone × 1.5` |
| `add` | + | `valenza + 50` |
| `subtract` | − | `canone - 10` |
| `divide` | ÷ | `valore ÷ 2` |
| `percentage` | % | `+10% del valore` |

### Tipi di Valore

| Tipo | Formato | Esempio |
|------|---------|---------|
| Economico | € | `€ 10.00` |
| Numerico | N | `50` |
| Percentuale | % | `10%` |

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
│   │   ├── Pacchetto Valenze (L2)
│   │   ├── Paletti: condizioni da soddisfare
│   │   └── Regole: soglie, %, moltiplicatori (L3)
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
  value_package_id UUID,                -- FK a pacchetto valenze (L2)
  
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
CREATE INDEX idx_value_packages_tenant ON commissioning_value_packages(tenant_id);
CREATE INDEX idx_value_package_items_package ON commissioning_value_package_items(package_id);
CREATE INDEX idx_value_package_items_pricelist ON commissioning_value_package_items(price_list_id);
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

### Tab Impostazioni

**L1 - Variable Mappings:**
- DataTable variabili con filtri
- Modal creazione/modifica variabile

**L2 - Value Packages:**
- DataTable pacchetti con filtri
- Wizard 3 step per creazione/modifica:
  - Step 1: Dati base
  - Step 2: Selezione listini (Canvas/Prodotti con filtri)
  - Step 3: Tabs con griglie prodotti per ogni listino

**L3 - Functions:**
- DataTable funzioni con filtri
- Modal creazione/modifica funzione

**Cluster:**
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
| `price_lists` | Listini associati ai Value Packages (L2) |
| `price_list_items` | Prodotti normali nei listini |
| `price_list_items_canvas` | Prodotti canvas con monthly_fee |
| `channels` | Canali per filtro gare |
| `operators` | Operatori per Gare Operatore e filtro listini Canvas |
| `suppliers` | Fornitori per filtro listini Prodotti |

---

## Task Sviluppo

| # | Task | Stato |
|---|------|-------|
| 1 | Schema DB Cluster + Races + Configurators | ✅ Completato |
| 2 | L1 - Variable Mappings UI + API | ✅ Completato |
| 3 | L2 - Value Packages Multi-Listino + Wizard | ✅ Completato |
| 4 | L2 - Griglia prodotti con bulk edit | ✅ Completato |
| 5 | L3 - Functions UI + API (condizioni logiche) | ✅ Completato |
| 6 | Architettura Configuratori 3 livelli (Tipo/Template/Istanza) | ✅ Completato |
| 7 | Configuratore TIPO "Soglie" (Backend + UI) | ⏳ Pending |
| 8 | Configuratore TIPO "Gettone" (Backend + UI) | ⏳ Pending |
| 9 | Configuratore TIPO "Bonus/Malus" (Backend + UI) | ⏳ Pending |
| 10 | Tab Configuratori - Gestione Template | ⏳ Pending |
| 11 | UI Gare Operatore | ⏳ Pending |
| 12 | UI Gare Interne | ⏳ Pending |
| 13 | Importazione Template in Gara (Istanza) | ⏳ Pending |
| 14 | UI Cluster (Impostazioni) con doppia funzione | ⏳ Pending |
| 15 | Backend Calcolo Commissioning (Engine) | ⏳ Pending |
| 16 | Dashboard Report Gare | ⏳ Pending |

---

*Ultimo aggiornamento: Gennaio 2026 - Architettura Configuratori 3 livelli (Tipo BE/Template/Istanza Gara), Layer di calcolo (RS/PdV/User), Cluster doppia funzione, Paletti vs CAP, Functions come condizioni logiche TRUE/FALSE*
