/**
 * Meta (Facebook/Instagram) Webhook Handler
 * 
 * Handles lead gen form submissions from Facebook/Instagram ads
 * Validates webhook signature and routes to unified external-leads endpoint
 */

import express from 'express';
import crypto from 'crypto';
import { logger } from '../core/logger';
import { db } from '../core/db';
import { eq, and } from 'drizzle-orm';
import { campaignSocialAccounts } from '../db/schema/w3suite';

const router = express.Router();

function verifyMetaSignature(payload: string, signature: string | undefined, appSecret: string): boolean {
  if (!signature) return false;
  
  try {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
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
    logger.error('Meta signature verification error', { error });
    return false;
  }
}

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'w3suite_meta_webhook_verify';
  
  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Meta webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Meta webhook verification failed', { mode, token });
    res.sendStatus(403);
  }
});

router.post('/', express.json({ verify: (req: any, res, buf) => {
  req.rawBody = buf.toString();
}}), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const appSecret = process.env.META_APP_SECRET || '';
    
    if (!verifyMetaSignature(req.rawBody, signature, appSecret)) {
      logger.warn('Invalid Meta webhook signature');
      return res.sendStatus(401);
    }
    
    const data = req.body;
    
    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        const pageId = entry.id;
        
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;
            const leadId = leadgenData.leadgen_id;
            const formId = leadgenData.form_id;
            const adId = leadgenData.ad_id;
            const createdTime = leadgenData.created_time;
            
            const campaignMatch = await db.query.campaignSocialAccounts.findFirst({
              where: and(
                eq(campaignSocialAccounts.externalCampaignId, adId),
                eq(campaignSocialAccounts.platform, 'facebook'),
                eq(campaignSocialAccounts.isActive, true)
              ),
              with: {
                campaign: true
              }
            });
            
            const leadPayload = {
              socialPlatform: 'facebook',
              platformAccountId: pageId,
              campaignId: campaignMatch?.campaignId,
              externalLeadId: leadId,
              leadSource: 'social_ad',
              sourceChannel: 'facebook',
              utm_source: 'facebook',
              utm_medium: 'lead_ad',
              utm_campaign: adId,
              rawPayload: {
                leadgen_id: leadId,
                form_id: formId,
                ad_id: adId,
                page_id: pageId,
                created_time: createdTime
              }
            };
            
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
              logger.error('Failed to create lead from Meta webhook', {
                leadId,
                pageId,
                error: errorText
              });
            } else {
              logger.info('Lead created from Meta webhook', {
                leadId,
                pageId,
                campaignId: campaignMatch?.campaignId
              });
            }
          }
        }
      }
    }
    
    res.sendStatus(200);
    
  } catch (error: any) {
    logger.error('Error processing Meta webhook', {
      error: error?.message || 'Unknown error',
      stack: error?.stack
    });
    res.sendStatus(500);
  }
});

export default router;
