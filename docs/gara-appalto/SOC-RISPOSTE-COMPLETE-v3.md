# SOC Technology v2.8 - Risposte W3Suite Complete

**Data**: 3 Febbraio 2026  
**Versione**: 3.0  
**Infrastruttura**: Seeweb Italia - Proxmox VE cluster 2 nodi HA

---

## Riepilogo Compliance

| Metrica | Valore | % |
|---------|--------|---|
| **Full Compliance** | 103 | 63% |
| **Partial** | 1 | 1% |
| **Not Applicable** | 60 | 37% |
| **TOTALE** | 164 | 100% |

---

## Infrastruttura W3Suite (Corretta)

| Componente | Configurazione |
|------------|----------------|
| **Cluster** | Proxmox VE 2 nodi HA (Bare Metal) |
| **Firewall** | FortiGate VM (Virtual Appliance) |
| **Backup** | Snapshot + Incrementale (1 min) |
| **DR** | Cloud Backup PBS su DC2 (Region Resilient) |
| **Database** | PostgreSQL 15 streaming replication |
| **Hosting** | Seeweb S.r.l. datacenter Italia |

---

## Legenda Colonne Risposta

| Colonna | Descrizione |
|---------|-------------|
| **Solution Modules** | Moduli W3Suite che coprono il requisito |
| **Included** | Incluso nel prezzo (Yes/No/N/A) |
| **Coverage** | Full / Partial / Not Applicable |
| **Short Answer** | Come W3Suite soddisfa il requisito |
| **Non Compliance** | Motivo se non Full |

---

## Service Management (33 requisiti)

**Compliance**: Full 28, Partial 0, N/A 5

### ✅ Service-Level GL # 1

**Statement:** The App/NF vendor to “Fill-in” the Architectural Guideline (section proposal structure) with the modules of solution specifying the Hosting and techni...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Service-Level GL # 2

**Statement:** The App/NF vendor (COTs and SaaS) to “Fill-in” the Service Level Form (Resource Section) selecting resources that are appropriate for each hosting mod...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ⬜ Service-Level GL # 3

**Statement:** COTs App/NF (means license-based application that need to be installed) vendor that host the service on “W3 Cloud Tenant “to “Fill-in” the Service Lev...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Service-Level GL # 4

**Statement:** COTs App/NF (means license-based application that need to be installed) that host the service on “W3 (Private Cloud) must “Fill-in” the Service Level ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | CaaS, Full IaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Service-Level GL # 5

**Statement:** Multi-tenant SaaS vendor (which means vendor that share resources among tenants) to Fill in the Service Level Form for only SW resources.
If the plat...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Service-Level GL # 6

