# Analisi Technology Service-Resource-Model v1.6

## Panoramica Documento

Questo documento definisce il **modello delle risorse tecniche** che compongono la soluzione. Per ogni modulo devi specificare:

- Risorse (server, database, load balancer, etc.)
- SLA e availability
- Modello di distribuzione (zone/region)
- Capacity e scaling
- Backup e recovery
- Modello operativo

---

## Struttura Fogli

| Foglio | Scopo |
|--------|-------|
| **Instructions** | Come compilare |
| **Proposal Structure** | Esempio struttura moduli (NON compilare) |
| **Resource Model** | Esempio risorse per modulo |
| **Service Model Example** | Esempio completo |
| **Service Model (to be filled)** | **DA COMPILARE** |
| **Service Resource Distribution** | Distribuzione geografica |
| **Values&Descriptions** | Valori ammessi |

---

## Ambienti Richiesti

| Ambiente | Descrizione |
|----------|-------------|
| **DEV** | Sviluppo |
| **NO.PROD** | Test/Staging |
| **PROD** | Produzione |

---

## Hosting Model Options

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `W3 Public cloud Tenant` | Cloud pubblico WindTre | Possibile |
| `W3 On-Premise` | Data center WindTre | No |
| `Not W3 Public cloud Tenant` | **Cloud pubblico nostro** | **SI** |
| `Not W3 Private datacenter` | Data center privato nostro | No |

---

## Hosting Providers Ammessi

| Provider | Descrizione |
|----------|-------------|
| **AWS** | Amazon Web Services |
| **Google** | Google Cloud Platform |
| **Azure** | Microsoft Azure |
| **Oracle** | Oracle Cloud |
| **W3** | WindTre data center |
| **Vendor Private** | Data center proprietario vendor |

---

## Technical Models

| Modello | Descrizione | W3Suite Match |
|---------|-------------|---------------|
| `Multi-tenant SaaS` | SaaS condiviso | **PERFETTO** |
| `Single-tenant SaaS` | SaaS dedicato | Possibile |
| `Full PaaS` | Solo servizi PaaS | SI |
| `Mixed CaaS/PaaS` | K8s + PaaS | **IDEALE** |
| `CaaS` | Solo container | SI |
| `Mixed IaaS/PaaS` | VM + PaaS | SI |
| `Full IaaS` | Solo VM | NON raccomandato |

---

## Proposta W3Suite - Resource Model

### Modulo 1: Core Platform (Multi-tenant SaaS)

| ENV | SLA | Hosting | Provider | Tech Model | Resource | # Instances |
|-----|-----|---------|----------|------------|----------|-------------|
| PROD | 99.9% | Not W3 Public Cloud | AWS/Google | Multi-tenant SaaS | **Backend API (Node.js)** | 3 |
| PROD | 99.9% | Not W3 Public Cloud | AWS/Google | Multi-tenant SaaS | **Frontend (React SPA)** | CDN |
| PROD | 99.9% | Not W3 Public Cloud | AWS/Google | Multi-tenant SaaS | **Load Balancer** | 2 |
| NO.PROD | 99.5% | Not W3 Public Cloud | AWS/Google | Multi-tenant SaaS | Backend API | 1 |
| DEV | 95% | Not W3 Public Cloud | AWS/Google | Multi-tenant SaaS | Backend API | 1 |

### Modulo 2: Database Layer (Full PaaS)

| ENV | SLA | Hosting | Provider | Tech Model | Resource | # Instances |
|-----|-----|---------|----------|------------|----------|-------------|
| PROD | 99.9% | Not W3 Public Cloud | Google | Full PaaS | **Cloud SQL PostgreSQL** | 3 (HA) |
| PROD | 99.9% | Not W3 Public Cloud | Google | Full PaaS | **Redis (Memorystore)** | 2 (HA) |
| NO.PROD | 99.5% | Not W3 Public Cloud | Google | Full PaaS | Cloud SQL PostgreSQL | 1 |
| DEV | 95% | Not W3 Public Cloud | Google | Full PaaS | Cloud SQL PostgreSQL | 1 |

### Modulo 3: AI Services (Multi-tenant SaaS)

| ENV | SLA | Hosting | Provider | Tech Model | Resource | # Instances |
|-----|-----|---------|----------|------------|----------|-------------|
| PROD | 99.9% | Not W3 Public Cloud | OpenAI | Multi-tenant SaaS | **GPT-4o API** | SaaS |
| PROD | 99.9% | Not W3 Public Cloud | OpenAI | Multi-tenant SaaS | **Realtime Voice API** | SaaS |

### Modulo 4: Voice Gateway (CaaS - opzionale)

| ENV | SLA | Hosting | Provider | Tech Model | Resource | # Instances |
|-----|-----|---------|----------|------------|----------|-------------|
| PROD | 99.5% | W3 Public Cloud | Google | CaaS | **Voice Gateway (GKE)** | 2 |
| PROD | 99.5% | W3 Public Cloud | Google | CaaS | **WebSocket Server** | 2 |

---

## Distribuzione Geografica

### Resource Distribution Model

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `Cloud-Single-zone` | Una sola zona | DEV |
| `Cloud-Multi-zone` | Multi-zona stessa region | **PROD** |
| `Cloud-Multi-region` | Multi-region | DR |

### Zone Consigliate

