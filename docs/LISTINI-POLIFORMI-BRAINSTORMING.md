# Listini Poliformi - Brainstorming & Design Document

> **Documento di lavoro** - Aggiornato man mano che procediamo con l'analisi e lo sviluppo
> 
> **Ultimo aggiornamento**: 18 Dicembre 2025
> 
> **Stato**: 🟢 Schema database implementato - Tabelle `price_lists`, `price_list_items`, `price_list_item_compositions` create

---

## 🎯 Concept Fondamentale

I **Listini Poliformi** sono listini che **cambiano forma** in base al tipo di prodotto. Sono **IBRIDI** perché contengono sia informazioni di **ACQUISTO** che di **VENDITA** nello stesso record, con gestione fiscale italiana completa.

---

## 📖 Glossario Terminologia W3 → W3Suite

| Termine W3 | Significato | Campo W3Suite |
|------------|-------------|---------------|
| **EuP** | Euro Pubblico (prezzo pubblico IVA incl.) | `salesPriceVatIncl` |
| **SP** | Street Price (= EuP) | `salesPriceVatIncl` |
| **DP** | Dealer Price (costo acquisto dealer) | `purchaseCost` |
| **NDC** | Nota di Credito (credito amministrativo) | `ndcAmount` (calcolato) |
| **GA** | Con SIM abbinata (bundle) | Flag su price_list_item |
| **FIN** | Finanziato (ente esterno: Compass, Findomestic, Agos) | `salesMode = 'FIN'` |
| **VAR** | Vendita a Rate (rateizzazione interna WindTre) | `salesMode = 'VAR'` |
| **Cash** | Vendita diretta senza vincoli | `salesMode = 'STD'` |
| **Codice Oracle (GSI)** | SKU interno gestionale | `products.sku` |
| **EAN** | Barcode | `products.barcode` |
| **Entry Fee** | Anticipo pagato dal cliente in cassa | `entryFee` |

### Tipi di Listino W3 (✅ IMPLEMENTATO)

| Tipo | Codice enum | Descrizione | Campi specifici |
|------|-------------|-------------|-----------------|
| **NO PROMO** | `no_promo` | Prodotti senza promozione (fisici, virtuali, servizi) | Solo prezzi base |
| **CANVAS** | `canvas` | Solo prodotto CANVAS (tariffa pura) | `monthlyFee` (canone) |
| **Promo Device** | `promo_device` | Device con promozione (senza CANVAS) | Colonne contabili |
| **Promo CANVAS** | `promo_canvas` | CANVAS + prodotto fisico abbinato | `monthlyFee` + colonne contabili |

**Enum PostgreSQL**: `price_list_type` = ['no_promo', 'canvas', 'promo_device', 'promo_canvas']

### Campi Economici per Tipo di Credito

| Campo | Tipo Credito | Descrizione | Quando si genera |
|-------|--------------|-------------|------------------|
| **Entry Fee** | Cash Flow | € incassati in cassa dal cliente | Sempre in vendita CANVAS |
| **NDC** | Credito Amministrativo | € rimborso da W3 o fornitore | Con promo o CANVAS |
| **FIN Credit** | Credito Non-Amministrativo | € per match flusso bancario | Solo con `salesMode = 'FIN'` |
| **VAR Cessione** | Credito Patrimoniale | Asset contabile | Solo con `salesMode = 'VAR'` |

### Flusso Economico Vendita CANVAS Finanziata

```
┌─────────────────────────────────────────────────────────┐
│ IN CASSA:                                               │
│   Cliente paga Entry Fee → Dealer incassa subito        │
├─────────────────────────────────────────────────────────┤
│ POST-VENDITA:                                           │
│   Ente paga FIN Credit → Dealer (match bancario)        │
│   W3 paga NDC → Dealer (credito amministrativo)         │
│   Cliente paga Rate → Ente finanziatore                 │
└─────────────────────────────────────────────────────────┘
```

### Colonne Listino W3 Standard

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Codice Oracle (GSI) | EAN | Vendor | Prodotto | Colore | Categoria       │
│ Memoria | Rete | SP Cash | SP FIN GA | Ordinabili | Sconto | DP | NDC    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Struttura IBRIDA dei Listini

