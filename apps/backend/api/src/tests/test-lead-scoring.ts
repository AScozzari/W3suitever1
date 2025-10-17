/**
 * Lead Scoring AI End-to-End Test
 * 
 * Tests the complete lead scoring flow:
 * 1. Create lead via external webhook with UTM params
 * 2. Verify auto-calculation of lead score (0-100)
 * 3. Check leadAiInsights record with insightType='scoring'
 * 4. Verify hot lead notifications (score >= 80)
 * 5. Test manual re-score functionality
 */

import { db } from '../core/db.js';
import { crmLeads, leadAiInsights, notifications } from '../db/schema/w3suite.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../core/logger.js';

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'; // Staging tenant
const TEST_STORE_ID = '00000000-0000-0000-0000-000000000002'; // First store in staging
const API_KEY = process.env.EXTERNAL_LEADS_API_KEY || 'default-dev-key-change-in-production';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Test 1: Create lead with UTM params (should trigger auto-scoring)
 */
async function testCreateLeadWithUTM() {
  console.log('\n📝 Test 1: Creating lead with UTM params...');
  
  try {
    const leadData = {
      tenantId: TEST_TENANT_ID,
      storeId: TEST_STORE_ID,
      // Lead data
      firstName: 'Marco',
      lastName: 'Rossi',
      email: `test-lead-${Date.now()}@example.com`,
      phone: '+39 320 1234567',
      companyName: 'Enterprise Solutions SRL',
      productInterest: 'CRM Platform - Enterprise Plan',
      notes: 'CEO looking for complete CRM solution, high budget',
      // UTM tracking (Facebook Ads campaign)
      utm_source: 'facebook',
      utm_medium: 'cpc',
      utm_campaign: 'summer_enterprise_sale_2024',
      utm_content: 'video_demo_cta',
      utm_term: 'crm_software_aziende',
      // Social source
      sourceChannel: 'landing_page',
      leadSource: 'web_form',
      socialPlatform: 'facebook',
      // Landing page
      landingPageUrl: 'https://example.com/enterprise-crm?utm_source=facebook',
      referrerUrl: 'https://www.facebook.com/',
      // GTM data
      gtmClientId: 'GA1.1.123456789.1234567890',
      gtmSessionId: 'session_abc123',
      gtmEvents: JSON.stringify([
        { event: 'page_view', timestamp: Date.now() - 60000 },
        { event: 'video_watched', timestamp: Date.now() - 30000 },
        { event: 'form_submitted', timestamp: Date.now() }
      ]),
      // GDPR consent
      privacyPolicyAccepted: true,
      marketingConsent: true,
      profilingConsent: true,
      consentTimestamp: new Date().toISOString(),
      // Raw payload
      rawPayload: JSON.stringify({
        fb_ad_id: '123456789',
        fb_form_id: 'form_987654',
        fb_leadgen_id: 'lead_abc123'
      })
    };

    const response = await fetch(`${BASE_URL}/api/crm/external-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Auth-Session': 'authenticated',
        'X-Demo-User': 'admin-user'
      },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    const result = await response.json();
    
    console.log('✅ Lead created successfully:', {
      leadId: result.data.id,
      email: result.data.email,
      utmSource: result.data.utmSource,
      utmCampaign: result.data.utmCampaign
    });

    return result.data.id;
  } catch (error) {
    console.error('❌ Failed to create lead:', error);
    throw error;
  }
}

/**
 * Test 2: Wait for async scoring and verify lead score
 */
async function testVerifyLeadScore(leadId: string) {
  console.log('\n📝 Test 2: Verifying lead score calculation...');
  
  try {
    // Wait 10 seconds for async scoring to complete
    console.log('⏳ Waiting 10 seconds for background scoring...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.id, leadId),
        eq(crmLeads.tenantId, TEST_TENANT_ID)
      ))
      .limit(1);

    if (!lead) {
      throw new Error('Lead not found in database');
    }

    if (lead.leadScore === null || lead.leadScore === undefined) {
      throw new Error('❌ Lead score not calculated - AI scoring failed');
    }

    const scoreCategory = 
      lead.leadScore >= 80 ? '🚀 Very Hot' :
      lead.leadScore >= 61 ? '🌟 Hot' :
      lead.leadScore >= 31 ? '🔥 Warm' :
      '❄️ Cold';

    console.log('✅ Lead score calculated:', {
      leadId: lead.id,
      leadScore: lead.leadScore,
      category: scoreCategory,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign
    });

    return { leadScore: lead.leadScore, scoringComplete: true };
  } catch (error) {
    console.error('❌ Failed to verify lead score:', error);
    throw error;
  }
}

/**
 * Test 3: Verify leadAiInsights record
 */
async function testVerifyAiInsights(leadId: string) {
  console.log('\n📝 Test 3: Verifying AI insights record...');
  
  try {
    const [insight] = await db
      .select()
      .from(leadAiInsights)
      .where(and(
        eq(leadAiInsights.leadId, leadId),
        eq(leadAiInsights.insightType, 'scoring')
      ))
      .orderBy(desc(leadAiInsights.createdAt))
      .limit(1);

    if (!insight) {
      throw new Error('❌ AI insight not found - scoring did not save insight record');
    }

    console.log('✅ AI insight found:', {
      insightId: insight.id,
      insightType: insight.insightType,
      confidence: insight.confidence,
      reasoning: insight.reasoning?.substring(0, 100) + '...',
      factors: insight.factors
    });

    return insight;
  } catch (error) {
    console.error('❌ Failed to verify AI insights:', error);
    throw error;
  }
}

/**
 * Test 4: Verify hot lead notification (if score >= 80)
 */
async function testVerifyHotLeadNotification(leadId: string, leadScore: number | null) {
  console.log('\n📝 Test 4: Verifying hot lead notification...');
  
  try {
    if (leadScore === null || leadScore < 80) {
      console.log(`ℹ️  Lead score (${leadScore}) below hot threshold (80), no notification expected`);
      return null;
    }

    // Check for notification - MUST exist for hot leads
    const notif = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, TEST_TENANT_ID),
        eq(notifications.relatedEntityType, 'lead'),
        eq(notifications.relatedEntityId, leadId)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    if (!notif || notif.length === 0) {
      throw new Error(`❌ Hot lead notification not found for score ${leadScore}. Notification system not working correctly.`);
    }

    console.log('✅ Hot lead notification created:', {
      notificationId: notif[0].id,
      title: notif[0].title,
      message: notif[0].message,
      priority: notif[0].priority,
      targetRoles: notif[0].targetRoles
    });

    return notif[0];
  } catch (error) {
    console.error('❌ Failed to verify notification:', error);
    throw error;
  }
}

/**
 * Test 5: Create high-quality lead (should score >= 80)
 */
async function testCreateHotLead() {
  console.log('\n📝 Test 5: Creating high-quality lead (should score >= 80)...');
  
  try {
    const leadData = {
      tenantId: TEST_TENANT_ID,
      storeId: TEST_STORE_ID,
      // High-quality lead data
      firstName: 'Laura',
      lastName: 'Bianchi',
      email: `hot-lead-${Date.now()}@fortune500.com`, // Enterprise domain
      phone: '+39 02 12345678', // Milan area code
      companyName: 'Fortune 500 Corporation Italia',
      productInterest: 'Enterprise CRM + Analytics Suite - Full Package',
      notes: 'CTO of 500+ employee company, immediate need, budget approved €100k+',
      // Company/role details for AI scoring
      jobTitle: 'Chief Technology Officer',
      companyRole: 'CTO',
      companySize: '500-1000',
      companySector: 'Technology',
      annualRevenue: '€50M-€100M',
      employeeCount: '750',
      budgetRange: '€100k-€250k',
      purchaseTimeframe: 'Immediate (within 1 month)',
      // UTM tracking (direct campaign)
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'enterprise_direct_outbound',
      utm_content: 'demo_request_cta',
      utm_term: 'enterprise_crm_solution',
      // Source
      sourceChannel: 'landing_page',
      leadSource: 'web_form',
      // Landing page (visited multiple pages)
      landingPageUrl: 'https://example.com/enterprise?utm_source=google',
      referrerUrl: 'https://www.google.com/search?q=enterprise+crm',
      // High engagement
      gtmClientId: 'GA1.1.999888777.9876543210',
      gtmSessionId: 'session_enterprise_xyz',
      gtmEvents: JSON.stringify([
        { event: 'page_view', page: '/enterprise', timestamp: Date.now() - 600000 },
        { event: 'page_view', page: '/features', timestamp: Date.now() - 480000 },
        { event: 'page_view', page: '/pricing', timestamp: Date.now() - 360000 },
        { event: 'video_watched', duration: 180, timestamp: Date.now() - 240000 },
        { event: 'demo_requested', timestamp: Date.now() - 120000 },
        { event: 'form_submitted', timestamp: Date.now() }
      ]),
      // GDPR consent
      privacyPolicyAccepted: true,
      marketingConsent: true,
      profilingConsent: true,
      consentTimestamp: new Date().toISOString()
    };

    const response = await fetch(`${BASE_URL}/api/crm/external-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Auth-Session': 'authenticated',
        'X-Demo-User': 'admin-user'
      },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create hot lead: ${error.message}`);
    }

    const result = await response.json();
    
    console.log('✅ Hot lead created successfully:', {
      leadId: result.data.id,
      email: result.data.email,
      companyName: result.data.companyName
    });

    return result.data.id;
  } catch (error) {
    console.error('❌ Failed to create hot lead:', error);
    throw error;
  }
}

/**
 * Test 6: Manual re-score test
 */
async function testManualRescore(leadId: string) {
  console.log('\n📝 Test 6: Testing manual re-score...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/crm/leads/${leadId}/rescore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-tenant-id': TEST_TENANT_ID,
        'X-Auth-Session': 'authenticated',
        'X-Demo-User': 'admin-user'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to re-score lead: ${error.message}`);
    }

    const result = await response.json();
    
    console.log('✅ Lead re-scored successfully:', {
      leadId,
      newScore: result.data.newScore,
      reasoning: result.data.reasoning?.substring(0, 100) + '...'
    });

    return result.data;
  } catch (error) {
    console.error('❌ Failed to re-score lead:', error);
    throw error;
  }
}

