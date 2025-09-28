// ============================================================================
// W3 SUITE - MULTITENANT SEED DATA
// Popolamento dati di esempio per tutti i tenant
// ============================================================================

import { db, withTenantContext } from '../../core/db';
import { 
  tenants, 
  legalEntities, 
  stores, 
  users,
  italianCities,
  legalForms
} from '../schema';

// Definizione tenant e dati seed
const TENANTS_DATA = {
  settings: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Settings Environment',
    code: 'SETTINGS',
    description: 'Ambiente di configurazione e sviluppo'
  },
  staging: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Staging Environment',
    code: 'STAGING',
    description: 'Ambiente di sviluppo e testing'
  },
  demo: {
    id: '99999999-9999-9999-9999-999999999999', 
    name: 'Demo Organization',
    code: 'DEMO',
    description: 'Organizzazione dimostrativa per showcase'
  },
  acme: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'ACME Corporation',
    code: 'ACME',
    description: 'ACME Corporation - Soluzioni Enterprise'
  },
  tech: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Tech Solutions Ltd',
    code: 'TECH', 
    description: 'Tech Solutions - Innovation Partner'
  }
};

// Dati sample per legal entities
const LEGAL_ENTITIES_SAMPLES = [
  {
    codice: 'LE001',
    nome: 'TechSoft Solutions SRL',
    formaGiuridica: 'SRL',
    indirizzo: 'Via Roma 123',
    cap: '20121', 
    citta: 'Milano',
    provincia: 'MI',
    pIva: 'IT12345670901',
    codiceFiscale: '12345670901',
    telefono: '+39 02 1234567',
    email: 'info@techsoft.it',
    stato: 'Attiva'
  },
  {
    codice: 'LE002',
    nome: 'Digital Marketing Plus SRL', 
    formaGiuridica: 'SRL',
    indirizzo: 'Corso Francia 45',
    cap: '10138',
    citta: 'Torino',
    provincia: 'TO',
    pIva: 'IT98765432109',
    codiceFiscale: '98765432109',
    telefono: '+39 011 9876543',
    email: 'contact@digitalplus.it',
    stato: 'Attiva'
  }
];

// Dati sample per stores
const STORES_SAMPLES = [
  {
    code: 'ST001',
    nome: 'Store Milano Centro',
    legalEntityId: '', // Sarà popolato dinamicamente
    address: 'Via Torino 15',
    cap: '20123',
    citta: 'Milano',
    provincia: 'MI',
    channelId: 'e3b0c442-98fc-1c14-9afb-4266c03f0000', // Default channel ID
    commercialAreaId: 'e3b0c442-98fc-1c14-9afb-4266c03f0001', // Default area ID
    status: 'active'
  },
  {
    code: 'ST002',
    nome: 'Store Torino Nord',
    legalEntityId: '', // Sarà popolato dinamicamente
    address: 'Via Po 67',
    cap: '10124', 
    citta: 'Torino',
    provincia: 'TO',
    channelId: 'e3b0c442-98fc-1c14-9afb-4266c03f0000', // Default channel ID
    commercialAreaId: 'e3b0c442-98fc-1c14-9afb-4266c03f0001', // Default area ID
    status: 'active'
  }
];

// Dati sample per users
const USERS_SAMPLES = [
  {
    id: 'mario.rossi',
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@w3suite.com',
    role: 'store_manager',
    status: 'attivo'
  },
  {
    id: 'laura.bianchi',
    firstName: 'Laura', 
    lastName: 'Bianchi',
    email: 'laura.bianchi@w3suite.com',
    role: 'sales',
    status: 'attivo'
  },
  {
    id: 'giuseppe.verdi',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    email: 'giuseppe.verdi@w3suite.com', 
    role: 'technical_support',
    status: 'attivo'
  }
];

/**
 * Popola i dati per un singolo tenant
 */
async function seedTenantData(tenantKey: string, tenantData: typeof TENANTS_DATA.staging) {
  console.log(`🌱 Seeding data for tenant: ${tenantData.name}`);

  await withTenantContext(tenantData.id, async () => {
    try {
      // 1. Inserisci tenant (se non esiste)
      const existingTenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.id, tenantData.id)
      });

      if (!existingTenant) {
        await db.insert(tenants).values({
          id: tenantData.id,
          name: tenantData.name,
          code: tenantData.code,
          description: tenantData.description,
          status: 'active'
        });
        console.log(`  ✅ Tenant ${tenantData.name} created`);
      }

      // 2. Inserisci legal entities
      const entities_inserted = [];
      for (const le of LEGAL_ENTITIES_SAMPLES) {
        const [entity] = await db.insert(legalEntities).values({
          ...le,
          tenantId: tenantData.id
        }).returning();
        entities_inserted.push(entity);
        console.log(`  ✅ Legal Entity ${entity.name} created`);
      }

      // 3. Inserisci stores
      const stores_inserted = [];
      for (let i = 0; i < STORES_SAMPLES.length; i++) {
        const st = STORES_SAMPLES[i];
        const entity = entities_inserted[i % entities_inserted.length];
        
        const [store] = await db.insert(stores).values({
          ...st,
          tenantId: tenantData.id,
          legalEntityId: entity.id
        }).returning();
        stores_inserted.push(store);
        console.log(`  ✅ Store ${store.name} created`);
      }

      // 4. Inserisci users
      for (let i = 0; i < USERS_SAMPLES.length; i++) {
        const user = USERS_SAMPLES[i];
        
        await db.insert(users).values({
          ...user,
          tenantId: tenantData.id
        });
        console.log(`  ✅ User ${user.firstName} ${user.lastName} created`);
      }

      console.log(`✅ Tenant ${tenantData.name} seeding completed!\n`);
      
    } catch (error) {
      console.error(`❌ Error seeding tenant ${tenantData.name}:`, error);
      throw error;
    }
  });
}

/**
 * Popola dati di base (reference tables)
 */
async function seedReferenceData() {
  console.log('🌱 Seeding reference data...');
  
  try {
    // Verifica se le tabelle di riferimento sono già popolate
    const citiesCount = await db.$count(italianCities);
    const legalFormsCount = await db.$count(legalForms);
    
    if (citiesCount === 0 || legalFormsCount === 0) {
      console.log('⚠️  Reference data tables are empty. Please run city and legal forms seed first.');
      return;
    }
    
    console.log(`✅ Reference data OK (${citiesCount} cities, ${legalFormsCount} legal forms)`);
    
  } catch (error) {
    console.error('❌ Error checking reference data:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
export async function runMultitenantSeed() {
  console.log('🚀 Starting W3 Suite Multitenant Seed...\n');
  
  try {
    // 1. Popola dati di riferimento
    await seedReferenceData();
    
    // 2. Popola ogni tenant
    for (const [key, data] of Object.entries(TENANTS_DATA)) {
      await seedTenantData(key, data);
    }
    
    console.log('🎉 Multitenant seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Tenants: ${Object.keys(TENANTS_DATA).length}`);
    console.log(`   Ragioni Sociali per tenant: ${RAGIONI_SOCIALI_SAMPLES.length}`);
    console.log(`   Punti Vendita per tenant: ${PUNTI_VENDITA_SAMPLES.length}`);
    console.log(`   Risorse per tenant: ${RISORSE_SAMPLES.length}`);
    
  } catch (error) {
    console.error('❌ Multitenant seed failed:', error);
    process.exit(1);
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMultitenantSeed().then(() => {
    console.log('✨ Done!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}