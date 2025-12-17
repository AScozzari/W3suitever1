# Listini Poliformi - Brainstorming & Design Document

> **Documento di lavoro** - Aggiornato man mano che procediamo con l'analisi e lo sviluppo
> 
> **Ultimo aggiornamento**: 17 Dicembre 2025
> 
> **Stato**: 🟡 In Review - Architettura da raffinare

---

## 🎯 Concept Fondamentale

I **Listini Poliformi** sono listini che **cambiano forma** in base al tipo di prodotto. Sono **IBRIDI** perché contengono sia informazioni di **ACQUISTO** che di **VENDITA** nello stesso record, con gestione fiscale italiana completa.

---

## 1. Struttura IBRIDA dei Listini

### 1.1 Campi Lato ACQUISTO (📦 Cosa Paghiamo)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `purchaseCost` | numeric(12,2) | Costo acquisto da fornitore (netto) |
| `purchaseTaxRegimeId` | FK | Regime fiscale acquisto (Ordinario, Forfettario, etc.) |
| `purchaseVatRate` | numeric(5,2) | Aliquota IVA acquisto % (22%, 10%, 4%, 0%) |
| `supplierId` | FK → suppliers | Fornitore del prodotto |

### 1.2 Campi Lato VENDITA (💰 Cosa Incassiamo)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `salesPriceVatIncl` | numeric(12,2) | Prezzo vendita **IVA inclusa** (quello che paga il cliente) |
| `salesPriceNet` | numeric(12,2) | *(calcolato)* Prezzo netto = salesPriceVatIncl / (1 + vatRate) |
| `salesTaxRegimeId` | FK | Regime fiscale vendita |
| `salesVatRate` | numeric(5,2) | Aliquota IVA vendita % |
| `marginAmount` | numeric(12,2) | *(calcolato)* Margine € = salesPriceNet - purchaseCost |
| `marginPercent` | numeric(5,2) | *(calcolato)* Margine % = marginAmount / purchaseCost * 100 |

### 1.3 Validità e Versioning

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `validFrom` | timestamp | Data/ora inizio validità |
| `validTo` | timestamp | Data/ora fine validità (NULL = senza scadenza) |
| `version` | integer | Numero versione (1, 2, 3...) |
| `previousVersionId` | FK | Punta alla versione precedente |
| `changeReason` | enum | 'correction' \| 'price_update' \| 'promo' \| 'supplier_change' |

### 1.4 Origine (Brand vs Tenant)

| Campo | Valore | Significato |
|-------|--------|-------------|
| `origin` | `'brand'` | Creato da Brand Interface (HQ), pushato ai tenant |
| `origin` | `'tenant'` | Creato localmente dal tenant |
| `isLocked` | `true` | Tenant NON può modificare (aggiornato solo da Brand) |
| `isLocked` | `false` | Tenant può fare fork e personalizzare |
| `sourceBrandVersionId` | UUID | Traccia la versione Brand da cui deriva |

---

## 2. Struttura per Tipo Prodotto (POLIFORMA)

### 2.1 Prodotti PHYSICAL, VIRTUAL, SERVICE

Questi tre tipi hanno struttura **identica**:

```
┌─────────────────────────────────────────────────────────────────┐
│ LISTINO ITEM - PHYSICAL/VIRTUAL/SERVICE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 ACQUISTO                      💰 VENDITA                    │
│  ─────────────────                ─────────────────             │
│  • Costo acquisto: €800           • Prezzo IVA incl: €1.199     │
│  • Regime fiscale: Ordinario      • Regime fiscale: Ordinario   │
│  • Aliquota IVA: 22%              • Aliquota IVA: 22%           │
│  • Fornitore: TIM SpA             • Prezzo netto: €982,79       │
│                                   • Margine: €182,79 (22,8%)    │
│                                                                 │
│  ⏰ VALIDITÀ                                                    │
│  ─────────────────                                              │
│  • Dal: 01/01/2025 00:00                                        │
│  • Al: 31/12/2025 23:59                                         │
│  • Versione: 3                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Prodotti CANVAS (Offerte Composite)

I **CANVAS** hanno struttura **DIVERSA**:

```
┌─────────────────────────────────────────────────────────────────┐
│ LISTINO ITEM - CANVAS (Offerta Composita)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ NESSUN COSTO ACQUISTO                                       │
│  (Non è un prodotto fisico da comprare)                         │
│                                                                 │
│  💳 CANONE CLIENTE                                              │
│  ─────────────────                                              │
│  • Canone mensile: €29,99/mese                                  │
│  • Durata contratto: 24 mesi (opzionale)                        │
│  • Costo attivazione: €49,00 una tantum (opzionale)             │
│                                                                 │
│  🎯 USO PRINCIPALE: COMMISSIONING                               │
│  ─────────────────                                              │
│  • Il canone alimenta il calcolo dei bonus agente               │
│  • Non genera movimento di cassa acquisto                       │
│  • Ricavo = canone cliente                                      │
│                                                                 │
│  📦 COMPONENTI INCLUSI (opzionale)                              │
│  ─────────────────                                              │
│  • SIM WindTre (SKU: SIM-W3-001)                                │
│  • Router Fibra (SKU: RTR-FIBRA-01)                             │
│  • Attivazione Linea (SKU: SRV-ATT-01)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Tabella Riepilogativa per Tipo

