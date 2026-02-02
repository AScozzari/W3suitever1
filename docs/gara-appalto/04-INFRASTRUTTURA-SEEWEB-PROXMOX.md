# Infrastruttura Cloud W3Suite - Seeweb + Proxmox + Fortinet

## Executive Summary

W3Suite verrà deployata su infrastruttura cloud italiana **Seeweb** con architettura multinodo basata su **Proxmox VE** e protezione perimetrale **Fortinet**. Questa scelta garantisce:

- **Data Residency italiana** 🇮🇹 - Compliance GDPR e normative italiane
- **Certificazioni enterprise** - ISO 27001, SOC 2, AGID qualified
- **Sicurezza avanzata** - Fortinet FortiGate firewall
- **Alta disponibilità** - Cluster Proxmox multinodo

---

## Architettura Infrastrutturale

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    SEEWEB CLOUD                         │
                    │              (Data Center Italia)                       │
                    │                                                         │
  Internet ───────▶ │  ┌─────────────────────────────────────────────────┐   │
                    │  │           FORTINET FortiGate                    │   │
                    │  │        (Firewall + IPS + WAF)                   │   │
                    │  └─────────────────────────────────────────────────┘   │
                    │                        │                               │
                    │                        ▼                               │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │              LOAD BALANCER                      │   │
                    │  │            (HAProxy/Nginx)                      │   │
                    │  └─────────────────────────────────────────────────┘   │
                    │                        │                               │
                    │     ┌──────────────────┼──────────────────┐           │
                    │     ▼                  ▼                  ▼           │
                    │  ┌──────┐          ┌──────┐          ┌──────┐        │
                    │  │Node 1│          │Node 2│          │Node 3│        │
                    │  │      │          │      │          │      │        │
                    │  │Proxmox          │Proxmox          │Proxmox        │
                    │  │ VE   │          │ VE   │          │ VE   │        │
                    │  └──────┘          └──────┘          └──────┘        │
                    │     │                  │                  │           │
                    │     └──────────────────┼──────────────────┘           │
                    │                        ▼                               │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │           CEPH STORAGE CLUSTER                  │   │
                    │  │        (Distributed Storage HA)                 │   │
                    │  └─────────────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────────────┘
```

---

## Componenti Infrastruttura

### 1. Seeweb Cloud
**Provider:** Seeweb S.r.l. (Italia)

| Caratteristica | Valore |
|----------------|--------|
| **Data Center** | Italia (Frosinone, Milano) |
| **Certificazioni** | ISO 27001, ISO 9001, SOC 2, AGID CSP |
| **Uptime SLA** | 99.95% |
| **Network** | 10 Gbps backbone |
| **DDoS Protection** | Inclusa |

**Vantaggi per WindTre:**
- ✅ Data residency italiana garantita
- ✅ Fornitore qualificato AGID per PA
- ✅ Supporto tecnico italiano 24/7
- ✅ Compliance GDPR nativo

---

### 2. Proxmox VE (Virtualizzazione)
**Versione:** Proxmox VE 8.x

| Caratteristica | Valore |
|----------------|--------|
| **Tipo** | Hypervisor Open Source (KVM + LXC) |
| **HA Cluster** | 3+ nodi con Corosync |
| **Live Migration** | Sì, senza downtime |
| **Storage** | Ceph, ZFS, NFS, iSCSI |
| **Backup** | Proxmox Backup Server integrato |

**Architettura Cluster:**
```
┌─────────────────────────────────────────────────────────┐
│                 PROXMOX HA CLUSTER                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Node 1 (Primary)     Node 2 (Secondary)    Node 3    │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────┐  │
│   │ VM: API-1   │     │ VM: API-2   │     │ VM:API-3│  │
│   │ VM: DB-Pri  │     │ VM: DB-Rep  │     │ VM:Redis│  │
│   │ CT: Monitor │     │ CT: Logs    │     │ CT:Proxy│  │
│   └─────────────┘     └─────────────┘     └─────────┘  │
│                                                         │
│   Corosync + Pacemaker (Quorum & Fencing)              │
│   Ceph Storage (Replicated Block Storage)              │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Fortinet FortiGate (Sicurezza)
**Modello:** FortiGate (serie appropriata al traffico)

| Funzionalità | Descrizione |
|--------------|-------------|
| **Firewall** | Next-Gen Firewall (NGFW) |
| **IPS/IDS** | Intrusion Prevention/Detection |
| **WAF** | Web Application Firewall |
| **SSL Inspection** | Deep packet inspection |
| **VPN** | IPSec + SSL VPN |
| **AntiVirus** | FortiGuard real-time |
| **DDoS** | Protezione volumetrica |

