# Listini Poliformi - Brainstorming & Design Document

> **Documento di lavoro** - Aggiornato man mano che procediamo con l'analisi e lo sviluppo
> 
> **Ultimo aggiornamento**: 17 Dicembre 2025
> 
> **Stato**: 🟡 In Review - Architettura da raffinare

---

## ⚠️ Punti Critici da Risolvere (Review 17/12/2025)

| # | Area | Issue | Azione Richiesta |
|---|------|-------|------------------|
| 1 | **Schema DB** | Conflitto convenzioni ID (varchar+nanoid vs UUID) | Allineare con pattern esistenti w3suite |
| 2 | **RLS** | Manca strategia Row Level Security | Documentare RLS policy per multi-tenancy |
| 3 | **Brand→Tenant** | Manca propagazione brand_price_lists → tenant copies | Definire flusso publishing |
| 4 | **Priorità** | Manca tiebreaker deterministico se stessa priorità | Aggiungere `createdAt` come secondary sort |
| 5 | **Stacking** | Regole non chiare per sconti cumulativi | Definire: override vs accumulate |
| 6 | **computedPrice** | Denormalizzazione senza strategia refresh | Definire job/worker per ricalcolo |
| 7 | **Product Version** | Cosa succede quando cambia product_versions? | Invalidazione cache + recalc |
| 8 | **API** | Mancano specifiche validazione, pagination, errori | Completare contract |

---

## 1. Stato Attuale del Sistema

### 1.1 Cosa Esiste

#### Database Schema (brand_interface)
```sql
-- Tabella brand_price_lists (Brand Interface - HQ)
brand_price_lists
├── id (UUID)
├── code (varchar unique)
├── name (varchar)
├── description (text)
├── validFrom (timestamp)
├── validTo (timestamp)  
├── isActive (boolean)
├── priority (integer) -- Per overlapping pricelists
├── currencyCode (varchar, default 'EUR')
├── metadata (jsonb)
├── createdAt, updatedAt
```

#### Database Schema (w3suite)
```sql
-- Tabella product_versions (Versioning prezzi prodotto)
product_versions
├── id (UUID)
├── tenantId
├── productId → products.id
├── version (integer incrementale)
├── monthlyFee (numeric) -- Canone mensile
├── unitPrice (numeric)  -- Prezzo vendita
├── costPrice (numeric)  -- Costo base
├── validFrom, validTo   -- Validità temporale
├── changeReason ('correction' | 'business_change')
├── createdBy, createdAt
```

#### Frontend (Placeholder)
- `apps/frontend/web/src/pages/wms/PriceListsPage.tsx` - Pagina vuota "In Arrivo"
- `apps/frontend/web/src/components/wms/ListiniTabContent.tsx` - Tab con DataTable vuota
- `apps/frontend/brand-web/src/components/wms/BrandPriceListsTab.tsx` - Brand Interface tab

### 1.2 Cosa Manca

1. **Tabella `price_list_items`** - Collegamento listino → prodotto con prezzo specifico
2. **Regole di applicabilità** - Condizioni per applicare un listino (cliente, canale, volume, etc.)
3. **Gerarchia listini** - Cascading/override tra listini diversi
4. **API Backend** - CRUD e calcolo prezzo effettivo
5. **Frontend funzionale** - Modal creazione, gestione items, preview prezzi

---

## 2. Requisiti Business (Da Validare)

### 2.1 Tipologie di Listino

| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| **Base** | Listino default, sempre applicato | "Listino Pubblico 2025" |
| **Cliente** | Specifico per singolo cliente/gruppo | "Accordo Quadro TIM Retail" |
| **Canale** | Per canale di vendita | "Listino E-commerce", "Listino Dealer" |
| **Promozionale** | Temporaneo, validità limitata | "Black Friday 2025" |
| **Volume** | Basato su quantità acquistata | "Sconto da 100+ pezzi" |
| **Geografico** | Per area commerciale | "Listino Sud Italia" |