| Tipo | Ha Costo Acquisto? | Ha Fornitore? | Ha Canone? | Uso Principale |
|------|-------------------|---------------|------------|----------------|
| **PHYSICAL** | ✅ Sì | ✅ Sì | ❌ No | Margine vendita |
| **VIRTUAL** | ✅ Sì | ✅ Sì | ❌ No | Margine vendita |
| **SERVICE** | ✅ Sì | ✅ Sì | ❌ No | Margine vendita |
| **CANVAS** | ❌ No | ❌ No | ✅ Sì | **Commissioning** |

---

## 3. Schema Database Proposto

### 3.1 Tabella `price_lists` (Header Listino)

```typescript
export const priceLists = w3suiteSchema.table("price_lists", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  
  // Identificazione
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Tipo e priorità
  type: varchar("type", { length: 50 }).notNull(), // 'base' | 'customer' | 'channel' | 'promo' | 'volume' | 'geographic'
  priority: integer("priority").default(0).notNull(),
  
  // Origine
  origin: varchar("origin", { length: 20 }).default('tenant').notNull(), // 'brand' | 'tenant'
  isLocked: boolean("is_locked").default(false).notNull(),
  sourceBrandPriceListId: varchar("source_brand_price_list_id", { length: 100 }),
  
  // Validità (a livello listino)
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").default(true).notNull(),
  
  // Versioning header
  currentVersion: integer("current_version").default(1).notNull(),
  
  // Metadata
  currencyCode: varchar("currency_code", { length: 3 }).default('EUR').notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 100 }),
});
```

### 3.2 Tabella `price_list_versions` (Versioning Immutabile)

```typescript
export const priceListVersions = w3suiteSchema.table("price_list_versions", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  priceListId: varchar("price_list_id", { length: 100 }).notNull(),
  
  // Versioning
  version: integer("version").notNull(), // 1, 2, 3...
  previousVersionId: varchar("previous_version_id", { length: 100 }),
  
  // Validità versione
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"), // NULL = versione corrente
  
  // Motivo cambio
  changeReason: varchar("change_reason", { length: 50 }).notNull(), // 'initial' | 'correction' | 'price_update' | 'promo' | 'supplier_change'
  changeNotes: text("change_notes"),
  
  // Tracking Brand
  sourceBrandVersionId: varchar("source_brand_version_id", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 100 }),
});
```

### 3.3 Tabella `price_list_items` (Item con struttura IBRIDA)