/**
 * Test 7: Cleanup test data
 */
async function testCleanup(leadIds: string[]) {
  console.log('\n🧹 Test 7: Cleaning up test data...');
  
  try {
    for (const leadId of leadIds) {
      // Delete AI insights
      await db.delete(leadAiInsights)
        .where(eq(leadAiInsights.leadId, leadId));
      
      // Delete lead
      await db.delete(crmLeads)
        .where(eq(crmLeads.id, leadId));
      
      console.log(`✅ Deleted lead: ${leadId}`);
    }

    console.log('ℹ️  Notifications retained for audit trail');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Lead Scoring AI End-to-End Tests\n');
  console.log('=' .repeat(70));

  const leadIds: string[] = [];

  try {
    // Test 1: Create lead with UTM params
    const leadId1 = await testCreateLeadWithUTM();
    leadIds.push(leadId1);

    // Test 2: Verify lead score
    const { leadScore: score1 } = await testVerifyLeadScore(leadId1);

    // Test 3: Verify AI insights
    await testVerifyAiInsights(leadId1);

    // Test 4: Check notification (if hot lead)
    await testVerifyHotLeadNotification(leadId1, score1);

    // Test 5: Create high-quality lead
    const leadId2 = await testCreateHotLead();
    leadIds.push(leadId2);

    // Wait and verify hot lead score - MUST be >= 80
    const { leadScore: score2 } = await testVerifyLeadScore(leadId2);
    if (score2 < 80) {
      throw new Error(`❌ Hot lead test failed: Expected score >= 80, got ${score2}. AI scoring not working correctly for high-quality leads.`);
    }
    await testVerifyAiInsights(leadId2);
    await testVerifyHotLeadNotification(leadId2, score2);

    // Test 6: Manual re-score
    if (leadIds.length > 0) {
      await testManualRescore(leadIds[0]);
    }

    console.log('\n' + '=' .repeat(70));
    console.log('✅ All lead scoring tests completed successfully!');
    console.log('\n📋 Test Results:');
    console.log('  ✅ Lead creation with UTM params');
    console.log('  ✅ Auto-scoring (background) - scores calculated');
    console.log('  ✅ AI insights storage - insights saved to DB');
    console.log('  ✅ Hot lead notifications - verified for score >= 80');
    console.log('  ✅ Manual re-score - endpoint functional');
    console.log('\n💡 Configuration:');
    console.log('  • OpenAI API key: Required for AI scoring');
    console.log('  • Scoring engine: OpenAI gpt-4o (JSON mode)');
    console.log('  • Background processing: setImmediate() non-blocking');
    console.log('  • Notification targets: sales_manager & team_leader roles');
    console.log('  • Score ranges: 0-30 Cold | 31-60 Warm | 61-79 Hot | 80-100 Very Hot\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (leadIds.length > 0) {
      await testCleanup(leadIds);
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('✅ Test execution complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { runAllTests };