### 2.2 Struttura Prezzo Prodotto

Un prodotto WindTre può avere:

```
┌─────────────────────────────────────────────────────────┐
│ PRODOTTO: iPhone 15 Pro 256GB                           │
├─────────────────────────────────────────────────────────┤
│ Prezzo Base (da product_versions):                      │
│   - unitPrice: €1.199,00                                │
│   - costPrice: €950,00                                  │
│   - monthlyFee: €0 (no canone per device puro)          │
├─────────────────────────────────────────────────────────┤
│ Listino "Dealer Gold":                                  │
│   - Sconto: -15%                                        │
│   - Prezzo Finale: €1.019,15                            │
├─────────────────────────────────────────────────────────┤
│ Listino "Black Friday" (priorità alta, temporaneo):     │
│   - Override: €999,00 (prezzo fisso)                    │
│   - Prezzo Finale: €999,00 ✓                            │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Regole di Priorità

```
1. Listino Promozionale (se attivo e in validità) → MASSIMA PRIORITÀ
2. Listino Cliente Specifico → override altri listini
3. Listino Canale → applicato se match
4. Listino Volume → applicato a soglia raggiunta
5. Listino Base → DEFAULT, sempre presente
```

---

## 3. Architettura Proposta

### 3.1 Modello Dati

#### Tabella `price_lists` (w3suite schema - Tenant)

```typescript
// Schema Drizzle
export const priceLists = w3suiteSchema.table("price_lists", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull().references(() => tenants.id),
  
  // Identificazione
  code: varchar("code", { length: 50 }).notNull(), // "PL-2025-BASE", "PL-BF-2025"
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Tipo e priorità
  type: varchar("type", { length: 50 }).notNull(), // 'base' | 'customer' | 'channel' | 'promo' | 'volume' | 'geographic'
  priority: integer("priority").default(0).notNull(), // Higher = more priority
  
  // Validità
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"), // NULL = no expiration
  isActive: boolean("is_active").default(true).notNull(),
  
  // Scoping (quando applicare)
  applicabilityRules: jsonb("applicability_rules").default({}).notNull(),
  // Esempio: { "channels": ["dealer", "retail"], "minQuantity": 10, "customerGroups": ["gold"] }
  
  // Metadata
  currencyCode: varchar("currency_code", { length: 3 }).default('EUR').notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 100 }),
});
```

#### Tabella `price_list_items` (w3suite schema - Tenant)

```typescript
export const priceListItems = w3suiteSchema.table("price_list_items", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull().references(() => tenants.id),
  
  // FK
  priceListId: varchar("price_list_id", { length: 100 }).notNull().references(() => priceLists.id),
  productId: varchar("product_id", { length: 100 }).notNull().references(() => products.id),
  productVersionId: varchar("product_version_id", { length: 100 }), // Opzionale: lock versione specifica
  
  // Tipo di pricing
  pricingType: varchar("pricing_type", { length: 20 }).notNull(), // 'fixed' | 'discount_percent' | 'discount_amount' | 'markup_percent'
  
  // Valori
  fixedPrice: numeric("fixed_price", { precision: 12, scale: 2 }), // Se pricingType = 'fixed'
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }), // Se pricingType = 'discount_percent'
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }), // Se pricingType = 'discount_amount'
  markupPercent: numeric("markup_percent", { precision: 5, scale: 2 }), // Se pricingType = 'markup_percent'
  
  // Prezzi calcolati (denormalizzati per performance)
  computedPrice: numeric("computed_price", { precision: 12, scale: 2 }).notNull(),
  
  // Override canone (per prodotti con monthlyFee)
  monthlyFeeOverride: numeric("monthly_fee_override", { precision: 12, scale: 2 }),
  
  // Validità item (può essere diversa dal listino padre)
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").default(true).notNull(),
  
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3.2 API Design

