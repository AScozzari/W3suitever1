import { db } from "../core/db";
import { 
  tenants, 
  users, 
  legalEntities, 
  stores, 
  roles, 
  userAssignments,
  commercialAreas,
  channels,
  brands,
  legalForms,
  countries,
  italianCities
} from "./schema";
import bcrypt from "bcryptjs";

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = 'admin-user';

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Create demo tenant
    console.log('Creating demo tenant...');
    const [tenant] = await db.insert(tenants).values({
      id: DEMO_TENANT_ID,
      name: 'Demo Organization',
      slug: 'w3-demo',
      status: 'active',
      settings: {
        theme: 'windtre',
        language: 'it'
      },
      features: {
        crm: true,
        pos: true,
        inventory: true,
        analytics: true,
        hr: true,
        cms: true,
        gare: true
      }
    }).onConflictDoNothing().returning();

    // 2. Create reference data
    console.log('Creating reference data...');
    
    // Legal Forms
    await db.insert(legalForms).values([
      { code: 'SRL', name: 'Società a Responsabilità Limitata', active: true, sortOrder: 1 },
      { code: 'SPA', name: 'Società per Azioni', active: true, sortOrder: 2 },
      { code: 'SAS', name: 'Società in Accomandita Semplice', active: true, sortOrder: 3 },
      { code: 'SNC', name: 'Società in Nome Collettivo', active: true, sortOrder: 4 },
      { code: 'DI', name: 'Ditta Individuale', active: true, sortOrder: 5 }
    ]).onConflictDoNothing();

    // Countries
    await db.insert(countries).values([
      { code: 'IT', name: 'Italia', active: true, isDefault: true },
      { code: 'FR', name: 'Francia', active: true },
      { code: 'DE', name: 'Germania', active: true },
      { code: 'ES', name: 'Spagna', active: true }
    ]).onConflictDoNothing();

    // Italian Cities (sample)
    await db.insert(italianCities).values([
      { name: 'Milano', province: 'MI', provinceName: 'Milano', region: 'Lombardia', postalCode: '20100', active: true },
      { name: 'Roma', province: 'RM', provinceName: 'Roma', region: 'Lazio', postalCode: '00100', active: true },
      { name: 'Napoli', province: 'NA', provinceName: 'Napoli', region: 'Campania', postalCode: '80100', active: true },
      { name: 'Torino', province: 'TO', provinceName: 'Torino', region: 'Piemonte', postalCode: '10100', active: true },
      { name: 'Palermo', province: 'PA', provinceName: 'Palermo', region: 'Sicilia', postalCode: '90100', active: true }
    ]).onConflictDoNothing();

    // Channels
    const [channelFranchising] = await db.insert(channels).values([
      { id: '10000000-0000-0000-0000-000000000001', code: 'FRANCHISING', name: 'Franchising' },
      { id: '10000000-0000-0000-0000-000000000002', code: 'TOP_DEALER', name: 'Top Dealer' },
      { id: '10000000-0000-0000-0000-000000000003', code: 'DEALER', name: 'Dealer' },
      { id: '10000000-0000-0000-0000-000000000004', code: 'FLAGSHIP', name: 'Flagship Store' }
    ]).onConflictDoNothing().returning();

    // Brands
    await db.insert(brands).values([
      { code: 'WINDTRE', name: 'WindTre', status: 'active' },
      { code: 'VERY', name: 'Very Mobile', status: 'active' }
    ]).onConflictDoNothing();

    // Commercial Areas
    const [area1, area2, area3] = await db.insert(commercialAreas).values([
      { id: '20000000-0000-0000-0000-000000000001', code: 'NORD_OVEST', name: 'Nord Ovest', description: 'Lombardia, Piemonte, Liguria, Valle d\'Aosta' },
      { id: '20000000-0000-0000-0000-000000000002', code: 'NORD_EST', name: 'Nord Est', description: 'Veneto, Trentino-Alto Adige, Friuli-Venezia Giulia, Emilia-Romagna' },
      { id: '20000000-0000-0000-0000-000000000003', code: 'CENTRO', name: 'Centro', description: 'Toscana, Umbria, Marche, Lazio, Abruzzo' },
      { id: '20000000-0000-0000-0000-000000000004', code: 'SUD', name: 'Sud', description: 'Campania, Molise, Puglia, Basilicata, Calabria' },
      { id: '20000000-0000-0000-0000-000000000005', code: 'ISOLE', name: 'Isole', description: 'Sicilia, Sardegna' }
    ]).onConflictDoNothing().returning();

    // 3. Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(users).values({
      id: ADMIN_USER_ID,
      email: 'admin@w3suite.com',
      firstName: 'Admin',
      lastName: 'User',
      tenantId: DEMO_TENANT_ID,
      status: 'Operativo',
      isSystemAdmin: true,
      mfaEnabled: false
    }).onConflictDoNothing().returning();

    // Create demo user  
    console.log('Creating demo user...');
    const [demoUser] = await db.insert(users).values({
      id: 'demo-user',
      email: 'demo@w3suite.com',
      firstName: 'Demo',
      lastName: 'User',
      tenantId: DEMO_TENANT_ID,
      status: 'Operativo',
      isSystemAdmin: false,
      mfaEnabled: false
    }).onConflictDoNothing().returning();

    // 4. Create roles
    console.log('Creating roles...');
    const [adminRole, managerRole, operatorRole] = await db.insert(roles).values([
      {
        id: '30000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        name: 'Amministratore',
        description: 'Accesso completo al sistema',
        isSystem: true
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        name: 'Store Manager',
        description: 'Gestione completa del punto vendita',
        isSystem: false
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        name: 'Operatore',
        description: 'Accesso limitato alle operazioni base',
        isSystem: false
      }
    ]).onConflictDoNothing().returning();

    // 5. Create legal entities
    console.log('Creating legal entities...');
    const [legalEntity1, legalEntity2, legalEntity3] = await db.insert(legalEntities).values([
      {
        id: '40000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        codice: 'LE001',
        nome: 'WindTre Retail Milano Srl',
        pIva: 'IT12345678901',
        stato: 'Attiva'
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        codice: 'LE002',
        nome: 'Digital Services Italia Spa',
        pIva: 'IT98765432101',
        stato: 'Attiva'
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        codice: 'LE003',
        nome: 'Telecom Solutions Sas',
        pIva: 'IT11223344556',
        stato: 'Sospesa'
      }
    ]).onConflictDoNothing().returning();

    // 6. Create stores
    console.log('Creating stores...');
    await db.insert(stores).values([
      // Stores for WindTre Retail Milano Srl
      {
        id: '50000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI001',
        nome: 'Milano Duomo',
        channelId: '10000000-0000-0000-0000-000000000004', // Flagship
        commercialAreaId: '20000000-0000-0000-0000-000000000001', // Nord Ovest
        address: 'Piazza Duomo, 1',
        citta: 'Milano',
        provincia: 'MI',
        cap: '20121',
        region: 'Lombardia',
        status: 'Attivo'
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI002',
        nome: 'Milano Corso Buenos Aires',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000001', // Nord Ovest
        address: 'Corso Buenos Aires, 33',
        citta: 'Milano',
        provincia: 'MI',
        cap: '20124',
        region: 'Lombardia',
        status: 'Attivo'
      },
      // Stores for Digital Services Italia Spa
      {
        id: '50000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'RM001',
        nome: 'Roma Termini',
        channelId: '10000000-0000-0000-0000-000000000002', // Top Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000003', // Centro
        address: 'Via Marsala, 25',
        citta: 'Roma',
        provincia: 'RM',
        cap: '00185',
        region: 'Lazio',
        status: 'Attivo'
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'NA001',
        nome: 'Napoli Centro',
        channelId: '10000000-0000-0000-0000-000000000003', // Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000004', // Sud
        address: 'Via Toledo, 148',
        citta: 'Napoli',
        provincia: 'NA',
        cap: '80134',
        region: 'Campania',
        status: 'Attivo'
      },
      // Store for Telecom Solutions Sas (suspended)
      {
        id: '50000000-0000-0000-0000-000000000005',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000003',
        code: 'TO001',
        nome: 'Torino Porta Nuova',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000001', // Nord Ovest
        address: 'Corso Vittorio Emanuele II, 52',
        citta: 'Torino',
        provincia: 'TO',
        cap: '10123',
        region: 'Piemonte',
        status: 'Sospeso'
      }
    ]).onConflictDoNothing();

    // 7. Create additional users
    console.log('Creating additional users...');
    await db.insert(users).values([
      {
        id: 'user-002',
        email: 'mario.rossi@windtre.it',
        firstName: 'Mario',
        lastName: 'Rossi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false
      },
      {
        id: 'user-003',
        email: 'giulia.bianchi@windtre.it',
        firstName: 'Giulia',
        lastName: 'Bianchi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false
      },
      {
        id: 'user-004',
        email: 'luca.verdi@windtre.it',
        firstName: 'Luca',
        lastName: 'Verdi',
        tenantId: DEMO_TENANT_ID,
        status: 'Sospeso',
        isSystemAdmin: false
      }
    ]).onConflictDoNothing();

    // 8. Create user assignments
    console.log('Creating user assignments...');
    await db.insert(userAssignments).values([
      // Admin user - tenant level
      {
        userId: ADMIN_USER_ID,
        roleId: '30000000-0000-0000-0000-000000000001', // Amministratore
        scopeType: 'tenant',
        scopeId: DEMO_TENANT_ID
      },
      // Demo user - Store Manager level
      {
        userId: 'demo-user',
        roleId: '30000000-0000-0000-0000-000000000002', // Store Manager
        scopeType: 'tenant',
        scopeId: DEMO_TENANT_ID
      },
      // Mario Rossi - Store Manager for Milano stores
      {
        userId: 'user-002',
        roleId: '30000000-0000-0000-0000-000000000002', // Store Manager
        scopeType: 'legal_entity',
        scopeId: '40000000-0000-0000-0000-000000000001' // WindTre Retail Milano Srl
      },
      // Giulia Bianchi - Operator for specific stores
      {
        userId: 'user-003',
        roleId: '30000000-0000-0000-0000-000000000003', // Operatore
        scopeType: 'store',
        scopeId: '50000000-0000-0000-0000-000000000001' // Milano Duomo
      },
      {
        userId: 'user-003',
        roleId: '30000000-0000-0000-0000-000000000003', // Operatore
        scopeType: 'store',
        scopeId: '50000000-0000-0000-0000-000000000002' // Milano Corso Buenos Aires
      }
    ]).onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
seedDatabase()
  .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });

export { seedDatabase };