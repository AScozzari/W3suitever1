# W3Suite - Risposte AI Questionnaire WindTre

**Documento**: 7_W3_AI_Questionnaire_2.PROVIDER  
**Ruolo W3Suite**: **DEPLOYER** (Art. 26 AI Act)  
**Data**: 3 Febbraio 2026

---

## ⚠️ Istruzioni di Compilazione

### Regola Fondamentale

Il questionario prevede che:

> **"Non compilare SECTION 2.2 e 2.3 se si è risposto 'Yes' al quesito P.09"**

Poiché W3Suite risponde **P.09 = Yes** (conferma ruolo di Deployer):

| Sezione | Compila? | Motivo |
|---------|----------|--------|
| **SECTION 2.1** | ✅ **SÌ** | Dati generali e ruolo |
| **SECTION 2.2** | ❌ **NO** | Solo per Provider di modelli AI |
| **SECTION 2.3** | ❌ **NO** | Solo per Provider di modelli AI |

---

## Posizionamento W3Suite

| Aspetto | Valore |
|---------|--------|
| **Ruolo AI Act** | **Deployer** (Art. 26) |
| **Provider modello AI** | OpenAI (GPT-4, GPT-3.5-turbo) |
| **Sviluppa modelli AI?** | NO |
| **Addestra modelli AI?** | NO |
| **Usa AI di terze parti?** | SÌ (OpenAI) |

---

## SECTION 2.1 - Risposte Complete

### Dati Provider

| ID | Domanda | Risposta |
|----|---------|----------|
| **P.01** | Provider (Vendor) | **Easy Digital Group S.r.l.** |
| **P.02** | Indirizzo sede | [Inserire indirizzo sede legale] |
| **P.03** | Intra/Extra EU | **Intra European Union** |
| **P.04** | Nome Servizio/Prodotto | **W3Suite - AI-Powered Enterprise Platform** |

### Consapevolezza AI Act

| ID | Domanda | Risposta |
|----|---------|----------|
| **P.05** | Consapevole previsioni AI Act? | **Yes** |
| **P.06** | Compreso definizione "sistema di IA"? | **Yes** |
| **P.07** | Compreso definizione "modello IA per finalità generali"? | **Yes** |

### Uso AI e Ruolo

| ID | Domanda | Risposta | Note |
|----|---------|----------|------|
| **P.08** | Il servizio/prodotto utilizza IA ed è soggetto al Regolamento? | **Yes** | W3Suite integra OpenAI GPT-4 |
| **P.09** | Utilizza IA nel ruolo di "deployer"? | **Yes** | ⚠️ **RISPOSTA CHIAVE** - W3Suite è DEPLOYER, non Provider |
| **P.10** | È System Integrator di sistemi IA? | **Yes** | Integra modelli OpenAI nella piattaforma |
| **P.11** | È IT SPOC? | **No** | |

---

## SECTION 2.2 - NON COMPILARE

> ❌ **Non compilare questa sezione**
> 
> Motivo: P.09 = Yes (W3Suite è Deployer, non Provider)

La sezione 2.2 contiene domande riservate ai **Provider** di sistemi AI secondo l'Art. 3 punto 3 del AI Act, ovvero soggetti che:
- Sviluppano sistemi di IA
- Fanno sviluppare sistemi di IA
- Immettono sul mercato sistemi di IA con proprio nome/marchio

**W3Suite non rientra in questa definizione** perché utilizza modelli AI di terze parti (OpenAI).

---

## SECTION 2.3 - NON COMPILARE

> ❌ **Non compilare questa sezione**
> 
> Motivo: P.09 = Yes (W3Suite è Deployer, non Provider)

La sezione 2.3 richiede dettagli tecnici sui modelli AI che sono responsabilità del **Provider** (OpenAI), non del Deployer (W3Suite).

---

## Riferimenti Normativi

### Art. 3 - Definizioni AI Act

**Punto 3 - Provider (Fornitore)**:
> "Una persona fisica o giuridica che **sviluppa** un sistema di IA o un modello di IA per finalità generali o che **fa sviluppare** un sistema di IA e lo immette sul mercato con il **proprio nome o marchio**"

**Punto 4 - Deployer (Operatore)**:
> "Una persona fisica o giuridica che **utilizza** un sistema di IA sotto la propria autorità"

### Obblighi Deployer (Art. 26)

W3Suite, come Deployer, è tenuto a:

1. ✅ Utilizzare sistemi AI conformemente alle istruzioni del Provider
2. ✅ Garantire supervisione umana appropriata
3. ✅ Monitorare il funzionamento del sistema AI
4. ✅ Informare gli utenti dell'interazione con sistemi AI
5. ✅ Conservare log generati automaticamente (quando applicabile)

---

## Riepilogo Compilazione

```
┌─────────────────────────────────────────────────────────┐
│  AI QUESTIONNAIRE 2. PROVIDER - W3Suite                 │
├─────────────────────────────────────────────────────────┤
│  SECTION 2.1 (P.01 - P.11)                              │
│  ✅ COMPILARE - Risposte fornite sopra                  │
├─────────────────────────────────────────────────────────┤
│  SECTION 2.2 (P.10 - P.20)                              │
│  ❌ NON COMPILARE - P.09 = Yes (Deployer)               │
├─────────────────────────────────────────────────────────┤
│  SECTION 2.3 (P.21 - P.71)                              │
│  ❌ NON COMPILARE - P.09 = Yes (Deployer)               │
└─────────────────────────────────────────────────────────┘
```

---

## File di Output

| File | Contenuto |
|------|-----------|
| `AI-QUESTIONNAIRE-RISPOSTE-W3SUITE.xlsx` | Risposte Excel pronte per copia/incolla |
| `GUIDA-AI-QUESTIONNAIRE-W3SUITE.md` | Questa guida |