### 1.1 Campi Lato ACQUISTO (📦 Cosa Paghiamo)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `purchaseCost` | numeric(12,2) | Costo acquisto da fornitore (netto) |
| `purchaseVatRateId` | FK → public.vat_rates | Aliquota IVA acquisto (lookup da tabella public) |
| `purchaseVatRegimeId` | FK → public.vat_regimes | Regime fiscale acquisto (lookup da tabella public) |
| `supplierId` | FK → suppliers | Fornitore del prodotto |

### 1.2 Campi Lato VENDITA (💰 Cosa Incassiamo)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `salesPriceVatIncl` | numeric(12,2) | Prezzo vendita **IVA inclusa** (quello che paga il cliente) |
| `salesPriceNet` | numeric(12,2) | *(calcolato)* Prezzo netto = salesPriceVatIncl × divisor (da vat_rates) |
| `salesVatRateId` | FK → public.vat_rates | Aliquota IVA vendita (lookup da tabella public) |
| `salesVatRegimeId` | FK → public.vat_regimes | Regime fiscale vendita (lookup da tabella public) |
| `marginAmount` | numeric(12,2) | *(calcolato)* Margine € = salesPriceNet - purchaseCost |
| `marginPercent` | numeric(5,2) | *(calcolato)* Margine % = marginAmount / purchaseCost × 100 |

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

### 1.5 Modalità di Vendita (🆕 Tabelle Dedicate)

Ogni item listino può avere una **modalità di vendita** che viene ereditata in cassa.

#### Tabella `public.sales_modes`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | uuid | PK |
| `code` | varchar(20) | `ALL`, `FIN`, `VAR` |
| `name` | varchar(100) | Nome descrittivo |
| `description` | text | Descrizione estesa |
| `requiresFinancialEntity` | boolean | true solo per FIN |
| `requiresInstallmentMethod` | boolean | true solo per VAR |
| `isActive` | boolean | default true |
| `displayOrder` | smallint | Ordinamento UI |

#### Tabella `public.installment_methods`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | uuid | PK |
| `code` | varchar(20) | `CREDIT_CARD`, `RID` |
| `name` | varchar(100) | "Carta di Credito", "RID Bancario" |
| `description` | text | Descrizione |
| `isActive` | boolean | default true |
| `displayOrder` | smallint | Ordinamento UI |

#### Campi su price_list_item

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `salesModeId` | FK → public.sales_modes | Modalità vendita |
| `financialEntityId` | FK → w3suite.financial_entities | Ente finanziatore (opz. se FIN) |
| `installmentMethodId` | FK → public.installment_methods | Metodo rateizzazione (opz. se VAR) |

**Codici Modalità Vendita WindTre**:

| Codice | Nome | requiresFinancialEntity | requiresInstallmentMethod |
|--------|------|-------------------------|---------------------------|
| **ALL** | Tutte le modalità | false | false |
| **FIN** | Finanziamento | **true** | false |
| **VAR** | Rateizzazione | false | **true** |

**Impatto su Cassa e Commissioning**:
- **Cassa**: Mostra opzioni pagamento appropriate, form ente finanziatore o metodo rateizzazione
- **Commissioning**: Regole bonus diverse per modalità (es: FIN paga più del STD)
- **Override**: Operatore può cambiare modalità in cassa se necessario (vedi Sezione 6)

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

### 2.4 Struttura Definitiva Listino STD - Prodotti PHYSICAL (✅ IMPLEMENTAZIONE)

#### Campi Database `price_list_items` per tipo PHYSICAL

| Campo | Tipo | Note |
|-------|------|------|
| **productId** | FK → w3suite.products | Prodotto master |
| **productVersionId** | FK → w3suite.product_versions | Versione specifica (opzionale) |
| **supplierId** | FK → w3suite.suppliers | Fornitore |
| **purchaseCost** | numeric(12,2) | DP - Costo acquisto netto |
| **purchaseVatRateId** | FK → public.vat_rates | Aliquota IVA acquisto |
| **purchaseVatRegimeId** | FK → public.vat_regimes | Regime fiscale acquisto |
| **salesPriceVatIncl** | numeric(12,2) | SP/EuP - Prezzo vendita IVA incl. |
| **salesVatRateId** | FK → public.vat_rates | Aliquota IVA vendita |
| **salesVatRegimeId** | FK → public.vat_regimes | Regime fiscale vendita |
| **discountPercent** | numeric(5,2) | Sconto dealer % |
| **salesModeId** | FK → public.sales_modes | Modalità vendita (ALL/FIN/VAR) |
| **financialEntityId** | FK → w3suite.financial_entities | Ente finanziatore (opz. se FIN) |
| **installmentMethodId** | FK → public.installment_methods | Metodo rateizzazione (opz. se VAR) |

