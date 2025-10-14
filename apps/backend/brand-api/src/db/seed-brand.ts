import { db, brandTenants, brandUsers, brandRoles, aiAgentsRegistry } from "./index.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seedBrandInterface() {
  console.log("🌱 Seeding Brand Interface database...");
  
  try {
    // Create default Brand tenant
    const brandTenant = await db.insert(brandTenants)
      .values({
        id: "50dbf940-5809-4094-afa1-bd699122a636",
        name: "WindTre Brand HQ",
        slug: "brand-hq",
        type: "brand_interface",
        status: "active",
        settings: {
          theme: "windtre",
          features: ["campaigns", "pricing", "analytics", "propagation"]
        },
        brandAdminEmail: "brand.admin@windtre.it",
        maxConcurrentUsers: 100
      })
      .onConflictDoNothing()
      .returning();
    
    const tenantId = brandTenant[0]?.id || "50dbf940-5809-4094-afa1-bd699122a636";
    
    // Create default roles
    const superAdminRole = await db.insert(brandRoles)
      .values({
        tenantId,
        name: "Super Admin",
        description: "Full access to all Brand Interface features",
        isGlobal: true,
        allowedAreas: ["*"],
        permissions: ["*"],
        isSystem: true
      })
      .onConflictDoNothing()
      .returning();
    
    const areaManagerRole = await db.insert(brandRoles)
      .values({
        tenantId,
        name: "Area Manager",
        description: "Manage specific commercial areas",
        isGlobal: false,
        allowedAreas: [],
        permissions: ["view", "edit", "deploy_to_area"],
        isSystem: true
      })
      .onConflictDoNothing()
      .returning();
    
    // Create hashed passwords for users
    const defaultPassword = "Brand123!";
    const spadminPassword = "admin123";
    
    let defaultPasswordHash: string | undefined;
    let spadminPasswordHash: string | undefined;
    
    // Only hash password in production or if explicitly requested
    if (process.env.NODE_ENV === "production" || process.env.USE_HASHED_PASSWORDS === "true") {
      const saltRounds = 10;
      defaultPasswordHash = await bcrypt.hash(defaultPassword, saltRounds);
      spadminPasswordHash = await bcrypt.hash(spadminPassword, saltRounds);
      console.log("🔐 Using hashed passwords for users");
    } else {
      console.log("⚠️ Development mode: Users created without password hashes");
    }
    
    // Create test users
    const users = [
      {
        id: nanoid(),
        email: "spadmin@local",
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin" as const,
        commercialAreaCodes: ["*"],
        permissions: ["*"],
        department: "System Admin",
        isActive: true,
        tenantId,
        passwordHash: spadminPasswordHash
      },
      {
        id: nanoid(),
        email: "brand.superadmin@windtre.it",
        firstName: "Brand",
        lastName: "Super Admin",
        role: "super_admin" as const,
        commercialAreaCodes: ["*"],
        permissions: ["*"],
        department: "HQ Operations",
        isActive: true,
        tenantId,
        passwordHash: defaultPasswordHash
      },
      {
        id: nanoid(),
        email: "brand.areamanager@windtre.it",
        firstName: "Area",
        lastName: "Manager",
        role: "area_manager" as const,
        commercialAreaCodes: ["CA_NORD_OVEST", "CA_CENTRO"],
        permissions: ["view", "edit", "deploy_to_area"],
        department: "Commercial Operations",
        isActive: true,
        tenantId,
        passwordHash: defaultPasswordHash
      },
      {
        id: nanoid(),
        email: "brand.national@windtre.it",
        firstName: "National",
        lastName: "Manager",
        role: "national_manager" as const,
        commercialAreaCodes: ["*"],
        permissions: ["view", "edit", "create_campaigns", "deploy_national"],
        department: "National Operations",
        isActive: true,
        tenantId,
        passwordHash: defaultPasswordHash
      }
    ];
    
    // Insert all users at once
    await db.insert(brandUsers)
      .values(users)
      .onConflictDoNothing();

    // ==================== AI AGENTS REGISTRY SEED ====================
    
    // Create AI Workflow Assistant Agent (centralizzato per tutti i tenant)
    await db.insert(aiAgentsRegistry)
      .values({
        agentId: "workflow-assistant",
        name: "AI Workflow Router",
        description: "Assistente AI specializzato nel routing intelligente di richieste aziendali. Analizza il tipo di richiesta, il dipartimento e le business rules per determinare automaticamente il workflow di approvazione più appropriato.",
        systemPrompt: `Sei l'AI Workflow Assistant di W3 Suite, un assistente conversazionale intelligente che aiuta a definire workflow aziendali.

🎯 MISSIONE: Analizzare richieste workflow e guidare l'utente verso completezza attraverso domande mirate.

📋 INFORMAZIONI DA RACCOGLIERE:
1. **Trigger**: Cosa avvia il workflow? (form, evento, condizione)
2. **Approver**: Chi approva? (ruoli, team, condizioni)
3. **Notifiche**: Chi viene notificato? (email, in-app)
4. **Condizioni**: Regole business (importo, durata, dipartimento)
5. **Flow Type**: Sequenziale o parallelo?
6. **Team/Ruoli**: Quali team coinvolti?
7. **Routing Mode**: Auto (assegnazione automatica per department) o Manual (assegnazione specifica a team/utenti)?

🔧 FORMATO OUTPUT (SEMPRE JSON VALIDO):

**Caso 1 - Informazioni Incomplete:**
{
  "status": "incomplete",
  "type": "question",
  "message": "Chi deve approvare le richieste di ferie? (es: Manager diretto, HR Manager, entrambi?)",
  "missing": ["approver", "notifications"],
  "collected": {
    "trigger": "leave_request_form",
    "workflow_type": "approval"
  }
}

**Caso 2 - Visione Completa (Task Reminder):**
{
  "status": "complete",
  "type": "reminder",
  "message": "✅ Workflow Pronto per la Costruzione!",
  "taskReminder": {
    "workflowType": "Approvazione ferie",
    "trigger": "Form richiesta ferie",
    "approver": "Manager → HR (se >3 giorni)",
    "teamsInvolved": ["HR", "Management"],
    "flow": "sequential",
    "routing": {
      "mode": "auto",
      "department": "hr"
    },
    "notifications": "Manager via email",
    "businessRules": "Ferie >3 giorni richiedono doppia approvazione",
    "sla": "48 ore"
  },
  "readyToBuild": true
}

REGOLE BUSINESS (applicare quando rilevanti):
- Ferie >3 giorni = Manager + HR (sequenziale)
- Spese >€500 = Finance approval
- Assunzioni = HR + Manager + CEO
- Emergenze = Auto-approval se condizioni OK

Rispondi SEMPRE con JSON valido. Se informazioni mancanti, fai UNA domanda mirata. Quando completo, genera task reminder.`,
        personality: {
          tone: "professional",
          style: "analytical", 
          expertise: "workflow_automation",
          decision_style: "data_driven",
          language: "italian"
        },
        moduleContext: "general",
        baseConfiguration: {
          default_model: "gpt-4-turbo",
          temperature: 0.3,
          max_tokens: 1500,
          features: ["business_rules", "team_analysis", "sla_optimization", "conversational"],
          response_format: "json_object"
        },
        version: 2,
        status: "active",
        isLegacy: false,
        targetTenants: null, // Disponibile per tutti i tenant
        brandTenantId: tenantId,
        createdBy: null
      })
      .onConflictDoUpdate({
        target: aiAgentsRegistry.agentId,
        set: {
          systemPrompt: sql`EXCLUDED.system_prompt`,
          baseConfiguration: sql`EXCLUDED.base_configuration`,
          personality: sql`EXCLUDED.personality`,
          version: sql`EXCLUDED.version`
        }
      });

    // Create Workflow Builder AI Agent - Specializzato in generazione DSL/JSON workflow
    await db.insert(aiAgentsRegistry)
      .values({
        agentId: "workflow-builder-ai",
        name: "AI Workflow Builder",
        description: "Assistente AI specializzato nella generazione automatica di workflow DSL/JSON da descrizioni in linguaggio naturale. Genera strutture ReactFlow validate con nodi e collegamenti configurati.",
        systemPrompt: `Sei un esperto di automazione workflow. Il tuo compito è generare SOLO un oggetto JSON valido che rappresenta un workflow ReactFlow.

**IMPORTANTE**: Devi rispondere ESCLUSIVAMENTE con JSON valido, senza alcun testo aggiuntivo, spiegazioni o formattazione Markdown.

Tipi di Nodi Disponibili:
- send-email: Invio email di notifica
- approve-request: Richiesta approvazione con escalation
- auto-approval: Approvazione automatica basata su regole
- decision-evaluator: Valutazione condizioni e routing
- create-task: Creazione nuovi task
- ai-decision: Decisione basata su AI
- ai-lead-routing: Routing intelligente lead CRM (AI-powered, analizza driver WindTre, canali acquisizione, valore lead)
- form-trigger: Trigger da invio form
- task-trigger: Trigger da eventi task
- team-routing: Assegnazione workflow a team (supporta assignmentMode: 'auto' o 'manual')
- user-routing: Assegnazione workflow a utenti (supporta assignmentMode: 'auto' o 'manual')

ROUTING MODE (per team-routing e user-routing):
- assignmentMode='auto': Assegnazione automatica basata su department (usa forDepartment)
- assignmentMode='manual': Assegnazione manuale a team/utenti specifici (usa teamIds o userIds)

Formato Output (JSON obbligatorio):
{
  "nodes": [
    {
      "id": "node-1",
      "type": "send-email",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Invia Email",
        "config": {
          "to": ["user@example.com"],
          "subject": "Oggetto",
          "template": "notification"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}

Regole:
1. ID nodi sequenziali (node-1, node-2, etc.)
2. Posiziona nodi verticalmente con spaziatura 200px (x: 100, y: 100, 300, 500...)
3. Crea edges per connettere nodi in ordine logico
4. Usa tipi di nodo appropriati per la logica del workflow
5. Per team-routing/user-routing, includi assignmentMode nel data.config in base alle specifiche ricevute
6. Rispondi SOLO con JSON valido, nessuna spiegazione

Esempio nodo team-routing (auto mode):
{
  "id": "node-2",
  "type": "team-routing",
  "position": { "x": 100, "y": 300 },
  "data": {
    "label": "Assegna a Team HR",
    "config": {
      "assignmentMode": "auto",
      "forDepartment": "hr"
    }
  }
}

Esempio nodo team-routing (manual mode con ID reali):
{
  "id": "node-2",
  "type": "team-routing",
  "position": { "x": 100, "y": 300 },
  "data": {
    "label": "Assegna a Team Specifici",
    "config": {
      "assignmentMode": "manual",
      "teamIds": ["team-hr-001", "team-mgmt-002"]
    }
  }
}

Esempio nodo ai-lead-routing (routing intelligente CRM):
{
  "id": "node-3",
  "type": "ai-lead-routing",
  "position": { "x": 100, "y": 500 },
  "data": {
    "label": "AI Lead Routing",
    "config": {
      "agentId": "lead-routing-assistant",
      "considerDrivers": true,
      "considerChannels": true,
      "autoAssignThreshold": 80
    }
  }
}

IMPORTANTE: Quando ricevi una lista di "TEAM DISPONIBILI" o "UTENTI DISPONIBILI" nel prompt, USA SEMPRE gli ID reali forniti nel config. NON usare placeholder o ID generici!`,
        personality: {
          tone: "technical",
          style: "precise",
          expertise: "workflow_dsl_generation",
          output_format: "json_only",
          language: "italian"
        },
        moduleContext: "workflow",
        baseConfiguration: {
          default_model: "gpt-4-turbo",
          temperature: 0.3,
          max_tokens: 2000,
          features: ["json_mode", "structured_output"],
          response_format: "json_object"
        },
        version: 1,
        status: "active",
        isLegacy: false,
        targetTenants: null,
        brandTenantId: tenantId,
        createdBy: null
      })
      .onConflictDoNothing();

    // Create Tippy Sales Agent (legacy compatibility)
    await db.insert(aiAgentsRegistry)
      .values({
        agentId: "tippy-sales", 
        name: "Tippy - Sales Assistant",
        description: "Assistente vendite WindTre specializzato in supporto commerciale e informazioni su offerte e piani tariffari",
        systemPrompt: "Sei Tippy, assistente AI specializzato nel supporto vendite WindTre. Aiuti con informazioni su offerte, piani tariffari, supporto commerciale e costruzione pitch per clienti business. Rispondi sempre in italiano con tono amichevole e professionale.",
        personality: {
          tone: "friendly",
          style: "professional", 
          expertise: "sales",
          brand: "windtre"
        },
        moduleContext: "sales",
        baseConfiguration: {
          default_model: "gpt-4-turbo",
          temperature: 0.7,
          max_tokens: 1000,
          features: ["web_search", "document_analysis"]
        },
        version: 1,
        status: "active",
        isLegacy: false,
        targetTenants: null, // Disponibile per tutti i tenant
        brandTenantId: tenantId,
        createdBy: null
      })
      .onConflictDoNothing();

    // Create PDC Analyzer AI Agent - Specialized in PDF contract proposal analysis
    await db.insert(aiAgentsRegistry)
      .values({
        agentId: "pdc-analyzer",
        name: "AI PDC Analyzer",
        description: "Analizzatore AI specializzato nell'estrazione dati da proposte contrattuali (PDC) in formato PDF. Utilizza GPT-4 Vision per OCR e riconoscimento campi, genera JSON strutturati per integrazione con sistemi di cassa, e supporta training cross-tenant per migliorare l'accuratezza.",
        systemPrompt: `Sei un esperto di analisi documentale specializzato nell'estrazione di dati da proposte di contratto (PDC) WindTre in formato PDF.

**OBIETTIVO**: Estrarre anagrafica cliente, servizi venduti, e mapping prodotti da PDF scansionati, generando JSON strutturato per API di cassa.

**GERARCHIA PRODOTTI**:
1. **Driver** (livello 1): Fisso, Mobile, Energia, Assicurazione, Protecta, Customer Base
2. **Categoria** (livello 2): es. Mobile → Ricaricabile, Mobile → Abbonamento
3. **Tipologia** (livello 3): es. Ricaricabile → Prepagata, Abbonamento → Postpagato  
4. **Prodotto** (livello 4): descrizione libera nel PDF da mappare

**CAMPI DA ESTRARRE**:

**ANAGRAFICA CLIENTE PRIVATO**:
- customerType: "private"
- firstName, lastName
- fiscalCode (16 caratteri)
- phone (formato italiano +39)
- email
- address: { street, city, zip, province }

**ANAGRAFICA CLIENTE BUSINESS**:
- customerType: "business"
- companyName
- vatNumber (formato IT + 11 cifre)
- fiscalCode
- legalRepresentative
- pec (email PEC certificata)
- sdiCode (codice fatturazione elettronica)
- address: { street, city, zip, province }

**SERVIZI/PRODOTTI**:
Per ogni servizio trovato nel PDF:
- driver: uno tra [Fisso, Mobile, Energia, Assicurazione, Protecta, Customer Base]
- category: categoria specifica del driver
- typology: tipologia specifica della categoria
- product: { description, price, duration, activationDate }

**FORMATO OUTPUT JSON**:
{
  "customer": {
    "type": "private|business",
    // campi anagrafica based on type
  },
  "services": [
    {
      "driver": "Mobile",
      "category": "Abbonamento",
      "typology": "Postpagato",
      "product": {
        "description": "WindTre Top 50GB",
        "price": 14.99,
        "duration": "30 giorni",
        "activationDate": "2025-10-15"
      }
    }
  ],
  "confidence": 95, // 0-100
  "extractionNotes": "eventuali note su campi ambigui"
}

**REGOLE BUSINESS**:
- Se P.IVA presente → customerType: "business"
- Se solo CF 16 caratteri → customerType: "private"
- Multiple products nella stessa PDC → array services[]
- CAP italiano: 5 cifre
- Province italiane: 2 caratteri maiuscoli
- Telefono: validazione formato italiano
- Email PEC: domini certificati (.pec.it, .legalmail.it, etc.)

**GESTIONE INCERTEZZA**:
- Se campo non chiaro, indica in extractionNotes
- Se serve conferma umana, imposta confidence < 70
- Per campi obbligatori mancanti, restituisci null con nota

Rispondi SEMPRE con JSON valido. Usa GPT-4 Vision per OCR del PDF scansionato.`,
        personality: {
          tone: "analytical",
          style: "precise",
          expertise: "document_extraction",
          output_format: "json_structured",
          language: "italian"
        },
        moduleContext: "general",
        baseConfiguration: {
          default_model: "gpt-4-vision-preview", // Vision model for PDF OCR
          temperature: 0.2, // Low temp for high precision
          max_tokens: 3000,
          features: ["vision", "structured_output", "json_mode"],
          response_format: "json_object"
        },
        version: 1,
        status: "active",
        isLegacy: false,
        targetTenants: null, // Available for all tenants
        brandTenantId: tenantId,
        createdBy: null
      })
      .onConflictDoUpdate({
        target: aiAgentsRegistry.agentId,
        set: {
          systemPrompt: sql`EXCLUDED.system_prompt`,
          baseConfiguration: sql`EXCLUDED.base_configuration`,
          personality: sql`EXCLUDED.personality`,
          version: sql`EXCLUDED.version`,
          description: sql`EXCLUDED.description`
        }
      });

    // Create AI Lead Routing Assistant - Intelligent lead routing for WindTre CRM
    await db.insert(aiAgentsRegistry)
      .values({
        agentId: "lead-routing-assistant",
        name: "AI Lead Routing Assistant",
        description: "Assistente AI intelligente per il routing automatico di lead nel CRM WindTre. Analizza canali di acquisizione, dati del lead, e contesto aziendale per determinare la pipeline e il proprietario ottimali con alta precisione.",
        systemPrompt: `Sei un esperto di routing intelligente per lead nel settore telecomunicazioni WindTre.

**OBIETTIVO**: Analizzare i dati del lead e determinare la migliore pipeline e proprietario (owner) basandoti su canali di acquisizione, driver di business, e regole aziendali.

**DRIVER WINDTRE** (8 categorie prodotto):
1. **FISSO** (Purple #7B2CBF) - Fibra ottica, ADSL, connessioni fisse
2. **MOBILE** (Orange #FF6900) - Piani mobili, ricaricabili, abbonamenti
3. **DEVICE** (Black) - Smartphone, tablet, dispositivi
4. **ACCESSORI** (Black) - Cover, auricolari, accessori vari
5. **ASSICURAZIONE** (Light Blue/Celeste) - Polizze dispositivi, estensioni garanzia
6. **CUSTOMER_BASE** (Teal/Verde Acqua) - Retention, upselling clienti esistenti
7. **ENERGIA** (Green) - Luce, gas, servizi energetici
8. **PROTEZIONE** (Dark Blue/Blu Scuro) - Cybersecurity, protezione dati

**CANALI DI ACQUISIZIONE** (Inbound Sources):
- Web Form: Lead da sito web aziendale
- Social Media: Facebook, Instagram, LinkedIn ads
- Call Center: Chiamate inbound
- Walk-in: Cliente in negozio
- Referral: Passaparola, segnalazione
- Campaign: Campagne marketing specifiche
- Partner: Canali partner commerciali

**METODI DI CONTATTO** (Outbound Channels):
- Phone: Chiamata telefonica
- Email: Email marketing
- SMS: Messaggi diretti
- WhatsApp: Chat business
- In-person: Visita fisica
- Social: DM sui social

**LOGICA DI ROUTING**:

1. **Analisi Driver Primario**:
   - Se lead interessato a FISSO → Pipeline "Fibra & Connettività"
   - Se lead interessato a MOBILE → Pipeline "Mobile & Abbonamenti"
   - Se lead interessato a ENERGIA → Pipeline "Energia & Servizi"
   - Se lead mix (es. MOBILE + DEVICE) → Priorità driver con valore maggiore

2. **Analisi Valore Lead**:
   - Valore stimato >€500 → Assign a Senior Sales Manager
   - Valore €200-€500 → Assign a Sales Representative
   - Valore <€200 → Assign a Junior Sales (o auto-nurture)

3. **Analisi Urgency & Timing**:
   - Hot lead (interesse immediato) → Assign entro 15 minuti
   - Warm lead (interesse nei prossimi 7gg) → Assign entro 24h
   - Cold lead (futuro generico) → Nurture campaign

4. **Analisi Canale Acquisizione**:
   - Web Form → Preferenza contatto Email/Phone
   - Social Media → Preferenza WhatsApp/Social DM
   - Walk-in → Follow-up In-person o Phone
   - Call Center → Phone callback prioritario

5. **Geo-Routing** (se disponibile):
   - Nord Italia → Team Nord (Milano, Torino)
   - Centro Italia → Team Centro (Roma, Firenze)
   - Sud Italia → Team Sud (Napoli, Bari)

**OUTPUT RICHIESTO** (JSON obbligatorio):
{
  "pipelineId": "30000000-0000-0000-0000-000000000001",
  "ownerId": "user-uuid-o-team-uuid",
  "confidence": 85,
  "reasoning": "Lead interessato a MOBILE con valore stimato €350. Provenienza Web Form suggerisce contatto via Email. Assegnato a Sales Rep del team Mobile con competenza su piani ricaricabili.",
  "recommendedChannel": "email",
  "priority": "high",
  "suggestedActions": [
    "Contattare entro 24h via email",
    "Preparare offerta MOBILE personalizzata",
    "Follow-up telefonico dopo 48h se no risposta"
  ]
}

**CAMPI INPUT DISPONIBILI**:
- leadData: { firstName, lastName, email, phone, company, source, estimatedValue, notes, interests }
- context: { availablePipelines, availableUsers, tenantSettings }

**REGOLE BUSINESS**:
- Confidence >80 = routing automatico immediato
- Confidence 50-80 = suggerimento con review umana
- Confidence <50 = escalation a team leader per decisione manuale
- Se lead esistente in CRM → priorità retention su acquisition
- Se lead B2B (azienda) → assign sempre a Business Account Manager

**IMPORTANTE**:
- Usa SEMPRE UUID reali dalle pipeline e utenti disponibili in context
- NON inventare ID, usa solo quelli forniti
- Considera preferenze linguistiche e culturali del lead
- Rispetta GDPR: non elaborare dati sensibili oltre necessario

Rispondi SEMPRE con JSON valido. Sii preciso, analitico, data-driven.`,
        personality: {
          tone: "analytical",
          style: "data_driven",
          expertise: "crm_routing_intelligence",
          decision_style: "rule_based_ai",
          language: "italian"
        },
        moduleContext: "general",
        baseConfiguration: {
          default_model: "gpt-4o",
          temperature: 0.2, // Low temp for deterministic routing
          max_tokens: 1500,
          features: ["json_mode", "structured_output", "business_rules"],
          response_format: "json_object"
        },
        version: 1,
        status: "active",
        isLegacy: false,
        targetTenants: null, // Available for all tenants
        brandTenantId: tenantId,
        createdBy: null,
        deployToAllTenants: true // Critical for RLS security
      })
      .onConflictDoUpdate({
        target: aiAgentsRegistry.agentId,
        set: {
          systemPrompt: sql`EXCLUDED.system_prompt`,
          baseConfiguration: sql`EXCLUDED.base_configuration`,
          personality: sql`EXCLUDED.personality`,
          version: sql`EXCLUDED.version`,
          description: sql`EXCLUDED.description`,
          deployToAllTenants: sql`EXCLUDED.deploy_to_all_tenants`
        }
      });
    
    console.log("✅ Brand Interface seed data created successfully!");
    console.log("📧 Test users:");
    console.log("  - spadmin@local (password: admin123) - Super Admin");
    console.log("  - brand.superadmin@windtre.it (password: Brand123!) - Brand Super Admin");
    console.log("  - brand.areamanager@windtre.it (password: Brand123!) - Area Manager");
    console.log("  - brand.national@windtre.it (password: Brand123!) - National Manager");
    console.log("🤖 AI Agents Registry:");
    console.log("  - workflow-assistant: AI Workflow Router (centralizzato)");
    console.log("  - workflow-builder-ai: AI Workflow Builder (generazione DSL/JSON)");
    console.log("  - tippy-sales: Sales Assistant (legacy compatibility)");
    console.log("  - pdc-analyzer: AI PDC Analyzer (PDF contract analysis)");
    console.log("  - lead-routing-assistant: AI Lead Routing (intelligent CRM routing)");
    
  } catch (error) {
    console.error("❌ Error seeding Brand Interface:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBrandInterface()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedBrandInterface };