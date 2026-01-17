import crypto from 'crypto';
import { db } from '../core/db';
import { tenantGtmConfig } from '../db/schema/w3suite';
import { isNull } from 'drizzle-orm';
import { logger } from '../core/logger';

/**
 * GTM Snippet Generator Service
 * Generates GTM HTML/JS snippet with precompiled dataLayer
 * 
 * Features:
 * - Tenant and store ID in dataLayer
 * - Tracking IDs (GA4, Google Ads, Facebook Pixel, TikTok)
 * - Enhanced Conversions data (SHA-256 hashed email/phone)
 * - UTM parameters from campaigns
 * 
 * Architecture:
 * - Container ID from tenant_gtm_config (global row with tenant_id = NULL)
 * - Store tracking IDs from store_tracking_config
 * - Campaigns inherit from store + add UTM
 */

export interface SnippetGeneratorInput {
  tenantId: string;
  storeId: string;
  // Tracking IDs (from store_tracking_config)
  ga4MeasurementId?: string | null;
  googleAdsConversionId?: string | null;
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
  // UTM Parameters (from campaign)
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  // Enhanced Conversions Data
  email?: string | null;
  phone?: string | null;
  facebookPageUrl?: string | null;
  instagramHandle?: string | null;
}

export class GTMSnippetGeneratorService {
  /**
   * Hash a value using SHA-256 for Enhanced Conversions
   */
  private static hashValue(value: string | null | undefined): string | null {
    if (!value || value.trim() === '') return null;
    
    const normalized = value.trim().toLowerCase();
    
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  /**
   * Get GTM Container ID from tenant_gtm_config (global row with tenant_id = NULL)
   */
  private static async getGTMContainerId(): Promise<string> {
    try {
      // Get global config (tenant_id = NULL)
      const [globalConfig] = await db
        .select()
        .from(tenantGtmConfig)
        .where(isNull(tenantGtmConfig.tenantId))
        .limit(1);

      if (globalConfig?.containerId) {
        return globalConfig.containerId;
      }

      logger.warn('⚠️ [GTM Snippet] No global GTM container configured');
      return 'GTM-XXXXXX';

    } catch (error) {
      logger.error('❌ [GTM Snippet] Failed to get container ID', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'GTM-XXXXXX';
    }
  }

  /**
   * Generate GTM snippet with precompiled dataLayer
   */
  static async generateSnippet(input: SnippetGeneratorInput): Promise<string> {
    const {
      tenantId,
      storeId,
      ga4MeasurementId,
      googleAdsConversionId,
      facebookPixelId,
      tiktokPixelId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      email,
      phone,
      facebookPageUrl,
      instagramHandle
    } = input;

    try {
      const containerId = await this.getGTMContainerId();

      // Hash all user data for Enhanced Conversions (GDPR-compliant)
      const emailHash = this.hashValue(email);
      const phoneHash = this.hashValue(phone);
      const facebookPageHash = this.hashValue(facebookPageUrl);
      const instagramHandleHash = this.hashValue(instagramHandle);

      // Build dataLayer object
      const dataLayer: any = {
        // Core identifiers
        tenant_id: tenantId,
        store_id: storeId,
        
        // Tracking IDs (only include if configured)
        ...(ga4MeasurementId && { ga4_measurement_id: ga4MeasurementId }),
        ...(googleAdsConversionId && { google_ads_conversion_id: googleAdsConversionId }),
        ...(facebookPixelId && { facebook_pixel_id: facebookPixelId }),
        ...(tiktokPixelId && { tiktok_pixel_id: tiktokPixelId }),
        
        // UTM Parameters (from campaign)
        ...(utmSource && { utm_source: utmSource }),
        ...(utmMedium && { utm_medium: utmMedium }),
        ...(utmCampaign && { utm_campaign: utmCampaign }),
        ...(utmContent && { utm_content: utmContent }),
        ...(utmTerm && { utm_term: utmTerm }),
        
        // Enhanced Conversions Data (all hashed for privacy/GDPR compliance)
        ...(emailHash && { user_email_hash: emailHash }),
        ...(phoneHash && { user_phone_hash: phoneHash }),
        ...(facebookPageHash && { facebook_page_hash: facebookPageHash }),
        ...(instagramHandleHash && { instagram_handle_hash: instagramHandleHash }),
      };

      // Generate GTM snippet
      const snippet = `<!-- Google Tag Manager -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');
</script>
<!-- End Google Tag Manager -->

<!-- W3 Suite - Precompiled dataLayer -->
<script>
window.dataLayer = window.dataLayer || [];
window.dataLayer.push(${JSON.stringify(dataLayer, null, 2)});
</script>

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

      logger.info('✅ [GTM Snippet] Generated snippet', {
        tenantId,
        storeId,
        containerId,
        trackingIdsConfigured: {
          ga4: !!ga4MeasurementId,
          googleAds: !!googleAdsConversionId,
          facebook: !!facebookPixelId,
          tiktok: !!tiktokPixelId
        },
        enhancedConversionsEnabled: !!(emailHash || phoneHash || facebookPageHash || instagramHandleHash),
        hashedFieldsCount: [emailHash, phoneHash, facebookPageHash, instagramHandleHash].filter(Boolean).length
      });

      return snippet;

    } catch (error) {
      logger.error('❌ [GTM Snippet] Failed to generate snippet', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        storeId
      });
      
      // Return a minimal snippet on error
      return `<!-- GTM Snippet Generation Failed: ${error instanceof Error ? error.message : 'Unknown error'} -->`;
    }
  }

  /**
   * Generate snippet for preview/testing without persisting
   */
  static generatePreviewSnippet(input: Partial<SnippetGeneratorInput>): string {
    const containerId = 'GTM-XXXXXX'; // Placeholder for preview
    
    const dataLayer: any = {
      tenant_id: input.tenantId || 'preview-tenant',
      store_id: input.storeId || 'preview-store',
      ...(input.ga4MeasurementId && { ga4_measurement_id: input.ga4MeasurementId }),
      ...(input.googleAdsConversionId && { google_ads_conversion_id: input.googleAdsConversionId }),
      ...(input.facebookPixelId && { facebook_pixel_id: input.facebookPixelId }),
      ...(input.tiktokPixelId && { tiktok_pixel_id: input.tiktokPixelId }),
    };

    return `<!-- Google Tag Manager (PREVIEW MODE) -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');
</script>

<script>
window.dataLayer = window.dataLayer || [];
window.dataLayer.push(${JSON.stringify(dataLayer, null, 2)});
</script>

<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->`;
  }
}
