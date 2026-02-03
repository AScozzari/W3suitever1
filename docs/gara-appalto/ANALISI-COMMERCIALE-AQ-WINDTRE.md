# Analisi Commerciale AQ WindTre - Servizi Cloud

**Data**: 3 Febbraio 2026  
**Versione**: 1.0

---

## 1. CONCLUSIONE PRINCIPALE

### WindTre NON richiede obbligatoriamente AWS/Azure/Google!

Il template Service-Resource-Model v1.6 prevede esplicitamente l'opzione **"Vendor Private"** come Hosting Provider e **"Not W3 Private datacenter"** come Hosting Model.

| Campo | Valore per W3Suite | Note |
|-------|-------------------|------|
| **Hosting Model** | Not W3 Private datacenter | ✅ Seeweb Italia |
| **Hosting Provider** | Vendor Private | ✅ Non hyperscale |
| **Technical Model** | Full IaaS | ✅ Proxmox VE cluster |

---

## 2. VALORI AMMESSI NEL TEMPLATE

### 2.1 Hosting Provider (dropdown)

| Provider | Descrizione | W3Suite |
|----------|-------------|---------|
| AWS | AWS cloud platform | ❌ |
| Google | Google cloud platform | ❌ |
| Azure | Microsoft cloud platform | ❌ |
| Oracle | Oracle cloud platform | ❌ |
| W3 | W3 network data center | ❌ |
| **Vendor Private** | **Vendor Proprietary data center** | ✅ |

### 2.2 Hosting Model (dropdown)

| Model | W3Suite |
|-------|---------|
| W3 Public cloud Tenant | ❌ |
| W3 On-Premise | ❌ |
| Not W3 Public cloud Tenant | ❌ |
| **Not W3 Private datacenter** | ✅ |

### 2.3 Technical Model (dropdown)

| Model | Descrizione | W3Suite |
|-------|-------------|---------|
| Multi-tenant SaaS | Shared Resources | ❌ |
| Single-tenant SaaS | Dedicated resource for W3 | ❌ |
| Full PaaS | Only PaaS Services | ❌ |
| Mixed CaaS/PaaS | Containers + PaaS | ❌ |
| CaaS | Only Containers on K8s | ❌ |
| Mixed IaaS/PaaS | VM + PaaS | ❌ |
| **Full IaaS** | **Run Time and Middleware on VM** | ✅ |
| Bare Metal | Physical Machine | ❌ |
| HW Appliance | HW embedded | ❌ |

---

## 3. COST MODEL - COME DICHIARARE I COSTI

### 3.1 Valori ammessi per Cost Model

| Model | Descrizione | W3Suite |
|-------|-------------|---------|
| **Subscription** | SaaS Subscription | ✅ Canone W3Suite |
| Public Cloud Consumption | Usage-based cloud cost | ❌ Non usiamo hyperscale |
| **COTs SW License** | Traditional SW licenses | ✅ FortiGate license |
| (on-premise) HW Buy & Support | HW buy with support | ❌ |
| (on-premise) Leasing | Leasing | ❌ |
| N/A | Non applicabile | Per risorse incluse |

### 3.2 Come applicare a W3Suite

| Risorsa | Cost Model | Details |
|---------|------------|---------|
| Cluster Node 1 | **Subscription** | Canone mensile hosting Seeweb |
| Cluster Node 2 | **Subscription** | Canone mensile hosting Seeweb |
| FortiGate VM | **COTs SW License** | Licenza FortiGate annuale |
| Cloud Backup PBS | **Subscription** | Canone mensile backup |
| VPC Frontend | **Subscription** | Incluso in hosting |
| VPC Backend | **Subscription** | Incluso in hosting |
| VPC DB Primary | **Subscription** | Incluso in hosting |
| VPC DB Replica | **Subscription** | Incluso in hosting |

---

## 4. STRUTTURA COSTI DA DICHIARARE

### 4.1 Dall'AQ - Sezione Corrispettivo (Art. 6)

> "Il Corrispettivo per la prestazione dei Servizi sarà riportato in ciascun Ordine di Acquisto e verrà individuato sulla base delle condizioni economiche e commerciali riportate nello specifico Allegato"

> "In deroga espressa all'art. 1664 Cod. Civ. i corrispettivi concordati s'intendono fissi ed invariabili per tutta la durata dell'Accordo Quadro"

**Interpretazione**: I prezzi devono essere FISSI per tutta la durata del contratto.

### 4.2 Listino Prezzi Richiesto

L'AQ definisce:
> "Listino Prezzi: Indica i prezzi unitari dei Servizi riportati del dettaglio economico allegato al presente Accordo Quadro."

**Cosa includere nel Listino**:

| Voce | Tipo | Frequenza | Note |
|------|------|-----------|------|
| Canone Piattaforma W3Suite | Subscription | Mensile/Annuale | Per utente o flat |
| Hosting Infrastruttura | Subscription | Mensile | Seeweb datacenter |
| Licenza FortiGate | COTs SW License | Annuale | Firewall VM |
| Backup & DR | Subscription | Mensile | Cloud Backup PBS |
| Supporto & Manutenzione | Subscription | Mensile | SLA Gold/Platinum |
| Servizi Professionali | FFP* | Una tantum | Onboarding, config |

*FFP = Fixed Firm Price (prezzo fisso)

---

## 5. REQUISITI SPECIFICI CLOUD