#### Collegamenti Logici (via productId → products)

```
price_list_item
  └── productId → products
        ├── driverId → w3suite.drivers (categoria commerciale)
        ├── categoryId → w3suite.categories (categoria merceologica)
        └── typeId → w3suite.product_types (tipologia prodotto)
```

**Nota**: I dati prodotto (SKU, EAN, brand, model, name, memory, color, condition) vengono letti in JOIN dalla tabella `products`.

#### Campi Calcolati (NON salvati - per report/analisi)

| Campo | Formula |
|-------|---------|
| `salesPriceNet` | salesPriceVatIncl ÷ (1 + aliquota%) |
| `marginAmount` | salesPriceNet - purchaseCost |
| `marginPercent` | marginAmount ÷ purchaseCost × 100 |

#### Multi-tenancy & Brand Push (✅ IMPLEMENTATO)

| Campo | Valore | Significato |
|-------|--------|-------------|
| `origin` | `'brand'` | Record pushato da Brand Interface (HQ) |
| `origin` | `'tenant'` | Record creato localmente dal tenant |
| `tenantId` | `NULL` | Cross-tenant (visibile a tutti i tenant) |
| `tenantId` | `UUID` | Specifico del tenant |
| `isLocked` | `true` | Tenant NON può modificare |
| `sourceBrandItemId` | UUID | Traccia versione Brand di origine |

**RLS Policy**:
```sql
WHERE tenant_id = current_tenant_id OR tenant_id IS NULL
```
*I tenant vedono i propri record + quelli brand (cross-tenant)*

#### Versioning (✅ IMPLEMENTATO)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `version` | integer | Numero versione (1, 2, 3...) |
| `previousVersionId` | uuid | Punta alla versione precedente |
| `changeReason` | enum | 'correction', 'price_update', 'promo', 'supplier_change', 'vat_change' |
| `validFrom` | timestamp | Inizio validità versione |
| `validTo` | timestamp | Fine validità (NULL = senza scadenza) |

#### Campi CANVAS-Specific (✅ IMPLEMENTATO)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `monthlyFee` | numeric(12,2) | Canone mensile CANVAS (es. 13,99€/mese) |
| `entryFee` | numeric(12,2) | Anticipo cliente CANVAS |

> **Nota**: Questi campi sono usati solo per prodotti di tipo CANVAS, per PHYSICAL/VIRTUAL/SERVICE rimangono NULL.

#### Colonne Contabili/Amministrative (✅ IMPLEMENTATO)

| Campo | Tipo | Descrizione | Usato da |
|-------|------|-------------|----------|
| `creditNoteAmount` | numeric(12,2) | Importo nota di credito | promo_device, promo_canvas |
| `creditAssignmentAmount` | numeric(12,2) | Importo cessione del credito | promo_device, promo_canvas |
| `financingAmount` | numeric(12,2) | Importo finanziamento | promo_device, promo_canvas |

> **Nota**: Questi campi sono usati solo per listini promozionali (promo_device, promo_canvas). Per no_promo e canvas rimangono NULL.

#### Rateizzazione FIN/VAR (✅ IMPLEMENTATO)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `numberOfInstallments` | integer | Numero rate (12, 24, 36, 48) |
| `installmentAmount` | numeric(12,2) | Importo singola rata |
| `totalFinancedAmount` | numeric(12,2) | Totale pagato a rate (**non calcolato**) |

> ⚠️ **IMPORTANTE**: Tutti i valori sono inseriti manualmente. `totalFinancedAmount` NON è `numberOfInstallments × installmentAmount` perché può includere interessi, commissioni o sconti.

---

## 2.5 Offerte Composite CANVAS + PHYSICAL (✅ IMPLEMENTATO)

### Tabella `price_list_item_compositions`

Le offerte composite collegano un prodotto CANVAS (master) a uno o più componenti (PHYSICAL, SERVICE, ADDON).

