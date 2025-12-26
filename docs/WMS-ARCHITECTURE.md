# WMS Architecture - W3 Suite Warehouse Management System

## Overview

Il modulo WMS (Warehouse Management System) di W3 Suite gestisce l'intero ciclo di vita dei prodotti fisici, dalla ricezione alla vendita, con tracciabilità completa per seriali (IMEI/ICCID) e lotti.

**Caratteristiche chiave:**
- Architettura CQRS (Command Query Responsibility Segregation)
- Event Sourcing per audit trail immutabile
- Snapshot periodici per report storici
- Scalabilità fino a 1000+ store con PostgreSQL partitioning

---

## 1. Tipologie Prodotto e Giacenza

| Tipo | Esempio | Giacenza Fisica | Serializzato |
|------|---------|-----------------|--------------|
| **PHYSICAL** | Smartphone, SIM, accessori, card ricarica | ✅ Sì | Dipende |
| **VIRTUAL** | Codici digitali puri (da sistema) | ❌ No | ❌ No |
| **CANVAS** | Template offerte composite | ❌ No | ❌ No |
| **SERVICE** | Attivazioni, installazioni | ❌ No | ❌ No |

**Regola fondamentale:** Se lo puoi toccare → PHYSICAL → ha giacenza

**Nota sulle ricariche:** Le card ricarica fisiche sono classificate come PHYSICAL (hanno giacenza). I codici digitali generati dal sistema sono VIRTUAL (illimitati, no giacenza).

---

## 2. Product Versioning (Dual-Layer Architecture)

### 2.1 Tabella `products` (Anagrafica Immutabile)

Contiene i dati identificativi che **NON cambiano mai**:

```sql
products
├── id, tenantId
├── sku (codice univoco per tenant)
├── name, model, brand
├── ean (codice a barre EAN-13)
├── type (PHYSICAL, VIRTUAL, CANVAS, SERVICE)
├── isSerializable (true/false)
├── serialType (imei, iccid, mac_address, other)
├── categoryId, typeId
├── isActive, createdAt, updatedAt
```

### 2.2 Tabella `product_versions` (Dati Commerciali Variabili)

Quando cambia prezzo/canone, si crea una **nuova versione**:

```sql
product_versions
├── id (UUID)
├── tenantId
├── productId → products.id
├── version (1, 2, 3... incrementale)
├── monthlyFee (canone mensile €)
├── unitPrice (prezzo vendita €)
├── costPrice (costo base €)
├── validFrom (data inizio validità)
├── validTo (data fine validità, NULL = attivo)
├── changeReason ('correction' | 'business_change')
├── createdBy, createdAt
```

### 2.3 Logica di Versioning nel Frontend

Nel modal di modifica prodotto, il sistema distingue:

- **Correzione errore** (`changeReason = 'correction'`): Aggiorna la versione corrente, non crea nuova versione. Usare per typo, dati errati.
- **Nuova versione commerciale** (`changeReason = 'business_change'`): Crea nuova versione con nuovi prezzi/canoni. La versione precedente viene chiusa (validTo = oggi).

### 2.4 Riferimento nelle Transazioni

Ordini e vendite puntano a `productVersionId`, non solo `productId`. Questo garantisce che i report storici mostrino sempre il prezzo corretto al momento della transazione.

---

## 3. Stati Logistici Prodotto

| Stato DB | Label IT | Descrizione | Impatto Giacenza |
|----------|----------|-------------|------------------|
| `in_stock` | In giacenza | Disponibile a magazzino/PV | ✅ Disponibile |
| `reserved` | Prenotato | Riservato per cliente/ordine | ⚠️ Non disponibile, presente |
| `preparing` | In preparazione | Picking/confezionamento | ⚠️ Non disponibile |
| `shipping` | DDT/In spedizione | Uscito con DDT, in viaggio | ❌ Fuori magazzino |
| `delivered` | Consegnato | Consegnato e confermato | ❌ Fuori magazzino |
| `customer_return` | Reso cliente | Rientrato per reso commerciale | ⚠️ Da verificare |
| `doa_return` | Reso DOA | Difetto entro breve (Dead On Arrival) | ⚠️ Da verificare |
| `in_service` | In assistenza | Centro riparazioni/diagnostica | ❌ Fuori magazzino |
| `supplier_return` | Restituito fornitore | Spedito al brand/grossista | ❌ Fuori magazzino |
| `in_transfer` | In trasferimento | Tra PV o magazzini | ⚠️ In transito |
| `lost` | Smarrito | Non rintracciabile | ❌ Perdita |
| `damaged` | Danneggiato/Dismesso | Non vendibile, rottamazione | ❌ Perdita |
| `internal_use` | Ad uso interno | Uso aziendale (demo, test) | ❌ Non vendibile |

