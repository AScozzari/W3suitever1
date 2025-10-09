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
- form-trigger: Trigger da invio form
- task-trigger: Trigger da eventi task

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
5. Rispondi SOLO con JSON valido, nessuna spiegazione`,
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