```
GET    /api/price-lists                     # Lista listini tenant
POST   /api/price-lists                     # Crea listino
GET    /api/price-lists/:id                 # Dettaglio listino
PUT    /api/price-lists/:id                 # Modifica listino
DELETE /api/price-lists/:id                 # Elimina listino (soft delete)

GET    /api/price-lists/:id/items           # Items di un listino
POST   /api/price-lists/:id/items           # Aggiungi prodotto a listino
PUT    /api/price-lists/:id/items/:itemId   # Modifica item
DELETE /api/price-lists/:id/items/:itemId   # Rimuovi item

# Calcolo prezzo effettivo
POST   /api/pricing/calculate               # Calcola prezzo per contesto
       Body: { productId, quantity, customerId?, channel?, storeId? }
       Response: { basePrice, discounts[], finalPrice, appliedPriceList }
```

### 3.3 Logica Calcolo Prezzo

```typescript
interface PricingContext {
  tenantId: string;
  productId: string;
  quantity: number;
  customerId?: string;
  customerGroup?: string;
  channel?: 'retail' | 'dealer' | 'ecommerce' | 'corporate';
  storeId?: string;
  commercialAreaId?: string;
  date?: Date; // Default: now
}

interface PricingResult {
  basePrice: number;           // Da product_versions
  monthlyFee: number;          // Da product_versions (se applicabile)
  appliedDiscounts: Discount[];
  finalUnitPrice: number;
  finalMonthlyFee: number;
  appliedPriceListId: string;
  appliedPriceListName: string;
  breakdown: PriceBreakdown;
}

async function calculatePrice(ctx: PricingContext): Promise<PricingResult> {
  // 1. Get base price from product_versions (latest active)
  const basePrice = await getProductVersionPrice(ctx.productId, ctx.date);
  
  // 2. Find applicable price lists (sorted by priority DESC)
  const applicableLists = await findApplicablePriceLists(ctx);
  
  // 3. Apply highest priority list that has this product
  for (const list of applicableLists) {
    const item = await getPriceListItem(list.id, ctx.productId);
    if (item) {
      return computeFinalPrice(basePrice, item, list);
    }
  }
  
  // 4. No special pricing → return base
  return { ...basePrice, appliedPriceListId: null };
}
```

---

## 4. Flusso Utente (UX)

### 4.1 Brand Interface (HQ)

```
┌─────────────────────────────────────────────────────────────────┐
│ WMS > Catalogo > Listini                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Nuovo Listino]   [Importa CSV]   [Esporta]                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 📋 Listino Base 2025          BASE    ✅ Attivo          │   │
│  │    Dal 01/01/2025 - Senza scadenza                       │   │
│  │    1.247 prodotti | Priorità: 0                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🏷️ Black Friday 2025          PROMO   ✅ Attivo          │   │
│  │    Dal 25/11/2025 al 02/12/2025                          │   │
│  │    89 prodotti | Priorità: 100                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Modal Creazione Listino

```
┌─────────────────────────────────────────────────────────────────┐
│ Nuovo Listino                                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Codice *        [PL-2025-001        ]                          │
│  Nome *          [Listino Dealer Gold ]                         │
│  Descrizione     [Prezzi riservati partner Gold...           ]  │
│                                                                 │
│  Tipo Listino *  [▼ Cliente Specifico ]                         │
│                  ○ Base (default)                               │
│                  ○ Cliente Specifico                            │
│                  ○ Canale                                       │
│                  ○ Promozionale                                 │
│                  ○ Volume                                       │
│                  ○ Geografico                                   │
│                                                                 │
│  ─────────────── Validità ───────────────                       │
│                                                                 │
│  Data Inizio *   [📅 01/01/2025]                                │
│  Data Fine       [📅 ___________]  ☐ Senza scadenza             │
│                                                                 │
│  Priorità        [50___] (0-100, alto = prioritario)            │
│                                                                 │
│  ─────────────── Applicabilità ───────────────                  │
│                                                                 │
│  Canali          [☑ Dealer] [☐ Retail] [☐ E-commerce]           │
│  Gruppi Cliente  [▼ Gold, Platinum     ]                        │
│  Aree Commerc.   [▼ Tutte              ]                        │
│  Quantità Min.   [1____]                                        │
│                                                                 │
│                              [Annulla]  [Salva e Aggiungi Prodotti] │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Gestione Items Listino