**Statement:** All Application/NF resources must have High availability model HA class (W3 taxonomy) which means that resources are multi-zone with autoscaling (Rif....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | SLA 99.9% produzione. Proxmox VE cluster 2 nodi HA, monitoring 24/7, incident management. |

---

### ✅ Service-Level GL # 7

**Statement:** All Application/NF resources must have SLA >= 99,9...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | SLA 99.9% produzione. Proxmox VE cluster 2 nodi HA, monitoring 24/7, incident management. |

---

### ⬜ Service-Level GL # 8

**Statement:** COTs App/NF (means license-based application that need to be installed) Capacity model to be “Fully automated” which means the all the resource used s...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Service-Level GL # 9

**Statement:** COTs K8s App/NF must configure k8s for autoscaling both for PODs and for K8s (nodes), or use a serverless configuration which is natively auto scale...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Full PaaS, CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Service-Level GL # 10

**Statement:** SaaS Capacity Model: To be auto scale no manual activities to set the needed resources...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Service-Level GL # 11

**Statement:** Application/NF Vendor to describe how many releases for each “resources” included on service are needed per year.
The Releases must be applied when r...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 12

**Statement:** Application/NF Vendor to provide Bug Fixes and data cleanups procedures...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Service-Level GL # 13

**Statement:** Application/NF App Resource (App SW) to be designed to support releases automation (full release or defect fix) without interrupting the service (Zero...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 14

**Statement:** Application/NF Infra Resource to be designed to support releases automation (full release or defect fix) without interrupting the service (zero down t...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 15

**Statement:** SaaS (Personalization Resource) Releases of patches to be Automated using DevOps Tools (internally of cloud provider, or standard best model)...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 16

**Statement:** COTs Service App/NF (means license-based application that needs to be installed) Resources Release of each layer (Compute, Store, Network) and non-nat...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 17

**Statement:** Application/NF Resource release and patching content to be documented, and stored on company Git...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Service-Level GL # 18

**Statement:** Vendor to define which resources are to be backup and for which reason (Resource Release, Recovery for Faults or both)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 19

**Statement:** Vendor to define the scheduling configuration to apply for the specific resources used by application.
Backup scheduling to be based on Native Servic...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 20

**Statement:** The resources backup data (full/incremental) to be stored on HCP “object stores”...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 21

**Statement:** Backup Native Services: Use Cloud Native Service backup feature of the specific resource...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 22

**Statement:** Backup NFS: Use native backup feature of NFS service that stores the backup on object store service of cloud provider (centrally managed by cloud back...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 23

**Statement:** Backup Stateful non-native Middleware resources installed on K8s: to be based on CRD K8s operator that must include the backup feature...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 24

**Statement:** Backup of database installed on VM: to be based on backup utilities provided by DB vendor...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | IaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 25

**Statement:** Backup NFVI: NFVI on-premises vendor to specify which backup solution is implemented based on type of Store provided (Hyper convergent infra with stor...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 26

**Statement:** SaaS provider to describe the internal backup features and use for recovery, internal SaaS releases and integrator personalization Releases (if SaaS i...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 27

**Statement:** Application provides the Export function of W3 data stored internally in a standard format (JSON, AVRO) in case of W3 request....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Service-Level GL # 28

**Statement:** Application/NF Resources Recovery model to be fully automatic both for fail-over and for fail-back with no data loss (RPO = 0). The resource instance ...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 29

**Statement:** If W3 accept “Manual recovery procedure” (which means that operation in case of fault must launch a recovery procedure) the procedure has to part of d...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 30

**Statement:** SaaS Recovery Model: To be automated by SaaS vendor...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Service-Level GL # 31

**Statement:** Vendor of Application/NF to fill the Service-level form section Operating Model by specify the operating model for each resource of services.
The ven...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Service-Level GL # 32

**Statement:** Vendor of Application/NF Cost to fill the Service-level form section Cost Model
...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ⬜ Service-Level GL # 33

**Statement:** NF vendor to fulfil the Service/Resource Distribution section...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

## Design (23 requisiti)

**Compliance**: Full 11, Partial 0, N/A 12

### ✅ Cloud-Model GL# 11

**Statement:** SaaS Application/NF provider must specify the model:
• (SaaS) multi-tenant provider (shared resource for tenants) or
• (SaaS) single-tenant (dedicat...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Cloud-Model GL# 12

**Statement:** SaaS Application /NF provider to specify which data centers are used if are
proprietary (explain which and which locations) or based on Hyperscale (w...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Cloud-Model GL# 13

**Statement:** COTs Application/NF (means application that require deployment & hosting on W3 public clouds) must use cloud native services...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ⬜ Cloud-Model GL# 14

**Statement:** COTs Application/NF (means license-based application that need to be installed) must use Compute native evolute Services.
The main guideline is to us...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 15

**Statement:** COTs Application (means license-based application that need to be installed) that are based on K8s must use CaaS (which is cloud providers K8s managed...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Cloud-Model GL# 16

**Statement:** COTs CaaS Application/NF (means application that require deployment & hosting on HCP) that require to install middleware on K8s must use
middleware t...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ⬜ Cloud-Model GL# 19

**Statement:** COTs Application/NF (means license-based application that needs to be installed) must use cloud native store services (no installation of store middle...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 20

**Statement:** COTs Application/NF (means license-based application that need to be installed) that need a SQL engine is required to use open-source DbaaS implemente...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 21

**Statement:** COTs Application/NF (means license-based application that needs to be installed) that needs to store not structured data (files) must use cloud Object...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 22

**Statement:** CaaS Application/NF that needs to mount a vDisk on POD must use external cloud NFS services....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 23

**Statement:** COTs Application/NF (means license-based application that need to be installed) must use HCP native network services. No SW network appliances (of thi...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Design GL # 2

**Statement:** Application/NF “Internal Design Model” should be based on Microservices...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Design GL # 3

**Statement:** Application Microservices to be implemented with the following Models:
• Kubernetes (PODs)
• Container as a service (Serverless container)
• Server...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Full PaaS, CaaS, Mixed CaaS/PaaS |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Design GL # 4

**Statement:** Apps/NF deployed on CaaS do not be sticked to specific node of cluster enabling the changes of K8s releases without affecting the Apps....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Design GL # 5

**Statement:** Application/NF deployed on Kubernetes must use service mesh (no communication code implemented within Pods communication only with http all logic on s...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Design GL # 6

**Statement:** Application/NF hosted on Kubernetes must implement network logic external to PODs using Service Mesh (based on Istio).
Vendor to state if use other S...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ⬜ Design GL # 14

**Statement:** Application/NF end point must be discovered by name (Service Registry).
No fixed IP hardcoded within application code....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Design GL # 15

**Statement:** Application/NF “configurations parameters” must be external to application.
No configuration data hardcode (App IPs, Instances of services ..)....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ⬜ Design GL # 16

**Statement:** CaaS Application/NF configurations must be stored on K8s ConfigMap....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Design GL # 17

**Statement:** Application/NF to provide Rest API (compliant with TMF standards API when applicable).
Rest API to be authorized with Oauth 2.0 protocol...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Design GL # 18

**Statement:** Application/NF API must support “OpenAPI standard” (to be discovered automatically possibly also by GenAI)...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Design GL # 19

**Statement:** Application/NF must support asynchronous integration for streaming and event driven architectural models (one or more queues technologies)...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ⬜ Design GL # 26

**Statement:** NF implementation to base on Kubernetes native model...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

## Hosting (21 requisiti)

**Compliance**: Full 5, Partial 0, N/A 16

### ⬜ Hosting GL # 1

**Statement:** Applications that are hosted on W3 tenants communicate using W3 landing zone network. No additional VPCs to be implemented by vendor, if requested to ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Hosting GL # 2

**Statement:** Application hosted externally to W3 must use Internet to communicate to other W3 applications....

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance), Full IaaS, ISO 27001. |

---

### ✅ Hosting GL # 3

**Statement:** External applications (which is SaaS application hosted externally to W3) that need W3 private network integration (with motivated and accepted reason...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 4

**Statement:** Application hosted on w3 tenants: must be deployed in specific Application context (which is AWS Account, Google Project or Azure Resource Group) defi...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ⬜ Hosting GL # 5

**Statement:** COTs Application (means license-based application that need to be installed) Hosted on W3 tenants must use w3 tenant’s shared virtual network.
Deviat...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 6

**Statement:** It is responsibility of COTs vendor (means license-based application that need to be installed) to implement if needed (within specific “application c...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Info |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 7

**Statement:** App/NF hosted on W3 (Cloud tenants or on-premises) must use IP ranges (subnets) defined by W3...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 8

**Statement:** Application hosted on W3 HCP tenants must use Virtual DNS defined in the landing-zones.
Application endpoints to be registered on DNS of specific clo...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 9

**Statement:** COTs App/NF (means license-based application that need to be installed) vendor to specify if needs multi-regional traffic load balancer...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Info |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 10

**Statement:** COTs Application (means license-based application that needs to be installed) hosted on W3 cloud tenants (but not on W3 shared K8s clusters) that need...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Info |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Hosting GL # 11

**Statement:** COTs Application (means license-based application that needs to be installed) Vendor to specify if the application needs to access internet (outbound)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Info |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ⬜ Hosting GL # 12

**Statement:** COTs Application (means license-based application that need to be installed) Vendor (that host application on Kubernetes in Shared clusters or on dedi...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT |
| Mandatory | Info |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Hosting GL # 13

**Statement:** COTs Application/Network Management plane (means license-based application that needs to be installed) Vendor to specify if need to be accessed though...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ⬜ Hosting GL # 19

**Statement:** COTs CaaS application (means license-based application that need to be installed) Hosted on W3 tenants “preferably” to use shared K8s cluster availabl...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 20

**Statement:** NF (regardless of hosting model), NF Mgr. APP (EMS/NMS), NF MGR. App (OSS) communicate with Network management applications via DCN (Data Communicatio...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 21

**Statement:** Network Data Center’s to be based on Light virtualization model (K8s on Bare metal)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | CaaS |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 22

**Statement:** K8s instances to be managed by multi-cluster via central controller to be hosted on Public Cloud or on-premises.
Management means set/enforce policie...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 23

**Statement:** cNF Network Functions (that are not SaaS) must be Kubernetes distribution “agnostic”.
At least must be certified on main K8s distribution: Google GKE...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 26

**Statement:** NF Vendor to describe which network advanced CNI (Container Network Interface) features are implemented for High performance network and for container...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | NTW |
| Mandatory | Recommend |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 27

**Statement:** NFVI Vendor (both for Traditional virtualization, Light virtualization and HW appliance must provide BMC (bare metal controller) based on IPMI standar...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | CaaS |
| Context | NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 28

**Statement:** NFVI Vendor to describe used virtualization stack (Traditional virtualization Stack: like VMware OpenStack, Proxmox or Light Virtualization stack:  K8...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

## Strategy (15 requisiti)

**Compliance**: Full 2, Partial 1, N/A 12

### ⬜ Cloud-Model GL# 1

**Statement:** W3 has multi-cloud strategy. COTs Apps (means license-based application which SW to be installed) to be installed on one of W3 Hyperscale’s (AWS, Goog...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud Brokering GL # 1

**Statement:** COTs Application (means license-based application which SW to be installed) to be cloud Agnostic, cloud assignment is W3 responsibility...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### 🔧 Cloud-Model GL# 2

**Statement:** Apps must use public cloud advanced models:
• SaaS
• Serverless (PaaS)
• CaaS and Mixed CaaS/PaaS
IaaS is not recommended; it need to be explicitl...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Partial |
| **Short Answer** | Full IaaS su Seeweb Italia datacenter. Necessario per controllo infrastruttura e compliance GDPR Italia. |
| **Non Compliance** | IaaS giustificato da requisiti compliance italiana. |

---

### ✅ Cloud-Model GL# 3

**Statement:** COTS Applications (means application that requires deployment & hosting on CSP) model should be based on fully serverless (PaaS), mixed CaaS/PaaS or C...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ⬜ Cloud-Model GL# 4

**Statement:** Custom Analytic Application should be based on a PaaS HCP Native service.  GCP is the current W3 HCP for Data Platform services....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Cloud-Model GL# 5

**Statement:** Network Function (NF) vendor to describe (as evolution) which Hybrid cloud model support or plan to support...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Cloud-Model GL# 6

**Statement:** Not SaaS Network Function (NF) and NF MGR. APP (EMS/NMS) to be based on Containers only (NF => cNF- Containerized Network Function)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Cloud-Model GL# 7

**Statement:** Data Plane Core Network Functions to be based on on-premises using CaaS (cNF cloud native functions on K8s)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Cloud-Model GL# 8

**Statement:** Network Function vendor as evolution path describes how
Control plane (/ Signaling) Core “Network Functions” will support Hybrid model....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Cloud-Model GL# 9

**Statement:** Management Plane: OSS of network domains (RAN, transmission and Core) to be hosted on public cloud...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Cloud-Model GL# 10

**Statement:** Management Plane NF MGR. APP (EMS/NMS) of network domains (RAN, transmission and Core) to be hosted on Hybrid Cloud...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ✅ Design GL # 1

**Statement:** Applications, NF MGR. APP (EMS/NMS), NF MGR. App (OSS) should use have “No Code Low Code model” development model...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ⬜ Cloud Brokering GL # 2

**Statement:** General COTs Application/NF/NTW management plane (means license-based application that must be installed) must be hosted on W3 HCP tenants “landing-zo...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 24

**Statement:** Network Functions should support main cloud provider Hybrid distributed infrastructure (e.g. Google distributed cloud, AWS outpost)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 25

**Statement:** (Cloud Native Function) Network Functions must be based on CaaS only infrastructure.
Vendor to provide full cNF, in case still have some VMs (to be i...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

## Observability Integration (12 requisiti)

**Compliance**: Full 9, Partial 0, N/A 3

### ✅ Hosting GL # 30

**Statement:** App/NF Vendor to support W3 to properly set the Service/Resource types W3 CMDBs (IT ServiceNow master for IT, CIRCE master for NTW)....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance), Full IaaS, ISO 27001. |

---

### ✅ Hosting GL # 31

**Statement:** COTs Application vendor (means application that need to be installed on W3 tenants) if not installed on shared K8s cluster to integrate to W3 Observab...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 32

**Statement:** COTs Application Vendor (means application that needs to be installed on W3 tenants) must implement rules using HCP Operation Tools (AWS cloud Watch, ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 33

**Statement:** COTs Application Vendor (means application that need to be installed on W3 tenants) that uses non-native cloud resources (means that install middlewar...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 34

**Statement:** COTs Application Vendor (means application that needs to be installed on W3 tenants) that uses non-native cloud resources (means that install middlewa...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ⬜ Hosting GL # 35

**Statement:** NF performance (local domains management) vendor must integrate the metrics to W3 common data platform for general analytics...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 36

**Statement:** NF MGR. App (NE/NMS) must integrate the Alarms with INS, and audit logs with Splunk...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Hosting GL # 37

**Statement:** NFVI provider (Heavy virtualization, Light Virtualization, Bare Metal) must integrate (provide adaptation): with INS for Alarms and with Splunk for au...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ✅ Hosting GL # 38

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Alarms Events to be integrated with W3 ServiceNow...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 39

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Metrics Events to be integrated with W3 XSPotter...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 40

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Log Events to be integrated with W3 Splunk...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Hosting GL # 41

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Trouble Tickets Events to be integrated with W3 ServiceNow...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | Multi-tenant SaaS, Single-tenant SaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

## Automation (11 requisiti)

**Compliance**: Full 5, Partial 0, N/A 6

### ⬜ Design GL # 27

**Statement:** Autonomous Network Reference Architecture Compliance
All the operation flows described by TM Forum (including initial deployment, upgrade, rollback, ...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Design GL # 28

**Statement:** Zero-Touch Orchestration and Automation (ZTNA):
OSS/NMS systems must facilitate end-to-end automation of network services and operations, minimizing ...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Design GL # 29

**Statement:** Closed-Loop Automation (CLA):
OSS/NMS must enable continuous monitoring, analysis, and optimization of network performance through automated feedback...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Design GL # 30

**Statement:** Intent-Based Networking (IBN):
OSS/NMS applications must enable the definition of desired network outcomes (intents) rather than specific configurati...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Design GL # 31

**Statement:** Service Orchestration and Resource Abstraction:
OSS/NMS systems must provide a unified view of network resources and services, enabling dynamic orche...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ⬜ Design GL # 32

**Statement:** Data-Driven Operations and Analytics:
OSS/NMS systems shall feed and leverage on data analytics to gain insights into network performance and custome...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

### ✅ Automation GL# 1

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to provide “Deploy Artifacts” based on specify deployment Model...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Automation GL# 2

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to provide “Deploy script specs” based on specify deployment Mo...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Automation GL# 3

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor must provide (IaC) Terraform Enterprise scripts for resource sp...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Automation GL# 4

**Statement:** SaaS Vendor that provides coding within the platform must support DevOps SW automation...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Automation GL# 6

**Statement:** Light Virtualization (K8s on Bare Metal) NFVI/HW provider to support Infrastructure life cycle Automation, vendor to state which bare metal automation...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

## Environment & FinOps (9 requisiti)

**Compliance**: Full 7, Partial 0, N/A 2

### ✅ Env-FinOps GL # 1

**Statement:** BoM/Dimensioning Table for each environment, including an architectural schema and a sizing and capacity model, as per the provided guidelines....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant), Not W3 (Public Cloud Tenant) |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Env-FinOps GL # 2

**Statement:** Architectural Schema of cloud services and their interconnections should be provided for each environment....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant), Not W3 (Public Cloud Tenant) |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Env-FinOps GL # 3

**Statement:** Cost estimation using the public pricing calculators of the assigned cloud providers (e.g., AWS, GCP, Azure, OCI)....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant), Not W3 (Public Cloud Tenant) |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Hosting Seeweb Italia (Not W3 Private). Datacenter ISO 27001, GDPR compliant. |

---

### ✅ Env-FinOps GL # 4

**Statement:** Vendor to list all the environments needed for the application deployment, including production and non-production environments for testing and develo...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ⬜ Env-FinOps GL # 5

**Statement:** Vendor to provide a monthly usage planning for each environment, aligned with the overall project schedule up to the end-state.
The plan shall be bas...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Hosting su Seeweb (Not W3). FinOps gestito direttamente con provider. |
| **Non Compliance** | Non W3 Hyperscale |

---

### ✅ Env-FinOps GL # 6

**Statement:** No-production environments should be configured according to the defined SLA and resource allocation guidelines, with adjustments for performance test...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | SLA 99.9% produzione. Proxmox VE cluster 2 nodi HA, monitoring 24/7, incident management. |

---

### ⬜ Env-FinOps GL # 7

**Statement:** Apply specific resource "Tags" to enable cost tracing and allocation across cloud environments according to Wind Tre indication....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Hosting su Seeweb (Not W3). FinOps gestito direttamente con provider. |
| **Non Compliance** | Non W3 Hyperscale |

---

### ✅ Env-FinOps GL # 8

**Statement:** Vendor to provide environment automation scripts based on cloud-native automation tools (e.g., Google Cloud Scheduler, Google Cloud Workflows, AWS Ste...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Env-FinOps GL # 9

**Statement:** Vendor to specify & implement usage windows via Automation scripts to include Start/stop and scheduling (e.g. day/night, weekly, working days ecc.) of...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

## Observability Design (8 requisiti)

**Compliance**: Full 8, Partial 0, N/A 0

### ✅ Design GL # 7

**Statement:** Application/Network management vendor must provide observability API (better if is on Open Telemetry or Prometheus for metrics).
Vendor to list the m...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Design GL # 8

**Statement:** App/NF Vendor must provide observability events in real-time (for all resources used for the service).
The resource includes both Application SW and M...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Design GL # 9

**Statement:** App/NF Vendor must document the possible Errors (with levels of priority) of all resources used by the service and Operating procedure to fix/escalate...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 21

**Statement:** Application Vendor to provide operation error (knowledge base)...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 22

**Statement:** Application must support “Data integrity”...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 23

**Statement:** Application vendor that provides “Bulk programs” for upload data or for internal processing must guarantee reliability...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 24

**Statement:** Application/NF vendor to provide “operation console and dashboards” that tracks all internal activities.
Includes
- Transactional activities (Status...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Design GL # 25

**Statement:** Application/NF vendor to provide database administration procedure (if needed) for compacting the databases, for data archiving (store old data on ext...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

## Acceptance (7 requisiti)

**Compliance**: Full 7, Partial 0, N/A 0

### ✅ Acceptance GL # 1

**Statement:** Vendor to provide technical documentation so solution according to W3 Templates the documents are:
H2LD, HLD, LLD...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, QA |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Documentazione tecnica, test DevOps, deployment validation, recovery test disponibili. |

---

### ✅ Acceptance GL # 2

**Statement:** Accept Automation DevOps/SecOps deploy: Vendor to provide test execution of DevOps (YAML, Helm, Argo ...) and the store on W3 Gits...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Acceptance GL # 3

**Statement:** Accept Automation DevOps/SecOps deploy: Vendor to provide test execution of DevOps (YAML, Helm, Argo ...) and the store on W3 Gits...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | Single-tenant SaaS, Full PaaS, CaaS, Mixed CaaS/PaaS, Full IaaS, Mixed IaaS/PaaS |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Acceptance GL # 4

**Statement:** For SW that is of W3 property Accept Automation DevOps/GitOps deployment: Vendor to provide test execution Terraform for creating infrastructure and D...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Acceptance GL # 5

**Statement:** Accept K8s deployment: Vendor to provide test the deployment conformance to CaaS W3 guidelines (on no prod environment)...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | CaaS, Mixed CaaS/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Acceptance GL # 6

**Statement:** Accept Recovery model: Vendor to test the Recovery model (automatic/Manual) as stated on the Service Level Form (on no prod environment)...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Backup snapshot + incrementale via PBS. Daily full + incrementale 1 min. Retention 1 mese. Cloud Backup PBS su DC2 (Region Resilient). |

---

### ✅ Acceptance GL # 7

**Statement:** Accept Observability model: Vendor to test the Observability...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

## Security Integration (6 requisiti)

**Compliance**: Full 4, Partial 0, N/A 2

### ⬜ Hosting GL # 14

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor, must store “Cloud Admins User” on Azure AD.
The integration i...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ⬜ Hosting GL # 15

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to specify the Application Admin cloud resources “roles” (that ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

### ✅ Hosting GL # 16

**Statement:** Admins access of VMs (both on cloud tenants and on-premises) or on bare metal (on-premises) must use the PAM W3 solution...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | IaaS, Mixed Iaas/PaaS |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Hosting GL # 17

**Statement:** App2App communication must use the HCP M2M non-Human model to grant access to resources to an application....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Hosting GL # 18

**Statement:** COTs Application (which means license-based application that needs to be installed) that are not deployed on common area must be instrumented with W3 ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Hosting GL # 29

**Statement:** All “Externally Hosted” Application to be accessed via Internet.
The provider must provide internally a Firewall configured to accept traffic only th...

| Campo | Valore |
|-------|--------|
| Hosting | Not W3 (Private Cloud), Not W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

## AI (5 requisiti)

**Compliance**: Full 5, Partial 0, N/A 0

### ✅ Design GL # 20

**Statement:** Application/NF to provide GenAI based assistance for configuration and development...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | AI SERVICES, CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OpenAI GPT-4 API (Deployer AI Act), MCP Gateway, RAG embeddings, AI Voice Agent. |

---

### ✅ Design GL # 40

**Statement:** APP/NF/Network Management plane Vendor to list if available on solution: the ML functions, ML Algorithm and technology framework used...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | AI SERVICES, CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OpenAI GPT-4 API (Deployer AI Act), MCP Gateway, RAG embeddings, AI Voice Agent. |

---

### ✅ Design GL # 41

**Statement:** APP/NF/Network Management plane to list (if includes this feature): for each ML function if there is a need of W3 trained data or if the model is pre-...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | AI SERVICES, CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OpenAI GPT-4 API (Deployer AI Act), MCP Gateway, RAG embeddings, AI Voice Agent. |

---

### ✅ Design GL # 42

**Statement:** APP/NF/Network Management plane vendor to describe (if used) the GenAI technology used and the type of use. Preferred to use HCP technology services...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | AI SERVICES, CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OpenAI GPT-4 API (Deployer AI Act), MCP Gateway, RAG embeddings, AI Voice Agent. |

---

### ✅ Design GL # 43

**Statement:** APP/NF/Network Management plane vendor to describe (if used) the use of GenAI with Embedding RAG technology...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Info |
| **Solution Modules** | AI SERVICES, CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OpenAI GPT-4 API (Deployer AI Act), MCP Gateway, RAG embeddings, AI Voice Agent. |

---

## Security Design (4 requisiti)

**Compliance**: Full 4, Partial 0, N/A 0

### ✅ Design GL # 10

**Statement:** Application/NF/Network management vendors must use SAML 2.0 for Application user authentication to central W3 IAM (currently implemented with azure AD...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Design GL # 11

**Statement:** Application/NF/Network management vendors to support (RBAC) authorization to enable profiled use of functions within the application.
Vendor to descr...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

### ✅ Design GL # 12

**Statement:** Application/NF/Network management vendors to describe how to support User Accounts/Profile provisioning automation.
Main guideline is that applicatio...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

### ✅ Design GL # 13

**Statement:** Application/NF/Network management vendors must store secrets (keys, PWD ...) on “Secret manager” services of HCP if deployed on cloud or use a Vaults ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Private Cloud), W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | CORE PLATFORM, DEVOPS |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | REST API OpenAPI, CI/CD pipeline, Git versioning, deploy automatizzato, rollback. |

---

## Integration (4 requisiti)

**Compliance**: Full 3, Partial 0, N/A 1

### ✅ Design GL # 36

**Statement:** App2App integration via ftp, db-link, or odbc/jdbc is not admitted.
Any deviation to this rule to be validated by W3....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 37

**Statement:** Applications/NF must be integrated with W3 “Data platform” (all transactions within an application to be loaded on W3 Lakehouse)...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ✅ Design GL # 38

**Statement:** Applications “Business Transaction” must be integrated with W3 “Data platform”...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

### ⬜ Design GL # 39

**Statement:** NF transactions “EDRs” (network user sessions, and rated sessions) must be integrated with W3 “Data platform”...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | NTW |
| Mandatory | Mandatory |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | Requisito per Network Functions. W3Suite è applicazione gestionale. |
| **Non Compliance** | Non Network Function |

---

## Cost, Sustainability (2 requisiti)

**Compliance**: Full 1, Partial 0, N/A 1

### ✅ Cloud-Model GL# 17

**Statement:** COTs CaaS Application (means application that require deployment & hosting on HCP) to support Arm-based processors (e.g., Graviton2, Tau T2A, C3A, Amp...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ⬜ Cloud-Model GL# 18

**Statement:** COTs CaaS Application/NF (means license-based application that need to be installed) to support HCP native OS (operating system) and RedHat (which is ...

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | N/A |
| **Included** | N/A |
| **Coverage** | Not Applicable |
| **Short Answer** | W3Suite su Seeweb Italia (Not W3 Private datacenter), non W3 Hyperscale. |
| **Non Compliance** | Hosting Not W3 |

---

## Integration, Observability (2 requisiti)

**Compliance**: Full 2, Partial 0, N/A 0

### ✅ Design GL # 33

**Statement:** All applications, SaaS and COTs Application that interact using API must use W3 API GTWYs (no need for vendor to add a GTWY), no direct interaction is...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Recommended |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

### ✅ Design GL # 34

**Statement:** Application, NF MGR. App (EMS/NMS), NF MGR. App (OSS) Vendor to state if (for process integration with W3 applications (in/out), is needed some non-tr...

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Recommended |
| **Solution Modules** | CORE PLATFORM |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Requisito coperto. Seeweb Italia datacenter: Proxmox VE cluster 2 nodi HA, FortiGate VM (Virtual Appliance). |

---

## Integration, Observability Design (1 requisiti)

**Compliance**: Full 1, Partial 0, N/A 0

### ✅ Design GL # 35

**Statement:** App vendor to describe How the E2E Integration observability Business Transactions/Processes Traces within APP....

| Campo | Valore |
|-------|--------|
| Hosting | All |
| Tech Model | All |
| Context | IT |
| Mandatory | Mandatory |
| **Solution Modules** | OBSERVABILITY |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | Grafana + Prometheus + Loki, logging JSON strutturato, metriche real-time, alerting. |

---

## security (1 requisiti)

**Compliance**: Full 1, Partial 0, N/A 0

### ✅ Automation GL# 5

**Statement:** COTS Application (means license-based application that need to be installed) vendor to prove that the SW has been tested for security (SAST and DASD)....

| Campo | Valore |
|-------|--------|
| Hosting | W3 (Public Cloud Tenant) |
| Tech Model | All |
| Context | IT, NTW |
| Mandatory | Mandatory |
| **Solution Modules** | SECURITY, INFRASTRUCTURE |
| **Included** | Yes |
| **Coverage** | Full |
| **Short Answer** | OAuth2/OIDC + MFA, 3-Level RBAC, RLS PostgreSQL, FortiGate VM (Virtual Appliance), TLS 1.3, AES-256. |

---

## Note Finali

### Hosting Model
W3Suite utilizza **"Not W3 Private datacenter"** (Seeweb Italia), non W3 Hyperscale (AWS/GCP/Azure).
Pertanto i requisiti specifici per "W3 (Public Cloud Tenant)" sono marcati **Not Applicable**.

### Network Functions
W3Suite è un'applicazione gestionale, non una Network Function.
I requisiti specifici per NF (Context: NTW) sono marcati **Not Applicable**.

### IaaS vs CaaS/PaaS
Utilizziamo **Full IaaS** (Proxmox VE) invece di CaaS/PaaS per:
- Controllo completo infrastruttura
- Compliance GDPR con data residency Italia
- Requisiti di sicurezza enterprise

### AI Services
W3Suite è **DEPLOYER** (Art. 26 AI Act), utilizza OpenAI GPT-4 come provider esterno SaaS.
OpenAI non è dichiarato come risorsa infrastrutturale.

---

**Fine Documento**