```
┌─────────────────────────────────────────────────────────────┐
│  OFFERTA COMPOSITA: "Powerful + iPhone 17 Pro"              │
├─────────────────────────────────────────────────────────────┤
│  MASTER (bundleItemId)                                       │
│  └── CANVAS "Powerful" - Canone 13,99€/mese                 │
│                                                              │
│  COMPONENTE (componentItemId)                                │
│  └── PHYSICAL "iPhone 17 Pro Red 256GB"                     │
│      ├── componentRole: primary                             │
│      ├── pricingStrategy: override                          │
│      ├── salesMode: FIN (Compass)                           │
│      ├── overrideSalesPriceVatIncl: 1.500€                  │
│      ├── overrideEntryFee: 100€                             │
│      ├── overrideNumberOfInstallments: 24                   │
│      └── overrideInstallmentAmount: 58,33€                  │
└─────────────────────────────────────────────────────────────┘
```

### Enum `component_role`

| Valore | Descrizione |
|--------|-------------|
| `primary` | Componente principale obbligatorio (es. iPhone) |
| `addon` | Servizio aggiuntivo incluso (es. Assicurazione) |
| `accessory` | Accessorio opzionale (es. Cover) |

### Enum `pricing_strategy`

| Valore | Descrizione |
|--------|-------------|
| `inherited` | Usa prezzo dal listino base del componente |
| `override` | Prezzo specifico per questa composizione |
| `discount` | Applica sconto % sul prezzo base |

### Chiave Univoca Composizioni

Il prezzo di un componente può variare per:
- **CANVAS abbinato** (bundleItemId)
- **Modalità vendita** (salesModeId: ALL/FIN/VAR)
- **Ente finanziatore** (financialEntityId: Compass, Findomestic, Agos)
- **Metodo rateizzazione** (installmentMethodId: RID, CDC)

**Esempio iPhone 17 Pro con prezzi diversi:**

| Canvas | Modalità | Ente/Metodo | Prezzo | Anticipo | Rate |
|--------|----------|-------------|--------|----------|------|
| Powerful | FIN | Compass | 1.500€ | 100€ | 24×58€ |
| Powerful | FIN | Findomestic | 1.520€ | 50€ | 24×61€ |
| Powerful | VAR | RID | 1.400€ | 0€ | 24×58€ |
| Powerful | VAR | CDC | 1.450€ | 0€ | 24×60€ |
| Basic | FIN | Compass | 1.600€ | 150€ | 24×60€ |

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

