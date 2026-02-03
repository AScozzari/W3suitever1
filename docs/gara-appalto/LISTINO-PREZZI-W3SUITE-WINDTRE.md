# Listino Prezzi W3Suite per WindTre

**Data**: 3 Febbraio 2026  
**Versione**: 1.0  
**Riferimento**: RFI 10078 - Commercial Annex

---

## 1. RIEPILOGO COMMERCIAL ANNEX RICHIESTO

Da compilare nel template WindTre:

| Voce | Valore | Note |
|------|--------|------|
| **SW Product** | **€ 2.988/anno** | = **€249/mese** per negozio |
| Sconto 1-10 negozi | X% | Da definire |
| Sconto 11-90 negozi | X% | Da definire |
| Sconto 91-350 negozi | X% | Da definire |
| Sconto oltre 350 | X% | Da definire |

---

## 2. ANALISI MARGINE 25%

### 2.1 Prezzo Base

| Metrica | Valore |
|---------|--------|
| Prezzo vendita | €249/mese = €2.988/anno |
| Margine target | 25% |
| **Costo massimo** | **€186,75/mese = €2.241/anno** |

### 2.2 Struttura Costi per Negozio

| Voce | Costo/mese | % su Prezzo | Note |
|------|------------|-------------|------|
| Infrastruttura Seeweb | €30 | 12% | Quota per negozio (costo condiviso) |
| Licenza FortiGate | €5 | 2% | Quota per negozio |
| Backup & DR | €10 | 4% | Cloud Backup PBS |
| Supporto L1/L2 | €40 | 16% | Helpdesk |
| Sviluppo/Manutenzione | €40 | 16% | R&D quota |
| **TOTALE COSTI** | **€125** | **50%** | |
| **MARGINE** | **€124** | **50%** | Molto superiore al 25% target! |

### 2.3 Margine Effettivo vs Target

Con i costi stimati sopra:
- **Margine effettivo**: 50% (€124/mese)
- **Margine target**: 25% (€62/mese)

**Hai spazio per sconti aggressivi!**

---

## 3. PROPOSTA SCONTI PER VOLUME

### 3.1 Opzione Conservativa (Margine min 35%)

| Volume | Sconto | Prezzo/mese | Prezzo/anno | Margine |
|--------|--------|-------------|-------------|---------|
| 1-10 | **5%** | €236,55 | €2.838,60 | 47% |
| 11-90 | **10%** | €224,10 | €2.689,20 | 44% |
| 91-350 | **15%** | €211,65 | €2.539,80 | 41% |
| oltre 350 | **20%** | €199,20 | €2.390,40 | 37% |

### 3.2 Opzione Aggressiva (Margine min 25%)

| Volume | Sconto | Prezzo/mese | Prezzo/anno | Margine |
|--------|--------|-------------|-------------|---------|
| 1-10 | **8%** | €229,08 | €2.748,96 | 45% |
| 11-90 | **15%** | €211,65 | €2.539,80 | 41% |
| 91-350 | **22%** | €194,22 | €2.330,64 | 36% |
| oltre 350 | **30%** | €174,30 | €2.091,60 | 28% |

### 3.3 Opzione Competitiva (Per vincere gara)

| Volume | Sconto | Prezzo/mese | Prezzo/anno | Margine |
|--------|--------|-------------|-------------|---------|
| 1-10 | **10%** | €224,10 | €2.689,20 | 44% |
| 11-90 | **18%** | €204,18 | €2.450,16 | 39% |
| 91-350 | **25%** | €186,75 | €2.241,00 | 33% |
| oltre 350 | **35%** | €161,85 | €1.942,20 | 23% |

---

## 4. SIMULAZIONE RICAVI WINDTRE

### 4.1 Scenario: 3.000 negozi WindTre

Usando Opzione Competitiva (sconti più alti):

| Negozi | Sconto | Prezzo/anno | Ricavo Totale | Costo Totale | Margine |
|--------|--------|-------------|---------------|--------------|---------|
| 3.000 | 35% | €1.942,20 | **€5.826.600** | €4.500.000 | **€1.326.600** |

