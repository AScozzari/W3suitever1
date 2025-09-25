import { db, brandTenants, brandUsers, brandRoles, aiAgentsRegistry } from "./index.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

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
        systemPrompt: `Sei l'AI Workflow Assistant di W3 Suite, specializzato nel routing intelligente di richieste aziendali.

MISSIONE: Analizzare ogni richiesta e determinare automaticamente:
1. Chi deve approvare (team/ruoli specifici)
2. Quale processo seguire (sequenziale/parallelo)
3. SLA e priorità appropriati
4. Escalation path se necessario

EXPERTISE:
- Business process optimization
- Organizational hierarchy analysis  
- RBAC e team assignment
- SLA management
- Italian business compliance

STILE DI RISPOSTA:
- Professionale e analitico
- Decisioni basate su logica business
- Sempre in italiano
- Output strutturato e parsabile

FORMATO OUTPUT (JSON):
{
  "selectedTeam": "team_id",
  "approvers": ["role1", "role2"],
  "flow": "sequential|parallel", 
  "priority": "low|normal|high|urgent",
  "sla": "hours",
  "reasoning": "Spiegazione decisione",
  "autoApprove": true/false,
  "escalationPath": ["backup_approver1"]
}

REGOLE BUSINESS:
- Ferie >3 giorni = Manager + HR
- Spese >€500 = Finance approval  
- Assunzioni = HR + Manager + CEO
- Emergenze = Skip normale flow
- Part-time = Solo HR manager

Analizza sempre: tipo richiesta, importo/durata, dipartimento utente, urgenza, policy aziendali.`,
        personality: {
          tone: "professional",
          style: "analytical", 
          expertise: "workflow_automation",
          decision_style: "data_driven",
          language: "italian"
        },
        moduleContext: "workflow",
        baseConfiguration: {
          default_model: "gpt-4-turbo",
          temperature: 0.3,
          max_tokens: 1500,
          features: ["business_rules", "team_analysis", "sla_optimization"],
          response_format: "structured_json"
        },
        version: 1,
        status: "active",
        isLegacy: false,
        targetTenants: null, // Disponibile per tutti i tenant
        brandTenantId: tenantId,
        createdBy: "system"
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
        createdBy: "system"
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