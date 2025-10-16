/**
 * LinkedIn Lead Gen Forms Webhook Handler
 * 
 * Handles lead submissions from LinkedIn Lead Gen Forms
 * Validates webhook signature and routes to unified external-leads endpoint
 */

import express from 'express';
import crypto from 'crypto';
import { logger } from '../core/logger';
import { db } from '../core/db';
import { eq, and } from 'drizzle-orm';
import { campaignSocialAccounts } from '../db/schema/w3suite';

const router = express.Router();

/**
 * Verify LinkedIn webhook signature
 * LinkedIn uses HMAC-SHA256 for webhook validation
 */
function verifyLinkedInSignature(payload: string, signature: string | undefined, clientSecret: string): boolean {
  if (!signature) return false;
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('hex');
    
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    // SECURITY: timingSafeEqual requires equal-length buffers
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error('LinkedIn signature verification error', { error });
    return false;
  }
}

/**
 * GET /api/webhooks/linkedin
 * LinkedIn webhook verification endpoint
 */
router.get('/', (req, res) => {
  const challenge = req.query.challenge as string;
  
  if (challenge) {
    logger.info('LinkedIn webhook challenge verification', { challenge });
    res.status(200).send(challenge);
  } else {
    logger.warn('LinkedIn webhook verification failed - no challenge');
    res.sendStatus(400);
  }
});

/**
 * POST /api/webhooks/linkedin
 * LinkedIn Lead Gen Form submission webhook
 */
router.post('/', express.json({ verify: (req: any, res, buf) => {
  req.rawBody = buf.toString();
}}), async (req, res) => {
  try {
    const signature = req.headers['x-linkedin-signature'] as string;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    
    // SECURITY: Validate webhook signature
    if (!verifyLinkedInSignature(req.rawBody, signature, clientSecret)) {
      logger.warn('Invalid LinkedIn webhook signature', {
        hasSignature: !!signature,
        ip: req.ip
      });
      return res.sendStatus(401);
    }
    
    const data = req.body;
    
    // LinkedIn webhook format: array of lead events
    if (Array.isArray(data)) {
      for (const event of data) {
        if (event.eventType === 'LEAD') {
          const leadUrn = event.leadUrn; // urn:li:sponsoredLeadGenForm:123456
          const campaignUrn = event.campaignUrn; // urn:li:sponsoredCampaign:123456
          const creativeUrn = event.creativeUrn;
          const formUrn = event.formUrn;
          const leadData = event.leadData || {};
          
          // Extract campaign ID from URN
          const campaignId = campaignUrn?.split(':').pop();
          
          // Try to match campaign via externalCampaignId
          const campaignMatch = await db.query.campaignSocialAccounts.findFirst({
            where: and(
              eq(campaignSocialAccounts.externalCampaignId, campaignId || ''),
              eq(campaignSocialAccounts.platform, 'linkedin'),
              eq(campaignSocialAccounts.isActive, true)
            ),
            with: {
              campaign: true
            }
          });
          
          // Extract lead fields from LinkedIn format
          const firstName = leadData.firstName?.value || '';
          const lastName = leadData.lastName?.value || '';
          const email = leadData.email?.value || '';
          const phone = leadData.phoneNumber?.value || '';
          const companyName = leadData.company?.value || '';
          
          const leadPayload = {
            socialPlatform: 'linkedin',
            platformAccountId: formUrn, // Use form URN as platform account identifier
            campaignId: campaignMatch?.campaignId,
            externalLeadId: leadUrn,
            leadSource: 'social_ad',
            sourceChannel: 'linkedin',
            firstName,
            lastName,
            email,
            phone,
            companyName,
            utm_source: 'linkedin',
            utm_medium: 'lead_gen_form',
            utm_campaign: campaignId,
            rawPayload: {
              leadUrn,
              campaignUrn,
              creativeUrn,
              formUrn,
              leadData,
              eventType: event.eventType,
              timestamp: event.timestamp
            }
          };
          
          // Call unified external-leads endpoint with API key
          const externalLeadsUrl = `${req.protocol}://${req.get('host')}/api/crm/external-leads`;
          const apiKey = process.env.EXTERNAL_LEADS_API_KEY || 'default-dev-key-change-in-production';
          
          const response = await fetch(externalLeadsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify(leadPayload)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            logger.error('Failed to create lead from LinkedIn webhook', { 
              status: response.status,
              error: errorText,
              leadUrn 
            });
          } else {
            const result = await response.json();
            logger.info('LinkedIn lead processed successfully', { 
              leadUrn,
              leadId: result.data?.id,
              campaignId: campaignMatch?.campaignId
            });
          }
        }
      }
    }
    
    // LinkedIn expects 200 OK response
    res.status(200).json({ success: true });
    
  } catch (error: any) {
    logger.error('LinkedIn webhook processing error', { 
      errorMessage: error?.message,
      errorStack: error?.stack
    });
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;
