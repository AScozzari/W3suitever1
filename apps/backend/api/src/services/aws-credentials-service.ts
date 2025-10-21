import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { encryptMCPCredentials, decryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * AWS Credentials Service
 * Gestisce AWS IAM credentials per MCP AWS integrations
 */
export class AWSCredentialsService {
  /**
   * Store AWS IAM credentials (Access Key ID + Secret Access Key)
   */
  static async storeCredentials(params: {
    serverId: string;
    tenantId: string;
    userId: string;
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  }): Promise<{
    success: boolean;
    message: string;
    credentialId?: string;
  }> {
    const { serverId, tenantId, userId, accessKeyId, secretAccessKey, region } = params;

    try {
      // Verify server exists
      const [server] = await db
        .select()
        .from(mcpServers)
        .where(and(
          eq(mcpServers.id, serverId),
          eq(mcpServers.tenantId, tenantId)
        ))
        .limit(1);

      if (!server) {
        throw new Error(`MCP server ${serverId} not found for tenant ${tenantId}`);
      }

      // Validate credentials with AWS
      const isValid = await this.validateCredentials({
        accessKeyId,
        secretAccessKey,
        region: region || 'us-east-1'
      });

      if (!isValid) {
        throw new Error('Invalid AWS credentials - authentication failed');
      }

      logger.info('✅ [AWS Credentials] Credentials validated successfully', {
        serverId,
        tenantId,
        region: region || 'us-east-1'
      });

      // Prepare credentials object
      const credentials = {
        accessKeyId,
        secretAccessKey,
        region: region || 'us-east-1',
        credentialType: 'aws-iam'
      };

      // Encrypt credentials using two-level key derivation
      const { encryptedData, keyId } = await encryptMCPCredentials(
        tenantId,
        credentials
      );

      // Check if credentials already exist for this server/provider (tenant-level, no userId)
      const existingCreds = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId),
          eq(mcpServerCredentials.oauthProvider, 'aws')
        ))
        .limit(1);

      let credentialId: string;

      if (existingCreds.length > 0) {
        // Update existing credentials
        await db
          .update(mcpServerCredentials)
          .set({
            encryptedCredentials: encryptedData,
            encryptionKeyId: keyId,
            updatedAt: new Date(),
            revokedAt: null
          })
          .where(eq(mcpServerCredentials.id, existingCreds[0].id));

        credentialId = existingCreds[0].id;

        logger.info('🔄 [AWS Credentials] Updated existing credentials', {
          credentialId,
          serverId
        });
      } else {
        // Insert new credentials (tenant-level API keys)
        const [newCred] = await db
          .insert(mcpServerCredentials)
          .values({
            tenantId,
            serverId,
            userId: null, // Tenant-level credential (not user-specific)
            oauthProvider: 'aws',
            credentialType: 'api_key',
            encryptedCredentials: encryptedData,
            encryptionKeyId: keyId,
            createdBy: userId
          })
          .returning({ id: mcpServerCredentials.id });

        credentialId = newCred.id;

        logger.info('✨ [AWS Credentials] Created new credentials', {
          credentialId,
          serverId,
          provider: 'aws'
        });
      }

      // Update server status to active
      await db
        .update(mcpServers)
        .set({
          status: 'active',
          lastHealthCheck: new Date(),
          errorCount: 0,
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(mcpServers.id, serverId));

      return {
        success: true,
        message: 'AWS credentials stored successfully',
        credentialId
      };

    } catch (error) {
      logger.error('❌ [AWS Credentials] Store failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      // Update server status to error
      await db
        .update(mcpServers)
        .set({
          status: 'error',
          lastError: error instanceof Error ? error.message : 'Credential storage failed',
          errorCount: sql`${mcpServers.errorCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(mcpServers.id, serverId))
        .catch(() => {
          // Ignore update errors during error handling
        });

      throw error;
    }
  }

  /**
   * Validate AWS credentials by attempting to list S3 buckets
   */
  static async validateCredentials(params: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }): Promise<boolean> {
    const { accessKeyId, secretAccessKey, region } = params;

    try {
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      // Attempt to list buckets (minimal permission check)
      const command = new ListBucketsCommand({});
      await s3Client.send(command);

      logger.info('✅ [AWS Credentials] Validation successful', {
        region,
        accessKeyId: accessKeyId.substring(0, 8) + '...' // Log partial key only
      });

      return true;

    } catch (error) {
      logger.error('❌ [AWS Credentials] Validation failed', {
        error: error instanceof Error ? error.message : String(error),
        region,
        accessKeyId: accessKeyId.substring(0, 8) + '...'
      });

      return false;
    }
  }

  /**
   * Get and decrypt AWS credentials
   */
  static async getCredentials(params: {
    serverId: string;
    tenantId: string;
  }): Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }> {
    const { serverId, tenantId } = params;

    try {
      const [creds] = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId)
        ))
        .limit(1);

      if (!creds) {
        throw new Error('No AWS credentials found - please configure first');
      }

      // Decrypt credentials
      const credentials = await decryptMCPCredentials(
        creds.encryptedCredentials,
        tenantId
      );

      return {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region || 'us-east-1'
      };

    } catch (error) {
      logger.error('❌ [AWS Credentials] Get credentials failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      throw error;
    }
  }

  /**
   * Test AWS credentials by calling AWS API
   */
  static async testCredentials(params: {
    serverId: string;
    tenantId: string;
  }): Promise<{
    valid: boolean;
    region?: string;
    bucketCount?: number;
    error?: string;
  }> {
    const { serverId, tenantId } = params;

    try {
      const credentials = await this.getCredentials({ serverId, tenantId });

      const s3Client = new S3Client({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey
        }
      });

      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);

      logger.info('✅ [AWS Credentials] Test successful', {
        serverId,
        tenantId,
        bucketCount: response.Buckets?.length || 0
      });

      return {
        valid: true,
        region: credentials.region,
        bucketCount: response.Buckets?.length || 0
      };

    } catch (error) {
      logger.error('❌ [AWS Credentials] Test failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete AWS credentials
   */
  static async deleteCredentials(params: {
    serverId: string;
    tenantId: string;
  }): Promise<void> {
    const { serverId, tenantId } = params;

    try {
      await db
        .delete(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId)
        ));

      // Update server status
      await db
        .update(mcpServers)
        .set({
          status: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(mcpServers.id, serverId));

      logger.info('🗑️ [AWS Credentials] Credentials deleted', {
        serverId,
        tenantId
      });

    } catch (error) {
      logger.error('❌ [AWS Credentials] Delete failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      throw error;
    }
  }
}
