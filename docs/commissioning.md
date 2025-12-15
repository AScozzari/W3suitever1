# Sistema Commissioning - Analisi e Specifiche

## Panoramica
Il **Commissioning** è un sistema di incentivazione economica legato alle vendite. I prodotti venduti da listino generano commissioni variabili che beneficiano sia le risorse/venditori che i dealer/imprenditori.

---

## Architettura Gare

### 1. Gare Brand (WindTre → Dealer)
Gare create dal brand verso i dealer con target:
- **Negozio singolo** (store)
- **Ragione Sociale** (legal entity)
- **Gruppo** (più ragioni sociali)

### 2. Gare Imprenditore (Dealer → Risorse)
Gare create dall'imprenditore verso le proprie risorse/venditori:
- **Target**: Singola risorsa

---

## Struttura Gara

| Campo | Descrizione |
|-------|-------------|
| Nome | Identificativo gara |
| Data Inizio | Inizio validità |
| Data Fine | Fine validità |
| Target | Negozio / Ragione Sociale / Gruppo / Risorsa |
| Configuratori | Regole del "gioco" (mixabili) |
| Stato | Bozza / Attiva / Conclusa / Annullata |

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

## Relazioni con Entità Esistenti

| Entità | Relazione |
|--------|-----------|
| `stores` | Partecipanti (solo type=store) |
| `legal_entities` | Target gare brand |
| `users` | Risorse beneficiarie |
| `products` | Prodotti che generano commissioni |
| `price_lists` | Listini collegati alle gare |
| `channels` | Canali per clusterizzazione |
| `drivers` | Driver per cluster specifici |

---

## Task Confermati per Sviluppo

> Questa sezione viene aggiornata man mano che confermiamo le specifiche

| # | Task | Stato | Note |
|---|------|-------|------|
| - | *Nessun task confermato ancora* | - | - |

---

## Note Sessione Brainstorming

### Da Approfondire
1. Dettaglio calcolo per ogni tipo di configuratore
2. Come si combinano più configuratori nella stessa gara
3. Trigger maturazione: vendita vs attivazione
4. Gestione storni (recesso cliente)
5. Split commissioni venditore/dealer
6. UI/UX per creazione gare
7. Dashboard performance/ranking

---

*Ultimo aggiornamento: Sessione brainstorming iniziale*