**Configurazione Sicurezza W3Suite:**
```
┌─────────────────────────────────────────────────────────┐
│                 FORTINET SECURITY STACK                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Internet Traffic                                      │
│         │                                               │
│         ▼                                               │
│   ┌─────────────┐                                       │
│   │ DDoS Shield │ ← Volumetric attack protection       │
│   └─────────────┘                                       │
│         │                                               │
│         ▼                                               │
│   ┌─────────────┐                                       │
│   │ WAF Rules   │ ← OWASP Top 10, SQLi, XSS           │
│   └─────────────┘                                       │
│         │                                               │
│         ▼                                               │
│   ┌─────────────┐                                       │
│   │ IPS/IDS     │ ← Signature-based detection          │
│   └─────────────┘                                       │
│         │                                               │
│         ▼                                               │
│   ┌─────────────┐                                       │
│   │ SSL Inspect │ ← TLS 1.3 termination               │
│   └─────────────┘                                       │
│         │                                               │
│         ▼                                               │
│   W3Suite Backend (HTTPS only)                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Mapping per Service-Resource-Model

### Hosting Model
Per il form WindTre, la nostra infrastruttura si mappa come:

| Campo | Valore | Note |
|-------|--------|------|
| **Hosting Model** | `Not W3 Private datacenter` | Seeweb è nostro provider |
| **Hosting Provider** | `Vendor Private` | Seeweb con infra dedicata |
| **Technical Model** | `Mixed CaaS/PaaS` | Proxmox VMs + managed services |

### Resource Model Aggiornato

| ENV | SLA | Hosting Model | Provider | Tech Model | Resource | # Instances |
|-----|-----|---------------|----------|------------|----------|-------------|
| PROD | 99.9% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | **Backend API (Node.js)** | 3 VM |
| PROD | 99.9% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | **Frontend (Nginx)** | 2 VM |
| PROD | 99.9% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | **PostgreSQL Primary** | 1 VM |
| PROD | 99.9% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | **PostgreSQL Replica** | 2 VM |
| PROD | 99.9% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | **Redis Cluster** | 3 VM |
| PROD | 99.9% | Not W3 Private DC | Seeweb (Fortinet) | Mixed CaaS/PaaS | **Load Balancer + WAF** | 2 (HA) |
| NO.PROD | 99.5% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | Backend API | 1 VM |
| DEV | 95% | Not W3 Private DC | Seeweb (Proxmox) | Mixed CaaS/PaaS | Backend API | 1 VM |

---

## Certificazioni Seeweb

### Certificazioni Attive
| Certificazione | Descrizione | Validità |
|----------------|-------------|----------|
| **ISO 27001:2013** | Information Security Management | ✅ |
| **ISO 9001:2015** | Quality Management System | ✅ |
| **SOC 2 Type II** | Security, Availability, Confidentiality | ✅ |
| **AGID CSP** | Cloud Service Provider qualificato AGID | ✅ |
| **GDPR Compliant** | Data Protection Regulation | ✅ |
| **PCI-DSS** | Payment Card Industry (se richiesto) | Disponibile |

### Vantaggi Certificazioni per Gara
1. **ISO 27001** → Soddisfa requisiti Security GL# 
2. **SOC 2** → Audit trail e controlli verificati
3. **AGID CSP** → Qualificato per PA italiana
4. **GDPR** → Data residency e protezione garantita

---

## Alta Disponibilità

### Architettura HA W3Suite su Proxmox

```
                    ┌─────────────────────────────────────┐
                    │         CLUSTER PROXMOX HA          │
                    │                                     │
  ┌─────────────────┼─────────────────────────────────────┼─────────────────┐
  │                 │                                     │                 │
  ▼                 ▼                                     ▼                 │
┌─────────┐    ┌─────────┐                           ┌─────────┐           │
│ Node 1  │    │ Node 2  │                           │ Node 3  │           │
│         │    │         │                           │         │           │
│ ┌─────┐ │    │ ┌─────┐ │    Live Migration         │ ┌─────┐ │           │
│ │API-1│ │◄───┼─│API-2│ │◄──────────────────────────│ │API-3│ │           │
│ └─────┘ │    │ └─────┘ │                           │ └─────┘ │           │
│         │    │         │                           │         │           │
│ ┌─────┐ │    │ ┌─────┐ │    Streaming Replication  │ ┌─────┐ │           │
│ │DB-P │ │────┼▶│DB-R1│ │──────────────────────────▶│ │DB-R2│ │           │
│ └─────┘ │    │ └─────┘ │                           │ └─────┘ │           │
│         │    │         │                           │         │           │
│ Ceph    │◄───┼─Ceph────┼───────────────────────────┼─Ceph    │           │
│ OSD     │    │ OSD     │    Replicated Storage     │ OSD     │           │
└─────────┘    └─────────┘                           └─────────┘           │
      │              │                                    │                 │
      └──────────────┴────────────────────────────────────┘                 │
                              │                                             │
                    Corosync Quorum                                        │
                    Pacemaker Fencing                                      │
                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Failover Automatico