| Provider | Region | Zone |
|----------|--------|------|
| **GCP** | europe-west8 (Milan) | a, b, c |
| **GCP** | europe-southwest1 (Turin) | a, b, c |
| **AWS** | eu-south-1 (Milan) | a, b, c |
| **AWS** | eu-central-1 (Frankfurt) | a, b, c |

---

## SLA Model

### SLA Values

| Classe | Valore | Downtime/anno |
|--------|--------|---------------|
| **HA** | 99.9% | 8.7 ore |
| **Standard** | 99.5% | 43.8 ore |
| **Basic** | 99% | 87.6 ore |
| **Dev** | 95% | 438 ore |

### W3Suite SLA Proposto

| Ambiente | SLA | Classe |
|----------|-----|--------|
| **PROD** | 99.9% | HA |
| **NO.PROD** | 99.5% | Standard |
| **DEV** | 95% | Dev |

---

## Capacity Model

### Scaling Options

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `Native autoscale (SaaS/Cloud)` | Autoscaling cloud nativo | **SI** |
| `Manual scaling` | Scaling manuale | Backup |
| `Fixed capacity` | Capacità fissa | DEV |

### W3Suite Capacity

| Componente | Min | Max | Scaling |
|------------|-----|-----|---------|
| Backend API | 2 | 10 | Autoscale (CPU > 70%) |
| PostgreSQL | 1 | 3 | Vertical + Read replicas |
| Redis | 1 | 2 | Manual |

---

## Recovery Model

### Backup Policy

| Tipo | Frequenza | Retention | W3Suite |
|------|-----------|-----------|---------|
| **Full Backup** | Daily | 30 giorni | **SI** |
| **Incremental** | Hourly | 7 giorni | **SI** |
| **Point-in-time** | Continuous | 7 giorni | **SI** |

### RTO/RPO

| Metrica | Valore | Descrizione |
|---------|--------|-------------|
| **RTO** | < 1 ora | Tempo ripristino servizio |
| **RPO** | < 5 minuti | Perdita dati massima |

### Recovery Method

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `Automated by Cloud` | Recovery automatico | **SI** (Cloud SQL) |
| `Automated By App` | Recovery via applicazione | SI (Rollback) |
| `Manual By Operation` | Procedure manuali | Backup |

---

## Operation Model

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `SaaS Provider` | Gestito dal SaaS provider | **SI** |
| `SaaS + W3 Operation (AM)` | Condiviso | Possibile |
| `W3 Operation (AM)` | Gestito da WindTre | No |

### W3Suite Operation Model

| Componente | Operatore |
|------------|-----------|
| **Core Platform** | W3Suite Team (SaaS Provider) |
| **Database** | Cloud Provider + W3Suite |
| **AI Services** | OpenAI (SaaS) |
| **Monitoring** | W3Suite + Cloud Provider |

---

## Cost Model

| Valore | Descrizione | W3Suite |
|--------|-------------|---------|
| `Subscription` | Abbonamento SaaS | **PRINCIPALE** |
| `Public Cloud Consumption` | Pay-per-use cloud | Incluso |
| `COTs SW License` | Licenze software | No |

---

## Sezioni da Compilare

Nel foglio **"Service Model (to be filled)"** devi compilare per ogni risorsa:

### 1. SLA Model & Resource Model
- ENV (DEV/NO.PROD/PROD)
- SLA Value (99.9%, 99.5%, etc.)
- SLA Class (HA, Standard, etc.)
- Proposal Modules
- Hosting Model
- Hosting Provider
- Technical Model
- Service Resource Name
- Service Resources Implementation
- # instances
- Region/Zone Distribution
- Distribution Method
- Resource Role

### 2. Capacity Model
- Autoscaling method
- Max capacity
- Scaling trigger

### 3. Release Model
- Release method (Blue-Green, Canary, etc.)
- Configuration management
- Artifact storage

### 4. Recovery & DR Model
- Backup policy (Full/Incremental)
- RTO/RPO
- Failover method
- Recovery class

### 5. Operation Model
- Chi opera la risorsa
- SLA monitoring
- Incident management

### 6. Cost Model
- Subscription
- Consumption
- License

---

## Template Compilazione W3Suite

Ecco un esempio di riga compilata:

```
ENV: PROD
SLA Value: 99.9%
SLA Class: HA
Proposal Modules: Core Platform
Hosting Model: Not W3 Public cloud Tenant
Hosting Provider: Google
Technical Model: Multi-tenant SaaS
Service Resource: Backend API (Node.js Express)
Service Resources Implementation: GKE Autopilot Container
# instances: 3
Region/Zone Distribution: Cloud-Multi-zone
Distribution Method: Internal SaaS/Cloud provider config
Resource Role: Active/Active
Autoscaling: Native autoscale (Cloud)
Max Capacity: 10 pods
Release Method: Blue-Green
Backup: Not applicable (stateless)
RTO: Seconds
RPO: N/A
Recovery Method: Automated by Cloud
Recovery Class: Zone Resilient
Operation Model: SaaS Provider
Cost Model: Subscription
```

---

## Next Steps

1. Compilare il foglio "Service Model (to be filled)" con tutte le risorse W3Suite
2. Compilare "Service Resource Distribution" con le zone specifiche
3. Verificare allineamento con requisiti SoC
