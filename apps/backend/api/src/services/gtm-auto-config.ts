import { google } from 'googleapis';
import { GoogleOAuthService } from './google-oauth-service';
import { db } from '../core/db';
import { mcpServers, storeTrackingConfig } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { logger } from '../core/logger';

/**
 * GTM Auto-Configuration Service
 * Multi-tenant Tag Manager setup using Google Tag Manager API v2
 * 
 * Architecture: Single GTM container with conditional triggers per store
 */
export class GTMAutoConfigService {
  /**
   * Get GTM configuration from MCP server config or environment
   */
  private static async getGTMConfig(tenantId: string): Promise<{
    containerId: string;
    accountId: string;
    workspaceId: string;
  }> {
    // Try to get from MCP server config
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'google-workspace-oauth-config'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    let containerId = process.env.GTM_CONTAINER_ID;
    let accountId = process.env.GTM_ACCOUNT_ID;
    let workspaceId = process.env.GTM_WORKSPACE_ID || '1'; // Default workspace

    // Override with server config if available
    if (server?.config) {
      const config = server.config as any;
      if (config.gtm_container_id) containerId = config.gtm_container_id;
      if (config.gtm_account_id) accountId = config.gtm_account_id;
      if (config.gtm_workspace_id) workspaceId = config.gtm_workspace_id;
    }

    if (!containerId || !accountId) {
      throw new Error('GTM configuration not found. Please configure GTM_CONTAINER_ID and GTM_ACCOUNT_ID in MCP Settings.');
    }

    return {
      containerId,
      accountId,
      workspaceId
    };
  }