| Componente | Failover | RTO | RPO |
|------------|----------|-----|-----|
| **Backend API** | Proxmox HA (auto) | < 30 sec | 0 |
| **PostgreSQL** | Patroni + Replica | < 60 sec | < 5 sec |
| **Redis** | Sentinel Cluster | < 10 sec | < 1 sec |
| **Load Balancer** | VRRP (keepalived) | < 5 sec | 0 |

---

## Backup & Disaster Recovery

### Strategia Backup

| Tipo | Frequenza | Retention | Storage |
|------|-----------|-----------|---------|
| **Proxmox Snapshot** | Ogni 4 ore | 7 giorni | Ceph |
| **PostgreSQL WAL** | Continuo | 30 giorni | Object Storage |
| **Full Backup** | Giornaliero | 90 giorni | Seeweb Backup |
| **Offsite Backup** | Settimanale | 1 anno | Secondo DC |

### Disaster Recovery
| Scenario | RTO | RPO | Procedura |
|----------|-----|-----|-----------|
| **VM Failure** | < 1 min | 0 | Proxmox HA auto-restart |
| **Node Failure** | < 5 min | 0 | Live migration automatica |
| **DC Failure** | < 4 ore | < 1 ora | Restore da backup offsite |

---

## Sicurezza Avanzata Fortinet

### Regole Firewall W3Suite

```
# Inbound Rules
┌──────────────────────────────────────────────────────────────────┐
│ Source          │ Destination      │ Port   │ Action  │ Note    │
├──────────────────────────────────────────────────────────────────┤
│ Any             │ LB VIP           │ 443    │ ALLOW   │ HTTPS   │
│ Any             │ LB VIP           │ 80     │ REDIRECT│ →443    │
│ WindTre VPN     │ Admin Network    │ 22     │ ALLOW   │ SSH     │
│ Monitoring      │ All Nodes        │ 9090   │ ALLOW   │ Metrics │
│ Any             │ Any              │ *      │ DROP    │ Default │
└──────────────────────────────────────────────────────────────────┘

# WAF Rules (OWASP Core Rule Set)
┌──────────────────────────────────────────────────────────────────┐
│ Rule ID    │ Description                     │ Action           │
├──────────────────────────────────────────────────────────────────┤
│ 942100     │ SQL Injection Detection         │ BLOCK + LOG      │
│ 941100     │ XSS Attack Detection            │ BLOCK + LOG      │
│ 930100     │ Path Traversal Attack           │ BLOCK + LOG      │
│ 920170     │ HTTP Protocol Anomalies         │ BLOCK + LOG      │
│ 913100     │ Scanner Detection               │ BLOCK + LOG      │
│ Custom     │ Rate Limiting (100 req/min)     │ THROTTLE         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Compliance Requisiti WindTre

### Mappatura Requisiti SoC → Infrastruttura Seeweb

| Requisito ID | Descrizione | Compliance | Note |
|--------------|-------------|------------|------|
| Security GL# 1 | IdP Integration | ✅ FULL | OAuth2 su Fortinet VPN |
| Security GL# 3 | Encryption at rest | ✅ FULL | Ceph encryption + LUKS |
| Security GL# 4 | Encryption in transit | ✅ FULL | TLS 1.3 + Fortinet SSL |
| Cloud-Model GL# 2 | No IaaS | ✅ FULL | Mixed CaaS/PaaS model |
| Observability GL# 1 | Centralized logging | ✅ FULL | FortiAnalyzer + ELK |
| Operations GL# 3 | Backup/Restore | ✅ FULL | PBS + Ceph snapshots |
| Operations GL# 4 | Disaster Recovery | ✅ FULL | Multi-node + offsite |

---

## Costi Indicativi

| Componente | Configurazione | Costo Mensile (stima) |
|------------|----------------|----------------------|
| **Proxmox Cluster** | 3 nodi 16vCPU/64GB | €800-1200 |
| **Ceph Storage** | 2TB SSD replicated | €200-400 |
| **Fortinet vFW** | FortiGate VM | €300-500 |
| **Backup Storage** | 5TB | €100-200 |
| **Bandwidth** | 1TB/mese | Incluso |
| **Support 24/7** | Premium | €200-300 |
| **TOTALE** | | **€1600-2600/mese** |

---

## Contatti Seeweb

- **Sito:** https://www.seeweb.it
- **Commerciale:** sales@seeweb.it
- **Supporto:** support@seeweb.it
- **Certificazioni:** https://www.seeweb.it/certificazioni