**Regola CQRS:** Ogni cambio stato genera **1 riga immutabile** in `wms_stock_movements`.

---

## 4. Struttura Magazzino

### 4.1 Prodotti SERIALIZZATI (Smartphone, SIM)

**Tabella `product_items`** - Ogni pezzo fisico con seriale univoco:

```sql
product_items
├── id (UUID)
├── tenantId, storeId, productId
├── serial (IMEI/ICCID/MAC) ← IDENTIFICATORE UNIVOCO
├── logisticStatus (in_stock, reserved, etc.)
├── condition (new, used, refurbished, demo)
├── batchId → product_batches.id (raggruppa stesso carico)
├── lastSupplierId → suppliers.id (ultimo fornitore)
├── lastPurchaseCost (ultimo costo acquisto €)
├── lastPurchaseDate
├── currentHolderId → customers.id (cliente se venduto)
├── warehouseLocation (ubicazione fisica)
├── productVersionId → product_versions.id
├── createdAt, updatedAt
```

**Esempio Bulk SIM:**
```
Carico 100 SIM da TIM (DDT-2024-001)

product_items:
├── ICCID: 893901000001 → batchId: B001, cost: €2, status: in_stock
├── ICCID: 893901000002 → batchId: B001, cost: €2, status: in_stock
├── ICCID: 893901000003 → batchId: B001, cost: €2, status: in_stock
└── ... (97 altre righe)
```

Ogni SIM è tracciata singolarmente. Il lotto (`batchId`) le raggruppa per carico.

### 4.2 Prodotti NON SERIALIZZATI (Cover, Cavi, Accessori)

**Tabella `product_batches`** - Lotti per tracciare provenienza/costo:

```sql
product_batches
├── id (UUID)
├── tenantId, storeId, productId
├── batchCode (es. "B001-2024-12")
├── supplierId → suppliers.id
├── purchaseCost (costo unitario €)
├── quantityReceived (caricati)
├── quantityAvailable (disponibili)
├── quantityReserved (prenotati)
├── expirationDate (opzionale, prodotti deperibili)
├── purchaseOrderId → purchase_orders.id
├── receivedAt, createdAt, updatedAt
```

**Esempio Cover:**
```
Prodotto: Cover iPhone 15 Nera (SKU: COVER-IPH15-BLK)

Lotto B001: 100 pz da TIM, costo €5.00, disponibili: 85
Lotto B002: 200 pz da Ingram, costo €4.50, disponibili: 200
─────────────────────────────────────────────────────────
TOTALE: 285 pz (ma so esattamente da dove e a che costo)
```

### 4.3 Chiave di Identificazione

| Tipo Prodotto | Chiave Univoca |
|---------------|----------------|
| Serializzato | `productId` + `serial` (IMEI/ICCID) |
| Non serializzato | `productId` + `batchId` |

---

## 5. Architettura CQRS (Event Sourcing + Snapshot)

### 5.1 Event Log Immutabile

**Tabella `wms_stock_movements`** - Single source of truth (CQRS Event Log):

```sql
wms_stock_movements
├── id (UUID)
├── tenantId, storeId
├── productId (varchar, FK to products)
├── productItemId (se serializzato, FK to product_items)
├── productBatchId (se non serializzato, FK to product_batches)
├── productVersionId (FK to product_versions)
├── quantityDelta (+5, -1, etc.)
├── movementDirection ('inbound' | 'outbound')
├── movementType ('purchase_in', 'sale_out', 'transfer', 'adjustment', 'return_in', 'damaged')
├── fromStatus, toStatus (cambio stato logistico)
├── documentType ('purchase_order', 'sale', 'transfer', 'return', 'adjustment')
├── documentId (UUID reference to document table)
├── unitCost (costo al momento)
├── unitPrice (prezzo al momento)
├── createdBy → users.id (chi ha fatto)
├── occurredAt (timestamp preciso)
├── notes
├── createdAt
```