  /**
   * Get authenticated Tag Manager API client
   */
  private static async getTagManagerClient(tenantId: string, userId: string) {
    // Get valid access token from Google OAuth service
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'google-workspace-oauth-config'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!server) {
      throw new Error('Google OAuth not configured. Please configure Google Workspace in MCP Settings.');
    }

    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId: server.id,
      tenantId,
      userId
    });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    return google.tagmanager({ version: 'v2', auth });
  }

  /**
   * Create a conditional trigger for a specific store
   * 
   * @param storeId - Store UUID
   * @param tenantId - Tenant ID for auth
   * @param userId - User ID for OAuth credentials
   * @returns GTM Trigger ID
   */
  static async createStoreGTMTrigger(params: {
    storeId: string;
    tenantId: string;
    userId: string;
  }): Promise<string> {
    const { storeId, tenantId, userId } = params;

    try {
      const gtmConfig = await this.getGTMConfig(tenantId);
      const tagManager = await this.getTagManagerClient(tenantId, userId);

      const parent = `accounts/${gtmConfig.accountId}/containers/${gtmConfig.containerId}/workspaces/${gtmConfig.workspaceId}`;

      // Create trigger with condition: store_id equals {storeId}
      const trigger = {
        name: `Store ${storeId.slice(0, 8)} - All Pages`,
        type: 'PAGEVIEW',
        filter: [
          {
            type: 'EQUALS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{store_id}}' }, // Built-in variable
              { type: 'TEMPLATE', key: 'arg1', value: storeId }
            ]
          }
        ]
      };

      const response = await tagManager.accounts.containers.workspaces.triggers.create({
        parent,
        requestBody: trigger
      });

      const triggerId = response.data.triggerId;

      logger.info('✅ [GTM Auto-Config] Created trigger', {
        storeId,
        triggerId,
        condition: `store_id equals ${storeId}`
      });

      return triggerId!;

    } catch (error) {
      logger.error('❌ [GTM Auto-Config] Failed to create trigger', {
        error: error instanceof Error ? error.message : String(error),
        storeId
      });
      throw error;
    }
  }

  /**
   * Create GA4 tag for a store
   */
  static async createGA4Tag(params: {
    storeId: string;
    triggerId: string;
    measurementId: string; // Format: G-XXXXXXXXX
    tenantId: string;
    userId: string;
  }): Promise<string> {
    const { storeId, triggerId, measurementId, tenantId, userId } = params;

    try {
      const gtmConfig = await this.getGTMConfig(tenantId);
      const tagManager = await this.getTagManagerClient(tenantId, userId);

      const parent = `accounts/${gtmConfig.accountId}/containers/${gtmConfig.containerId}/workspaces/${gtmConfig.workspaceId}`;

      const tag = {
        name: `GA4 - Store ${storeId.slice(0, 8)}`,
        type: 'gaawe', // Google Analytics 4 Event tag type
        parameter: [
          {
            type: 'TEMPLATE',
            key: 'measurementId',
            value: measurementId
          }
        ],
        firingTriggerId: [triggerId]
      };

      const response = await tagManager.accounts.containers.workspaces.tags.create({
        parent,
        requestBody: tag
      });

      logger.info('✅ [GTM Auto-Config] Created GA4 tag', {
        storeId,
        measurementId,
        tagId: response.data.tagId
      });

      return response.data.tagId!;

    } catch (error) {
      logger.error('❌ [GTM Auto-Config] Failed to create GA4 tag', {
        error: error instanceof Error ? error.message : String(error),
        storeId,
        measurementId
      });
      throw error;
    }
  }

  /**
   * Create Facebook Pixel tag for a store
   */
  static async createFBPixelTag(params: {
    storeId: string;
    triggerId: string;
    pixelId: string;
    tenantId: string;
    userId: string;
  }): Promise<string> {
    const { storeId, triggerId, pixelId, tenantId, userId } = params;

    try {
      const gtmConfig = await this.getGTMConfig(tenantId);
      const tagManager = await this.getTagManagerClient(tenantId, userId);

      const parent = `accounts/${gtmConfig.accountId}/containers/${gtmConfig.containerId}/workspaces/${gtmConfig.workspaceId}`;

      const tag = {
        name: `FB Pixel - Store ${storeId.slice(0, 8)}`,
        type: 'html', // Custom HTML tag
        parameter: [
          {
            type: 'TEMPLATE',
            key: 'html',
            value: `
              <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              </script>
            `
          }
        ],
        firingTriggerId: [triggerId],
        tagFiringOption: 'ONCE_PER_EVENT'
      };

      const response = await tagManager.accounts.containers.workspaces.tags.create({
        parent,
        requestBody: tag
      });

      logger.info('✅ [GTM Auto-Config] Created FB Pixel tag', {
        storeId,
        pixelId,
        tagId: response.data.tagId
      });

      return response.data.tagId!;

    } catch (error) {
      logger.error('❌ [GTM Auto-Config] Failed to create FB Pixel tag', {
        error: error instanceof Error ? error.message : String(error),
        storeId,
        pixelId
      });
      throw error;
    }
  }

  /**
   * Publish GTM container workspace
   */
  static async publishGTMContainer(params: {
    tenantId: string;
    userId: string;
    versionName?: string;
  }): Promise<void> {
    const { tenantId, userId, versionName } = params;

    try {
      const gtmConfig = await this.getGTMConfig(tenantId);
      const tagManager = await this.getTagManagerClient(tenantId, userId);

      const path = `accounts/${gtmConfig.accountId}/containers/${gtmConfig.containerId}/workspaces/${gtmConfig.workspaceId}`;

      await tagManager.accounts.containers.workspaces.create_version({
        path,
        requestBody: {
          name: versionName || `Auto-config ${new Date().toISOString()}`,
          notes: 'Auto-generated by W3 Suite GTM Auto-Configuration'
        }
      });

      logger.info('✅ [GTM Auto-Config] Published container', {
        containerId: gtmConfig.containerId,
        workspaceId: gtmConfig.workspaceId
      });

    } catch (error) {
      logger.error('❌ [GTM Auto-Config] Failed to publish container', {
        error: error instanceof Error ? error.message : String(error),
        tenantId
      });
      throw error;
    }
  }

  /**
   * Complete store tracking configuration
   * Creates trigger + tags and updates database
   */
  static async configureStoreTracking(params: {
    storeId: string;
    tenantId: string;
    userId: string;
    ga4MeasurementId?: string;
    googleAdsConversionId?: string;
    facebookPixelId?: string;
    tiktokPixelId?: string;
  }): Promise<{
    success: boolean;
    gtmTriggerId: string;
    tagsCreated: string[];
  }> {
    const { storeId, tenantId, userId, ga4MeasurementId, facebookPixelId } = params;

    try {
      // Step 1: Create conditional trigger for this store
      const triggerId = await this.createStoreGTMTrigger({
        storeId,
        tenantId,
        userId
      });

      const tagsCreated: string[] = [];

      // Step 2: Create GA4 tag if provided
      if (ga4MeasurementId) {
        const tagId = await this.createGA4Tag({
          storeId,
          triggerId,
          measurementId: ga4MeasurementId,
          tenantId,
          userId
        });
        tagsCreated.push(tagId);
      }

      // Step 3: Create Facebook Pixel tag if provided
      if (facebookPixelId) {
        const tagId = await this.createFBPixelTag({
          storeId,
          triggerId,
          pixelId: facebookPixelId,
          tenantId,
          userId
        });
        tagsCreated.push(tagId);
      }

      // Step 4: Update store tracking config in database
      const [existing] = await db
        .select()
        .from(storeTrackingConfig)
        .where(eq(storeTrackingConfig.storeId, storeId))
        .limit(1);

      if (existing) {
        await db
          .update(storeTrackingConfig)
          .set({
            ga4MeasurementId,
            facebookPixelId,
            gtmConfigured: true,
            gtmTriggerId: triggerId,
            updatedAt: new Date()
          })
          .where(eq(storeTrackingConfig.id, existing.id));
      } else {
        await db
          .insert(storeTrackingConfig)
          .values({
            storeId,
            tenantId,
            ga4MeasurementId,
            facebookPixelId,
            gtmConfigured: true,
            gtmTriggerId: triggerId
          });
      }

      // Step 5: Publish container (optional - can be done manually)
      // await this.publishGTMContainer({ tenantId, userId });

      logger.info('🎉 [GTM Auto-Config] Store tracking configured successfully', {
        storeId,
        triggerId,
        tagsCreated: tagsCreated.length
      });

      return {
        success: true,
        gtmTriggerId: triggerId,
        tagsCreated
      };

    } catch (error) {
      logger.error('❌ [GTM Auto-Config] Configuration failed', {
        error: error instanceof Error ? error.message : String(error),
        storeId
      });
      throw error;
    }
  }
}
