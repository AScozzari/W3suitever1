import { db } from "../core/db";
import { 
  crmPipelines,
  crmPipelineStages,
  crmDeals,
  crmLeads,
  crmPersonIdentities,
  stores,
  users
} from "./schema/w3suite";
import { sql } from "drizzle-orm";

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = 'admin-user';

// IDs fissi per le pipeline
const PIPELINE_MOBILE_5G_ID = '30000000-0000-0000-0000-000000000001';
const PIPELINE_ENTERPRISE_ID = '30000000-0000-0000-0000-000000000002';
const PIPELINE_WHOLESALE_ID = '30000000-0000-0000-0000-000000000003';

export async function seedCrmPipelines() {
  console.log('🎯 Seeding CRM Pipelines & Deals...');

  try {
    // Ottieni store demo esistente
    const [demoStore] = await db.select().from(stores).where(sql`tenant_id = ${DEMO_TENANT_ID}`).limit(1);
    if (!demoStore) {
      console.log('⚠️  No demo store found, skipping CRM seed');
      return;
    }

    // Ottieni users per assegnazioni
    const demoUsers = await db.select().from(users).where(sql`tenant_id = ${DEMO_TENANT_ID}`).limit(5);
    const userIds = demoUsers.map(u => u.id);
    
    // Fallback to admin if no users found
    if (userIds.length === 0) {
      userIds.push(ADMIN_USER_ID);
    }

    // ===================== PIPELINE 1: MOBILE 5G ENTERPRISE =====================
    console.log('Creating Pipeline 1: Mobile 5G Enterprise...');
    
    await db.insert(crmPipelines).values({
      id: PIPELINE_MOBILE_5G_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Vendite Mobile 5G Enterprise',
      domain: 'sales',
      isActive: true,
      stagesConfig: []
    }).onConflictDoNothing();

    const pipeline1Stages = [
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Primo Contatto', category: 'starter' as const, orderIndex: 1, color: '#10b981', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Analisi Esigenze', category: 'progress' as const, orderIndex: 2, color: '#3b82f6', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Demo Tecnica', category: 'progress' as const, orderIndex: 3, color: '#3b82f6', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Attesa Approvazione', category: 'pending' as const, orderIndex: 4, color: '#f59e0b', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Negoziazione Contratto', category: 'purchase' as const, orderIndex: 5, color: '#FF6900', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Firmato', category: 'finalized' as const, orderIndex: 6, color: '#22c55e', isActive: true },
      { pipelineId: PIPELINE_MOBILE_5G_ID, name: 'Perso', category: 'ko' as const, orderIndex: 7, color: '#ef4444', isActive: true }
    ];
    await db.insert(crmPipelineStages).values(pipeline1Stages).onConflictDoNothing();

    // ===================== PIPELINE 2: ENTERPRISE MULTI-SERVICE =====================
    console.log('Creating Pipeline 2: Enterprise Multi-Service...');
    
    await db.insert(crmPipelines).values({
      id: PIPELINE_ENTERPRISE_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Soluzioni Enterprise (Connectivity + Energy)',
      domain: 'sales',
      isActive: true,
      stagesConfig: []
    }).onConflictDoNothing();

    const pipeline2Stages = [
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Lead Qualificato', category: 'starter' as const, orderIndex: 1, color: '#10b981', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Analisi Multi-Service', category: 'progress' as const, orderIndex: 2, color: '#3b82f6', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Proposta Bundle', category: 'progress' as const, orderIndex: 3, color: '#3b82f6', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Validazione Stakeholder', category: 'pending' as const, orderIndex: 4, color: '#f59e0b', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Contratto Finale', category: 'purchase' as const, orderIndex: 5, color: '#FF6900', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Chiuso Vinto', category: 'finalized' as const, orderIndex: 6, color: '#22c55e', isActive: true },
      { pipelineId: PIPELINE_ENTERPRISE_ID, name: 'Chiuso Perso', category: 'ko' as const, orderIndex: 7, color: '#ef4444', isActive: true }
    ];
    await db.insert(crmPipelineStages).values(pipeline2Stages).onConflictDoNothing();

    // ===================== PIPELINE 3: WHOLESALE & PARTNER =====================
    console.log('Creating Pipeline 3: Wholesale & Partner...');
    
    await db.insert(crmPipelines).values({
      id: PIPELINE_WHOLESALE_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Wholesale & Partner (B2B2C)',
      domain: 'sales',
      isActive: true,
      stagesConfig: []
    }).onConflictDoNothing();

    const pipeline3Stages = [
      { pipelineId: PIPELINE_WHOLESALE_ID, name: 'Partner Prospect', category: 'starter' as const, orderIndex: 1, color: '#10b981', isActive: true },
      { pipelineId: PIPELINE_WHOLESALE_ID, name: 'Due Diligence', category: 'progress' as const, orderIndex: 2, color: '#3b82f6', isActive: true },
      { pipelineId: PIPELINE_WHOLESALE_ID, name: 'Framework Agreement', category: 'purchase' as const, orderIndex: 3, color: '#FF6900', isActive: true },
      { pipelineId: PIPELINE_WHOLESALE_ID, name: 'Attivo', category: 'finalized' as const, orderIndex: 4, color: '#22c55e', isActive: true },
      { pipelineId: PIPELINE_WHOLESALE_ID, name: 'Rifiutato', category: 'ko' as const, orderIndex: 5, color: '#ef4444', isActive: true }
    ];
    await db.insert(crmPipelineStages).values(pipeline3Stages).onConflictDoNothing();

    // ===================== CREARE LEAD DEMO =====================
    console.log('Creating demo leads...');

    const demoLeadsData = [
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[0] || ADMIN_USER_ID, firstName: 'Marco', lastName: 'Bianchi', email: 'marco.bianchi@acmecorp.it', phone: '+39 335 1234567', companyName: 'Acme Corp', status: 'qualified' as const, sourceChannel: 'Web Inbound' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[1] || ADMIN_USER_ID, firstName: 'Laura', lastName: 'Rossi', email: 'laura.rossi@techsolutions.it', phone: '+39 347 2345678', companyName: 'TechSolutions SpA', status: 'qualified' as const, sourceChannel: 'Partner Referral' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[2] || ADMIN_USER_ID, firstName: 'Giuseppe', lastName: 'Verdi', email: 'g.verdi@megacorp.com', phone: '+39 339 3456789', companyName: 'MegaCorp International', status: 'qualified' as const, sourceChannel: 'Event - MWC' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[3] || ADMIN_USER_ID, firstName: 'Anna', lastName: 'Neri', email: 'anna.neri@smallbiz.it', phone: '+39 328 4567890', companyName: 'SmallBiz Srl', status: 'qualified' as const, sourceChannel: 'Cold Call' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[0] || ADMIN_USER_ID, firstName: 'Francesco', lastName: 'Conti', email: 'f.conti@industrie.it', phone: '+39 340 5678901', companyName: 'Industrie Italiane', status: 'qualified' as const, sourceChannel: 'LinkedIn' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[1] || ADMIN_USER_ID, firstName: 'Silvia', lastName: 'Marini', email: 's.marini@logistica.com', phone: '+39 333 6789012', companyName: 'Logistica Express', status: 'qualified' as const, sourceChannel: 'Email Campaign' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[2] || ADMIN_USER_ID, firstName: 'Roberto', lastName: 'Ferrari', email: 'r.ferrari@automotive.it', phone: '+39 348 7890123', companyName: 'Ferrari Automotive', status: 'qualified' as const, sourceChannel: 'Web Inbound' },
      { tenantId: DEMO_TENANT_ID, personId: sql`gen_random_uuid()`, storeId: demoStore.id, ownerUserId: userIds[3] || ADMIN_USER_ID, firstName: 'Chiara', lastName: 'Colombo', email: 'chiara@retailchain.it', phone: '+39 338 8901234', companyName: 'Retail Chain Italia', status: 'qualified' as const, sourceChannel: 'Partner Referral' }
    ];

    const leads = await db.insert(crmLeads).values(demoLeadsData).onConflictDoNothing().returning();

    // ===================== CREARE DEAL DEMO REALISTICI =====================
    console.log('Creating demo deals...');

    const getRandomUserId = () => userIds[Math.floor(Math.random() * userIds.length)] || ADMIN_USER_ID;
    const getRandomDaysAgo = (max: number) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * max));
      return date;
    };
    const getFutureDate = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    const demoDeals = [
      // PIPELINE 1: Mobile 5G Enterprise (10 deal)
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Primo Contatto',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[0]?.id,
        personId: leads[0]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 85000,
        probability: 20,
        sourceChannel: 'Web Inbound',
        agingDays: 5,
        createdAt: getRandomDaysAgo(5),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Analisi Esigenze',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[1]?.id,
        personId: leads[1]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 125000,
        probability: 35,
        sourceChannel: 'Partner Referral',
        agingDays: 12,
        createdAt: getRandomDaysAgo(12),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Demo Tecnica',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[2]?.id,
        personId: leads[2]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 450000,
        probability: 55,
        sourceChannel: 'Event - MWC',
        agingDays: 18,
        createdAt: getRandomDaysAgo(18),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Attesa Approvazione',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[3]?.id,
        personId: leads[3]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 15000,
        probability: 40,
        sourceChannel: 'Cold Call',
        agingDays: 45, // AGING ALERT!
        createdAt: getRandomDaysAgo(45),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Negoziazione Contratto',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[4]?.id,
        personId: leads[4]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 320000,
        probability: 85,
        sourceChannel: 'Partner Referral',
        agingDays: 12,
        createdAt: getRandomDaysAgo(12),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Primo Contatto',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        leadId: leads[5]?.id,
        personId: leads[5]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 55000,
        probability: 15,
        sourceChannel: 'LinkedIn',
        agingDays: 3,
        createdAt: getRandomDaysAgo(3),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Analisi Esigenze',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[6]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 95000,
        probability: 40,
        sourceChannel: 'Email Campaign',
        agingDays: 22,
        createdAt: getRandomDaysAgo(22),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Perso',
        status: 'lost' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[7]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 75000,
        probability: 0,
        sourceChannel: 'Cold Call',
        agingDays: 60,
        lostAt: getRandomDaysAgo(5),
        createdAt: getRandomDaysAgo(60),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Firmato',
        status: 'won' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[0]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 280000,
        probability: 100,
        sourceChannel: 'Partner Referral',
        agingDays: 45,
        wonAt: getRandomDaysAgo(2),
        createdAt: getRandomDaysAgo(45),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_MOBILE_5G_ID,
        stage: 'Demo Tecnica',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[1]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 165000,
        probability: 50,
        sourceChannel: 'Web Inbound',
        agingDays: 14,
        createdAt: getRandomDaysAgo(14),
        updatedAt: new Date()
      },

      // PIPELINE 2: Enterprise Multi-Service (8 deal)
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Lead Qualificato',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[2]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 195000,
        probability: 25,
        sourceChannel: 'Event - MWC',
        agingDays: 8,
        createdAt: getRandomDaysAgo(8),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Analisi Multi-Service',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[3]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 420000,
        probability: 45,
        sourceChannel: 'Partner Referral',
        agingDays: 20,
        createdAt: getRandomDaysAgo(20),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Proposta Bundle',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[4]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 580000,
        probability: 60,
        sourceChannel: 'Web Inbound',
        agingDays: 15,
        createdAt: getRandomDaysAgo(15),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Validazione Stakeholder',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[5]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 325000,
        probability: 55,
        sourceChannel: 'Cold Call',
        agingDays: 38, // WARNING
        createdAt: getRandomDaysAgo(38),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Contratto Finale',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[6]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 750000,
        probability: 90,
        sourceChannel: 'Partner Referral',
        agingDays: 10,
        createdAt: getRandomDaysAgo(10),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Chiuso Vinto',
        status: 'won' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[7]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 890000,
        probability: 100,
        sourceChannel: 'Event - MWC',
        agingDays: 52,
        wonAt: getRandomDaysAgo(3),
        createdAt: getRandomDaysAgo(52),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Chiuso Perso',
        status: 'lost' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[0]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 210000,
        probability: 0,
        sourceChannel: 'LinkedIn',
        agingDays: 35,
        lostAt: getRandomDaysAgo(7),
        createdAt: getRandomDaysAgo(35),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_ENTERPRISE_ID,
        stage: 'Lead Qualificato',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[1]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 145000,
        probability: 20,
        sourceChannel: 'Email Campaign',
        agingDays: 6,
        createdAt: getRandomDaysAgo(6),
        updatedAt: new Date()
      },

      // PIPELINE 3: Wholesale & Partner (7 deal)
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Partner Prospect',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[2]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 1200000,
        probability: 30,
        sourceChannel: 'Partner Referral',
        agingDays: 15,
        createdAt: getRandomDaysAgo(15),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Due Diligence',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[3]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 2500000,
        probability: 50,
        sourceChannel: 'Event - MWC',
        agingDays: 28,
        createdAt: getRandomDaysAgo(28),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Framework Agreement',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[4]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 3800000,
        probability: 75,
        sourceChannel: 'Partner Referral',
        agingDays: 22,
        createdAt: getRandomDaysAgo(22),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Attivo',
        status: 'won' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[5]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 5200000,
        probability: 100,
        sourceChannel: 'Partner Referral',
        agingDays: 90,
        wonAt: getRandomDaysAgo(10),
        createdAt: getRandomDaysAgo(90),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Rifiutato',
        status: 'lost' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[6]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 1500000,
        probability: 0,
        sourceChannel: 'Cold Call',
        agingDays: 45,
        lostAt: getRandomDaysAgo(15),
        createdAt: getRandomDaysAgo(45),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Partner Prospect',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[7]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 980000,
        probability: 25,
        sourceChannel: 'LinkedIn',
        agingDays: 10,
        createdAt: getRandomDaysAgo(10),
        updatedAt: new Date()
      },
      {
        tenantId: DEMO_TENANT_ID,
        pipelineId: PIPELINE_WHOLESALE_ID,
        stage: 'Due Diligence',
        status: 'open' as const,
        storeId: demoStore.id,
        ownerUserId: getRandomUserId(),
        personId: leads[0]?.personId || sql`gen_random_uuid()`,
        estimatedValue: 1750000,
        probability: 45,
        sourceChannel: 'Event - MWC',
        agingDays: 32,
        createdAt: getRandomDaysAgo(32),
        updatedAt: new Date()
      }
    ];

    await db.insert(crmDeals).values(demoDeals).onConflictDoNothing();

    console.log('✅ CRM Pipelines & Deals seeded successfully!');
    console.log(`   - 3 Pipelines created`);
    console.log(`   - 20 Stages created`);
    console.log(`   - ${demoDeals.length} Deals created`);

  } catch (error) {
    console.error('❌ Error seeding CRM pipelines:', error);
    throw error;
  }
}

// Run if executed directly
seedCrmPipelines()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
