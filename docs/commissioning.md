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

## Struttura Gara

| Campo | Descrizione |
|-------|-------------|
| Nome | Identificativo gara |
| Tipo | Brand / Risorse |
| Data Inizio | Inizio validità |
| Data Fine | Fine validità |
| Target | Negozio / Ragione Sociale / Gruppo / Risorsa |
| Driver | Brand e/o Custom (solo per gare risorse) |
| Configuratori | Regole del "gioco" (mixabili) |
| Stato | Bozza / Attiva / Conclusa / Annullata |

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

## Paletti (Condizioni)

I paletti sono condizioni che devono essere soddisfatte per maturare l'incentivo:

| Paletto | Descrizione |
|---------|-------------|
| **Produttività Negozio** | Basato su performance singolo store |
| **Produttività Multi-Negozio** | Basato su performance totale più negozi |
| **Produttività Risorsa** | Basato su performance personale del venditore |

---

## Clusterizzazione

### Cluster Negozi
- I negozi vengono **clusterizzati per canale**
- Cluster possono essere:
  - **Globali**: validi per tutti i driver
  - **Per Driver**: specifici per singolo driver
- Solo sedi tipo **"store"** partecipano all'incentivazione
- Canali già definiti nel modal store

### Cluster Risorse
- Le risorse vengono clusterizzate
- Una risorsa può appartenere a **più cluster di canali differenti**

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
7. UI/UX per creazione gare (distinta Brand vs Risorse)
8. Dashboard performance/ranking
9. Dettaglio calcolo per ogni tipo di configuratore con le 4 variabili

---

*Ultimo aggiornamento: Trigger vendita, Storno KO, Doppio valore vendita con integrazione CRM*