```
┌─────────────────────────────────────────────────────────────────┐
│ Listino: Dealer Gold (PL-2025-001)                   [← Indietro] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Aggiungi Prodotti]  [Importa Prezzi CSV]  [Azioni Bulk ▼]   │
│                                                                 │
│  🔍 [Cerca prodotto...]                                         │
│                                                                 │
│  ┌────────┬──────────────────┬─────────┬──────────┬──────────┐  │
│  │ SKU    │ Prodotto         │ P.Base  │ Sconto   │ P.Finale │  │
│  ├────────┼──────────────────┼─────────┼──────────┼──────────┤  │
│  │ IPH15P │ iPhone 15 Pro    │€1.199   │ -15%     │ €1.019   │  │
│  │ GAL24U │ Galaxy S24 Ultra │€1.399   │ €150 off │ €1.249   │  │
│  │ SIM001 │ SIM WindTre      │€5,00    │ Fisso €3 │ €3,00    │  │
│  └────────┴──────────────────┴─────────┴──────────┴──────────┘  │
│                                                                 │
│  Mostrando 1-50 di 247 prodotti                    [< 1 2 3 >]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Domande Aperte (Da Discutere)

### 5.1 Business Rules

1. **Un prodotto può essere in più listini contemporaneamente?**
   - Proposta: SÌ, il sistema usa priorità per determinare quale applicare

2. **Cosa succede se un listino scade mentre un ordine è in corso?**
   - Proposta: Il prezzo viene "cristallizzato" al momento dell'ordine

3. **I listini sono ereditati da Brand → Tenant o ogni tenant ha i suoi?**
   - Proposta: Brand Interface crea "template" che i tenant possono personalizzare

4. **Servono listini a livello negozio (store) oltre che tenant?**
   - Da validare con stakeholder

### 5.2 Integrazioni

1. **Come si integra con il modulo Commissioning?**
   - I bonus agente dipendono dal listino applicato?

2. **Come si integra con CRM Opportunità/Ordini?**
   - L'opportunità deve mostrare prezzo da listino cliente

3. **Sincronizzazione con ERP esterno?**
   - Previsto import/export CSV? API bidirezionale?

### 5.3 Performance

1. **Quanti listini attivi contemporaneamente per tenant?**
   - Stima: 5-20 listini attivi

2. **Quanti items per listino?**
   - Stima: 100-2000 prodotti per listino

3. **Frequenza calcolo prezzo?**
   - Ogni visualizzazione catalogo → cache necessaria

---

## 6. Roadmap Implementazione

### Fase 1 - MVP (2-3 giorni)
- [ ] Schema DB `price_lists` + `price_list_items`
- [ ] CRUD API listini
- [ ] UI creazione/gestione listino base
- [ ] Collegamento prodotti a listino (manual)

### Fase 2 - Calcolo Prezzi (1-2 giorni)
- [ ] Servizio `PricingService` con logica priorità
- [ ] Endpoint `/api/pricing/calculate`
- [ ] Cache prezzi calcolati (Redis o in-memory)

### Fase 3 - Applicabilità Avanzata (2 giorni)
- [ ] Regole per canale, cliente, volume
- [ ] UI filtri applicabilità nel modal
- [ ] Preview "chi vedrà questo listino"

### Fase 4 - Integrazioni (1-2 giorni)
- [ ] Integrazione con Product Modal (mostra prezzo listino)
- [ ] Integrazione con CRM Opportunità
- [ ] Import/Export CSV

---

## 7. Note Sessioni di Lavoro

### Sessione 17/12/2025
- Creato documento iniziale
- Analizzato stato attuale schema DB
- Proposta architettura base
- Da validare requisiti business con stakeholder
- **Review Architect**: Identificati 8 punti critici (vedi tabella inizio documento)
  - Schema ID deve allinearsi a convenzioni esistenti
  - Manca strategia RLS
  - Manca flusso Brand→Tenant publishing
  - Definire tiebreaker priorità e regole stacking

---

## 8. Decisioni Architetturali (ADR)

### ADR-001: Stacking vs Override (DA DECIDERE)

**Problema**: Quando un prodotto matcha più listini, come si combinano gli sconti?

**Opzioni**:

| Opzione | Comportamento | Pro | Contro |
|---------|---------------|-----|--------|
| **A) Override puro** | Vince listino priorità più alta, altri ignorati | Semplice, prevedibile | Meno flessibile |
| **B) Stacking cumulativo** | Tutti gli sconti si sommano/moltiplicano | Massima flessibilità | Complesso, può dare prezzi negativi |
| **C) Override + Base** | Listino vincente si applica sopra Base | Bilanciato | Richiede distinzione "additive" vs "override" |

**Proposta**: Opzione A (Override puro) per MVP, poi valutare C.

---

### ADR-002: Brand→Tenant Publishing Flow (DA DECIDERE)

**Problema**: Come i listini creati in Brand Interface diventano disponibili ai tenant?

**Flusso proposto**:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   BRAND     │      │   DEPLOY    │      │   TENANT    │
│  INTERFACE  │──────│   CENTER    │──────│   W3SUITE   │
└─────────────┘      └─────────────┘      └─────────────┘
     │                     │                     │
     │ 1. Crea listino     │                     │
     │    (template)       │                     │
     │─────────────────────│                     │
     │                     │                     │
     │ 2. Pubblica a       │                     │
     │    tenant selezionati                     │
     │─────────────────────│                     │
     │                     │ 3. Clone listino    │
     │                     │    in w3suite.      │
     │                     │    price_lists      │
     │                     │─────────────────────│
     │                     │                     │
     │                     │                     │ 4. Tenant può
     │                     │                     │    personalizzare
     │                     │                     │    (opzionale)
```

