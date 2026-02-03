# AUDIT COMPLETO DOCUMENTI GARA WINDTRE

**Data Audit**: 3 Febbraio 2026  
**Versione**: 3.0  
**Auditor**: W3Suite Team

---

## 1. RIEPILOGO DOCUMENTI VERIFICATI

| # | Documento | Stato | Note |
|---|-----------|-------|------|
| 1 | SERVICE-RESOURCE-MODEL-W3SUITE-FINAL.xlsx | ✅ CORRETTO | Valori dropdown esatti, 7 risorse |
| 2 | SOC-RISPOSTE-W3SUITE.xlsx | ✅ CONFORME | Risposte allineate TOGAF |
| 3 | AI-QUESTIONNAIRE-RISPOSTE-W3SUITE.xlsx | ✅ CONFORME | Posizionamento DEPLOYER corretto |
| 4 | GAP-ANALYSIS-GESTIONALE-MIO-NEGOZIO.xlsx | ✅ COMPLETO | 111 requisiti analizzati |

---

## 2. INFRASTRUTTURA SEEWEB (VERIFICATA DA seeweb.it)

### 2.1 Architettura Cluster

```
┌────────────────────────────────────────┐    ┌──────────────────────┐
│          SEEWEB DC1 (Primary)          │    │   SEEWEB DC2 (DR)    │
│                                        │    │                      │
│  ┌─────────────┐  ┌─────────────┐      │    │  ┌────────────────┐  │
│  │   Nodo 1    │  │   Nodo 2    │      │    │  │ Cloud Backup   │  │
│  │ Bare Metal  │  │ Bare Metal  │      │    │  │    (PBS)       │  │
│  │ Foundation  │  │ Foundation  │      │    │  │  Full IaaS     │  │
│  │   Server    │  │   Server    │      │    │  │  23€/100GB     │  │
│  └──────┬──────┘  └──────┬──────┘      │    │  └────────────────┘  │
│         │    HA Appliance    │         │    │                      │
│         └────────┬───────────┘         │    └──────────────────────┘
│                  │                     │
│  ┌───────────────┴───────────────┐     │
│  │      Proxmox VE Cluster       │     │
│  │  ┌─────────────────────────┐  │     │
│  │  │   FortiGate VM (IaaS)   │  │     │
│  │  │   Virtual Appliance     │  │     │
│  │  └─────────────────────────┘  │     │
│  │  ┌──────┐┌──────┐┌──────┐┌──────┐   │
│  │  │ VPC  ││ VPC  ││ VPC  ││ VPC  │   │
│  │  │ FE   ││ BE   ││DB Pri││DB Rep│   │
│  │  └──────┘└──────┘└──────┘└──────┘   │
│  └───────────────────────────────┘     │
└────────────────────────────────────────┘
```

### 2.2 Componenti e Technical Model

| Componente | Tipo Seeweb | Technical Model | Note |
|------------|-------------|-----------------|------|
| **Foundation Server (2 nodi)** | Server fisici dedicati | `Bare Metal` | Cluster Proxmox VE |
| **FortiGate** | Virtual Appliance (1-4 CPU) | `Full IaaS` | NGFW |
| **Cloud Backup (PBS)** | Servizio Cloud | `Full IaaS` | 23€/100GB, DC separato |
| **VPC (4 VM)** | Macchine virtuali | `Full IaaS` | FE, BE, DB Pri, DB Rep |

### 2.3 Configurazione Backup

| VM | Snapshot (Full) | Incrementale | Retention Full | Retention Incr | Target |
|----|-----------------|--------------|----------------|----------------|--------|
| Nodo 1 | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| Nodo 2 | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| FortiGate VM | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| Frontend VPC | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| Backend VPC | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| PostgreSQL Primary | Daily | 1 min | 1 month | 1 week | PBS DC2 |
| PostgreSQL Replica | Daily | 1 min | 1 month | 1 week | PBS DC2 |

**Nota**: TUTTE le VM hanno backup sia snapshot che incrementali verso Proxmox Backup Server su DC2.

---

## 3. SERVICE-RESOURCE-MODEL - VERIFICA DROPDOWN

### 3.1 Hosting Model (Colonna E)

| Valore Usato | Valore Dropdown Esatto | Stato |
|--------------|------------------------|-------|
| Not W3 Private datacenter | `Not W3 Private datacenter` | ✅ |

**Motivazione**: W3Suite è ospitato su Seeweb (datacenter privato italiano), non su cloud WindTre.

### 3.2 Hosting Provider (Colonna F)

| Valore Usato | Valore Dropdown Esatto | Stato |
|--------------|------------------------|-------|
| Vendor Private | `Vendor Private` | ✅ |

**Motivazione**: Seeweb è un provider privato italiano.

### 3.3 Technical Model (Colonna G)

| Valore Usato | Valore Dropdown Esatto | Uso |
|--------------|------------------------|-----|
| Bare Metal | `Bare Metal` | Foundation Server (nodi fisici) |
| Full IaaS | `Full IaaS` | FortiGate VM, Cloud Backup PBS, VPC |

### 3.4 Distribution (Colonna K)

| Valore Usato | Valore Dropdown Esatto | Uso |
|--------------|------------------------|-----|
| Cloud-Multi-zone | `Cloud-Multi-zone` | Foundation Server (2 nodi HA) |
| Cloud-Single-zone | `Cloud-Single-zone` | VPC, FortiGate, PBS |

### 3.5 Recovery Class (Colonna AE)

| Valore Usato | Valore Dropdown Esatto | Stato |
|--------------|------------------------|-------|
| Zone Resilent  | `Zone Resilent ` (spazio finale) | ✅ Cluster 2 nodi |
| Region Resilent  | `Region Resilent ` (spazio finale) | ✅ Backup su DC2 |
| Local Resilent  | `Local Resilent ` (spazio finale) | ✅ FortiGate single |

