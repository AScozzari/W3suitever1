/**
 * 🎯 EXECUTOR RUNTIME INTERFACE
 * 
 * Consolidated dependency injection interface for all executors.
 * Decouples executors from specific backend implementations.
 * 
 * Brand Interface and W3 Suite can provide their own implementations
 * of this runtime while executors remain agnostic.
 */

/**
 * Logging interface for executor operations
 */
export interface ExecutorLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Notification service interface for sending notifications
 */
export interface ExecutorNotificationService {
  sendNotification(
    tenantId: string,
    userId: string,
    title: string,
    message: string,
    type: string,
    priority: 'low' | 'medium' | 'high',
    metadata?: Record<string, any>
  ): Promise<void>;

  sendEmailNotification(
    tenantId: string,
    recipient: string,
    subject: string,
    message: string,
    type: string,
    priority: 'low' | 'medium' | 'high',
    metadata?: Record<string, any>
  ): Promise<void>;
}

/**
 * AI service interface for workflow assistant integration
 */
export interface ExecutorAIService {
  createUnifiedResponse(
    input: string,
    settings: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
    context: {
      agentId: string;
      tenantId: string;
      userId: string;
      moduleContext: string;
      businessEntityId?: string;
    }
  ): Promise<{
    success: boolean;
    output?: string;
    tokensUsed?: number;
    cost?: number;
  }>;
}

/**
 * MCP client service interface for external service connectors
 */
export interface ExecutorMCPService {
  getUserCredentials(
    userId: string,
    tenantId: string,
    serviceType: string
  ): Promise<{ accessToken?: string; metadata?: Record<string, any> } | null>;

  callTool(
    serviceType: string,
    toolName: string,
    args: Record<string, any>,
    context: {
      userId: string;
      tenantId: string;
      accessToken?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }>;
}

/**
 * Database interface for executor data access
 * Uses generic type to allow different schema implementations
 */
export interface ExecutorDatabaseService {
  // User & Team queries
  getUserAssignments(userId: string, tenantId: string): Promise<any[]>;
  getStore(storeId: string): Promise<any | null>;
  getLegalEntity(legalEntityId: string): Promise<any | null>;
  findTeamByDepartment(department: string, tenantId: string): Promise<any | null>;

  // CRM queries
  getCampaigns(tenantId: string, filters?: Record<string, any>): Promise<any[]>;
  getPipelines(tenantId: string, filters?: Record<string, any>): Promise<any[]>;
  getDeal(dealId: string): Promise<any | null>;
  updateDeal(dealId: string, data: Record<string, any>): Promise<void>;

  // Funnel queries
  getFunnelStages(funnelId: string): Promise<any[]>;
  getFunnelPipelines(funnelId: string): Promise<any[]>;

  // Generic query access (for advanced use cases)
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * Consolidated executor runtime providing all dependencies
 */
export interface ExecutorRuntime {
  logger: ExecutorLogger;
  notifications: ExecutorNotificationService;
  ai: ExecutorAIService;
  mcp: ExecutorMCPService;
  database: ExecutorDatabaseService;
  
  // Environment/config access
  env: {
    isDevelopment: boolean;
    region?: string;
  };
}

/**
 * Factory function type for creating executor instances with runtime
 */
export type ExecutorFactory<T> = (runtime: ExecutorRuntime) => T;
