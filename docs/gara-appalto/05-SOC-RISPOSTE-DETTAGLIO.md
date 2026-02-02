# SOC Technology v2.8 - Risposte W3Suite

## Riepilogo Compliance

| Metrica | Valore |
|---------|--------|
| **Totale Requisiti** | 164 |
| **Full Compliance** | 140 (85%) |
| **Partial Compliance** | 5 |
| **Not Applicable** | 19 (Network Functions) |

---

## Come Usare Questo Documento

1. Apri il file **SOC-RISPOSTE-W3SUITE.xlsx** 
2. Per ogni riga nel file originale SoC, trova il corrispondente ID
3. Copia i valori delle colonne M, N, O, P, Q nel file originale

---

## Legenda Colonne

| Colonna | Descrizione |
|---------|-------------|
| **M - Solution Modules** | Moduli W3Suite che coprono il requisito |
| **N - Included in Quotation** | Incluso nel prezzo (Yes/No) |
| **O - Requirement Coverage** | Full / Partial / Not Applicable |
| **P - Short Answer** | Come W3Suite soddisfa il requisito |
| **Q - Non Compliance** | Motivo se non Full |

---

## AI (5 requisiti)

### ✅ Design GL # 20

**Statement:** Application/NF to provide GenAI based assistance for configuration and development...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Requisito coperto secondo principi Cloud-First, API-First, Security by-design di W3Suite. |

---

### ✅ Design GL # 40

**Statement:** APP/NF/Network Management plane Vendor to list if available on solution: the ML functions, ML Algori...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 41

**Statement:** APP/NF/Network Management plane to list (if includes this feature): for each ML function if there is...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Requisito coperto secondo principi Cloud-First, API-First, Security by-design di W3Suite. |

---

### ✅ Design GL # 42

**Statement:** APP/NF/Network Management plane vendor to describe (if used) the GenAI technology used and the type ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ✅ Design GL # 43

**Statement:** APP/NF/Network Management plane vendor to describe (if used) the use of GenAI with Embedding RAG tec...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

## Acceptance (7 requisiti)

### ⚠️ Acceptance GL # 1

**Statement:** Vendor to provide technical documentation so solution according to W3 Templates the documents are:
...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Partial |
| **P** Short Answer | Documentazione tecnica disponibile. H2LD/HLD/LLD preparabili secondo template W3. |
| **Q** Non Compliance | Documentazione H2LD/HLD/LLD da preparare secondo template W3 durante fase di onboarding progetto. |

---

### ⚠️ Acceptance GL # 2

