import { db } from "../core/db";
import { crmCampaigns, crmLeads } from "./schema/w3suite";
import { sql } from "drizzle-orm";

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_STORE_ID = '50000000-0000-0000-0000-000000000001'; // Milano Duomo

// IDs statici per consistency
const CAMPAIGN_BLACK_FRIDAY = '90000000-0000-0000-0000-000000000001';
const CAMPAIGN_FIBRA_BUSINESS = '90000000-0000-0000-0000-000000000002';
const CAMPAIGN_POWERFUL_API = '90000000-0000-0000-0000-000000000003';
const CAMPAIGN_STORE_WALKIN = '90000000-0000-0000-0000-000000000004';

const UTM_SOURCE_GOOGLE = '70000000-0000-0000-0000-000000000001';
const UTM_SOURCE_FACEBOOK = '70000000-0000-0000-0000-000000000002';
const UTM_SOURCE_NEWSLETTER = '70000000-0000-0000-0000-000000000003';
const UTM_SOURCE_LINKEDIN = '70000000-0000-0000-0000-000000000004';

const UTM_MEDIUM_CPC = '80000000-0000-0000-0000-000000000001';
const UTM_MEDIUM_PAID_SOCIAL = '80000000-0000-0000-0000-000000000002';
const UTM_MEDIUM_EMAIL = '80000000-0000-0000-0000-000000000003';

const DRIVER_FISSO = '60000000-0000-0000-0000-000000000001';
const DRIVER_MOBILE = '60000000-0000-0000-0000-000000000002';
const DRIVER_DEVICE = '60000000-0000-0000-0000-000000000003';

