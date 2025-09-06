import { db } from "../core/db";
import { 
  tenants, 
  users, 
  legalEntities, 
  stores, 
  roles,
  commercialAreas,
  channels,
  brands
} from "./schema";

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function seedDatabase() {
  console.log('🌱 Starting simple database seed...');

  try {
    // 1. Create demo tenant
    console.log('Creating demo tenant...');
    await db.insert(tenants).values({
      id: DEMO_TENANT_ID,
      name: 'Demo Organization',
      slug: 'demo-org',
      status: 'active'
    }).onConflictDoNothing();

    // 2. Create channels
    console.log('Creating channels...');
    await db.insert(channels).values([
      { id: '10000000-0000-0000-0000-000000000001', code: 'FRANCHISING', name: 'Franchising' },
      { id: '10000000-0000-0000-0000-000000000002', code: 'TOP_DEALER', name: 'Top Dealer' },
      { id: '10000000-0000-0000-0000-000000000003', code: 'DEALER', name: 'Dealer' }
    ]).onConflictDoNothing();

    // 3. Create commercial areas
    console.log('Creating commercial areas...');
    await db.insert(commercialAreas).values([
      { id: '20000000-0000-0000-0000-000000000001', code: 'NORD_OVEST', name: 'Nord Ovest' },
      { id: '20000000-0000-0000-0000-000000000002', code: 'NORD_EST', name: 'Nord Est' },
      { id: '20000000-0000-0000-0000-000000000003', code: 'CENTRO', name: 'Centro' },
      { id: '20000000-0000-0000-0000-000000000004', code: 'SUD', name: 'Sud' }
    ]).onConflictDoNothing();

    // 4. Create admin user
    console.log('Creating admin user...');
    await db.insert(users).values({
      id: 'admin-user',
      email: 'admin@w3suite.com',
      firstName: 'Admin',
      lastName: 'User',
      tenantId: DEMO_TENANT_ID,
      status: 'Operativo',
      isSystemAdmin: true
    }).onConflictDoNothing();

    // 5. Create roles
    console.log('Creating roles...');
    await db.insert(roles).values([
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
      }
    ]).onConflictDoNothing();

    // 6. Create legal entities
    console.log('Creating legal entities...');
    await db.insert(legalEntities).values([
      {
        id: '40000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        name: 'WindTre Retail Milano Srl',
        vat: 'IT12345678901',
        status: 'Attiva'
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        name: 'Digital Services Italia Spa',
        vat: 'IT98765432101',
        status: 'Attiva'
      }
    ]).onConflictDoNothing();

    // 7. Create stores
    console.log('Creating stores...');
    await db.insert(stores).values([
      {
        id: '50000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI001',
        name: 'Milano Duomo',
        channelId: '10000000-0000-0000-0000-000000000001',
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Piazza Duomo, 1',
        city: 'Milano',
        province: 'MI',
        cap: '20121',
        region: 'Lombardia',
        status: 'Attivo'
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI002',
        name: 'Milano Corso Buenos Aires',
        channelId: '10000000-0000-0000-0000-000000000001',
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Corso Buenos Aires, 33',
        city: 'Milano',
        province: 'MI',
        cap: '20124',
        region: 'Lombardia',
        status: 'Attivo'
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'RM001',
        name: 'Roma Termini',
        channelId: '10000000-0000-0000-0000-000000000002',
        commercialAreaId: '20000000-0000-0000-0000-000000000003',
        address: 'Via Marsala, 25',
        city: 'Roma',
        province: 'RM',
        cap: '00185',
        region: 'Lazio',
        status: 'Attivo'
      }
    ]).onConflictDoNothing();

    // 8. Create additional users
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
      }
    ]).onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed
seedDatabase()
  .then(() => {
    console.log('✨ Seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });