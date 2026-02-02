# W3Suite - Risposte AI Questionnaire WindTre

**Documento: 7_W3_AI_Questionnaire_2.PROVIDER**  
**Ruolo W3Suite: DEPLOYER (non Provider di modelli AI)**  
**Data: 2 Febbraio 2026**

---

## Riepilogo Posizionamento

| Aspetto | Posizione W3Suite |
|---------|-------------------|
| **Ruolo AI Act** | Deployer (Art. 26) |
| **Provider modello AI** | OpenAI (GPT-4, GPT-3.5-turbo) |
| **Classificazione rischio** | Minimal/No Risk |
| **Training dati W3** | NO (zero-day retention OpenAI) |
| **FRIA richiesta** | NO (non high-risk) |

---

## Risposte Complete per Sezione

### SEZIONE 2.1 - Dati Provider

| ID | Domanda | Risposta |
|----|---------|----------|
| P.01 | Provider (Vendor) | **Easy Digital Group S.r.l.** |
| P.02 | Indirizzo | [Inserire indirizzo sede legale] |
| P.03 | Intra/Extra EU | **Intra European Union** |
| P.04 | Nome Servizio/Prodotto | **W3Suite - AI-Powered Enterprise Platform** |

### Consapevolezza AI Act

| ID | Domanda | Risposta |
|----|---------|----------|
| P.05 | Consapevole AI Act? | **Yes** |
| P.06 | Compreso definizione "sistema IA"? | **Yes** |
| P.07 | Compreso definizione "GPAI model"? | **Yes** |

### Uso AI e Ruolo

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.08 | Servizio usa AI? | **Yes** | W3Suite integra AI per assistenza operativa |
| P.09 | Conforme AI Act? | **Yes** | Come deployer, applica Art. 26 |
| P.10 | System Integrator? | **Yes** | Integra OpenAI in piattaforma enterprise |
| P.11 | IT SPOC? | **No** | |

### Ruolo secondo AI Act (CRITICO)

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.10bis | Siete "Provider" AI Act? | **No, deployer** | W3Suite è DEPLOYER. Non sviluppa modelli AI, utilizza OpenAI GPT-4 come modello GPAI esterno |

### Garanzie e Conformità

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.11bis | Garantisce conformità Provider? | **Yes** | Come deployer, garantisce uso conforme |
| P.12 | Manleva WindTre? | **Yes** | |
| P.13 | No sistemi "rischio inaccettabile"? | **Yes** | Nessun sistema Art. 5 AI Act |
| P.14 | Consapevole "High Risk Systems"? | **Yes** | |
| P.15 | Consapevole modelli GPAI? | **Yes** | |
| P.16 | Consapevole obblighi trasparenza? | **Yes** | Art. 50 AI Act |
| P.17 | Verificato provider terzi? | **Yes** | OpenAI verificato conforme |
| P.18 | Responsabile per failure terzi? | **Yes** | |
| P.19 | Staff formato su AI? | **Yes** | Formazione Art. 4 AI Regulation |
| P.20 | Marcatura CE? | **N/A** | Non applicabile a deployer |

### Classificazione Rischio

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.21 | Categoria rischio AI | **N/A - Minimal/No Risk** | AI per assistenza operativa, non in Allegato III |
| P.22 | Sistema ad alto rischio? | **No** | |
| P.23-P.29 | Dettagli high-risk | **N/A** | Non applicabile |

### Modelli AI Utilizzati

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.30 | Modelli GPAI usati | **OpenAI GPT-4 e GPT-3.5-turbo** | OpenAI garantisce Art. 53, W3Suite applica Art. 26 |
| P.31 | Tipo modello ML | **Generative** | LLM per generazione testo |
| P.32 | Training dataset | **External Data** | Training gestito da OpenAI. Dati W3 NON usati (zero-day retention) |
| P.33 | Dati biometrici? | **No** | |
| P.34 | Livello autonomia | **Partial Machine Autonomy** | Output sempre soggetto a revisione umana |
| P.35 | Dove eseguito AI? | **Cloud - OpenAI API (EU endpoint)** | Endpoint EU per minimizzare trasferimenti extra-UE |
| P.36 | Adattabilità post-deploy? | **Nil** | Nessun apprendimento post-deployment |

### Trasparenza e Output

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.37 | Utenti informati interazione AI? | **Yes** | Label "AI Assistant", disclaimer |
| P.38 | Tipo output AI | **Text generation, data analysis, recommendations** | |
| P.39 | Genera deep-fake? | **No deep-fake generation** | |
| P.40 | Output etichettati/tracciabili? | **Yes** | Audit trail attivo |

### Sicurezza e Controlli

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.41 | Cybersecurity AI? | **Yes** | TLS 1.3, API key rotation, rate limiting |
| P.42 | Logging interazioni? | **Yes** | Retention 90 giorni |
| P.43 | Controlli accesso AI? | **Yes** | RBAC per funzionalità AI |
| P.44 | Monitoring qualità output? | **Yes** | |
| P.45 | Incident response AI? | **Yes** | |

### Explainability e Bias

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.46 | Explainability? | **Partial** | Limitata da natura black-box LLM |
| P.47 | Bias mitigation? | **OpenAI + W3Suite monitoring** | |
| P.48 | Testing comportamenti? | **Yes** | |
| P.49 | Feedback loop? | **Yes** | |
| P.50 | Decisioni automatizzate? | **N/A** | No decisioni con impatto legale |

### Governance AI

| ID | Domanda | Risposta |
|----|---------|----------|
| P.51 | Governance AI definita? | **Yes** |
| P.52 | Policy uso accettabile? | **Yes** |
| P.53 | Revisione periodica? | **Yes** |
| P.54 | Documentazione tecnica? | **Yes** |
| P.55 | Contratto con provider AI? | **Yes** |

### Performance e SLA

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.56 | SLA AI Services | **99.5%** | Dipendente da SLA OpenAI |
| P.57 | Monitoring performance? | **Yes** | |
| P.58 | Capacity planning? | **Yes** | |
| P.59 | Gestione failure? | **Graceful degradation** | Fallback a funzionalità non-AI |
| P.60 | Business continuity? | **Yes** | |

### MLOps / LLMOps

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.61 | Architettura MLOps | **API Integration Architecture** | MCP Gateway → OpenAI API → Processing → Audit |
| P.62 | Stack tecnologico | **Node.js Gateway, Git prompt templates, Redis cache, PostgreSQL audit** | |
| P.63 | Componenti open source? | **Yes** | Node.js, Express, PostgreSQL, Redis |
| P.64 | Componenti SaaS? | **Yes - OpenAI API** | Contratto Enterprise |
| P.65 | Modello costi | **Pay-per-use (tokens)** | OpenAI per token, W3Suite incluso in SaaS |

### Data Protection

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| P.66 | Isolamento dati W3 | **W3Suite tenant isolation** | RLS PostgreSQL, zero-day retention OpenAI |
| P.67 | Data retention | **90 days audit, 0-day OpenAI** | |
| P.68 | Dati W3 per training? | **Yes, no W3 data used** | Dati W3 NON usati per training OpenAI |
| P.69 | DPIA | **DPIA by both** | Easy Digital Group + WindTre |
| P.70 | FRIA | **N/A - Not high-risk AI** | Non richiesta per sistemi non ad alto rischio |

### Note Finali

| ID | Risposta |
|----|----------|
| P.71 | W3Suite è deployer AI (Art. 26 AI Act). Utilizza OpenAI GPT-4 come modello GPAI esterno. Conformità garantita da: (1) OpenAI come provider del modello, (2) Easy Digital Group come deployer responsabile dell'uso conforme. Architettura predisposta per audit, trasparenza e supervisione umana. |

---

## Documenti di Supporto

Per completare il questionario, allegare:

1. **Documentazione tecnica W3Suite AI** - Architettura integrazione OpenAI
2. **Policy uso AI** - Linee guida uso accettabile
3. **DPIA W3Suite** - Valutazione impatto protezione dati
4. **Contratto OpenAI Enterprise** - Clausole data protection

---

## Riferimenti Normativi

- **AI Act**: Regolamento (UE) 2024/1689
- **Art. 26**: Obblighi dei deployer di sistemi AI
- **Art. 53**: Obblighi dei provider di modelli GPAI
- **Allegato III**: Lista sistemi AI ad alto rischio
