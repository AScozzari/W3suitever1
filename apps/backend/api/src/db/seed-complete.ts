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

async function seedCompleteDatabase() {
  console.log('🌱 Starting complete database seed with real demo data...');

  try {
    // 1. Create demo tenant
    console.log('Creating demo tenant...');
    await db.insert(tenants).values({
      id: DEMO_TENANT_ID,
      name: 'WindTre Retail Group',
      slug: 'windtre-retail',
      status: 'active',
      settings: {
        theme: 'windtre',
        language: 'it',
        currency: 'EUR',
        timezone: 'Europe/Rome'
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
    }).onConflictDoNothing();

    // 2. Create channels
    console.log('Creating sales channels...');
    await db.insert(channels).values([
      { id: '10000000-0000-0000-0000-000000000001', code: 'FRANCHISING', name: 'Franchising' },
      { id: '10000000-0000-0000-0000-000000000002', code: 'TOP_DEALER', name: 'Top Dealer' },
      { id: '10000000-0000-0000-0000-000000000003', code: 'DEALER', name: 'Dealer' },
      { id: '10000000-0000-0000-0000-000000000004', code: 'FLAGSHIP', name: 'Flagship Store' },
      { id: '10000000-0000-0000-0000-000000000005', code: 'ONLINE', name: 'E-Commerce' }
    ]).onConflictDoNothing();

    // 3. Create commercial areas
    console.log('Creating commercial areas...');
    await db.insert(commercialAreas).values([
      { id: '20000000-0000-0000-0000-000000000001', code: 'NORD_OVEST', name: 'Nord Ovest', description: 'Lombardia, Piemonte, Liguria, Valle d\'Aosta' },
      { id: '20000000-0000-0000-0000-000000000002', code: 'NORD_EST', name: 'Nord Est', description: 'Veneto, Trentino-Alto Adige, Friuli-Venezia Giulia, Emilia-Romagna' },
      { id: '20000000-0000-0000-0000-000000000003', code: 'CENTRO', name: 'Centro', description: 'Toscana, Umbria, Marche, Lazio, Abruzzo' },
      { id: '20000000-0000-0000-0000-000000000004', code: 'SUD', name: 'Sud', description: 'Campania, Molise, Puglia, Basilicata, Calabria' },
      { id: '20000000-0000-0000-0000-000000000005', code: 'ISOLE', name: 'Isole', description: 'Sicilia, Sardegna' }
    ]).onConflictDoNothing();

    // 4. Create brands
    console.log('Creating brands...');
    await db.insert(brands).values([
      { code: 'WINDTRE', name: 'WindTre', status: 'active' },
      { code: 'VERY', name: 'Very Mobile', status: 'active' },
      { code: 'WINDTRE_BUSINESS', name: 'WindTre Business', status: 'active' }
    ]).onConflictDoNothing();

    // 5. Create roles and permissions using RBAC seed
    console.log('Creating organizational roles and permissions...');
    const { seedRBACForTenant } = await import('./seed-rbac');
    await seedRBACForTenant(DEMO_TENANT_ID);

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
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        name: 'Telecom Solutions Sas',
        vat: 'IT11223344556',
        status: 'Sospesa'
      },
      {
        id: '40000000-0000-0000-0000-000000000004',
        tenantId: DEMO_TENANT_ID,
        name: 'Mobile Store Network Srl',
        vat: 'IT55667788990',
        status: 'Attiva'
      },
      {
        id: '40000000-0000-0000-0000-000000000005',
        tenantId: DEMO_TENANT_ID,
        name: 'Tech Solutions Group Spa',
        vat: 'IT99887766554',
        status: 'Attiva'
      },
      {
        id: '40000000-0000-0000-0000-000000000006',
        tenantId: DEMO_TENANT_ID,
        name: 'Innovation Services Srl',
        vat: 'IT33445566778',
        status: 'Archiviata'
      }
    ]).onConflictDoNothing();

    // 7. Create stores
    console.log('Creating stores...');
    await db.insert(stores).values([
      // WindTre Retail Milano Srl stores
      {
        id: '50000000-0000-0000-0000-000000000001',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI001',
        name: 'Milano Duomo',
        channelId: '10000000-0000-0000-0000-000000000004', // Flagship
        commercialAreaId: '20000000-0000-0000-0000-000000000001', // Nord Ovest
        address: 'Piazza Duomo, 1',
        city: 'Milano',
        province: 'MI',
        cap: '20121',
        region: 'Lombardia',
        status: 'Attivo',
        geo: { lat: 45.4642, lng: 9.1900 }
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI002',
        name: 'Milano Corso Buenos Aires',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Corso Buenos Aires, 33',
        city: 'Milano',
        province: 'MI',
        cap: '20124',
        region: 'Lombardia',
        status: 'Attivo',
        geo: { lat: 45.4788, lng: 9.2050 }
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000001',
        code: 'MI003',
        name: 'Milano Porta Romana',
        channelId: '10000000-0000-0000-0000-000000000003', // Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Viale Sabotino, 14',
        city: 'Milano',
        province: 'MI',
        cap: '20135',
        region: 'Lombardia',
        status: 'Attivo',
        geo: { lat: 45.4515, lng: 9.1953 }
      },
      // Digital Services Italia Spa stores
      {
        id: '50000000-0000-0000-0000-000000000004',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'RM001',
        name: 'Roma Termini',
        channelId: '10000000-0000-0000-0000-000000000002', // Top Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000003', // Centro
        address: 'Via Marsala, 25',
        city: 'Roma',
        province: 'RM',
        cap: '00185',
        region: 'Lazio',
        status: 'Attivo',
        geo: { lat: 41.9009, lng: 12.5021 }
      },
      {
        id: '50000000-0000-0000-0000-000000000005',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'RM002',
        name: 'Roma EUR',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000003',
        address: 'Viale Europa, 190',
        city: 'Roma',
        province: 'RM',
        cap: '00144',
        region: 'Lazio',
        status: 'Attivo',
        geo: { lat: 41.8308, lng: 12.4664 }
      },
      {
        id: '50000000-0000-0000-0000-000000000006',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000002',
        code: 'NA001',
        name: 'Napoli Centro',
        channelId: '10000000-0000-0000-0000-000000000003', // Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000004', // Sud
        address: 'Via Toledo, 148',
        city: 'Napoli',
        province: 'NA',
        cap: '80134',
        region: 'Campania',
        status: 'Attivo',
        geo: { lat: 40.8518, lng: 14.2681 }
      },
      // Mobile Store Network Srl stores
      {
        id: '50000000-0000-0000-0000-000000000007',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000004',
        code: 'TO001',
        name: 'Torino Porta Nuova',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000001', // Nord Ovest
        address: 'Corso Vittorio Emanuele II, 52',
        city: 'Torino',
        province: 'TO',
        cap: '10123',
        region: 'Piemonte',
        status: 'Attivo',
        geo: { lat: 45.0622, lng: 7.6786 }
      },
      {
        id: '50000000-0000-0000-0000-000000000008',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000004',
        code: 'TO002',
        name: 'Torino Lingotto',
        channelId: '10000000-0000-0000-0000-000000000003', // Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Via Nizza, 230',
        city: 'Torino',
        province: 'TO',
        cap: '10126',
        region: 'Piemonte',
        status: 'Attivo',
        geo: { lat: 45.0311, lng: 7.6586 }
      },
      {
        id: '50000000-0000-0000-0000-000000000009',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000004',
        code: 'GE001',
        name: 'Genova De Ferrari',
        channelId: '10000000-0000-0000-0000-000000000002', // Top Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000001',
        address: 'Via XX Settembre, 139',
        city: 'Genova',
        province: 'GE',
        cap: '16121',
        region: 'Liguria',
        status: 'Attivo',
        geo: { lat: 44.4056, lng: 8.9463 }
      },
      // Tech Solutions Group Spa stores
      {
        id: '50000000-0000-0000-0000-000000000010',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000005',
        code: 'BO001',
        name: 'Bologna Centrale',
        channelId: '10000000-0000-0000-0000-000000000004', // Flagship
        commercialAreaId: '20000000-0000-0000-0000-000000000002', // Nord Est
        address: 'Via Indipendenza, 36',
        city: 'Bologna',
        province: 'BO',
        cap: '40121',
        region: 'Emilia-Romagna',
        status: 'Attivo',
        geo: { lat: 44.4949, lng: 11.3426 }
      },
      {
        id: '50000000-0000-0000-0000-000000000011',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000005',
        code: 'VE001',
        name: 'Venezia Mestre',
        channelId: '10000000-0000-0000-0000-000000000001', // Franchising
        commercialAreaId: '20000000-0000-0000-0000-000000000002',
        address: 'Via Cappuccina, 46',
        city: 'Mestre',
        province: 'VE',
        cap: '30172',
        region: 'Veneto',
        status: 'Attivo',
        geo: { lat: 45.4904, lng: 12.2426 }
      },
      {
        id: '50000000-0000-0000-0000-000000000012',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000005',
        code: 'VR001',
        name: 'Verona Piazza Bra',
        channelId: '10000000-0000-0000-0000-000000000003', // Dealer
        commercialAreaId: '20000000-0000-0000-0000-000000000002',
        address: 'Via Mazzini, 17',
        city: 'Verona',
        province: 'VR',
        cap: '37121',
        region: 'Veneto',
        status: 'Attivo',
        geo: { lat: 45.4384, lng: 10.9916 }
      },
      // Telecom Solutions Sas stores (suspended)
      {
        id: '50000000-0000-0000-0000-000000000013',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000003',
        code: 'FI001',
        name: 'Firenze Santa Maria Novella',
        channelId: '10000000-0000-0000-0000-000000000001',
        commercialAreaId: '20000000-0000-0000-0000-000000000003', // Centro
        address: 'Via dei Fossi, 12',
        city: 'Firenze',
        province: 'FI',
        cap: '50123',
        region: 'Toscana',
        status: 'Sospeso',
        geo: { lat: 43.7731, lng: 11.2472 }
      },
      {
        id: '50000000-0000-0000-0000-000000000014',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000003',
        code: 'PI001',
        name: 'Pisa Corso Italia',
        channelId: '10000000-0000-0000-0000-000000000003',
        commercialAreaId: '20000000-0000-0000-0000-000000000003',
        address: 'Corso Italia, 84',
        city: 'Pisa',
        province: 'PI',
        cap: '56125',
        region: 'Toscana',
        status: 'Sospeso',
        geo: { lat: 43.7160, lng: 10.4019 }
      },
      // More stores in South and Islands
      {
        id: '50000000-0000-0000-0000-000000000015',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000004',
        code: 'BA001',
        name: 'Bari Centrale',
        channelId: '10000000-0000-0000-0000-000000000002',
        commercialAreaId: '20000000-0000-0000-0000-000000000004', // Sud
        address: 'Via Sparano, 152',
        city: 'Bari',
        province: 'BA',
        cap: '70121',
        region: 'Puglia',
        status: 'Attivo',
        geo: { lat: 41.1171, lng: 16.8719 }
      },
      {
        id: '50000000-0000-0000-0000-000000000016',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000005',
        code: 'PA001',
        name: 'Palermo Politeama',
        channelId: '10000000-0000-0000-0000-000000000001',
        commercialAreaId: '20000000-0000-0000-0000-000000000005', // Isole
        address: 'Via Ruggero Settimo, 74',
        city: 'Palermo',
        province: 'PA',
        cap: '90139',
        region: 'Sicilia',
        status: 'Attivo',
        geo: { lat: 38.1241, lng: 13.3571 }
      },
      {
        id: '50000000-0000-0000-0000-000000000017',
        tenantId: DEMO_TENANT_ID,
        legalEntityId: '40000000-0000-0000-0000-000000000005',
        code: 'CA001',
        name: 'Cagliari Via Roma',
        channelId: '10000000-0000-0000-0000-000000000003',
        commercialAreaId: '20000000-0000-0000-0000-000000000005',
        address: 'Via Roma, 85',
        city: 'Cagliari',
        province: 'CA',
        cap: '09124',
        region: 'Sardegna',
        status: 'Attivo',
        geo: { lat: 39.2146, lng: 9.1139 }
      }
    ]).onConflictDoNothing();

    // 8. Create users
    console.log('Creating users...');
    await db.insert(users).values([
      // Admin users
      {
        id: 'admin-user',
        email: 'admin@w3suite.com',
        firstName: 'Admin',
        lastName: 'User',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: true,
        lastLoginAt: new Date('2025-01-06T09:00:00')
      },
      // Area Managers
      {
        id: 'user-001',
        email: 'marco.bianchi@windtre.it',
        firstName: 'Marco',
        lastName: 'Bianchi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T08:30:00')
      },
      {
        id: 'user-002',
        email: 'laura.verdi@windtre.it',
        firstName: 'Laura',
        lastName: 'Verdi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T10:15:00')
      },
      // Store Managers
      {
        id: 'user-003',
        email: 'giuseppe.rossi@windtre.it',
        firstName: 'Giuseppe',
        lastName: 'Rossi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T07:45:00')
      },
      {
        id: 'user-004',
        email: 'anna.ferrari@windtre.it',
        firstName: 'Anna',
        lastName: 'Ferrari',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-05T18:20:00')
      },
      {
        id: 'user-005',
        email: 'roberto.esposito@windtre.it',
        firstName: 'Roberto',
        lastName: 'Esposito',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T11:00:00')
      },
      // Sales Agents
      {
        id: 'user-006',
        email: 'francesca.marino@windtre.it',
        firstName: 'Francesca',
        lastName: 'Marino',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T09:30:00')
      },
      {
        id: 'user-007',
        email: 'alessandro.greco@windtre.it',
        firstName: 'Alessandro',
        lastName: 'Greco',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T08:00:00')
      },
      {
        id: 'user-008',
        email: 'chiara.bruno@windtre.it',
        firstName: 'Chiara',
        lastName: 'Bruno',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T10:45:00')
      },
      {
        id: 'user-009',
        email: 'matteo.costa@windtre.it',
        firstName: 'Matteo',
        lastName: 'Costa',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-05T16:30:00')
      },
      {
        id: 'user-010',
        email: 'giulia.ricci@windtre.it',
        firstName: 'Giulia',
        lastName: 'Ricci',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T09:15:00')
      },
      // Cashiers
      {
        id: 'user-011',
        email: 'paolo.gallo@windtre.it',
        firstName: 'Paolo',
        lastName: 'Gallo',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T07:30:00')
      },
      {
        id: 'user-012',
        email: 'silvia.conti@windtre.it',
        firstName: 'Silvia',
        lastName: 'Conti',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T08:15:00')
      },
      {
        id: 'user-013',
        email: 'andrea.mancini@windtre.it',
        firstName: 'Andrea',
        lastName: 'Mancini',
        tenantId: DEMO_TENANT_ID,
        status: 'Sospeso',
        isSystemAdmin: false,
        lastLoginAt: new Date('2024-12-15T14:00:00')
      },
      // HR Manager
      {
        id: 'user-014',
        email: 'monica.lombardi@windtre.it',
        firstName: 'Monica',
        lastName: 'Lombardi',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T08:45:00')
      },
      // Finance
      {
        id: 'user-015',
        email: 'lorenzo.barbieri@windtre.it',
        firstName: 'Lorenzo',
        lastName: 'Barbieri',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T09:00:00')
      },
      {
        id: 'user-016',
        email: 'sara.fontana@windtre.it',
        firstName: 'Sara',
        lastName: 'Fontana',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T10:30:00')
      },
      // Marketing
      {
        id: 'user-017',
        email: 'davide.santoro@windtre.it',
        firstName: 'Davide',
        lastName: 'Santoro',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T09:45:00')
      },
      {
        id: 'user-018',
        email: 'valentina.marini@windtre.it',
        firstName: 'Valentina',
        lastName: 'Marini',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T11:15:00')
      },
      // Warehouse
      {
        id: 'user-019',
        email: 'stefano.caruso@windtre.it',
        firstName: 'Stefano',
        lastName: 'Caruso',
        tenantId: DEMO_TENANT_ID,
        status: 'Operativo',
        isSystemAdmin: false,
        lastLoginAt: new Date('2025-01-06T06:00:00')
      },
      {
        id: 'user-020',
        email: 'elisa.ferrara@windtre.it',
        firstName: 'Elisa',
        lastName: 'Ferrara',
        tenantId: DEMO_TENANT_ID,
        status: 'Archiviato',
        isSystemAdmin: false,
        lastLoginAt: new Date('2024-10-20T12:00:00')
      }
    ]).onConflictDoNothing();

    console.log('✅ Complete database seeded successfully with real demo data!');
    console.log('📊 Summary:');
    console.log('   - 1 Tenant');
    console.log('   - 5 Commercial Areas');
    console.log('   - 5 Sales Channels');
    console.log('   - 3 Brands');
    console.log('   - 9 Roles');
    console.log('   - 6 Legal Entities');
    console.log('   - 17 Stores');
    console.log('   - 20 Users');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed
seedCompleteDatabase()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });