# Verifica Risposte Requisiti WindTre - Analisi Coerenza

**Data**: 3 Febbraio 2026  
**File analizzato**: Req_Gestione_Negozio_integrato_con_descrizioni.xlsx  
**Requisiti totali**: 111

---

## 1. RIEPILOGO ESECUTIVO

### Coperture Dichiarate

| Tipo | Quantità | % |
|------|----------|---|
| Base | 89 | 80% |
| Avanzata | 22 | 20% |

### Incongruenze Trovate

| Severità | Quantità | Azione |
|----------|----------|--------|
| **CRITICO** | 4 | Correzione immediata |
| **ALTO** | 1 | Correzione necessaria |
| **MEDIO** | 2 | Verifica e chiarimento |
| **BASSO** | 1 | Opzionale |

---

## 2. INCONGRUENZE CRITICHE

### 2.1 REQ.86 - Cloud Provider (CRITICO)

**Requisito**:
> Adozione di architetture cloud-native: Le nuove soluzioni devono essere progettate per ambienti cloud (es. OCI, AWS, GCP).

**Risposta attuale**:
> Progettazione cloud-native su OCI/AWS/GCP con principi 12-factor e IaC.

**PROBLEMA**: 
La risposta afferma deployment su OCI/AWS/GCP, ma la nostra documentazione dichiara:
- Hosting Model: **Not W3 Private datacenter**
- Hosting Provider: **Vendor Private** (Seeweb)
- Technical Model: **Full IaaS**

**CORREZIONE SUGGERITA**:
```
Architettura cloud-ready basata su principi 12-factor, attualmente deployata 
su datacenter privato italiano (Seeweb) con Full IaaS. L'architettura è 
progettata per essere cloud-agnostic e migrabile verso hyperscale (AWS/GCP/OCI) 
secondo roadmap evolutiva.
```

---

### 2.2 REQ.87 - Multi-AZ vs Cluster 2 Nodi (ALTO)

**Requisito**:
> Alta disponibilità e resilienza: Replica dei servizi su più Availability Zone, failover automatico, bilanciamento del carico, disaster recovery e backup periodici.

**Risposta attuale**:
> HA multi-AZ, failover e bilanciamento; DR e backup con RPO/RTO definiti.

**PROBLEMA**:
La risposta menziona "multi-AZ" ma W3Suite usa:
- Cluster Proxmox VE **2 nodi** in singolo datacenter
- Backup su **datacenter secondario** (Region Resilient)
- NON ha vere Availability Zone separate

**CORREZIONE SUGGERITA**:
```
Alta disponibilità tramite cluster Proxmox VE 2 nodi con failover automatico 
e bilanciamento del carico. Disaster Recovery garantito da backup su datacenter 
geograficamente separato (Region Resilient). RPO: 1 minuto, RTO: 4 ore per DR.
```

---

### 2.3 REQ.88 - Autoscaling (BASSO)

**Requisito**:
> Scalabilità: Capacità di gestire carichi variabili, con risorse computazionali e storage elastiche, e possibilità di upgrade senza interruzione del servizio.

**Risposta attuale**:
> Autoscaling e vertical/horizontal scaling; deploy/upgrade zero-downtime ove applicabile.

**PROBLEMA**:
La risposta menziona "Autoscaling" ma l'infrastruttura Seeweb/Proxmox richiede **scaling manuale**.

**CORREZIONE SUGGERITA**:
```
Scaling verticale e orizzontale con provisioning coordinato. Architettura 
predisposta per autoscaling su hyperscale futuro. Deploy e upgrade con 
minimal-downtime tramite rolling update e blue-green deployment.
```

---

### 2.4 REQ.91 - LDAP vs OAuth2 (MEDIO)

**Requisito**:
> Security by design: gestione delle utenze tramite **LDAP Aziendale**, logging centralizzato.

**Risposta attuale**:
> Applicazione controlli security WindTre: TLS 1.2+, cifratura at-rest, policy firewall e identity LDAP; logging centralizzato.

**PROBLEMA**:
W3Suite nella documentazione dichiara **OAuth2/OIDC + MFA**, non LDAP diretto.

**VERIFICA NECESSARIA**:
- W3Suite supporta integrazione LDAP nativa?
- Oppure solo federation OAuth2 → LDAP via IdP?

**CORREZIONE SUGGERITA (se solo OAuth2)**:
```
Gestione identità via OAuth2/OIDC con possibilità di federation verso LDAP 
aziendale tramite Identity Provider (es. Keycloak, Azure AD). MFA configurabile.
```

---

### 2.5 REQ.94 - Oracle OAM (MEDIO)

**Requisito**:
> Compatibilità con Single Sign-On (SSO): Integrazione con **Oracle OAM**, supporto a protocolli di autenticazione (OAuth2, SAML)

**Risposta attuale**:
> SSO tramite Oracle OAM con supporto OAuth2/SAML e policy sessioni.

**PROBLEMA**:
La risposta afferma integrazione diretta con Oracle OAM, ma dobbiamo verificare se W3Suite ha connettore specifico OAM o usa solo protocolli standard.

