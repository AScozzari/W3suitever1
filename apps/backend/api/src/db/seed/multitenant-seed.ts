// ============================================================================
// W3 SUITE - MULTITENANT SEED DATA
// Popolamento dati di esempio per tutti i tenant
// ============================================================================

import { db, withTenantContext } from '../../core/db';
import { 
  tenants, 
  ragioni_sociali, 
  punti_vendita, 
  risorse,
  italian_cities,
  legal_forms
} from '../schema';

// Definizione tenant e dati seed
const TENANTS_DATA = {
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

// Dati sample per ragioni sociali
const RAGIONI_SOCIALI_SAMPLES = [
  {
    codice: '800001',
    nome: 'TechSoft Solutions SRL',
    forma_giuridica_id: '1',
    citta_id: '3173', // Milano
    indirizzo: 'Via Roma 123',
    cap: '20121',
    partita_iva: 'IT12345670901',
    codice_fiscale: '12345670901',
    telefono: '+39 02 1234567',
    email: 'info@techsoft.it',
    attiva: true
  },
  {
    codice: '800002', 
    nome: 'Digital Marketing Plus SRL',
    forma_giuridica_id: '1',
    citta_id: '5419', // Torino
    indirizzo: 'Corso Francia 45',
    cap: '10138',
    partita_iva: 'IT98765432109',
    codice_fiscale: '98765432109',
    telefono: '+39 011 9876543',
    email: 'contact@digitalplus.it',
    attiva: true
  }
];

// Dati sample per punti vendita  
const PUNTI_VENDITA_SAMPLES = [
  {
    codice: '90001001',
    nome: 'Store Milano Centro',
    ragione_sociale_id: '', // Sarà popolato dinamicamente
    indirizzo: 'Via Torino 15',
    citta_id: '3173', // Milano
    cap: '20123',
    telefono: '+39 02 5551234',
    email: 'milano.centro@store.it',
    manager: 'Marco Rossi',
    tipo_canale: 'franchising',
    brand_association: ['windtre'],
    attivo: true
  },
  {
    codice: '90001002',
    nome: 'Store Torino Nord', 
    ragione_sociale_id: '',
    indirizzo: 'Via Po 67',
    citta_id: '5419', // Torino
    cap: '10124',
    telefono: '+39 011 5559876',
    email: 'torino.nord@store.it',
    manager: 'Laura Bianchi',
    tipo_canale: 'dealer',
    brand_association: ['windtre', 'verymobile'],
    attivo: true
  }
];

// Dati sample per risorse
const RISORSE_SAMPLES = [
  {
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario.rossi@w3suite.com',
    telefono: '+39 333 1234567',
    ruolo: 'Store Manager',
    punto_vendita_id: '', // Sarà popolato dinamicamente
    data_assunzione: new Date('2023-01-15'),
    attivo: true
  },
  {
    nome: 'Laura', 
    cognome: 'Bianchi',
    email: 'laura.bianchi@w3suite.com',
    telefono: '+39 333 9876543',
    ruolo: 'Sales Representative',
    punto_vendita_id: '',
    data_assunzione: new Date('2023-03-20'),
    attivo: true
  },
  {
    nome: 'Giuseppe',
    cognome: 'Verdi',
    email: 'giuseppe.verdi@w3suite.com', 
    telefono: '+39 333 5556789',
    ruolo: 'Technical Support',
    punto_vendita_id: '',
    data_assunzione: new Date('2023-05-10'),
    attivo: true
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

      // 2. Inserisci ragioni sociali
      const ragioni_inserted = [];
      for (const rs of RAGIONI_SOCIALI_SAMPLES) {
        const [ragione] = await db.insert(ragioni_sociali).values({
          ...rs,
          tenant_id: tenantData.id
        }).returning();
        ragioni_inserted.push(ragione);
        console.log(`  ✅ Ragione Sociale ${ragione.nome} created`);
      }

      // 3. Inserisci punti vendita
      const punti_inserted = [];
      for (let i = 0; i < PUNTI_VENDITA_SAMPLES.length; i++) {
        const pv = PUNTI_VENDITA_SAMPLES[i];
        const ragione = ragioni_inserted[i % ragioni_inserted.length];
        
        const [punto] = await db.insert(punti_vendita).values({
          ...pv,
          tenant_id: tenantData.id,
          ragione_sociale_id: ragione.id
        }).returning();
        punti_inserted.push(punto);
        console.log(`  ✅ Punto Vendita ${punto.nome} created`);
      }

      // 4. Inserisci risorse
      for (let i = 0; i < RISORSE_SAMPLES.length; i++) {
        const risorsa = RISORSE_SAMPLES[i];
        const punto = punti_inserted[i % punti_inserted.length];
        
        await db.insert(risorse).values({
          ...risorsa,
          tenant_id: tenantData.id,
          punto_vendita_id: punto.id
        });
        console.log(`  ✅ Risorsa ${risorsa.nome} ${risorsa.cognome} created`);
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
    const citiesCount = await db.$count(italian_cities);
    const legalFormsCount = await db.$count(legal_forms);
    
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
if (require.main === module) {
  runMultitenantSeed().then(() => {
    console.log('✨ Done!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}