**NOTA**: Il template WindTre usa "Resilent" (senza "i"), non "Resilient".

---

## 4. RISORSE SERVICE-RESOURCE-MODEL (7 RISORSE)

### 4.1 Riepilogo Completo

| # | Risorsa | Technical Model | Distribution | Recovery | Backup |
|---|---------|-----------------|--------------|----------|--------|
| 1 | Foundation Server Cluster (2 nodi) | Bare Metal | Cloud-Multi-zone | Zone Resilent | Snapshot + Incr |
| 2 | FortiGate VM | Full IaaS | Cloud-Single-zone | Local Resilent | Snapshot + Incr |
| 3 | Cloud Backup (PBS) | Full IaaS | Cloud-Single-zone | Region Resilent | - (è il target) |
| 4 | W3Suite Frontend VPC | Full IaaS | Cloud-Single-zone | Region Resilent | Snapshot + Incr |
| 5 | W3Suite Backend VPC | Full IaaS | Cloud-Single-zone | Region Resilent | Snapshot + Incr |
| 6 | PostgreSQL Primary VPC | Full IaaS | Cloud-Single-zone | Region Resilent | Snapshot + Incr |
| 7 | PostgreSQL Replica VPC | Full IaaS | Cloud-Single-zone | Region Resilent | Snapshot + Incr |

### 4.2 Service Resource Distribution

| Module | Risorsa | DC1 (Primary) | DC2 (DR) | Backup Type |
|--------|---------|---------------|----------|-------------|
| INFRASTRUCTURE | Nodo 1 (Bare Metal) | Active | | Snapshot + Incr |
| INFRASTRUCTURE | Nodo 2 (Bare Metal) | Active | | Snapshot + Incr |
| INFRASTRUCTURE | FortiGate VM | Active | | Snapshot + Incr |
| INFRASTRUCTURE | Cloud Backup (PBS) | | Active | - |
| APPLICATION | Frontend VPC | Active | | Snapshot + Incr |
| APPLICATION | Backend VPC | Active | | Snapshot + Incr |
| DATABASE | PostgreSQL Primary | Active | | Snapshot + Incr |
| DATABASE | PostgreSQL Replica | Standby | | Snapshot + Incr |

---

## 5. AI QUESTIONNAIRE - POSIZIONAMENTO

### 5.1 Ruolo W3Suite nell'Ecosistema AI

| Domanda | Risposta | Motivazione |
|---------|----------|-------------|
| P.09: Sistema IA come DEPLOYER? | **Sì** | W3Suite usa OpenAI GPT-4 come provider esterno |
| P.10: Categorizzazione AI Act | Uso Generico | Assistenza operativa, non safety-critical |

### 5.2 Sezioni Compilate

| Sezione | Stato | Note |
|---------|-------|------|
| 2.1 (Deployer Questions P.01-P.11) | ✅ COMPILATA | Tutte le risposte fornite |
| 2.2 (Provider Questions) | ⬜ NON COMPILATA | Non applicabile (siamo Deployer) |
| 2.3 (Provider Technical) | ⬜ NON COMPILATA | Non applicabile (siamo Deployer) |

**Nota**: OpenAI è il Provider AI esterno (SaaS). Non va dichiarato come risorsa infrastrutturale nel Service-Resource-Model.

---

## 6. GAP ANALYSIS "MIO NEGOZIO"

### 6.1 Riepilogo Copertura

| Stato | Requisiti | % |
|-------|-----------|---|
| ✅ COPERTO | 78 | 70% |
| 🔧 PARZIALE | 19 | 17% |
| ❌ GAP | 14 | 13% |
| **TOTALE** | **111** | **100%** |

### 6.2 Gap Critici (Integrazioni WindTre)

| # | Sistema | Effort | Tempo |
|---|---------|--------|-------|
| 1 | DRMSPD (finanza) | Alto | 8-12 sett |
| 2 | ORMA + Packing List | Medio | 4-6 sett |
| 3 | Power BI/DWH | Medio | 4-6 sett |
| 4 | WCM/MyWCM + PowerChat | Alto | 8-12 sett |
| 5 | ROC (numerazioni) | Alto | 6-10 sett |
| 6 | Pega CRM | Alto | 10-14 sett |
| 7 | Voodoo (digital) | Medio | 4-6 sett |

---

## 7. CHECKLIST CONFORMITÀ FINALE

### 7.1 Documenti Obbligatori

| Documento | Presente | Conforme |
|-----------|----------|----------|
| Service-Resource-Model | ✅ | ✅ |
| Technology SoC Risposte | ✅ | ✅ |
| AI Questionnaire | ✅ | ✅ |
| Gap Analysis Mio Negozio | ✅ | ✅ |

### 7.2 Requisiti Tecnici

| Requisito | Stato | Evidenza |
|-----------|-------|----------|
| Datacenter Italia | ✅ | Seeweb Rome/Milan |
| Cluster 2 nodi | ✅ | Foundation Server Bare Metal |
| Backup Snapshot + Incr | ✅ | Tutte le VM → PBS DC2 |
| DR su DC separato | ✅ | PBS su DC2 (Region Resilient) |
| Firewall | ✅ | FortiGate Virtual Appliance |
| GDPR Compliance | ✅ | RLS + Data residency Italia |

---

## 8. FIRMA AUDIT

| Campo | Valore |
|-------|--------|
| Data Audit | 3 Febbraio 2026 |
| Versione | 3.0 |
| Auditor | W3Suite Technical Team |
| Stato Finale | ✅ **CONFORME** |
| Pronto per Submission | ✅ **SÌ** |