**REGOLA FONDAMENTALE:** MAI modificabile, solo INSERT. Audit trail perfetto.

### 5.2 Saldo Real-Time

**Tabella `wms_inventory_balances`** - Read model per query veloci:

```sql
wms_inventory_balances
├── id (UUID)
├── tenantId, storeId, productId
├── quantityAvailable
├── quantityReserved
├── totalValue (valore economico)
├── lastMovementAt
├── updatedAt
```

Aggiornato atomicamente via worker ad ogni evento. Query veloci per operatività quotidiana.

### 5.3 Snapshot Giornalieri

**Tabella `wms_inventory_snapshots`** - Foto magazzino per commercialista:

```sql
wms_inventory_snapshots
├── id (UUID)
├── tenantId, storeId, productId
├── snapshotAt (2x/giorno: 12:00 e 23:00)
├── quantityAtTime
├── valueAtTime (valore economico)
├── productVersionId (versione attiva al momento)
├── createdAt
```

**Scheduling:** Worker esegue alle 12:00 e 23:00 (UTC+1 Italia).

---

## 6. Architettura Documenti WMS

### 6.0 Classificazione Documenti

#### Per Natura

| Natura | Documenti | Descrizione |
|--------|-----------|-------------|
| **Operativo** | Ordine, DDT, Ricevuta | Gestiscono movimentazione fisica |
| **Fiscale/Amministrativo** | Scontrino, Fattura, Nota Credito | Rilevanza fiscale/contabile |

#### Per Direzione (NON usare inbound/outbound per documenti)

| Direzione | Valore DB | Descrizione |
|-----------|-----------|-------------|
| **Attivo** | `active` | Documento emesso da noi verso terzi |
| **Passivo** | `passive` | Documento ricevuto da terzi |

#### Chi Genera Movimento Logistico

| Documento | Direzione | Genera Movimento? | Note |
|-----------|-----------|-------------------|------|
| **DDT** | Attivo/Passivo | ✅ Sempre | Attesta movimento fisico merce |
| **Ricevuta** | Attivo | ✅ Sì | Operativo, precede doc fiscale |
| **Scontrino** | Attivo | ✅ Sì | Fiscale → stato "venduto" |
| **Fattura Attiva** | Attivo | ✅ Sì | Fiscale → stato "venduto" |
| **Fattura Passiva** | Passivo | ⚠️ Condizionale | Solo se NON esiste DDT (carico diretto) |
| **Ordine** | Attivo/Passivo | ❌ No | Solo impegno/previsione |
| **Nota Credito** | Attivo/Passivo | ⚠️ Condizionale | Solo se implica reso fisico |

#### Flusso Documenti

```
Ordine → DDT → Fattura
   ↓       ↓       ↓
  (N)     (N)     (N)
   
NON tutti obbligatori! Possono esistere indipendentemente.
```

**Combinazioni valide:**
- Flusso completo: Ordine → DDT → Fattura (movimento da DDT)
- Senza ordine: DDT → Fattura (movimento da DDT)
- Solo fattura: Fattura passiva senza DDT (movimento da Fattura)
- Senza fattura: Ordine → DDT (raro, movimento da DDT)

#### Relazioni tra Documenti

| Da | A | Cardinalità |
|----|---|-------------|
| Ordine | DDT | 1:N |
| Ordine | Fattura | 1:N |
| DDT | Fattura | N:N |
| Ricevuta | Scontrino/Fattura | 1:1 |

#### Destinatari DDT Uscita (Attivo)

```
DDT USCITA (emesso da noi) →
├── Cliente (vendita/consegna)
├── Fornitore (reso merce)
├── Laboratorio/Centro riparazioni
├── Altro store (trasferimento interno)
└── Altro soggetto
```

### ⚠️ REGOLA FONDAMENTALE: Relazione 1:N Movimento-Documenti

