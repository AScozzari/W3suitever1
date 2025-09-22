/**
 * COMPATIBILITY LAYER: Universal Requests System
 * FASE 2.3: Backward compatibility for legacy hrRequests and leaveRequests APIs
 * 
 * This layer provides seamless transition from fragmented request systems
 * to the unified universalRequests architecture while maintaining API compatibility.
 */

import { db } from './db';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { 
  universalRequests, 
  hrRequests, 
  leaveRequests,
  hrRequestApprovals,
  hrRequestComments,
  hrRequestStatusHistory 
} from '../db/schema/w3suite';
import { setTenantContext } from './db';

// ==========================================
// TYPE DEFINITIONS FOR LEGACY COMPATIBILITY
// ==========================================

export interface LegacyHrRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  category: string;
  type: string;
  description?: string;
  payload?: any;
  status: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  attachments?: string[];
  approvalChain?: any[];
  currentApproverId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LegacyLeaveRequest {
  id: string;
  tenantId: string;
  userId: string;
  storeId?: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  notes?: string;
  status: string;
  approvalChain?: any[];
  currentApprover?: string;
  coveredBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==========================================
// COMPATIBILITY LAYER SERVICE
// ==========================================

export class CompatibilityLayerService {
  
  /**
   * Get HR Requests with legacy format
   * Proxy to universalRequests with data transformation
   */
  async getLegacyHrRequests(
    tenantId: string, 
    requesterId?: string,
    filters?: { status?: string; category?: string; type?: string }
  ): Promise<LegacyHrRequest[]> {
    await setTenantContext(tenantId);
    
    // Build where conditions
    const whereConditions = [
      eq(universalRequests.tenantId, tenantId),
      eq(universalRequests.category, 'HR' as any) // HR requests only
    ];
    
    if (requesterId) {
      whereConditions.push(eq(universalRequests.requesterId, requesterId));
    }
    
    if (filters?.status) {
      whereConditions.push(eq(universalRequests.status, filters.status as any));
    }
    
    // Query universalRequests
    const requests = await db
      .select()
      .from(universalRequests)
      .where(and(...whereConditions))
      .orderBy(desc(universalRequests.createdAt));
    
    // Transform to legacy format
    return requests
      .filter(req => {
        // Additional filtering based on request_data content
        const data = req.requestData as any;
        if (filters?.category && data?.category !== filters.category) return false;
        if (filters?.type && data?.type !== filters.type) return false;
        return data?.originalTable === 'hr_requests' || !data?.originalTable; // Include both migrated and new
      })
      .map(req => this.transformToLegacyHrRequest(req));
  }
  
  /**
   * Get Leave Requests with legacy format
   * Proxy to universalRequests with data transformation
   */
  async getLegacyLeaveRequests(
    tenantId: string,
    userId?: string,
    filters?: { status?: string; leaveType?: string }
  ): Promise<LegacyLeaveRequest[]> {
    await setTenantContext(tenantId);
    
    // Build where conditions
    const whereConditions = [
      eq(universalRequests.tenantId, tenantId),
      eq(universalRequests.category, 'HR' as any),
      eq(universalRequests.requestType, 'leave')
    ];
    
    if (userId) {
      whereConditions.push(eq(universalRequests.requesterId, userId));
    }
    
    if (filters?.status) {
      whereConditions.push(eq(universalRequests.status, filters.status as any));
    }
    
    // Query universalRequests
    const requests = await db
      .select()
      .from(universalRequests)
      .where(and(...whereConditions))
      .orderBy(desc(universalRequests.createdAt));
    
    // Transform to legacy format
    return requests
      .filter(req => {
        const data = req.requestData as any;
        if (filters?.leaveType && data?.leaveType !== filters.leaveType) return false;
        return data?.originalTable === 'leave_requests' || !data?.originalTable;
      })
      .map(req => this.transformToLegacyLeaveRequest(req));
  }
  
  /**
   * Create HR Request via compatibility layer
   * Creates universalRequest but maintains legacy interface
   */
  async createLegacyHrRequest(
    tenantId: string,
    requestData: Partial<LegacyHrRequest>
  ): Promise<LegacyHrRequest> {
    await setTenantContext(tenantId);
    
    // Transform legacy data to universal format
    const [created] = await db
      .insert(universalRequests)
      .values({
        tenantId,
        requesterId: requestData.requesterId!,
        category: (requestData.category as any) || 'HR',
        requestType: requestData.type || 'general',
        title: `HR Request - ${requestData.category} - ${requestData.type}`,
        description: requestData.description,
        requestData: {
          category: requestData.category,
          type: requestData.type,
          payload: requestData.payload || {},
          originalAPI: 'hr_requests', // Mark as created via legacy API
          legacyCompatibility: true
        },
        status: (requestData.status as any) || 'draft',
        priority: requestData.priority || 'normal',
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        attachments: requestData.attachments || [],
        approvalChain: requestData.approvalChain || [],
        currentApproverId: requestData.currentApproverId,
        createdBy: requestData.requesterId!,
        updatedBy: requestData.requesterId!
      })
      .returning();
    
    return this.transformToLegacyHrRequest(created);
  }
  
  /**
   * Create Leave Request via compatibility layer
   */
  async createLegacyLeaveRequest(
    tenantId: string,
    requestData: Partial<LegacyLeaveRequest>
  ): Promise<LegacyLeaveRequest> {
    await setTenantContext(tenantId);
    
    // Transform legacy data to universal format
    const [created] = await db
      .insert(universalRequests)
      .values({
        tenantId,
        requesterId: requestData.userId!,
        storeId: requestData.storeId,
        category: 'HR' as any,
        requestType: 'leave',
        requestSubtype: requestData.leaveType,
        title: `Leave Request - ${requestData.leaveType}`,
        description: requestData.reason,
        requestData: {
          leaveType: requestData.leaveType,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
          totalDays: requestData.totalDays,
          reason: requestData.reason,
          notes: requestData.notes,
          coveredBy: requestData.coveredBy,
          originalAPI: 'leave_requests', // Mark as created via legacy API
          legacyCompatibility: true
        },
        status: (requestData.status as any) || 'draft',
        priority: 'normal',
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        approvalChain: requestData.approvalChain || [],
        currentApproverId: requestData.currentApprover,
        createdBy: requestData.userId!,
        updatedBy: requestData.userId!
      })
      .returning();
    
    return this.transformToLegacyLeaveRequest(created);
  }
  
  /**
   * Get legacy HR request by ID
   */
  async getLegacyHrRequestById(tenantId: string, requestId: string): Promise<LegacyHrRequest | null> {
    await setTenantContext(tenantId);
    
    const [request] = await db
      .select()
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!request) return null;
    
    return this.transformToLegacyHrRequest(request);
  }
  
  /**
   * Get legacy Leave request by ID
   */
  async getLegacyLeaveRequestById(tenantId: string, requestId: string): Promise<LegacyLeaveRequest | null> {
    await setTenantContext(tenantId);
    
    const [request] = await db
      .select()
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId),
        eq(universalRequests.requestType, 'leave')
      ))
      .limit(1);
    
    if (!request) return null;
    
    return this.transformToLegacyLeaveRequest(request);
  }
  
  // ==========================================
  // TRANSFORMATION HELPERS
  // ==========================================
  
  private transformToLegacyHrRequest(request: any): LegacyHrRequest {
    const data = request.requestData as any || {};
    
    return {
      id: request.id,
      tenantId: request.tenantId,
      requesterId: request.requesterId,
      category: data.category || request.category,
      type: data.type || request.requestType,
      description: request.description,
      payload: data.payload || {},
      status: request.status,
      priority: request.priority,
      startDate: request.startDate,
      endDate: request.endDate,
      attachments: request.attachments || [],
      approvalChain: request.approvalChain || [],
      currentApproverId: request.currentApproverId,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }
  
  private transformToLegacyLeaveRequest(request: any): LegacyLeaveRequest {
    const data = request.requestData as any || {};
    
    return {
      id: request.id,
      tenantId: request.tenantId,
      userId: request.requesterId,
      storeId: request.storeId,
      leaveType: data.leaveType || request.requestSubtype,
      startDate: new Date(data.startDate || request.startDate),
      endDate: new Date(data.endDate || request.endDate),
      totalDays: data.totalDays || 1,
      reason: data.reason || request.description,
      notes: data.notes,
      status: request.status,
      approvalChain: request.approvalChain || [],
      currentApprover: request.currentApproverId,
      coveredBy: data.coveredBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }
  
  // ==========================================
  // DEPRECATION WARNINGS
  // ==========================================
  
  /**
   * Log deprecation warning for legacy API usage
   */
  private logDeprecationWarning(apiEndpoint: string, tenantId: string): void {
    console.warn(`
    🚨 DEPRECATION WARNING: Legacy API Usage Detected
    
    Endpoint: ${apiEndpoint}
    Tenant: ${tenantId}
    Timestamp: ${new Date().toISOString()}
    
    This endpoint is deprecated and will be removed in a future version.
    Please migrate to the Universal Requests API: /api/universal/requests
    
    Migration Guide: https://docs.w3suite.com/migration/universal-requests
    `);
  }
  
  /**
   * Add deprecation headers to response
   */
  addDeprecationHeaders(res: any, newEndpoint: string): void {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecation-Date', '2025-12-31');
    res.setHeader('X-API-Replacement', newEndpoint);
    res.setHeader('Warning', '299 - "This API is deprecated. Use ' + newEndpoint + ' instead"');
  }
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const compatibilityLayer = new CompatibilityLayerService();