### 5.1 Ambiente Cloud (dall'AQ)

> "(i) il Fornitore deve dare a Wind Tre un termine ragionevole -in ogni caso non inferiore a XX giorni- di preavviso in caso di eventuali modifiche rilevanti all'Ambiente Cloud"

> "(ii) il Fornitore deve garantire l'utilizzo di metodologie di disaster recovery per assicurare alti livelli di affidabilità, prevedendo almeno un Ambiente Cloud secondario localizzato in una nazione diversa da quella di hosting primario"

**ATTENZIONE**: Richiede DR in nazione diversa! Seeweb ha datacenter in Italia. Possibili opzioni:
- PBS replicato su Seeweb CH (Svizzera)
- Backup cross-border con altro provider

### 5.2 Sicurezza Dati

> "(xi) il Fornitore si obbliga ad adottare e mantenere aggiornato un meccanismo adeguato di crittografia per la conservazione dei Dati nell'Ambiente Cloud"

**W3Suite**: ✅ TLS 1.3, AES-256 encryption at rest, PostgreSQL encryption.

---

## 6. SERVICE-RESOURCE-MODEL - COLONNE DA COMPILARE

### 6.1 Sezioni del Template

| Sezione | Colonne | Descrizione |
|---------|---------|-------------|
| Environment | ENV | DEV, NO.PROD, PROD |
| SLA Model | SLA Value, SLA Class | 99.9%, HA/HA+/NO HA |
| Resource Model | Proposal Modules, Hosting Model, Hosting Provider, Technical Model, Service Resource | Definizione risorse |
| Resource Distribution | # instances, Region/Zone, Distribution Method, Resource Role | HA e distribuzione |
| Capacity Model | Capacity Class, Method, Outages | Scaling |
| Release Model | Release Class, Method, Outages, Configuration | Deploy |
| Recovery & DR Model | Backup Policy, Recovery Model, RTO, RPO | Backup e DR |
| Operation Model | Operated By, Activities | Chi gestisce |
| **Cost Model** | **Model, Details** | **Tipo costo** |

### 6.2 Colonne Cost Model

| Colonna | Campo | Valore W3Suite |
|---------|-------|----------------|
| 36 | Model | Subscription / COTs SW License |
| 37 | Details | Descrizione costo specifico |

---

## 7. PROPOSTA STRUTTURA COSTI W3SUITE

### 7.1 Canone Piattaforma (Subscription)

| Tier | Utenti | Prezzo/mese | Note |
|------|--------|-------------|------|
| Starter | 1-10 | € XXX | Base |
| Business | 11-50 | € XXX | +Analytics |
| Enterprise | 51-200 | € XXX | +AI Voice Agent |
| Unlimited | 200+ | € XXX | Full platform |

### 7.2 Infrastruttura (Subscription)

| Componente | Prezzo/mese | Note |
|------------|-------------|------|
| Hosting Seeweb (2 nodi) | € XXX | Bare Metal Foundation |
| Cloud Backup PBS | € XXX | 100GB base |
| Banda Internet | Incluso | Flat |

### 7.3 Licenze (COTs SW License)

| Componente | Prezzo/anno | Note |
|------------|-------------|------|
| FortiGate VM | € XXX | Firewall |
| SSL Certificate | Incluso | Let's Encrypt |

### 7.4 Servizi Professionali (FFP)

| Servizio | Prezzo | Note |
|----------|--------|------|
| Onboarding | € XXX | Una tantum |
| Training | € XXX/giorno | Opzionale |
| Customization | € XXX/ora | Su richiesta |

---

## 8. CHECKLIST DOCUMENTAZIONE COMMERCIALE

| Documento | Stato | Note |
|-----------|-------|------|
| Listino Prezzi | ⬜ Da creare | Template AQ |
| Service-Resource-Model | ✅ Compilato | 7 risorse |
| Condizioni Commerciali | ⬜ Da creare | Pagamento, durata |
| SLA Document | ⬜ Da creare | 99.9% PROD, 99% DEV |
| Piano DR | ⬜ Da verificare | Richiesto DR cross-border |

---

## 9. DOMANDE APERTE

1. **DR Cross-Border**: L'AQ richiede DR in nazione diversa. Seeweb offre solo Italia. Verificare se accettabile PBS su provider estero.

2. **Prezzi Fissi**: I corrispettivi sono fissi per tutta la durata AQ. Definire durata contratto per calcolare margine.

3. **Pagamento**: 180 giorni DFFM (fine mese). Considerare impatto cash flow.

4. **Primaria Clientela**: WindTre richiede prezzi migliori o uguali ad altri clienti (MFN clause).

---

## 10. CONCLUSIONI

### WindTre ACCETTA hosting su provider privato

Non è obbligatorio usare AWS/Azure/Google. Il template include esplicitamente:
- **Vendor Private** come Hosting Provider
- **Not W3 Private datacenter** come Hosting Model
- **Full IaaS** come Technical Model

### Costi da dichiarare

1. **Cost Model = Subscription** per canone piattaforma e hosting
2. **Cost Model = COTs SW License** per licenze (FortiGate)
3. Dettagli in colonna 37 del Service-Resource-Model

### Prossimi passi

1. Definire listino prezzi concreto
2. Verificare requisito DR cross-border con Seeweb
3. Compilare condizioni commerciali secondo template AQ

---

**Fine Documento**