```typescript
export const priceListItems = w3suiteSchema.table("price_list_items", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  
  // FK
  priceListId: varchar("price_list_id", { length: 100 }).notNull(),
  priceListVersionId: varchar("price_list_version_id", { length: 100 }).notNull(),
  productId: varchar("product_id", { length: 100 }).notNull(),
  productType: varchar("product_type", { length: 20 }).notNull(), // 'PHYSICAL' | 'VIRTUAL' | 'SERVICE' | 'CANVAS'
  
  // ═══════════════════════════════════════════════════════════════
  // 📦 LATO ACQUISTO (NULL per CANVAS)
  // ═══════════════════════════════════════════════════════════════
  purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }),
  purchaseTaxRegimeId: varchar("purchase_tax_regime_id", { length: 100 }),
  purchaseVatRate: numeric("purchase_vat_rate", { precision: 5, scale: 2 }),
  supplierId: varchar("supplier_id", { length: 100 }),
  
  // ═══════════════════════════════════════════════════════════════
  // 💰 LATO VENDITA (per PHYSICAL, VIRTUAL, SERVICE)
  // ═══════════════════════════════════════════════════════════════
  salesPriceVatIncl: numeric("sales_price_vat_incl", { precision: 12, scale: 2 }),
  salesPriceNet: numeric("sales_price_net", { precision: 12, scale: 2 }), // Calcolato
  salesTaxRegimeId: varchar("sales_tax_regime_id", { length: 100 }),
  salesVatRate: numeric("sales_vat_rate", { precision: 5, scale: 2 }),
  
  // Margini calcolati
  marginAmount: numeric("margin_amount", { precision: 12, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
  
  // ═══════════════════════════════════════════════════════════════
  // 💳 CAMPI SPECIFICI CANVAS
  // ═══════════════════════════════════════════════════════════════
  monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }), // Canone mensile cliente
  contractDurationMonths: integer("contract_duration_months"), // 12, 24, 36 mesi
  activationCost: numeric("activation_cost", { precision: 12, scale: 2 }), // Costo attivazione una tantum
  includedComponents: jsonb("included_components").default([]), // Array di { productId, quantity }
  
  // ═══════════════════════════════════════════════════════════════
  // 🎯 COMMISSIONING (per CANVAS)
  // ═══════════════════════════════════════════════════════════════
  commissionBase: numeric("commission_base", { precision: 12, scale: 2 }), // Base per calcolo bonus agente
  commissionCategory: varchar("commission_category", { length: 50 }), // Categoria per regole commissioning
  
  // Validità item (può essere diversa dal listino)
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").default(true).notNull(),
  
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3.4 Tabelle Lookup Fiscali

```typescript
// Regimi Fiscali Italiani
export const taxRegimes = w3suiteSchema.table("tax_regimes", {
  id: varchar("id", { length: 100 }).primaryKey(),
  code: varchar("code", { length: 20 }).notNull(), // 'RF01', 'RF02', etc.
  name: varchar("name", { length: 100 }).notNull(), // 'Ordinario', 'Forfettario', etc.
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Aliquote IVA
export const vatRates = w3suiteSchema.table("vat_rates", {
  id: varchar("id", { length: 100 }).primaryKey(),
  code: varchar("code", { length: 10 }).notNull(), // '22', '10', '4', '0'
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(), // 22.00, 10.00, 4.00, 0.00
  name: varchar("name", { length: 100 }).notNull(), // 'Aliquota ordinaria', 'Aliquota ridotta', etc.
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});
```

---

## 4. Regimi Fiscali Italiani

### 4.1 Codici Regime Fiscale (SDI)

| Codice | Nome | Descrizione |
|--------|------|-------------|
| RF01 | **Ordinario** | Regime IVA ordinario |
| RF02 | Contribuenti minimi | Art.1 c.96-117 L.244/2007 |
| RF04 | Agricoltura | Regime speciale agricoltura |
| RF05 | Pesca | Regime speciale pesca |
| RF06 | Vendita sali e tabacchi | Regime speciale |
| RF07 | Commercio fiammiferi | Regime speciale |
| RF08 | Editoria | Regime speciale editoria |
| RF09 | Gestione telefoni pubblici | Regime speciale |
| RF10 | Rivendita documenti trasporto | Regime speciale |
| RF11 | Agenzie viaggi | Regime speciale |
| RF12 | Agriturismo | Regime speciale |
| RF13 | Vendite a domicilio | Regime speciale |
| RF14 | Rivendita beni usati | Regime margine beni usati |
| RF15 | Agenzie aste | Regime margine |
| RF16 | IVA per cassa | Regime IVA per cassa |
| RF17 | IVA per cassa P.A. | IVA per cassa con P.A. |
| RF18 | Altro | Altri regimi speciali |
| RF19 | **Forfettario** | Regime forfettario L.190/2014 |

### 4.2 Aliquote IVA Italia

| Aliquota | Nome | Applicazione Tipica |
|----------|------|---------------------|
| **22%** | Ordinaria | Elettronica, accessori, servizi standard |
| **10%** | Ridotta | Alcuni servizi, ristorazione |
| **5%** | Super-ridotta | Alcuni beni prima necessità |
| **4%** | Minima | Alimentari base, libri, giornali |
| **0%** | Esente/Non imponibile | Esportazioni, operazioni esenti art.10 |

---

## 5. Flusso Brand → Tenant

### 5.1 Publishing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BRAND INTERFACE (HQ)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Brand crea "Listino Base 2025" (template)                   │
│     → origin: 'brand'                                           │
│     → Items con prezzi acquisto/vendita                         │
│                                                                 │
│  2. Brand seleziona tenant destinatari                          │
│     → [x] Tenant Milano                                         │
│     → [x] Tenant Roma                                           │
│     → [ ] Tenant Napoli                                         │
│                                                                 │
│  3. Brand sceglie modalità:                                     │
│     → ○ Locked (tenant non può modificare)                      │
│     → ● Unlocked (tenant può fare fork)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DEPLOY CENTER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  4. Worker clona listino per ogni tenant selezionato            │
│     → Crea price_lists con origin='brand'                       │
│     → Crea price_list_versions (v1)                             │
│     → Copia tutti price_list_items                              │
│     → Imposta sourceBrandPriceListId per tracking               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TENANT W3SUITE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5a. Se LOCKED:                                                 │
│      → Tenant vede listino in sola lettura                      │
│      → Aggiornamenti Brand sovrascrivono automaticamente        │
│                                                                 │
│  5b. Se UNLOCKED:                                               │
│      → Tenant può fare "Fork" e creare versione locale          │
│      → Nuova versione: origin='tenant', source = versione brand │
│      → Aggiornamenti Brand NON sovrascrivono il fork            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Gestione Aggiornamenti Brand

| Scenario | Listino Tenant | Comportamento |
|----------|----------------|---------------|
| Brand pubblica v2 | Locked, nessun fork | Auto-aggiornato a v2 |
| Brand pubblica v2 | Unlocked, nessun fork | Proposto aggiornamento (accept/ignore) |
| Brand pubblica v2 | Fork locale esistente | Ignorato (tenant ha versione custom) |
| Tenant fa fork | Qualsiasi | origin diventa 'tenant', tracking mantenuto |

---

## 6. Integrazione con Commissioning

### 6.1 Come i Listini CANVAS alimentano il Commissioning

```
┌─────────────────────────────────────────────────────────────────┐
│ VENDITA OFFERTA CANVAS                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agente vende: "SuperFibra 1Giga + iPhone 15"                   │
│                                                                 │
│  Dal Listino CANVAS:                                            │
│  ├── monthlyFee: €39,99/mese                                    │
│  ├── commissionBase: €39,99 (base calcolo)                      │
│  └── commissionCategory: 'fibra_bundle'                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ MOTORE COMMISSIONING                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Regola: "fibra_bundle" → bonus = commissionBase * 2            │
│                                                                 │
│  Calcolo:                                                       │
│  └── Bonus agente = €39,99 * 2 = €79,98                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Differenza con Prodotti PHYSICAL

| Tipo | Cosa determina il Commissioning? |
|------|----------------------------------|
| **CANVAS** | `monthlyFee` + `commissionBase` + `commissionCategory` |
| **PHYSICAL** | `marginAmount` (margine vendita) o regole fisse |

---

## 7. Versioning Strategy

### 7.1 Principio: Righe Immutabili

Ogni modifica a un listino crea una **nuova versione**. Le versioni precedenti rimangono intatte per:
- Audit trail
- Report storici
- Riferimento ordini passati

### 7.2 Flusso Creazione Nuova Versione

```
Listino "Base 2025" versione 1
├── validFrom: 01/01/2025
├── validTo: NULL (attivo)
└── Items: 500 prodotti

              │
              │ Utente modifica prezzo iPhone
              ▼

Listino "Base 2025" versione 2
├── validFrom: 15/03/2025
├── validTo: NULL (attivo)
├── previousVersionId: → versione 1
├── changeReason: 'price_update'
└── Items: 500 prodotti (con iPhone aggiornato)

(Versione 1 ora ha validTo: 14/03/2025 23:59:59)
```

### 7.3 Riferimento da Ordini

Quando si crea un ordine:
```typescript
order = {
  productId: 'iphone-15',
  priceListVersionId: 'v2', // ← Cristallizza la versione listino
  priceAtOrder: 1199.00,    // ← Prezzo al momento dell'ordine
  ...
}
```

Questo garantisce che i report storici mostrino sempre il prezzo corretto.

---

## 8. Domande Aperte (Da Discutere)

### 8.1 Business Rules

1. ~~Un prodotto può essere in più listini contemporaneamente?~~ ✅ SÌ, priorità determina quale applicare

2. **I regimi fiscali acquisto e vendita possono essere diversi?**
   - Es: acquisto da fornitore estero (regime import) vs vendita italiana
   - Proposta: SÌ, sono campi separati

3. **Il CANVAS può avere anche un prezzo una tantum oltre al canone?**
   - Proposta: SÌ, campo `activationCost` per costo attivazione

4. **I componenti inclusi nel CANVAS hanno prezzi propri o solo riferimento?**
   - Proposta: Solo riferimento (productId), prezzi da rispettivi listini

### 8.2 Validazione Campi per Tipo

| Tipo Prodotto | Campi OBBLIGATORI | Campi VIETATI |
|---------------|-------------------|---------------|
| PHYSICAL | purchaseCost, supplierId, salesPriceVatIncl | monthlyFee, activationCost |
| VIRTUAL | purchaseCost, supplierId, salesPriceVatIncl | monthlyFee, activationCost |
| SERVICE | purchaseCost, supplierId, salesPriceVatIncl | monthlyFee, activationCost |
| **CANVAS** | monthlyFee | purchaseCost, supplierId |

### 8.3 Margini per CANVAS

**Problema**: CANVAS non ha `purchaseCost`, quindi `marginPercent` non ha senso.

**Soluzione**:
- `marginAmount` e `marginPercent` → **NULL** per CANVAS
- Il "margine" di un CANVAS è il `monthlyFee` stesso (100% ricavo)
- Per Commissioning usare `commissionBase`, non il margine

### 8.4 Performance

1. **Cache prezzi calcolati?**
   - Proposta: Redis cache con invalidazione su modifica listino

2. **Denormalizzazione margini?**
   - Proposta: Calcolare e salvare `marginAmount`/`marginPercent` per evitare calcoli runtime
   
3. **Trigger ricalcolo `salesPriceNet`?**
   - Quando cambia `salesPriceVatIncl` o `salesVatRate`
   - Implementare via hook Drizzle o trigger DB

---

## 9. Note Sessioni di Lavoro

### Sessione 17/12/2025
- Creato documento iniziale
- Analizzato stato attuale schema DB
- Proposta architettura base
- **Review Architect**: Identificati 8 punti critici
- **Brainstorming struttura IBRIDA**:
  - Definiti campi lato ACQUISTO (costo, regime, IVA, fornitore)
  - Definiti campi lato VENDITA (prezzo IVA inclusa, regime, aliquota)
  - Chiarita differenza PHYSICAL/VIRTUAL/SERVICE vs CANVAS
  - CANVAS non ha costo acquisto, ha canone per Commissioning
  - Definito flusso Brand→Tenant con lock/unlock
  - Documentato versioning immutabile

---

## 10. Decisioni Architetturali (ADR)

### ADR-001: Stacking vs Override

**Decisione**: Override puro (Opzione A)
- Vince il listino con priorità più alta
- Semplice e prevedibile per MVP
- Tiebreaker: `createdAt DESC` se stessa priorità

### ADR-002: Brand→Tenant Publishing

**Decisione**: Clone + Lock/Unlock
- Brand crea template, Deploy Center clona ai tenant
- `isLocked=true`: Tenant in sola lettura, aggiornamenti auto
- `isLocked=false`: Tenant può fare fork indipendente

### ADR-003: Versioning Strategy

**Decisione**: Righe immutabili in `price_list_versions`
- Ogni modifica = nuova versione
- previousVersionId per catena storica
- Ordini puntano a versionId specifico

### ADR-004: Struttura Poliforma

**Decisione**: Tabella unica con campi nullable per tipo
- Campi ACQUISTO: nullable, NULL per CANVAS
- Campi CANVAS (monthlyFee, etc.): nullable, NULL per altri tipi
- Discriminatore: `productType` indica quali campi usare

---

## Appendice A - Glossario

| Termine | Definizione |
|---------|-------------|
| **Listino Polimorfo** | Listino che cambia struttura in base al tipo prodotto |
| **Listino IBRIDO** | Listino con campi sia acquisto che vendita |
| **CANVAS** | Offerta composita (bundle) con canone mensile |
| **Fork** | Copia locale di un listino Brand che il tenant può modificare |
| **Versione Immutabile** | Snapshot del listino in un momento specifico |
| **Regime Fiscale** | Codice SDI per tipo di regime IVA (RF01, RF19, etc.) |

## Appendice B - Riferimenti

- WMS Architecture: `docs/WMS-ARCHITECTURE.md`
- Product Versioning: Sezione 2 di WMS-ARCHITECTURE.md
- Brand Price Lists Schema: `apps/backend/api/src/db/schema/brand-interface.ts`
- Commissioning Module: `docs/commissioning.md`