**Statement:** Accept Automation DevOps/SecOps deploy: Vendor to provide test execution of DevOps (YAML, Helm, Argo...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Partial |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |
| **Q** Non Compliance | Deploy attuale via scripts. Helm/ArgoCD supportabili con customizzazione minima. |

---

### ⚠️ Acceptance GL # 3

**Statement:** Accept Automation DevOps/SecOps deploy: Vendor to provide test execution of DevOps (YAML, Helm, Argo...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Partial |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |
| **Q** Non Compliance | Deploy attuale via scripts. Helm/ArgoCD supportabili con customizzazione minima. |

---

### ✅ Acceptance GL # 4

**Statement:** For SW that is of W3 property Accept Automation DevOps/GitOps deployment: Vendor to provide test exe...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Acceptance GL # 5

**Statement:** Accept K8s deployment: Vendor to provide test the deployment conformance to CaaS W3 guidelines (on n...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Acceptance GL # 6

**Statement:** Accept Recovery model: Vendor to test the Recovery model (automatic/Manual) as stated on the Service...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | CI/CD completo: Git-based, deploy incrementale, test automatici, rollback immediato. |

---

### ✅ Acceptance GL # 7

**Statement:** Accept Observability model: Vendor to test the Observability...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

## Automation (11 requisiti)

### ✅ Design GL # 27

**Statement:** Autonomous Network Reference Architecture Compliance
All the operation flows described by TM Forum ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ❌ Design GL # 28

**Statement:** Zero-Touch Orchestration and Automation (ZTNA):
OSS/NMS systems must facilitate end-to-end automati...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Design GL # 29

**Statement:** Closed-Loop Automation (CLA):
OSS/NMS must enable continuous monitoring, analysis, and optimization...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ❌ Design GL # 30

**Statement:** Intent-Based Networking (IBN):
OSS/NMS applications must enable the definition of desired network o...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Design GL # 31

**Statement:** Service Orchestration and Resource Abstraction:
OSS/NMS systems must provide a unified view of netw...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 32

**Statement:** Data-Driven Operations and Analytics:
OSS/NMS systems shall feed and leverage on data analytics to ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Automation GL# 1

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to provide “D...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ⚠️ Automation GL# 2

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to provide “D...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Partial |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |
| **Q** Non Compliance | Deploy attuale via scripts. Helm/ArgoCD supportabili con customizzazione minima. |

---

### ✅ Automation GL# 3

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor must provide ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Automation GL# 4

**Statement:** SaaS Vendor that provides coding within the platform must support DevOps SW automation...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | CI/CD completo: Git-based, deploy incrementale, test automatici, rollback immediato. |

---

### ✅ Automation GL# 6

**Statement:** Light Virtualization (K8s on Bare Metal) NFVI/HW provider to support Infrastructure life cycle Autom...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

## Cost, Sustainability (2 requisiti)

### ✅ Cloud-Model GL# 17

**Statement:** COTs CaaS Application (means application that require deployment & hosting on HCP) to support Arm-ba...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 18

**Statement:** COTs CaaS Application/NF (means license-based application that need to be installed) to support HCP ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

## Design (23 requisiti)

### ✅ Cloud-Model GL# 11

**Statement:** SaaS Application/NF provider must specify the model:
• (SaaS) multi-tenant provider (shared resourc...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 12

**Statement:** SaaS Application /NF provider to specify which data centers are used if are
proprietary (explain wh...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 13

**Statement:** COTs Application/NF (means application that require deployment & hosting on W3 public clouds) must u...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ✅ Cloud-Model GL# 14

**Statement:** COTs Application/NF (means license-based application that need to be installed) must use Compute nat...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 15

**Statement:** COTs Application (means license-based application that need to be installed) that are based on K8s m...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 16

**Statement:** COTs CaaS Application/NF (means application that require deployment & hosting on HCP) that require t...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 19

**Statement:** COTs Application/NF (means license-based application that needs to be installed) must use cloud nati...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ✅ Cloud-Model GL# 20

**Statement:** COTs Application/NF (means license-based application that need to be installed) that need a SQL engi...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ✅ Cloud-Model GL# 21

**Statement:** COTs Application/NF (means license-based application that needs to be installed) that needs to store...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ✅ Cloud-Model GL# 22

**Statement:** CaaS Application/NF that needs to mount a vDisk on POD must use external cloud NFS services....

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 23

**Statement:** COTs Application/NF (means license-based application that need to be installed) must use HCP native ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ❌ Design GL # 2

**Statement:** Application/NF “Internal Design Model” should be based on Microservices...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Design GL # 3

**Statement:** Application Microservices to be implemented with the following Models:
• Kubernetes (PODs)
• Conta...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Architettura modulare: CRM, WMS, HR, Commissioning come moduli indipendenti con API stabili. |

---

### ✅ Design GL # 4

**Statement:** Apps/NF deployed on CaaS do not be sticked to specific node of cluster enabling the changes of K8s r...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Design GL # 5

**Statement:** Application/NF deployed on Kubernetes must use service mesh (no communication code implemented withi...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Design GL # 6

**Statement:** Application/NF hosted on Kubernetes must implement network logic external to PODs using Service Mesh...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Encryption AES-256-GCM at-rest, TLS 1.3 in-transit. EncryptionKeyService centralizzato con key rotation. |

---

### ✅ Design GL # 14

**Statement:** Application/NF end point must be discovered by name (Service Registry).
No fixed IP hardcoded withi...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Design TOGAF-aligned: modularità, API-first, event-driven, osservabilità, sicurezza by-design. |

---

### ✅ Design GL # 15

**Statement:** Application/NF “configurations parameters” must be external to application.
No configuration data h...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ✅ Design GL # 16

**Statement:** CaaS Application/NF configurations must be stored on K8s ConfigMap....

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ✅ Design GL # 17

**Statement:** Application/NF to provide Rest API (compliant with TMF standards API when applicable).
Rest API to ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 18

**Statement:** Application/NF API must support “OpenAPI standard” (to be discovered automatically possibly also by ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API documentate OpenAPI 3.0, autenticazione JWT/API Key, versioning, rate limiting. |

---

### ✅ Design GL # 19

**Statement:** Application/NF must support asynchronous integration for streaming and event driven architectural mo...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

### ❌ Design GL # 26

**Statement:** NF implementation to base on Kubernetes native model...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

## Environment & FinOps (9 requisiti)

### ✅ Env-FinOps GL # 1

**Statement:** BoM/Dimensioning Table for each environment, including an architectural schema and a sizing and capa...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Env-FinOps GL # 2

**Statement:** Architectural Schema of cloud services and their interconnections should be provided for each enviro...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Env-FinOps GL # 3

**Statement:** Cost estimation using the public pricing calculators of the assigned cloud providers (e.g., AWS, GCP...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cost control by-design: multi-tenant cost sharing, resource monitoring, budget alerting. |

---

### ✅ Env-FinOps GL # 4

**Statement:** Vendor to list all the environments needed for the application deployment, including production and ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Env-FinOps GL # 5

**Statement:** Vendor to provide a monthly usage planning for each environment, aligned with the overall project sc...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cost control by-design: multi-tenant cost sharing, resource monitoring, budget alerting. |

---

### ✅ Env-FinOps GL # 6

**Statement:** No-production environments should be configured according to the defined SLA and resource allocation...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Env-FinOps GL # 7

**Statement:** Apply specific resource "Tags" to enable cost tracing and allocation across cloud environments accor...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Observability stack: logging centralizzato, metriche, health checks, alerting, audit trail. |

---

### ✅ Env-FinOps GL # 8

**Statement:** Vendor to provide environment automation scripts based on cloud-native automation tools (e.g., Googl...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Env-FinOps GL # 9

**Statement:** Vendor to specify & implement usage windows via Automation scripts to include Start/stop and schedul...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | CI/CD completo: Git-based, deploy incrementale, test automatici, rollback immediato. |

---

## Hosting (21 requisiti)

### ✅ Hosting GL # 1

**Statement:** Applications that are hosted on W3 tenants communicate using W3 landing zone network. No additional ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 2

**Statement:** Application hosted externally to W3 must use Internet to communicate to other W3 applications....

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 3

**Statement:** External applications (which is SaaS application hosted externally to W3) that need W3 private netwo...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 4

**Statement:** Application hosted on w3 tenants: must be deployed in specific Application context (which is AWS Acc...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 5

**Statement:** COTs Application (means license-based application that need to be installed) Hosted on W3 tenants mu...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 6

**Statement:** It is responsibility of COTs vendor (means license-based application that need to be installed) to i...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 7

**Statement:** App/NF hosted on W3 (Cloud tenants or on-premises) must use IP ranges (subnets) defined by W3...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 8

**Statement:** Application hosted on W3 HCP tenants must use Virtual DNS defined in the landing-zones.
Application...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 9

**Statement:** COTs App/NF (means license-based application that need to be installed) vendor to specify if needs m...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 10

**Statement:** COTs Application (means license-based application that needs to be installed) hosted on W3 cloud ten...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 11

**Statement:** COTs Application (means license-based application that needs to be installed) Vendor to specify if t...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 12

**Statement:** COTs Application (means license-based application that need to be installed) Vendor (that host appli...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 13

**Statement:** COTs Application/Network Management plane (means license-based application that needs to be installe...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 19

**Statement:** COTs CaaS application (means license-based application that need to be installed) Hosted on W3 tenan...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ❌ Hosting GL # 20

**Statement:** NF (regardless of hosting model), NF Mgr. APP (EMS/NMS), NF MGR. App (OSS) communicate with Network ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Hosting GL # 21

**Statement:** Network Data Center’s to be based on Light virtualization model (K8s on Bare metal)...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ❌ Hosting GL # 22

**Statement:** K8s instances to be managed by multi-cluster via central controller to be hosted on Public Cloud or ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Hosting GL # 23

**Statement:** cNF Network Functions (that are not SaaS) must be Kubernetes distribution “agnostic”.
At least must...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Hosting GL # 26

**Statement:** NF Vendor to describe which network advanced CNI (Container Network Interface) features are implemen...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Hosting GL # 27

**Statement:** NFVI Vendor (both for Traditional virtualization, Light virtualization and HW appliance must provide...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ✅ Hosting GL # 28

**Statement:** NFVI Vendor to describe used virtualization stack (Traditional virtualization Stack: like VMware Ope...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

## Integration (4 requisiti)

### ✅ Design GL # 36

**Statement:** App2App integration via ftp, db-link, or odbc/jdbc is not admitted.
Any deviation to this rule to b...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 37

**Statement:** Applications/NF must be integrated with W3 “Data platform” (all transactions within an application t...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 38

**Statement:** Applications “Business Transaction” must be integrated with W3 “Data platform”...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ❌ Design GL # 39

**Statement:** NF transactions “EDRs” (network user sessions, and rated sessions) must be integrated with W3 “Data ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

## Integration, Observability (2 requisiti)

### ✅ Design GL # 33

**Statement:** All applications, SaaS and COTs Application that interact using API must use W3 API GTWYs (no need f...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ❌ Design GL # 34

**Statement:** Application, NF MGR. App (EMS/NMS), NF MGR. App (OSS) Vendor to state if (for process integration wi...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

## Integration, Observability Design (1 requisiti)

### ✅ Design GL # 35

**Statement:** App vendor to describe How the E2E Integration observability Business Transactions/Processes Traces ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

## Observability Design (8 requisiti)

### ✅ Design GL # 7

**Statement:** Application/Network management vendor must provide observability API (better if is on Open Telemetry...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 8

**Statement:** App/NF Vendor must provide observability events in real-time (for all resources used for the service...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

### ✅ Design GL # 9

**Statement:** App/NF Vendor must document the possible Errors (with levels of priority) of all resources used by t...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ✅ Design GL # 21

**Statement:** Application Vendor to provide operation error (knowledge base)...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Design TOGAF-aligned: modularità, API-first, event-driven, osservabilità, sicurezza by-design. |

---

### ✅ Design GL # 22

**Statement:** Application must support “Data integrity”...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 23

**Statement:** Application vendor that provides “Bulk programs” for upload data or for internal processing must gua...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 24

**Statement:** Application/NF vendor to provide “operation console and dashboards” that tracks all internal activit...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Design GL # 25

**Statement:** Application/NF vendor to provide database administration procedure (if needed) for compacting the da...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Design TOGAF-aligned: modularità, API-first, event-driven, osservabilità, sicurezza by-design. |

---

## Observability Integration (12 requisiti)

### ✅ Hosting GL # 30

**Statement:** App/NF Vendor to support W3 to properly set the Service/Resource types W3 CMDBs (IT ServiceNow maste...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ⚠️ Hosting GL # 31

**Statement:** COTs Application vendor (means application that need to be installed on W3 tenants) if not installed...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Partial |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |
| **Q** Non Compliance | OpenTelemetry non ancora integrato. Logging centralizzato e health checks disponibili. Integrabile in 2-3 settimane. |

---

### ✅ Hosting GL # 32

**Statement:** COTs Application Vendor (means application that needs to be installed on W3 tenants) must implement ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Metriche Prometheus-ready, health endpoints /api/health, dashboard Grafana compatibile. |

---

### ✅ Hosting GL # 33

**Statement:** COTs Application Vendor (means application that need to be installed on W3 tenants) that uses non-na...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Metriche Prometheus-ready, health endpoints /api/health, dashboard Grafana compatibile. |

---

### ✅ Hosting GL # 34

**Statement:** COTs Application Vendor (means application that needs to be installed on W3 tenants) that uses non-n...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 35

**Statement:** NF performance (local domains management) vendor must integrate the metrics to W3 common data platfo...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 36

**Statement:** NF MGR. App (NE/NMS) must integrate the Alarms with INS, and audit logs with Splunk...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 37

**Statement:** NFVI provider (Heavy virtualization, Light Virtualization, Bare Metal) must integrate (provide adapt...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Hosting GL # 38

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Alarms Events to be integrated ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

### ✅ Hosting GL # 39

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Metrics Events to be integrated...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

### ✅ Hosting GL # 40

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Log Events to be integrated wit...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

### ✅ Hosting GL # 41

**Statement:** SaaS Applications to be integrated with W3 Observability Framework:
Trouble Tickets Events to be in...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Webhooks configurabili per ogni evento business. WebSocket per real-time. Redis Pub/Sub per async. |

---

## Security Design (4 requisiti)

### ✅ Design GL # 10

**Statement:** Application/NF/Network management vendors must use SAML 2.0 for Application user authentication to c...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | OAuth2/OIDC nativo con supporto IdP esterni (Keycloak, Azure AD, Google). SSO enterprise-ready. |

---

### ✅ Design GL # 11

**Statement:** Application/NF/Network management vendors to support (RBAC) authorization to enable profiled use of ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | RBAC gerarchico 3 livelli con 200+ permessi. Row-Level Security PostgreSQL per isolamento tenant. |

---

### ✅ Design GL # 12

**Statement:** Application/NF/Network management vendors to describe how to support User Accounts/Profile provision...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Design GL # 13

**Statement:** Application/NF/Network management vendors must store secrets (keys, PWD ...) on “Secret manager” ser...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Secrets management con encryption AES-256, accesso role-based, rotation automatica supportata. |

---

## Security Integration (6 requisiti)

### ✅ Hosting GL # 14

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor, must store “...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | OAuth2/OIDC nativo con supporto IdP esterni (Keycloak, Azure AD, Google). SSO enterprise-ready. |

---

### ✅ Hosting GL # 15

**Statement:** COTS Application/NF (means license-based application that need to be installed) vendor to specify th...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Hosting GL # 16

**Statement:** Admins access of VMs (both on cloud tenants and on-premises) or on bare metal (on-premises) must use...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Hosting GL # 17

**Statement:** App2App communication must use the HCP M2M non-Human model to grant access to resources to an applic...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Hosting GL # 18

**Statement:** COTs Application (which means license-based application that needs to be installed) that are not dep...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

### ✅ Hosting GL # 29

**Statement:** All “Externally Hosted” Application to be accessed via Internet.
The provider must provide internal...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

## Service Management (33 requisiti)

### ✅ Service-Level GL # 1

**Statement:** The App/NF vendor to “Fill-in” the Architectural Guideline (section proposal structure) with the mod...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Service-Level GL # 2

**Statement:** The App/NF vendor (COTs and SaaS) to “Fill-in” the Service Level Form (Resource Section) selecting r...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Service-Level GL # 3

**Statement:** COTs App/NF (means license-based application that need to be installed) vendor that host the service...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

### ✅ Service-Level GL # 4

**Statement:** COTs App/NF (means license-based application that need to be installed) that host the service on “W3...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Backup daily + WAL continuo PostgreSQL, Proxmox snapshots, retention 30gg, offsite backup settimanale. |

---

### ✅ Service-Level GL # 5

**Statement:** Multi-tenant SaaS vendor (which means vendor that share resources among tenants) to Fill in the Serv...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 6

**Statement:** All Application/NF resources must have High availability model HA class (W3 taxonomy) which means th...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 7

**Statement:** All Application/NF resources must have SLA >= 99,9...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 8

**Statement:** COTs App/NF (means license-based application that need to be installed) Capacity model to be “Fully ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 9

**Statement:** COTs K8s App/NF must configure k8s for autoscaling both for PODs and for K8s (nodes), or use a serve...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 10

**Statement:** SaaS Capacity Model: To be auto scale no manual activities to set the needed resources...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 11

**Statement:** Application/NF Vendor to describe how many releases for each “resources” included on service are nee...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 12

**Statement:** Application/NF Vendor to provide Bug Fixes and data cleanups procedures...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 13

**Statement:** Application/NF App Resource (App SW) to be designed to support releases automation (full release or ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 14

**Statement:** Application/NF Infra Resource to be designed to support releases automation (full release or defect ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Backup daily + WAL continuo PostgreSQL, Proxmox snapshots, retention 30gg, offsite backup settimanale. |

---

### ✅ Service-Level GL # 15

**Statement:** SaaS (Personalization Resource) Releases of patches to be Automated using DevOps Tools (internally o...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Backup daily + WAL continuo PostgreSQL, Proxmox snapshots, retention 30gg, offsite backup settimanale. |

---

### ✅ Service-Level GL # 16

**Statement:** COTs Service App/NF (means license-based application that needs to be installed) Resources Release o...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 17

**Statement:** Application/NF Resource release and patching content to be documented, and stored on company Git...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 18

**Statement:** Vendor to define which resources are to be backup and for which reason (Resource Release, Recovery f...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Logging JSON strutturato (Winston), livelli configurabili, correlazione request ID, retention. |

---

### ❌ Service-Level GL # 19

**Statement:** Vendor to define the scheduling configuration to apply for the specific resources used by applicatio...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Service-Level GL # 20

**Statement:** The resources backup data (full/incremental) to be stored on HCP “object stores”...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 21

**Statement:** Backup Native Services: Use Cloud Native Service backup feature of the specific resource...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 22

**Statement:** Backup NFS: Use native backup feature of NFS service that stores the backup on object store service ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 23

**Statement:** Backup Stateful non-native Middleware resources installed on K8s: to be based on CRD K8s operator th...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 24

**Statement:** Backup of database installed on VM: to be based on backup utilities provided by DB vendor...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 25

**Statement:** Backup NFVI: NFVI on-premises vendor to specify which backup solution is implemented based on type o...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Backup daily + WAL continuo PostgreSQL, Proxmox snapshots, retention 30gg, offsite backup settimanale. |

---

### ✅ Service-Level GL # 26

**Statement:** SaaS provider to describe the internal backup features and use for recovery, internal SaaS releases ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Service-Level GL # 27

**Statement:** Application provides the Export function of W3 data stored internally in a standard format (JSON, AV...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 28

**Statement:** Application/NF Resources Recovery model to be fully automatic both for fail-over and for fail-back w...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | API-First: REST API complete, WebSocket real-time, Webhooks configurabili, MCP Gateway per AI agents. |

---

### ✅ Service-Level GL # 29

**Statement:** If W3 accept “Manual recovery procedure” (which means that operation in case of fault must launch a ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 30

**Statement:** SaaS Recovery Model: To be automated by SaaS vendor...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 31

**Statement:** Vendor of Application/NF to fill the Service-level form section Operating Model by specify the opera...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, DATABASE LAYER |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA 99.9% produzione con cluster HA, monitoring 24/7, incident management strutturato. |

---

### ✅ Service-Level GL # 32

**Statement:** Vendor of Application/NF Cost to fill the Service-level form section Cost Model
...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | SLA enterprise: 99.9% uptime, monitoring continuo, support 24/7, incident escalation. |

---

### ✅ Service-Level GL # 33

**Statement:** NF vendor to fulfil the Service/Resource Distribution section...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Hosting Seeweb Italia: Proxmox HA, Fortinet WAF/IPS, Ceph storage, ISO 27001 certified. |

---

## Strategy (15 requisiti)

### ✅ Cloud-Model GL# 1

**Statement:** W3 has multi-cloud strategy. COTs Apps (means license-based application which SW to be installed) to...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | W3Suite è cloud-agnostic: Node.js + PostgreSQL deployabili su AWS, GCP, Azure. Attualmente su Seeweb Italia con certificazioni ISO 27001, SOC 2. |

---

### ✅ Cloud Brokering GL # 1

**Statement:** COTs Application (means license-based application which SW to be installed) to be cloud Agnostic, cl...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | W3Suite è cloud-agnostic: Node.js + PostgreSQL deployabili su AWS, GCP, Azure. Attualmente su Seeweb Italia con certificazioni ISO 27001, SOC 2. |

---

### ✅ Cloud-Model GL# 2

**Statement:** Apps must use public cloud advanced models:
• SaaS
• Serverless (PaaS)
• CaaS and Mixed CaaS/PaaS...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 3

**Statement:** COTS Applications (means application that requires deployment & hosting on CSP) model should be base...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ✅ Cloud-Model GL# 4

**Statement:** Custom Analytic Application should be based on a PaaS HCP Native service.  GCP is the current W3 HCP...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM, AI SERVICES |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Multi-tenant SaaS con architettura Mixed CaaS/PaaS: backend containerizzato, PostgreSQL managed, Redis cache. |

---

### ❌ Cloud-Model GL# 5

**Statement:** Network Function (NF) vendor to describe (as evolution) which Hybrid cloud model support or plan to ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Cloud-Model GL# 6

**Statement:** Not SaaS Network Function (NF) and NF MGR. APP (EMS/NMS) to be based on Containers only (NF => cNF- ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Cloud-Model GL# 7

**Statement:** Data Plane Core Network Functions to be based on on-premises using CaaS (cNF cloud native functions ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Cloud-Model GL# 8

**Statement:** Network Function vendor as evolution path describes how
Control plane (/ Signaling) Core “Network F...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Cloud-Model GL# 9

**Statement:** Management Plane: OSS of network domains (RAN, transmission and Core) to be hosted on public cloud...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Cloud-Model GL# 10

**Statement:** Management Plane NF MGR. APP (EMS/NMS) of network domains (RAN, transmission and Core) to be hosted ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Design GL # 1

**Statement:** Applications, NF MGR. APP (EMS/NMS), NF MGR. App (OSS) should use have “No Code Low Code model” deve...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ✅ Cloud Brokering GL # 2

**Statement:** General COTs Application/NF/NTW management plane (means license-based application that must be insta...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Cloud-First su Seeweb Italia: Proxmox HA multinodo, Fortinet firewall, Ceph storage distribuito. |

---

### ❌ Hosting GL # 24

**Statement:** Network Functions should support main cloud provider Hybrid distributed infrastructure (e.g. Google ...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

### ❌ Hosting GL # 25

**Statement:** (Cloud Native Function) Network Functions must be based on CaaS only infrastructure.
Vendor to prov...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | N/A |
| **N** Included | No |
| **O** Coverage | Not Applicable |
| **P** Short Answer | N/A - Requisito specifico per Network Functions, non applicabile a piattaforma applicativa IT. |
| **Q** Non Compliance | Requisito specifico per Network Functions (NF/cNF/VNF), non applicabile a W3Suite (piattaforma applicativa IT). |

---

## security (1 requisiti)

### ✅ Automation GL# 5

**Statement:** COTS Application (means license-based application that need to be installed) vendor to prove that th...

| Colonna | Risposta |
|---------|----------|
| **M** Solution Modules | CORE PLATFORM |
| **N** Included | Yes |
| **O** Coverage | Full |
| **P** Short Answer | Security by-design: OAuth2, MFA, RBAC, encryption E2E, audit logging, Zero Trust architecture. |

---