> ⚠️ **IMPORTANTE**: I campi fiscali usano FK alle tabelle `public.vat_rates` e `public.vat_regimes`.
> NON duplicare valori numerici - usare sempre join per recuperare aliquota/regime.

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
  purchaseVatRateId: uuid("purchase_vat_rate_id"),        // FK → public.vat_rates.id
  purchaseVatRegimeId: uuid("purchase_vat_regime_id"),    // FK → public.vat_regimes.id
  supplierId: varchar("supplier_id", { length: 100 }),
  
  // ═══════════════════════════════════════════════════════════════
  // 💰 LATO VENDITA (per PHYSICAL, VIRTUAL, SERVICE)
  // ═══════════════════════════════════════════════════════════════
  salesPriceVatIncl: numeric("sales_price_vat_incl", { precision: 12, scale: 2 }),
  salesPriceNet: numeric("sales_price_net", { precision: 12, scale: 2 }), // Calcolato da salesPriceVatIncl / multiplier
  salesVatRateId: uuid("sales_vat_rate_id"),              // FK → public.vat_rates.id
  salesVatRegimeId: uuid("sales_vat_regime_id"),          // FK → public.vat_regimes.id
  
  // Margini calcolati (denormalizzati per performance)
  marginAmount: numeric("margin_amount", { precision: 12, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
  
  // ═══════════════════════════════════════════════════════════════
  // 🛒 MODALITÀ VENDITA (ereditata in cassa)
  // ═══════════════════════════════════════════════════════════════
  salesMode: varchar("sales_mode", { length: 20 }).default('STD').notNull(), // 'STD' | 'FIN' | 'VAR'
  financingEntityId: varchar("financing_entity_id", { length: 100 }), // FK → financing_entities.id
  financingMonths: integer("financing_months"), // 12, 24, 36, 48 mesi
  
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

// ═══════════════════════════════════════════════════════════════
// NOTA IMPORTANTE: Calcolo salesPriceNet
// ═══════════════════════════════════════════════════════════════
// salesPriceNet = salesPriceVatIncl * divisor (da public.vat_rates)
// Esempio: €1.199 * 0.8197 = €982,83 (per IVA 22%)
// Questo valore viene calcolato e salvato quando si inserisce/aggiorna l'item.
```

### 3.4 Tabelle Lookup Fiscali (GIÀ ESISTENTI in public schema)

> ⚠️ **NOTA**: Le tabelle fiscali esistono già in `public` schema. NON creare duplicati!

**File**: `apps/backend/api/src/db/schema/public.ts`

#### `public.vat_rates` - Aliquote IVA

```typescript
// GIÀ ESISTENTE - NON DUPLICARE
export const vatRates = pgTable("vat_rates", {
  id: uuid("id").primaryKey(),
  code: varchar("code", { length: 20 }).unique().notNull(),     // STD, RID10, RID5, RID4, ESE
  name: varchar("name", { length: 100 }).notNull(),              // Ordinaria, Ridotta 10%, etc.
  ratePercent: varchar("rate_percent", { length: 10 }).notNull(), // "22.00", "10.00", etc.
  multiplier: varchar("multiplier", { length: 10 }).notNull(),   // "1.22" per calcolo lordo
  divisor: varchar("divisor", { length: 10 }).notNull(),         // "0.8197" per scorporo IVA
  naturaFeCode: varchar("natura_fe_code", { length: 10 }),       // Codice SDI (N1, N2, N3, etc.)
  legalReference: varchar("legal_reference", { length: 100 }),   // DPR 633/72, etc.
  // ... altri campi
});
```

#### `public.vat_regimes` - Regimi Fiscali

```typescript
// GIÀ ESISTENTE - NON DUPLICARE
export const vatRegimes = pgTable("vat_regimes", {
  id: uuid("id").primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(),       // STANDARD, ART10, ART17_RC, etc.
  name: varchar("name", { length: 150 }).notNull(),               // Regime Ordinario, Esente Art.10, etc.
  legalReference: varchar("legal_reference", { length: 200 }),    // Art.10 DPR 633/72, etc.
  rateStrategy: varchar("rate_strategy", { length: 20 }).notNull(), // 'product_rate', 'fixed_rate', 'margin', 'excluded'
  vatPayer: varchar("vat_payer", { length: 20 }).notNull(),       // 'supplier', 'customer', 'pa', 'none'
  naturaFeCode: varchar("natura_fe_code", { length: 10 }),        // Codice SDI (N1, N2.1, N3.x, etc.)
  invoiceNote: text("invoice_note"),                              // Nota obbligatoria in fattura
  requiresStampDuty: boolean("requires_stamp_duty"),              // Marca da bollo €2
  // ... altri campi
});
```

**FK nei `price_list_items`**:
- `purchaseVatRateId` → `public.vat_rates.id`
- `purchaseVatRegimeId` → `public.vat_regimes.id`
- `salesVatRateId` → `public.vat_rates.id`
- `salesVatRegimeId` → `public.vat_regimes.id`

### 3.5 Tabella `financing_entities` (Enti Finanziatori)

```typescript
export const financingEntities = w3suiteSchema.table("financing_entities", {
  id: varchar("id", { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(), // COMPASS, FINDOMESTIC, AGOS, etc.
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  apiEndpoint: varchar("api_endpoint", { length: 255 }), // Per integrazione API ente
  contractTemplate: text("contract_template"), // Template contratto
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

## 6. Flusso Listino → Cassa → Compliance Fiscale

### 6.1 Override in Cassa

Il listino fornisce **defaults intelligenti**, ma la cassa può sovrascrivere ogni valore:

```
┌─────────────────────────────────────────────────────────────────┐
│ LISTINO (defaults)                                              │
├─────────────────────────────────────────────────────────────────┤
│  • Modalità vendita: FIN (Finanziato Compass)                   │
│  • Regime fiscale: STANDARD (RF01)                              │
│  • Aliquota IVA: 22%                                            │
│  • Prezzo IVA incl: €1.199,00                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Operatore può modificare
┌─────────────────────────────────────────────────────────────────┐
│ CASSA (override possibile)                                      │
├─────────────────────────────────────────────────────────────────┤
│  • Modalità vendita: STD (cliente paga cash)       ← OVERRIDE   │
│  • Regime fiscale: ART10 (esente)                  ← OVERRIDE   │
│  • Aliquota IVA: 0%                                ← OVERRIDE   │
│  • Prezzo IVA incl: €1.199,00 (invariato)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Valori finali
┌─────────────────────────────────────────────────────────────────┐
│ TRANSAZIONE FINALE                                              │
├─────────────────────────────────────────────────────────────────┤
│  • Genera documento fiscale con dati effettivi                  │
│  • Alimenta Commissioning con valori reali                      │
│  • Traccia override per audit                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Campi Transazione per Tracciare Override

```typescript
// Nella tabella transactions o sales
export const salesTransactions = w3suiteSchema.table("sales_transactions", {
  // ... altri campi
  
  // Valori originali dal listino
  originalSalesMode: varchar("original_sales_mode", { length: 20 }),
  originalVatRegimeId: varchar("original_vat_regime_id", { length: 100 }),
  originalVatRateId: varchar("original_vat_rate_id", { length: 100 }),
  
  // Valori finali (dopo override cassa)
  finalSalesMode: varchar("final_sales_mode", { length: 20 }).notNull(),
  finalVatRegimeId: varchar("final_vat_regime_id", { length: 100 }).notNull(),
  finalVatRateId: varchar("final_vat_rate_id", { length: 100 }).notNull(),
  
  // Audit
  wasOverridden: boolean("was_overridden").default(false).notNull(),
  overrideReason: text("override_reason"),
  overriddenBy: varchar("overridden_by", { length: 100 }),
  overriddenAt: timestamp("overridden_at"),
});
```

### 6.3 Compliance Fiscale Italiana (SDI/AdE)

Le informazioni fiscali **non sono opzionali** - costruiscono documenti ufficiali per l'Agenzia delle Entrate:

| Documento | Destinazione | Dati dal Listino/Cassa |
|-----------|--------------|------------------------|
| **Scontrino fiscale** | Registratore telematico → AdE | Aliquota IVA, importo, natura |
| **Fattura elettronica** | SDI → Agenzia Entrate | Regime, P.IVA, aliquota, natura |
| **Corrispettivi giornalieri** | Invio telematico | Totali per aliquota |

#### Campi Obbligatori per Documento Fiscale

| Campo | Da Dove | Descrizione |
|-------|---------|-------------|
| `vatRate` | Listino/Cassa | Aliquota IVA applicata |
| `naturaFeCode` | `public.vat_rates` | Codice natura SDI (N1, N2, N3...) se aliquota 0% |
| `vatRegime` | Listino/Cassa | Regime fiscale operazione |
| `invoiceNote` | `public.vat_regimes` | Nota obbligatoria per regimi speciali |
| `requiresStampDuty` | `public.vat_regimes` | Marca da bollo €2 se importo > €77.47 |

#### Codici Natura SDI (quando aliquota = 0%)

| Codice | Significato | Esempio |
|--------|-------------|---------|
| N1 | Escluso art.15 | Anticipazioni nome conto cliente |
| N2.1 | Non soggetto (art.7 ter) | Servizi a soggetti UE |
| N2.2 | Non soggetto (altri casi) | Operazioni non territoriali |
| N3.x | Non imponibile | Esportazioni, triangolazioni |
| N4 | Esente | Operazioni art.10 DPR 633/72 |
| N5 | Regime margine | Beni usati |
| N6.x | Inversione contabile | Reverse charge |
| N7 | IVA assolta in altro stato | MOSS, OSS |

---

## 7. Integrazione con Commissioning

### 7.1 Come i Listini CANVAS alimentano il Commissioning

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

### 7.2 Differenza con Prodotti PHYSICAL

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
- **Modalità di Vendita (STD/FIN/VAR)** 🆕:
  - STD = Standard (qualsiasi pagamento, no vincoli)
  - FIN = Finanziato con ente esterno (Compass, Findomestic, Agos)
  - VAR = Vendita a Rate (rateizzazione interna WindTre)
  - Impatto su cassa e commissioning
- **Override in Cassa** 🆕:
  - Listino fornisce defaults intelligenti
  - Cassa può sovrascrivere: modalità vendita, regime fiscale, aliquota IVA
  - Tracciabilità override per audit
- **Compliance Fiscale SDI/AdE** 🆕:
  - Info fiscali costruiscono scontrino/fattura per Agenzia Entrate
  - Riferimento tabelle esistenti: `public.vat_rates`, `public.vat_regimes`
  - Codici Natura SDI per aliquota 0%
  - Non duplicare tabelle fiscali (già in public schema)

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