export async function seedCRMDemo() {
  console.log('🎯 Seeding CRM Demo Data...');

  try {
    // 1. Create 4 demo campaigns
    await db.insert(crmCampaigns).values([
      {
        id: CAMPAIGN_BLACK_FRIDAY,
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        name: 'Black Friday 2024 - Promo Speciale',
        description: 'Campagna Black Friday con offerte esclusive su Fibra + Mobile. Target: nuovi clienti consumer con bundle famiglia.',
        type: 'acquisition',
        status: 'active',
        objective: 500,
        targetDriverIds: [DRIVER_FISSO, DRIVER_MOBILE],
        routingMode: 'automatic',
        defaultLeadSource: 'landing_page',
        landingPageUrl: 'https://windtre.it/promo/black-friday-2024',
        marketingChannelIds: ['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'], // Google Ads, Facebook Ads
        utmSourceId: UTM_SOURCE_GOOGLE,
        utmMediumId: UTM_MEDIUM_CPC,
        utmCampaign: 'black_friday_2024',
        budget: 25000,
        startDate: new Date('2024-11-15'),
        endDate: new Date('2024-11-30'),
        requiredConsents: {
          privacy_policy: true,
          marketing: true,
          profiling: false,
          third_party: false
        }
      },
      {
        id: CAMPAIGN_FIBRA_BUSINESS,
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        name: 'Fibra Business Q1 2025',
        description: 'Campagna acquisizione clienti business per servizi Fibra dedicata. Target: PMI e liberi professionisti con esigenze connectivity.',
        type: 'acquisition',
        status: 'active',
        objective: 200,
        targetDriverIds: [DRIVER_FISSO],
        routingMode: 'manual',
        defaultLeadSource: 'web_form',
        landingPageUrl: 'https://windtre.it/business/fibra-dedicated',
        marketingChannelIds: ['30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004'], // Email Marketing, LinkedIn Ads
        utmSourceId: UTM_SOURCE_NEWSLETTER,
        utmMediumId: UTM_MEDIUM_EMAIL,
        utmCampaign: 'fibra_business_q1',
        budget: 15000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        requiredConsents: {
          privacy_policy: true,
          marketing: true,
          profiling: true,
          third_party: false
        }
      },
      {
        id: CAMPAIGN_POWERFUL_API,
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        name: 'Powerful API Integration Test',
        description: 'Campagna di test per integrazione Powerful API - lead automatici da comparatori esterni.',
        type: 'retention',
        status: 'active',
        objective: 1000,
        targetDriverIds: [DRIVER_FISSO, DRIVER_MOBILE, DRIVER_DEVICE],
        routingMode: 'automatic',
        defaultLeadSource: 'powerful_api',
        externalCampaignId: 'PWR-API-2024-001',
        budget: 5000,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2025-12-31'),
        requiredConsents: {
          privacy_policy: true,
          marketing: false,
          profiling: false,
          third_party: true
        }
      },
      {
        id: CAMPAIGN_STORE_WALKIN,
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        name: 'Store Walk-in Program Milano',
        description: 'Programma di acquisizione per clienti che entrano fisicamente in negozio. Focus su upgrade device e cross-selling accessori.',
        type: 'upsell',
        status: 'active',
        objective: 300,
        targetDriverIds: [DRIVER_MOBILE, DRIVER_DEVICE],
        routingMode: 'manual',
        defaultLeadSource: 'manual',
        budget: 8000,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        requiredConsents: {
          privacy_policy: true,
          marketing: true,
          profiling: true,
          third_party: false
        }
      }
    ]).onConflictDoNothing();

    console.log('✅ 4 campagne demo create');

    // 2. Create 100 demo leads distributed across campaigns
    const leadNames = [
      { firstName: 'Marco', lastName: 'Rossi', company: 'Rossi SRL', email: 'marco.rossi@rossisrl.it', phone: '+39 335 1234567' },
      { firstName: 'Laura', lastName: 'Bianchi', company: 'Bianchi Consulting', email: 'l.bianchi@bianchiconsulting.it', phone: '+39 340 2345678' },
      { firstName: 'Giuseppe', lastName: 'Verdi', company: null, email: 'giuseppe.verdi@gmail.com', phone: '+39 347 3456789' },
      { firstName: 'Anna', lastName: 'Ferrari', company: 'Ferrari Tech', email: 'anna@ferraritech.it', phone: '+39 348 4567890' },
      { firstName: 'Luca', lastName: 'Romano', company: null, email: 'luca.romano@hotmail.it', phone: '+39 333 5678901' },
      { firstName: 'Chiara', lastName: 'Colombo', company: 'Colombo Design Studio', email: 'chiara@colombodesign.it', phone: '+39 338 6789012' },
      { firstName: 'Matteo', lastName: 'Ricci', company: null, email: 'matteo.ricci@outlook.com', phone: '+39 345 7890123' },
      { firstName: 'Giulia', lastName: 'Marino', company: 'Marino Associati', email: 'giulia.marino@marinoassociati.it', phone: '+39 349 8901234' },
      { firstName: 'Alessandro', lastName: 'Greco', company: null, email: 'a.greco@libero.it', phone: '+39 334 9012345' },
      { firstName: 'Francesca', lastName: 'Bruno', company: 'Bruno Services', email: 'f.bruno@brunoservices.com', phone: '+39 339 0123456' },
      { firstName: 'Davide', lastName: 'Gallo', company: null, email: 'davide.gallo@gmail.com', phone: '+39 346 1234567' },
      { firstName: 'Elena', lastName: 'Conti', company: 'Conti Legal', email: 'elena@contilegal.it', phone: '+39 347 2345678' },
      { firstName: 'Simone', lastName: 'De Luca', company: null, email: 'simone.deluca@yahoo.it', phone: '+39 333 3456789' },
      { firstName: 'Sara', lastName: 'Mancini', company: 'Mancini & Partners', email: 's.mancini@mancinipartners.it', phone: '+39 340 4567890' },
      { firstName: 'Andrea', lastName: 'Vitale', company: null, email: 'andrea.vitale@gmail.com', phone: '+39 348 5678901' },
      { firstName: 'Martina', lastName: 'Lombardi', company: 'Lombardi Import Export', email: 'martina@lombardiimport.it', phone: '+39 335 6789012' },
      { firstName: 'Federico', lastName: 'Moretti', company: null, email: 'federico.moretti@outlook.it', phone: '+39 338 7890123' },
      { firstName: 'Valentina', lastName: 'Barbieri', company: 'Barbieri Communications', email: 'v.barbieri@barbiericomm.it', phone: '+39 349 8901234' },
      { firstName: 'Lorenzo', lastName: 'Fontana', company: null, email: 'lorenzo.fontana@libero.it', phone: '+39 334 9012345' },
      { firstName: 'Sofia', lastName: 'Santoro', company: 'Santoro Spa', email: 'sofia.santoro@santorospa.it', phone: '+39 339 0123456' },
    ];

    const statuses = ['new', 'working', 'qualified', 'converted', 'disqualified', 'on_hold'];
    const interests = [
      'Fibra 1Gbit + Mobile Unlimited',
      'Solo Fibra Business',
      'Mobile 5G Premium',
      'Device iPhone 15 Pro',
      'Bundle Famiglia 4 SIM',
      'Fibra + SmartHome',
      'Mobile Business Fleet',
      'Upgrade Device Samsung S24',
      'Accessori AirPods Pro',
      'Assicurazione Device Premium'
    ];

    const demoLeads = [];

    // Black Friday Campaign - 40 leads (15-30 Nov 2024)
    for (let i = 0; i < 40; i++) {
      const person = leadNames[i % leadNames.length];
      const randomDays = Math.floor(Math.random() * 15);
      const createdDate = new Date('2024-11-15');
      createdDate.setDate(createdDate.getDate() + randomDays);

      demoLeads.push({
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        campaignId: CAMPAIGN_BLACK_FRIDAY,
        personId: sql`gen_random_uuid()`,
        leadSource: 'landing_page' as const,
        sourceChannel: 'form' as const,
        firstName: person.firstName,
        lastName: person.lastName,
        email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.${i}@example.com`,
        phone: person.phone,
        companyName: person.company,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        leadScore: Math.floor(Math.random() * 100),
        productInterest: interests[Math.floor(Math.random() * interests.length)],
        driverId: i % 2 === 0 ? DRIVER_FISSO : DRIVER_MOBILE,
        utmSourceId: i % 3 === 0 ? UTM_SOURCE_GOOGLE : UTM_SOURCE_FACEBOOK,
        utmMediumId: i % 3 === 0 ? UTM_MEDIUM_CPC : UTM_MEDIUM_PAID_SOCIAL,
        utmCampaign: 'black_friday_2024',
        utmContent: i % 2 === 0 ? 'cta-banner-top' : 'cta-sidebar',
        landingPageUrl: 'https://windtre.it/promo/black-friday-2024',
        privacyPolicyAccepted: true,
        marketingConsent: Math.random() > 0.3,
        profilingConsent: Math.random() > 0.5,
        consentTimestamp: createdDate,
        notes: i % 5 === 0 ? 'Cliente interessato a bundle famiglia completo' : null,
        createdAt: createdDate
      });
    }

    // Fibra Business Campaign - 30 leads (Jan-Mar 2025)
    for (let i = 0; i < 30; i++) {
      const person = leadNames[(i + 5) % leadNames.length];
      const randomDays = Math.floor(Math.random() * 90);
      const createdDate = new Date('2025-01-01');
      createdDate.setDate(createdDate.getDate() + randomDays);

      demoLeads.push({
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        campaignId: CAMPAIGN_FIBRA_BUSINESS,
        personId: sql`gen_random_uuid()`,
        leadSource: 'web_form' as const,
        sourceChannel: 'form' as const,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        companyName: person.company || `${person.lastName} Professional Services`,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        leadScore: Math.floor(Math.random() * 100),
        productInterest: 'Fibra Business Dedicata 1Gbit',
        driverId: DRIVER_FISSO,
        utmSourceId: i % 2 === 0 ? UTM_SOURCE_NEWSLETTER : UTM_SOURCE_LINKEDIN,
        utmMediumId: i % 2 === 0 ? UTM_MEDIUM_EMAIL : UTM_MEDIUM_PAID_SOCIAL,
        utmCampaign: 'fibra_business_q1',
        landingPageUrl: 'https://windtre.it/business/fibra-dedicated',
        privacyPolicyAccepted: true,
        marketingConsent: true,
        profilingConsent: Math.random() > 0.3,
        consentTimestamp: createdDate,
        notes: i % 3 === 0 ? 'PMI con 5-10 dipendenti, richiesta preventivo personalizzato' : null,
        createdAt: createdDate
      });
    }

    // Powerful API Campaign - 20 leads (distributed Oct 2024 - Dec 2025)
    for (let i = 0; i < 20; i++) {
      const person = leadNames[(i + 10) % leadNames.length];
      const randomDays = Math.floor(Math.random() * 450);
      const createdDate = new Date('2024-10-01');
      createdDate.setDate(createdDate.getDate() + randomDays);

      demoLeads.push({
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        campaignId: CAMPAIGN_POWERFUL_API,
        personId: sql`gen_random_uuid()`,
        leadSource: 'powerful_api' as const,
        sourceChannel: 'web' as const,
        firstName: person.firstName,
        lastName: person.lastName,
        email: `api.lead.${i}@comparatori.it`,
        phone: person.phone,
        companyName: null,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        leadScore: Math.floor(Math.random() * 100),
        productInterest: interests[Math.floor(Math.random() * interests.length)],
        driverId: [DRIVER_FISSO, DRIVER_MOBILE, DRIVER_DEVICE][Math.floor(Math.random() * 3)],
        externalLeadId: `PWR-LEAD-2024-${String(i).padStart(4, '0')}`,
        privacyPolicyAccepted: true,
        marketingConsent: false,
        profilingConsent: false,
        consentTimestamp: createdDate,
        notes: 'Lead da comparatore esterno - verificare interesse reale',
        createdAt: createdDate
      });
    }

    // Store Walk-in Campaign - 10 leads (Oct-Dec 2024)
    for (let i = 0; i < 10; i++) {
      const person = leadNames[(i + 15) % leadNames.length];
      const randomDays = Math.floor(Math.random() * 90);
      const createdDate = new Date('2024-10-01');
      createdDate.setDate(createdDate.getDate() + randomDays);

      demoLeads.push({
        tenantId: DEMO_TENANT_ID,
        storeId: DEMO_STORE_ID,
        campaignId: CAMPAIGN_STORE_WALKIN,
        personId: sql`gen_random_uuid()`,
        leadSource: 'manual' as const,
        sourceChannel: 'store' as const,
        firstName: person.firstName,
        lastName: person.lastName,
        email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.store@example.com`,
        phone: person.phone,
        companyName: null,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        leadScore: Math.floor(Math.random() * 100),
        productInterest: i % 2 === 0 ? 'Upgrade Device iPhone 15 Pro' : 'Accessori Premium',
        driverId: i % 2 === 0 ? DRIVER_DEVICE : DRIVER_MOBILE,
        privacyPolicyAccepted: true,
        marketingConsent: true,
        profilingConsent: true,
        consentTimestamp: createdDate,
        notes: 'Cliente walk-in negozio Milano Duomo',
        createdAt: createdDate
      });
    }

    // Insert all leads
    await db.insert(crmLeads).values(demoLeads as any);

    console.log(`✅ ${demoLeads.length} leads demo creati (40 Black Friday + 30 Fibra Business + 20 Powerful API + 10 Store Walk-in)`);
    console.log('🎯 CRM Demo Data seeding completato!');

  } catch (error) {
    console.error('❌ Errore durante seed CRM demo:', error);
    throw error;
  }
}