**UN movimento può avere MULTIPLI documenti correlati nel suo ciclo di vita!**

```
MOVIMENTO (Carico Merce)
├── Ordine d'acquisto (creato inizialmente)
├── DDT #1 (consegna parziale)
├── DDT #2 (resto merce)
├── Fattura #1 (primo periodo)
└── Fattura #2 (secondo periodo)
```

La tabella `wms_movement_documents` gestisce questa relazione 1:N:
- `movementId` → FK al movimento
- `documentType` → tipo documento (order, ddt, receipt, invoice, fiscal_receipt, credit_note, debit_note)
- `documentDirection` → active/passive
- `documentNature` → operational/fiscal
- `generatesMovement` → boolean, true se documento ha generato movimento
- `hasPhysicalReturn` → boolean, per NDC se implica reso fisico merce
- `linkedOrderId`, `linkedDdtId`, `linkedInvoiceId`, `linkedReceiptId` → FK opzionali per linking

### 6.0.1 Logica di Generazione Movimento (Dettaglio)

La funzione `shouldGenerateMovement()` in `wms-document-rules.ts` determina automaticamente se un documento deve generare movimento:

```typescript
// Casi principali:

// 1. DDT - SEMPRE genera movimento
DDT Attivo  → Movimento OUTBOUND (spedisco)
DDT Passivo → Movimento INBOUND (ricevo)

// 2. Ricevuta - SEMPRE genera movimento
Ricevuta Attiva  → OUTBOUND
Ricevuta Passiva → INBOUND

// 3. Scontrino Fiscale - SEMPRE outbound (vendita POS)
Scontrino → Movimento OUTBOUND

// 4. Fattura - DIPENDE da presenza DDT/Ricevuta collegata
Fattura Attiva + DDT    → NESSUN movimento (DDT già fatto), applica stato 'sold'
Fattura Attiva NO DDT   → OUTBOUND (vendita diretta), stato 'sold'
Fattura Passiva + DDT   → NESSUN movimento (DDT già fatto), applica stato 'in_stock'
Fattura Passiva NO DDT  → INBOUND (carico diretto), stato 'in_stock'

// 5. Ordine - MAI genera movimento
Ordine (qualsiasi) → Nessun movimento (solo impegno)

// 6. Nota di Credito - DIPENDE da hasPhysicalReturn
NDC con reso fisico (hasPhysicalReturn=true):
  - NDC Attiva  → INBOUND (cliente restituisce)
  - NDC Passiva → OUTBOUND (restituisco a fornitore)
NDC senza reso (hasPhysicalReturn=false):
  → Nessun movimento (solo rettifica contabile)

// 7. Nota di Debito - MAI genera movimento
Nota Debito → Nessun movimento (solo contabile)
```

#### Casi d'Uso NDC (Nota di Credito)

| Scenario | hasPhysicalReturn | Movimento |
|----------|-------------------|-----------|
| Storno parziale fattura (no merce) | false | ❌ Nessuno |
| Reso cliente con rientro fisico | true | ✅ INBOUND |
| Reso a fornitore con spedizione | true | ✅ OUTBOUND |
| Sconto commerciale su fattura | false | ❌ Nessuno |
| Merce danneggiata rientrata | true | ✅ INBOUND |

### 6.0.2 Matrice Documento → Stato Logistico

Ogni documento che genera movimento applica uno stato logistico ai prodotti coinvolti:

| Documento | Direzione | Stato Target | Descrizione |
|-----------|-----------|--------------|-------------|
| **DDT** | Attivo | `shipping` | Merce in spedizione |
| **DDT** | Passivo | `in_stock` | Merce ricevuta a magazzino |
| **Ricevuta** | Attivo | `shipping` | Conferma spedizione |
| **Ricevuta** | Passivo | `in_stock` | Conferma ricezione |
| **Scontrino** | Attivo | `sold` | Vendita POS completata |
| **Fattura** | Attivo | `sold` | Vendita completata |
| **Fattura** | Passivo | `in_stock` | Carico merce |
| **NDC** | Attivo (con reso) | `customer_return` | Reso da cliente |
| **NDC** | Passivo (con reso) | `supplier_return` | Reso a fornitore |

