/**
 * 🎯 BASE EXECUTOR
 * 
 * Abstract base class providing dependency injection runtime access
 * to all workflow executors. Eliminates direct imports to backend services.
 */

import type { ActionExecutor, ActionExecutionResult, ExecutorRuntime } from '../types';

/**
 * Base class for all workflow executors
 * Provides runtime dependency injection and common utilities
 */
export abstract class BaseExecutor implements ActionExecutor {
  abstract executorId: string;
  abstract description: string;

  protected runtime: ExecutorRuntime;

  constructor(runtime: ExecutorRuntime) {
    this.runtime = runtime;
  }

  /**
 * Execute workflow step with provided input data and context
   */
  abstract execute(
    step: any,
    inputData?: Record<string, any>,
    context?: any
  ): Promise<ActionExecutionResult>;

  /**
   * Helper: Log info message
   */
  protected logInfo(message: string, meta?: Record<string, any>): void {
    this.runtime.logger.info(message, meta);
  }

  /**
   * Helper: Log error message
   */
  protected logError(message: string, meta?: Record<string, any>): void {
    this.runtime.logger.error(message, meta);
  }

  /**
   * Helper: Log warning message
   */
  protected logWarn(message: string, meta?: Record<string, any>): void {
    this.runtime.logger.warn(message, meta);
  }

  /**
   * Helper: Send notification
   */
  protected async sendNotification(
    tenantId: string,
    userId: string,
    title: string,
    message: string,
    type: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.runtime.notifications.sendNotification(
      tenantId,
      userId,
      title,
      message,
      type,
      priority,
      metadata
    );
  }

  /**
   * Helper: Send email notification
   */
  protected async sendEmail(
    tenantId: string,
    recipient: string,
    subject: string,
    message: string,
    type: string = 'workflow',
    priority: 'low' | 'medium' | 'high' = 'medium',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.runtime.notifications.sendEmailNotification(
      tenantId,
      recipient,
      subject,
      message,
      type,
      priority,
      metadata
    );
  }

  /**
   * Helper: Call AI service
   */
  protected async callAI(
    prompt: string,
    context: {
      agentId: string;
      tenantId: string;
      userId: string;
      moduleContext: string;
      businessEntityId?: string;
    },
    settings?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<{
    success: boolean;
    output?: string;
    tokensUsed?: number;
    cost?: number;
  }> {
    return await this.runtime.ai.createUnifiedResponse(
      prompt,
      settings || {},
      context
    );
  }

  /**
   * Helper: Validate user scope access
   */
  protected async validateUserScope(
    userId: string,
    tenantId: string,
    storeId?: string,
    legalEntityId?: string
  ): Promise<{ hasAccess: boolean; message?: string }> {
    try {
      const assignments = await this.runtime.database.getUserAssignments(userId, tenantId);

      if (assignments.length === 0) {
        return {
          hasAccess: false,
          message: 'Utente non ha scope assignments configurati'
        };
      }

      // Check tenant-wide access
      const hasTenantAccess = assignments.some((a: any) => a.scopeType === 'tenant');
      if (hasTenantAccess) {
        return { hasAccess: true };
      }

      // Check store-level access
      if (storeId) {
        const hasStoreAccess = assignments.some(
          (a: any) => a.scopeType === 'store' && a.scopeId === storeId
        );
        if (hasStoreAccess) {
          return { hasAccess: true };
        }

        // Check indirect access via legal entity
        const store = await this.runtime.database.getStore(storeId);
        if (store?.legalEntityId) {
          const hasLegalEntityAccess = assignments.some(
            (a: any) => a.scopeType === 'legal_entity' && a.scopeId === store.legalEntityId
          );
          if (hasLegalEntityAccess) {
            return { hasAccess: true };
          }
        }

        return {
          hasAccess: false,
          message: 'Non hai permessi per operare sul punto vendita specificato'
        };
      }

      // Check legal_entity-level access
      if (legalEntityId) {
        const hasLegalEntityAccess = assignments.some(
          (a: any) => a.scopeType === 'legal_entity' && a.scopeId === legalEntityId
        );
        if (hasLegalEntityAccess) {
          return { hasAccess: true };
        }

        return {
          hasAccess: false,
          message: 'Non hai permessi per operare sulla ragione sociale specificata'
        };
      }

      return { hasAccess: true };
    } catch (error) {
      this.logError('❌ Scope validation error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
        storeId,
        legalEntityId
      });
      return {
        hasAccess: false,
        message: 'Errore durante la validazione dello scope'
      };
    }
  }
}