**Margine annuo: €1.326.600 (23%)**

### 4.2 Scenario: 1.000 negozi WindTre

| Negozi | Sconto | Prezzo/anno | Ricavo Totale | Costo Totale | Margine |
|--------|--------|-------------|---------------|--------------|---------|
| 1.000 | 25% | €2.241,00 | **€2.241.000** | €1.500.000 | **€741.000** |

**Margine annuo: €741.000 (33%)**

---

## 5. VALORI DA INSERIRE NEL COMMERCIAL ANNEX

### Proposta Raccomandata (Bilanciata)

```
SW Product: € 2.988 (= €249/mese)

Sconti:
- 1-10 negozi:    8%
- 11-90 negozi:  15%
- 91-350 negozi: 22%
- oltre 350:     30%
```

### Motivazione

- **Margine minimo garantito**: 28% (oltre 350 negozi)
- **Margine medio atteso**: 35-40%
- **Competitività**: Sconti significativi per grandi volumi
- **Break-even**: Già dal primo negozio

---

## 6. COSTI INFRASTRUTTURA DETTAGLIATI

### 6.1 Costi Fissi Mensili (indipendenti dal numero negozi)

| Voce | Costo/mese | Costo/anno | Note |
|------|------------|------------|------|
| Seeweb Nodo 1 (Bare Metal) | €200 | €2.400 | Foundation Server |
| Seeweb Nodo 2 (Bare Metal) | €200 | €2.400 | Foundation Server |
| FortiGate VM License | €150 | €1.800 | Full IaaS |
| Cloud Backup PBS | €50 | €600 | 100GB+ |
| Banda/IP Pubblici | €50 | €600 | Incluso |
| SSL/Domini | €20 | €240 | Let's Encrypt + dominio |
| **TOTALE FISSO** | **€670** | **€8.040** | |

### 6.2 Break-Even Analysis

Con costi fissi €670/mese:
- **Prezzo negozio**: €249/mese
- **Margine per negozio** (al netto costi variabili €50): €199
- **Break-even**: 670 ÷ 199 = **3,4 negozi**

**Con soli 4 negozi copri i costi fissi!**

### 6.3 Costi Variabili per Negozio

| Voce | Costo/mese | Note |
|------|------------|------|
| Supporto (quota) | €30 | Helpdesk allocato |
| Compute (quota) | €15 | CPU/RAM allocati |
| Storage (quota) | €5 | DB + files |
| **TOTALE VARIABILE** | **€50** | Per negozio |

---

## 7. MARGINE PER SCENARIO

| Negozi | Prezzo Totale/mese | Costi Fissi | Costi Var | Margine | % |
|--------|-------------------|-------------|-----------|---------|---|
| 10 | €2.291* | €670 | €500 | €1.121 | 49% |
| 50 | €10.584* | €670 | €2.500 | €7.414 | 70% |
| 100 | €19.422* | €670 | €5.000 | €13.752 | 71% |
| 500 | €87.150* | €1.000** | €25.000 | €61.150 | 70% |
| 1.000 | €161.850* | €1.500** | €50.000 | €110.350 | 68% |

*Con sconti volume applicati
**Costi fissi aumentano con scale (più server)

---

## 8. FILE EXCEL DA COMPILARE

Valori da inserire nel Commercial Annex:

| Campo | Valore |
|-------|--------|
| SW Product (Euro/12 mesi) | **2988** |
| Sconto da 1 a 10 | **8** |
| Sconto da 11 a 90 | **15** |
| Sconto da 91 a 350 | **22** |
| Sconto oltre 350 | **30** |

---

## 9. NOTE IMPORTANTI

1. **Prezzo Fisso**: L'AQ richiede prezzi fissi per tutta la durata contratto
2. **MFN Clause**: WindTre richiede prezzi uguali o migliori di altri clienti
3. **Pagamento 180gg**: Considera nel cash flow
4. **No minimi**: L'allegato specifica "non vincolato a quantitativo minimo"

---

**Fine Documento**