**Nota importante:** Se un documento è collegato a un DDT/Ricevuta precedente (es. Fattura dopo DDT), NON genera un nuovo movimento ma PUÒ comunque aggiornare lo stato logistico (es. da `shipping` a `sold`).

**UI Requirement:** Ogni movimento deve mostrare una **timeline dei documenti** allegati.

### 6.1 Documenti Carico (Acquisti da Fornitore)

```sql
purchase_orders
├── id, tenantId, storeId
├── orderNumber (DDT/Fattura)
├── supplierId → suppliers.id
├── status ('draft', 'confirmed', 'received', 'cancelled')
├── orderDate, expectedDeliveryDate, receivedDate
├── totalCost, notes
├── createdBy, createdAt, updatedAt

purchase_order_items
├── id, purchaseOrderId
├── productId, productVersionId
├── productItemId (se serializzato)
├── batchId (se non serializzato)
├── quantity, unitCost, totalCost
├── receivedQuantity
├── notes
```

### 6.2 Documenti Vendita

```sql
wms_sales
├── id, tenantId, storeId
├── saleNumber (scontrino/fattura)
├── customerId → customers.id
├── status ('draft', 'confirmed', 'completed', 'cancelled')
├── saleDate
├── totalPrice, discount, finalPrice
├── paymentMethod, notes
├── createdBy, createdAt, updatedAt

wms_sale_items
├── id, saleId
├── productId, productVersionId
├── productItemId (se serializzato)
├── batchId (se non serializzato)
├── quantity, unitPrice, discount, totalPrice
├── notes
```

### 6.3 Trasferimenti tra Store

```sql
wms_transfers
├── id, tenantId
├── transferNumber
├── sourceStoreId, destinationStoreId
├── status ('draft', 'in_transit', 'received', 'cancelled')
├── shippedAt, receivedAt
├── notes
├── createdBy, createdAt, updatedAt

wms_transfer_items
├── id, transferId
├── productId
├── productItemId (se serializzato)
├── batchId (se non serializzato)
├── quantity
├── status ('pending', 'shipped', 'received')
├── notes
```

### 6.4 Resi

```sql
wms_returns
├── id, tenantId, storeId
├── returnNumber
├── returnType ('customer_return', 'doa_return', 'supplier_return')
├── relatedSaleId / relatedPurchaseOrderId
├── customerId / supplierId
├── status ('pending', 'approved', 'received', 'processed', 'rejected')
├── reason, notes
├── createdBy, createdAt, updatedAt

wms_return_items
├── id, returnId
├── productId
├── productItemId (se serializzato)
├── batchId (se non serializzato)
├── quantity
├── condition ('like_new', 'damaged', 'defective')
├── notes
```

---

## 7. Flussi Operativi

### 7.1 Carico Merce

```
1. Crea purchase_order + purchase_order_items
2. Per prodotti serializzati:
   └── Crea product_items (uno per seriale)
   └── Aggiorna lastSupplierId, lastPurchaseCost, batchId
3. Per prodotti non serializzati:
   └── Crea/aggiorna product_batch (incrementa quantityAvailable)
4. Inserisce wms_inventory_event (direction=inbound, type=purchase_in)
5. Worker aggiorna wms_inventory_balances
```

### 7.2 Vendita

```
1. Crea wms_sale + wms_sale_items
2. Per prodotti serializzati:
   └── Aggiorna product_item.logisticStatus → 'delivered'
   └── Aggiorna product_item.currentHolderId → customerId
3. Per prodotti non serializzati:
   └── Decrementa product_batch.quantityAvailable
4. Inserisce wms_inventory_event (direction=outbound, type=sale_out)
5. Worker aggiorna wms_inventory_balances
```

### 7.3 Trasferimento tra Store

```
1. Crea wms_transfer + wms_transfer_items
2. Store origine:
   └── product_item.logisticStatus → 'in_transfer'
   └── wms_inventory_event (outbound, transfer)
3. Store destinazione (alla ricezione):
   └── product_item.storeId → destinationStoreId
   └── product_item.logisticStatus → 'in_stock'
   └── wms_inventory_event (inbound, transfer)
4. Worker aggiorna wms_inventory_balances per entrambi gli store
```