**CORREZIONE SUGGERITA**:
```
SSO tramite protocolli standard OAuth2/SAML, compatibile con Oracle OAM. 
Integrazione validata in ambiente WindTre durante fase di onboarding.
```

---

## 3. ALTRE INCONGRUENZE MINORI

### REQ.22, REQ.24, REQ.105

Queste risposte non menzionano direttamente hyperscale, ma il sistema di rilevamento ha trovato match parziali. **Verificare manualmente** che le risposte non implicano infrastruttura cloud diversa da quella dichiarata.

---

## 4. CONFRONTO CON DOCUMENTAZIONE UFFICIALE

### 4.1 Service-Resource-Model (nostro)

| Campo | Valore Dichiarato | Coerente? |
|-------|-------------------|-----------|
| Hosting Model | Not W3 Private datacenter | ⚠️ Risposte dicono "cloud-native OCI/AWS/GCP" |
| Hosting Provider | Vendor Private | ⚠️ Non menzionato in risposte |
| Technical Model | Full IaaS | ⚠️ Risposte implicano CaaS/PaaS |
| Backup | Snapshot + Incrementale PBS | ✅ Coerente |
| DR | Region Resilient (DC2) | ⚠️ Risposte dicono "multi-AZ" |

### 4.2 SOC Technology Risposte (nostre)

| Campo | Valore Dichiarato | Coerente? |
|-------|-------------------|-----------|
| Autenticazione | OAuth2/OIDC + MFA | ⚠️ Risposte dicono "LDAP" |
| SSO | Standard OAuth2/SAML | ⚠️ Risposte dicono "Oracle OAM" |
| Scaling | Manuale/Semi-automatico | ⚠️ Risposte dicono "Autoscaling" |

---

## 5. RISPOSTE DA CORREGGERE

### Tabella Correzioni

| REQ | Testo Attuale | Testo Corretto | Priorità |
|-----|---------------|----------------|----------|
| REQ.86 | "cloud-native su OCI/AWS/GCP" | "cloud-ready su datacenter privato italiano, migrabile verso hyperscale" | ALTA |
| REQ.87 | "multi-AZ" | "cluster 2 nodi HA + backup DC separato" | ALTA |
| REQ.88 | "Autoscaling" | "Scaling manuale/semi-automatico, predisposto per autoscaling" | MEDIA |
| REQ.91 | "identity LDAP" | "OAuth2/OIDC con federation LDAP" | MEDIA |
| REQ.94 | "tramite Oracle OAM" | "via OAuth2/SAML compatibile con Oracle OAM" | MEDIA |

---

## 6. VERIFICA CATEGORIE FUNZIONALI

### 6.1 Requisiti Funzionali (non infrastrutturali)

Per le categorie funzionali, le risposte sembrano coerenti con le capacità W3Suite:

| Categoria | Requisiti | Copertura | Status |
|-----------|-----------|-----------|--------|
| Administration | 4 | Base | ✅ OK |
| Cash & Warehouse | 6 | Base | ✅ OK |
| Performance Management | 4 | Base | ✅ OK |
| HR Management | 2 | Base | ✅ OK |
| MULTIPLO - NEGOZIO | 18 | Base | ✅ OK |
| MULTIPLO - CATEGORY MANAGEMENT | 19 | Base | ✅ OK |
| Assistenza Dealer e W3 | 6 | Base | ✅ OK |

### 6.2 Requisiti "Avanzata"

| Categoria | Requisiti | Note |
|-----------|-----------|------|
| GA & CB Management | 10 | Funzionalità avanzate commissioni |
| Digital Presence | 5 | Canali digitali |
| Profiling | 4 | Profilazione utenti |
| Brand Interface & HR | 3 | Interfaccia brand |

---

## 7. AZIONI RICHIESTE

### Immediate (Prima di consegna)

1. ☐ Correggere REQ.86 - Rimuovere riferimenti a OCI/AWS/GCP
2. ☐ Correggere REQ.87 - Sostituire "multi-AZ" con "cluster 2 nodi + backup DC2"
3. ☐ Correggere REQ.88 - Modificare "Autoscaling" in "scaling manuale/predisposto"
4. ☐ Verificare REQ.91/REQ.94 - Confermare supporto LDAP e Oracle OAM

### Verifiche Tecniche

1. ☐ W3Suite supporta integrazione LDAP nativa?
2. ☐ W3Suite ha connettore Oracle OAM specifico o solo OAuth2/SAML standard?
3. ☐ Scaling: è realmente "zero-downtime" o "minimal-downtime"?

---

## 8. CONCLUSIONI

Le risposte funzionali (80% dei requisiti) sono **coerenti** con le capacità W3Suite.

Le risposte infrastrutturali/architetturali (REQ.86-REQ.101) presentano **4-5 incongruenze** che devono essere corrette per allinearsi alla documentazione ufficiale che dichiara:

- **Hosting**: Seeweb Italia (Vendor Private), NOT hyperscale
- **HA**: Cluster 2 nodi, NOT multi-AZ
- **Auth**: OAuth2/OIDC, da verificare LDAP
- **Scaling**: Manuale, NOT autoscaling

**Raccomandazione**: Correggere le risposte prima della consegna per evitare discrepanze durante la valutazione tecnica.

---

**Fine Documento**
