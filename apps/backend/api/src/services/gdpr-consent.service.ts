import { db } from '../core/db';
import { crmLeads, crmCampaigns } from '../db/schema/w3suite';
import { eq } from 'drizzle-orm';

export interface ConsentComplianceResult {
  compliant: boolean;
  missing: string[];
  lead: {
    privacyPolicyAccepted: boolean;
    marketingConsent: boolean;
    profilingConsent: boolean;
    thirdPartyConsent: boolean;
  };
  required: {
    privacy_policy?: boolean;
    marketing?: boolean;
    profiling?: boolean;
    third_party?: boolean;
  };
}

export class GDPRConsentService {
  static async validateLeadConsentCompliance(
    leadId: string,
    tenantId: string
  ): Promise<ConsentComplianceResult> {
    const lead = await db.query.crmLeads.findFirst({
      where: (leads, { and, eq }) => and(
        eq(leads.id, leadId),
        eq(leads.tenantId, tenantId)
      ),
      columns: {
        privacyPolicyAccepted: true,
        marketingConsent: true,
        profilingConsent: true,
        thirdPartyConsent: true,
        campaignId: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (!lead.campaignId) {
      return {
        compliant: true,
        missing: [],
        lead: {
          privacyPolicyAccepted: lead.privacyPolicyAccepted || false,
          marketingConsent: lead.marketingConsent || false,
          profilingConsent: lead.profilingConsent || false,
          thirdPartyConsent: lead.thirdPartyConsent || false,
        },
        required: {},
      };
    }

    const campaign = await db.query.crmCampaigns.findFirst({
      where: (campaigns, { and, eq }) => and(
        eq(campaigns.id, lead.campaignId!),
        eq(campaigns.tenantId, tenantId)
      ),
      columns: {
        requiredConsents: true,
      },
    });

    if (!campaign || !campaign.requiredConsents) {
      return {
        compliant: true,
        missing: [],
        lead: {
          privacyPolicyAccepted: lead.privacyPolicyAccepted || false,
          marketingConsent: lead.marketingConsent || false,
          profilingConsent: lead.profilingConsent || false,
          thirdPartyConsent: lead.thirdPartyConsent || false,
        },
        required: {},
      };
    }

    const requiredConsents = campaign.requiredConsents as {
      privacy_policy?: boolean;
      marketing?: boolean;
      profiling?: boolean;
      third_party?: boolean;
    };

    const missing: string[] = [];

    if (requiredConsents.privacy_policy && !lead.privacyPolicyAccepted) {
      missing.push('privacy_policy');
    }
    if (requiredConsents.marketing && !lead.marketingConsent) {
      missing.push('marketing');
    }
    if (requiredConsents.profiling && !lead.profilingConsent) {
      missing.push('profiling');
    }
    if (requiredConsents.third_party && !lead.thirdPartyConsent) {
      missing.push('third_party');
    }

    return {
      compliant: missing.length === 0,
      missing,
      lead: {
        privacyPolicyAccepted: lead.privacyPolicyAccepted || false,
        marketingConsent: lead.marketingConsent || false,
        profilingConsent: lead.profilingConsent || false,
        thirdPartyConsent: lead.thirdPartyConsent || false,
      },
      required: requiredConsents,
    };
  }

  static async checkBulkCompliance(
    leadIds: string[],
    tenantId: string
  ): Promise<Map<string, ConsentComplianceResult>> {
    const results = new Map<string, ConsentComplianceResult>();

    for (const leadId of leadIds) {
      try {
        const compliance = await this.validateLeadConsentCompliance(leadId, tenantId);
        results.set(leadId, compliance);
      } catch (error) {
        console.error(`Failed to check compliance for lead ${leadId}:`, error);
      }
    }

    return results;
  }
}