### 7.4 Reso

```
1. Crea wms_return + wms_return_items
2. Verifica tipo reso (customer, doa, supplier)
3. Aggiorna product_item.logisticStatus → tipo_reso
4. Inserisce wms_inventory_event (inbound per resi cliente, outbound per resi fornitore)
5. Worker aggiorna wms_inventory_balances
```

### 7.5 Report Storico

```
Opzione A (veloce): Query su wms_inventory_snapshots per data specifica
Opzione B (preciso): Replay wms_stock_movements fino a data X
```

---

## 8. Scalabilità (1000+ Store)

### 8.1 Stima Volumi

| Dato | Calcolo | Volume/Anno |
|------|---------|-------------|
| Eventi movimento | 1000 store × 100 mov/giorno × 365 | ~36.5M righe (~20 GB) |
| Snapshot (2x/giorno) | 1000 store × 500 prodotti × 730 | ~0.8 GB |
| Balances (real-time) | 1000 store × 500 prodotti | ~500K righe (fisso) |

**Totale anno 1:** ~25 GB di dati WMS

### 8.2 Strategie di Ottimizzazione

| Aspetto | Soluzione |
|---------|-----------|
| **Partitioning** | Per `tenant_id` + `occurred_at` (mensile) |
| **Indexing** | Composite: `(tenant_id, store_id, product_id, occurred_at)` |
| **Connection Pool** | PgBouncer obbligatorio (max 100 connections) |
| **Snapshot Worker** | Throttled, esegue alle 12:00 e 23:00 |
| **Retention Policy** | Eventi > 3 anni → archivio cold storage |

### 8.3 VPS Requirements

- **CPU:** 8+ vCPU
- **RAM:** 32 GB
- **Storage:** NVMe SSD (≥10k IOPS)
- **Database:** PostgreSQL 16 con partitioning

### 8.4 Quando Scalare a DWH

| Threshold | Azione |
|-----------|--------|
| < 50M eventi | PostgreSQL singolo OK |
| > 50M eventi | Read replica per analytics |
| > 100M eventi | DWH separato (TimescaleDB/ClickHouse) |

---

## 9. Schema Relazionale Finale

```
products (anagrafica)
    └── product_versions (prezzi/canoni)
            │
            ├── product_items (pezzi serializzati: IMEI/ICCID)
            │       └── product_serials (seriali multipli)
            │
            └── product_batches (lotti non serializzati)

wms_stock_movements (CQRS event log immutabile)
        │
        ├── wms_inventory_balances (read model real-time)
        └── wms_inventory_snapshots (foto 2x/giorno)

purchase_orders ─┐
wms_sales ───────┼─→ documentId in wms_stock_movements
wms_transfers ───┤
wms_returns ─────┘

suppliers ─→ supplierId in product_items/batches/purchase_orders
```

---

## 10. Tabelle Esistenti (Già Implementate)

Le seguenti tabelle sono già presenti nello schema `w3suite`:

- ✅ `products` - Anagrafica prodotti completa
- ✅ `productItems` - Pezzi serializzati (da aggiornare con nuovi campi)
- ✅ `productSerials` - IMEI/ICCID/MAC
- ✅ `productBatches` - Lotti (da aggiornare con nuovi campi)
- ✅ `wmsStockMovements` - Movimenti stock (da evolvere in event log)
- ✅ `wmsInventoryAdjustments` - Rettifiche inventario
- ✅ `productItemStatusHistory` - Storico stati
- ✅ `wmsWarehouseLocations` - Ubicazioni magazzino
- ✅ `wmsCategories` - Categorie prodotti
- ✅ `wmsProductTypes` - Tipologie prodotti
- ✅ `suppliers` - Anagrafica fornitori

---

## 11. Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2025-12-26 | 1.1.0 | Architettura documenti completa: classificazione Operativo/Fiscale, direzione Attivo/Passivo, regole generazione movimenti, flusso Ordine→DDT→Fattura, relazioni N:N tra documenti |
| 2025-12-07 | 1.0.0 | Documento iniziale con architettura completa |
