# Guida Compilazione Service-Resource-Model WindTre

**Per: Template 16_Technology_Service-Resource-Model_v1.6**  
**Da: W3Suite (Easy Digital Group)**  
**Data: 2 Febbraio 2026**

---

## Istruzioni

Apri il file `16_Technology_Service-Resource-Model_v1.6_(3).xlsx` e vai al tab **"Service Model (to be filled)"**.

Per ogni risorsa W3Suite, compila una riga usando **esattamente i valori dei dropdown** elencati di seguito.

---

## Risorse da Inserire (12 totali)

### 1. Backend Node.js (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | W3Suite (Easy Digital Group) |
| Service Resource Implementation | Node.js 20 LTS + Express.js API server |
| # instances | 3 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `GitOps - Scripts (vendor provided)` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `SW Integrator` |
| Operation Other | Monitoring, Incident Management |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 2. Redis Cache (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | Redis Ltd |
| Service Resource Implementation | Redis 7.x in-memory cache + session store |
| # instances | 2 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active-StandBy` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `Native feature of cloud resource` |
| Backup Store | `Local storage (same site)` |
| Backup Full Freq | `Daily` |
| Backup Full Retention | `1 week` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Minutes (1-5)` |
| Operated By | `SW Integrator` |
| Operation Other | Monitoring |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 3. Nginx Reverse Proxy (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | Nginx Inc (F5) |
| Service Resource Implementation | Nginx reverse proxy + TLS 1.3 termination |
| # instances | 2 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `N/A` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `SW Integrator` |
| Operation Other | Monitoring |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 4. Fortinet FortiGate Firewall (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Full IaaS` |
| Service Resource Vendor | Fortinet |
| Service Resource Implementation | FortiGate WAF + IPS/IDS + Firewall |
| # instances | 2 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active-StandBy` |
| Capacity Class | `Fixed` |
| Capacity Method | `N/A` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Scheduled` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Vendor managed |
| Deploy Artifact | `N/A` |
| Artifact Registry | `N/A` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `Export file (vendor)` |
| Backup Store | `Local storage (same site)` |
| Backup Full Freq | `Daily` |
| Backup Full Retention | `1 month` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Manual By Operation` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `HW/SW vendor` |
| Operation Other | Security monitoring |
| Cost Model | `Subscription` |
| Cost Details | Managed by Seeweb |

---

### 5. Identity & Auth Service (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | W3Suite (Easy Digital Group) |
| Service Resource Implementation | OAuth2/OIDC + JWT + RBAC 3-level engine |
| # instances | 3 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `GitOps - Scripts (vendor provided)` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `N/A` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `SW Integrator` |
| Operation Other | Security monitoring |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 6. Audit Logging Service (CORE PLATFORM)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `CORE PLATFORM` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | W3Suite (Easy Digital Group) |
| Service Resource Implementation | Structured JSON logs + PostgreSQL audit tables (90 days retention) |
| # instances | 2 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `GitOps - Scripts (vendor provided)` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `Native feature of cloud resource` |
| Backup Store | `Local storage (same site)` |
| Backup Full Freq | `Daily` |
| Backup Full Retention | `1 month` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Minutes (1-5)` |
| Operated By | `SW Integrator` |
| Operation Other | Compliance audit support |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 7. PostgreSQL Primary (DATABASE LAYER)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `DATABASE LAYER` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Mixed CaaS/PaaS` |
| Service Resource Vendor | PostgreSQL Global Development Group |
| Service Resource Implementation | PostgreSQL 15 primary + streaming replication |
| # instances | 1 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `Outages (maintenance window)` |
| Release Class | `Scheduled` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `Outages (maintenance window)` |
| Config Specification | `File (SQL) - Schema migration` |
| Config Version | Git versioned (Drizzle ORM) |
| Deploy Artifact | `SQL migration scripts` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource: Release and Recovery ` |
| Backup Method | `Native feature of cloud resource` |
| Backup Store | `Remote storage (different site)` |
| Backup Full Freq | `Daily` |
| Backup Full Retention | `1 month` |
| Backup Incr Freq | `5 min` |
| Backup Incr Retention | `1 week` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Manual By Operation` |
| RTO | `Hour (1-5)` |
| RPO | `Minutes (1-5)` |
| Operated By | `SW Integrator` |
| Operation Other | Backup verification, Performance tuning |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 8. PostgreSQL Replica (DATABASE LAYER)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA-` |
| Proposal Modules | `DATABASE LAYER` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Mixed CaaS/PaaS` |
| Service Resource Vendor | PostgreSQL Global Development Group |
| Service Resource Implementation | PostgreSQL 15 read replica + failover target |
| # instances | 1 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `StandBy` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Scheduled` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (SQL) - Schema migration` |
| Config Version | Synced from Primary |
| Deploy Artifact | `SQL migration scripts` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Manual By Operation` |
| RTO | `Minutes (1-5)` |
| RPO | `Minutes (1-5)` |
| Operated By | `SW Integrator` |
| Operation Other | Failover testing |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 9. Ceph Storage (DATABASE LAYER)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `DATABASE LAYER` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Full IaaS` |
| Service Resource Vendor | Ceph Foundation (Red Hat) |
| Service Resource Implementation | Ceph distributed storage cluster |
| # instances | 3+ |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Scheduled` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Vendor managed |
| Deploy Artifact | `N/A` |
| Artifact Registry | `N/A` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `Export file (vendor)` |
| Backup Store | `Remote storage (different site)` |
| Backup Full Freq | `Weekly` |
| Backup Full Retention | `1 month` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Hour (1-5)` |
| RPO | `Minutes (1-5)` |
| Operated By | `HW/SW vendor` |
| Operation Other | Capacity monitoring |
| Cost Model | `Subscription` |
| Cost Details | Managed by Seeweb |

---

### 10. Secret Manager (DATABASE LAYER)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `DATABASE LAYER` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | W3Suite (Easy Digital Group) |
| Service Resource Implementation | AES-256-GCM encryption + env vars (Vault-ready architecture) |
| # instances | 1 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Fixed` |
| Capacity Method | `N/A` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Scheduled` |
| Release Method | `Ops Manual - CLI shell scripts` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `Resource Recovery` |
| Backup Method | `Export file (vendor)` |
| Backup Store | `Remote storage (different site)` |
| Backup Full Freq | `Daily` |
| Backup Full Retention | `1 month` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `No Resilient` |
| Recovery Method | `Manual By Operation` |
| RTO | `Hour (1-5)` |
| RPO | `Hour (1-5)` |
| Operated By | `SW Integrator` |
| Operation Other | Key rotation |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

### 11. OpenAI GPT API (AI SERVICES)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,5%` |
| SLA Class | `HA-` |
| Proposal Modules | `AI SERVICES` |
| Hosting Model | `Not W3 Public cloud Tenant` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | OpenAI |
| Service Resource Implementation | OpenAI GPT-4 / GPT-3.5-turbo API |
| # instances | N/A (SaaS) |
| Region/Zone | OpenAI Cloud (EU endpoint) |
| Distribution Method | `SaaS  App - Generic Platform` |
| Resource Role | `Active` |
| Capacity Class | `Elastic` |
| Capacity Method | `Native autoscale (SaaS /Cloud providers)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `Ops Manual - Cloud consolle/direct Log-on resource` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | API Version pinning |
| Config Version | OpenAI managed |
| Deploy Artifact | `N/A` |
| Artifact Registry | `N/A` |
| Backup Use for | `N/A` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Zone Resilent ` |
| Recovery Method | `Automated by Cloud/SaaS Provider` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `SaaS Provider` |
| Operation Other | Rate limit monitoring |
| Cost Model | `Public Cloud Consumption` |
| Cost Details | Pay-per-use (tokens) |

---

### 12. AI Gateway MCP (AI SERVICES)

| Campo | Valore Dropdown |
|-------|-----------------|
| ENV | `PROD` |
| SLA Value | `99,9%` |
| SLA Class | `HA` |
| Proposal Modules | `AI SERVICES` |
| Hosting Model | `Not W3 Private datacenter` |
| Hosting Provider | `Vendor Private` |
| Technical Model | `Multi-tenant SaaS` |
| Service Resource Vendor | W3Suite (Easy Digital Group) |
| Service Resource Implementation | MCP Gateway per AI routing, orchestration, fallback |
| # instances | 2 |
| Region/Zone | Seeweb Italy (Rome/Milan) |
| Distribution Method | `Virtualization Platform - ProxMox` |
| Resource Role | `Active` |
| Capacity Class | `Scalable` |
| Capacity Method | `Manual scale (Operation)` |
| Capacity Outages | `No outages (hot-config)` |
| Release Class | `Continuous` |
| Release Method | `GitOps - Scripts (vendor provided)` |
| Release Outages | `No outages (hot-config)` |
| Config Specification | `File (JSON/YAML) - App properties` |
| Config Version | Git versioned |
| Deploy Artifact | `Container Image` |
| Artifact Registry | `Private Registry (Vendor)` |
| Backup Use for | `N/A` |
| Backup Method | `N/A` |
| Backup Store | `N/A` |
| Backup Full Freq | `N/A` |
| Backup Full Retention | `N/A` |
| Backup Incr Freq | `N/A` |
| Backup Incr Retention | `N/A` |
| Recovery Class | `Local Resilent ` |
| Recovery Method | `Automated By App` |
| RTO | `Minutes (1-5)` |
| RPO | `Seconds ` |
| Operated By | `SW Integrator` |
| Operation Other | AI model performance monitoring |
| Cost Model | `Subscription` |
| Cost Details | Included in SaaS subscription |

---

## Note sui Valori Dropdown

I valori tra backtick (\`) sono **esattamente quelli presenti nei menu a tendina** del template WindTre. Alcuni valori hanno spazi finali intenzionali (es. `Local Resilent `, `Seconds `).

### Valori Custom da Aggiungere

Se il dropdown non accetta un valore, vai al tab **"Values&Descriptions"** e aggiungi:

1. Nella sezione **Resources** (riga 103+):
   - `PostgreSQL 15`
   - `Redis 7.x`
   - `Nginx`
   - `Fortinet FortiGate`
   - `Identity & Auth Service`
   - `Audit Logging Service`
   - `Secret Manager`
   - `AI Gateway MCP`

2. Nella sezione **Hosting Provider** (se necessario):
   - `Vendor Private` già esiste
   - Seeweb è incluso come "Vendor Private"

---

## Checklist Finale

- [ ] Tutte le 12 risorse inserite
- [ ] Valori dropdown selezionati (non digitati manualmente)
- [ ] Risorse custom aggiunte a Values&Descriptions se necessario
- [ ] SLA coerenti (99,9% tranne OpenAI 99,5%)
- [ ] Proposal Modules corretti (CORE PLATFORM, DATABASE LAYER, AI SERVICES)