**Campo tracking**: `sourceBrandPriceListId` + `isLocked` per distinguere copie modificabili/bloccate.

---

### ADR-003: computedPrice Refresh Strategy (DA IMPLEMENTARE)

**Problema**: Il campo `computedPrice` è denormalizzato. Come mantenerlo aggiornato?

**Trigger di invalidazione**:
1. Modifica `product_versions.unitPrice`
2. Modifica `price_list_items` (sconto, tipo)
3. Scadenza validità listino

**Strategie**:

| Strategia | Quando | Pro | Contro |
|-----------|--------|-----|--------|
| **Eager (on-write)** | Ricalcola subito dopo ogni modifica | Sempre aggiornato | Costoso se bulk update |
| **Lazy (on-read)** | Ricalcola al primo accesso dopo invalidazione | Efficiente | Prima lettura lenta |
| **Scheduled (cron)** | Job notturno ricalcola tutto | Semplice | Dati potenzialmente stale |

**Proposta**: Eager per modifiche singole, Scheduled per bulk/expiration.

---

## Appendice A - Glossario

| Termine | Definizione |
|---------|-------------|
| **Listino Base** | Listino default applicato quando nessun altro matcha |
| **Listino Override** | Listino con priorità alta che sovrascrive altri |
| **Price List Item** | Singola entry prodotto-prezzo in un listino |
| **Pricing Context** | Insieme di parametri per calcolare il prezzo (cliente, canale, qty) |
| **Computed Price** | Prezzo finale calcolato dopo applicazione sconti |

## Appendice B - Riferimenti

- WMS Architecture: `docs/WMS-ARCHITECTURE.md`
- Product Versioning: Sezione 2 di WMS-ARCHITECTURE.md
- Brand Price Lists Schema: `apps/backend/api/src/db/schema/brand-interface.ts`
