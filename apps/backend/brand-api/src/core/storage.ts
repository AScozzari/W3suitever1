import { db, brandTenants, brandUsers, brandRoles, brandAuditLogs, aiAgentsRegistry } from "../db/index.js";
import { eq, and, sql, inArray, like, or, count, desc } from "drizzle-orm";
import type { 
  BrandTenant, NewBrandTenant, BrandUser, NewBrandUser, BrandRole, NewBrandRole, 
  BrandAuditLog, NewBrandAuditLog, StoreListDTO, StoreFiltersDTO, StoreListResponseDTO,
  StructureStatsDTO, CreateOrganizationDTO, BulkOperationDTO, BulkOperationResultDTO,
  AIAgent, NewAIAgent
} from "../db/index.js";
import { nanoid } from "nanoid";

export interface IBrandStorage {
  // Tenant operations
  getTenants(): Promise<BrandTenant[]>;
  getTenant(id: string): Promise<BrandTenant | null>;
  createTenant(data: NewBrandTenant): Promise<BrandTenant>;
  updateTenant(id: string, data: Partial<BrandTenant>): Promise<BrandTenant | null>;
  
  // User operations
  getUsers(tenantId?: string): Promise<BrandUser[]>;
  getUser(id: string): Promise<BrandUser | null>;
  getUserByEmail(email: string): Promise<BrandUser | null>;
  createUser(data: NewBrandUser): Promise<BrandUser>;
  updateUser(id: string, data: Partial<BrandUser>): Promise<BrandUser | null>;
  
  // Role operations
  getRoles(tenantId: string): Promise<BrandRole[]>;
  getRole(id: string): Promise<BrandRole | null>;
  createRole(data: NewBrandRole): Promise<BrandRole>;
  updateRole(id: string, data: Partial<BrandRole>): Promise<BrandRole | null>;
  
  // Audit log operations
  createAuditLog(data: NewBrandAuditLog): Promise<BrandAuditLog>;
  getAuditLogs(tenantId?: string, limit?: number): Promise<BrandAuditLog[]>;
  
  // ==================== MANAGEMENT OPERATIONS ====================
  
  // Structure management operations
  getStructureStores(filters: StoreFiltersDTO): Promise<StoreListResponseDTO>;
  getStructureStats(tenantId?: string): Promise<StructureStatsDTO>;
  createOrganization(data: CreateOrganizationDTO): Promise<BrandTenant>;
  performBulkOperation(operation: BulkOperationDTO): Promise<BulkOperationResultDTO>;
  
  // Export operations
  exportStoresCSV(filters: StoreFiltersDTO): Promise<string>;
  
  // ==================== AI AGENTS REGISTRY ====================
  
  // AI Agents operations
  getAIAgents(filters?: { moduleContext?: string; status?: string; search?: string }): Promise<AIAgent[]>;
  getAIAgent(id: string): Promise<AIAgent | null>;
  getAIAgentByAgentId(agentId: string): Promise<AIAgent | null>;
  createAIAgent(data: NewAIAgent): Promise<AIAgent>;
  updateAIAgent(id: string, data: Partial<AIAgent>): Promise<AIAgent | null>;
  deleteAIAgent(id: string): Promise<boolean>;
  bulkUpdateAIAgents(agentIds: string[], operation: string, values?: any): Promise<{ processedCount: number; errorCount: number }>;
  exportAIAgentsCSV(filters?: { moduleContext?: string; status?: string; search?: string }): Promise<string>;
}

class BrandDrizzleStorage implements IBrandStorage {
  // Tenant operations
  async getTenants(): Promise<BrandTenant[]> {
    return await db.select().from(brandTenants);
  }

  async getTenant(id: string): Promise<BrandTenant | null> {
    const results = await db.select()
      .from(brandTenants)
      .where(eq(brandTenants.id, id))
      .limit(1);
    return results[0] || null;
  }

  async createTenant(data: NewBrandTenant): Promise<BrandTenant> {
    const results = await db.insert(brandTenants)
      .values(data)
      .returning();
    return results[0];
  }

  async updateTenant(id: string, data: Partial<BrandTenant>): Promise<BrandTenant | null> {
    const results = await db.update(brandTenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandTenants.id, id))
      .returning();
    return results[0] || null;
  }

  // User operations
  async getUsers(tenantId?: string): Promise<BrandUser[]> {
    if (tenantId) {
      return await db.select()
        .from(brandUsers)
        .where(eq(brandUsers.tenantId, tenantId));
    }
    return await db.select().from(brandUsers);
  }

  async getUser(id: string): Promise<BrandUser | null> {
    const results = await db.select()
      .from(brandUsers)
      .where(eq(brandUsers.id, id))
      .limit(1);
    return results[0] || null;
  }

  async getUserByEmail(email: string): Promise<BrandUser | null> {
    const results = await db.select()
      .from(brandUsers)
      .where(eq(brandUsers.email, email))
      .limit(1);
    return results[0] || null;
  }

  async createUser(data: NewBrandUser): Promise<BrandUser> {
    const userId = data.id || nanoid();
    const results = await db.insert(brandUsers)
      .values({ ...data, id: userId })
      .returning();
    return results[0];
  }

  async updateUser(id: string, data: Partial<BrandUser>): Promise<BrandUser | null> {
    const results = await db.update(brandUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandUsers.id, id))
      .returning();
    return results[0] || null;
  }

  // Role operations
  async getRoles(tenantId: string): Promise<BrandRole[]> {
    return await db.select()
      .from(brandRoles)
      .where(eq(brandRoles.tenantId, tenantId));
  }

  async getRole(id: string): Promise<BrandRole | null> {
    const results = await db.select()
      .from(brandRoles)
      .where(eq(brandRoles.id, id))
      .limit(1);
    return results[0] || null;
  }

  async createRole(data: NewBrandRole): Promise<BrandRole> {
    const results = await db.insert(brandRoles)
      .values(data)
      .returning();
    return results[0];
  }

  async updateRole(id: string, data: Partial<BrandRole>): Promise<BrandRole | null> {
    const results = await db.update(brandRoles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandRoles.id, id))
      .returning();
    return results[0] || null;
  }

  // Audit log operations
  async createAuditLog(data: NewBrandAuditLog): Promise<BrandAuditLog> {
    const results = await db.insert(brandAuditLogs)
      .values(data)
      .returning();
    return results[0];
  }

  async getAuditLogs(tenantId?: string, limit: number = 100): Promise<BrandAuditLog[]> {
    if (tenantId) {
      return await db.select()
        .from(brandAuditLogs)
        .where(eq(brandAuditLogs.tenantId, tenantId))
        .orderBy(sql`${brandAuditLogs.createdAt} DESC`)
        .limit(limit);
    }
    return await db.select()
      .from(brandAuditLogs)
      .orderBy(sql`${brandAuditLogs.createdAt} DESC`)
      .limit(limit);
  }

  // ==================== MANAGEMENT OPERATIONS IMPLEMENTATION ====================

  // Helper function for secure W3 backend calls (same pattern as routes.ts)
  private async secureW3BackendCall(endpoint: string, options: any = {}) {
    try {
      const response = await fetch(`http://localhost:3004${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.W3_SERVICE_TOKEN || 'dev-service-token'}`,
          'X-Service': 'brand-interface',
          'X-Service-Version': '1.0.0',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`W3 Backend error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Secure W3 Backend call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get structure stores with filters and pagination
  async getStructureStores(filters: StoreFiltersDTO): Promise<StoreListResponseDTO> {
    try {
      // Build query parameters for W3 backend
      const queryParams = new URLSearchParams();
      
      if (filters.tenantId) queryParams.set('tenantId', filters.tenantId);
      if (filters.areaCommerciale) queryParams.set('areaCommerciale', filters.areaCommerciale);
      if (filters.canale) queryParams.set('canale', filters.canale);
      if (filters.citta) queryParams.set('citta', filters.citta);
      if (filters.provincia) queryParams.set('provincia', filters.provincia);
      if (filters.stato && filters.stato !== 'all') queryParams.set('stato', filters.stato);
      if (filters.search) queryParams.set('search', filters.search);
      
      queryParams.set('page', String(filters.page || 1));
      queryParams.set('limit', String(filters.limit || 20));

      // Call W3 backend for stores data
      const storesData = await this.secureW3BackendCall(`/api/stores?${queryParams.toString()}`);
      
      // Transform to expected DTO format
      const stores: StoreListDTO[] = storesData.stores.map((store: any) => ({
        id: store.id,
        codigo: store.codigo || store.code,
        ragioneSocialeId: store.legalEntityId,
        ragioneSocialeName: store.legalEntity?.name || 'N/A',
        nome: store.nome || store.name,
        via: store.via || store.address,
        citta: store.citta || store.city,
        provincia: store.provincia || store.province,
        stato: store.stato || store.status || 'active',
        canale: store.canale || store.channel,
        areaCommerciale: store.areaCommerciale || store.commercialArea,
        dataApertura: store.dataApertura || store.openingDate,
        manager: store.manager,
        telefono: store.telefono || store.phone,
        email: store.email,
        tenantId: store.tenantId,
        tenantName: store.tenant?.name || 'N/A'
      }));

      return {
        stores,
        pagination: {
          total: storesData.total || stores.length,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil((storesData.total || stores.length) / (filters.limit || 20))
        },
        filters
      };
    } catch (error) {
      console.error('Error fetching structure stores:', error);
      
      // Fallback to mock data for development
      const mockStores: StoreListDTO[] = [
        {
          id: '1',
          codigo: 'WND001',
          ragioneSocialeId: 'legal-1',
          ragioneSocialeName: 'WindTre S.p.A.',
          nome: 'Store Milano Centro',
          via: 'Via Dante 15',
          citta: 'Milano',
          provincia: 'MI',
          stato: 'active',
          canale: 'Diretto',
          areaCommerciale: 'Nord',
          dataApertura: '2024-01-15',
          manager: 'Mario Rossi',
          telefono: '+39 02 1234567',
          email: 'milano.centro@windtre.it',
          tenantId: '11111111-1111-1111-1111-111111111111',
          tenantName: 'Demo Tenant'
        },
        {
          id: '2',
          codigo: 'WND002',
          ragioneSocialeId: 'legal-1',
          ragioneSocialeName: 'WindTre S.p.A.',
          nome: 'Store Roma EUR',
          via: 'Viale Europa 45',
          citta: 'Roma',
          provincia: 'RM',
          stato: 'active',
          canale: 'Franchising',
          areaCommerciale: 'Centro',
          dataApertura: '2024-02-01',
          manager: 'Laura Bianchi',
          telefono: '+39 06 7654321',
          email: 'roma.eur@windtre.it',
          tenantId: '11111111-1111-1111-1111-111111111111',
          tenantName: 'Demo Tenant'
        }
      ];

      return {
        stores: mockStores,
        pagination: {
          total: mockStores.length,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        filters
      };
    }
  }

  // Get structure statistics
  async getStructureStats(tenantId?: string): Promise<StructureStatsDTO> {
    try {
      const queryParams = tenantId ? `?tenantId=${tenantId}` : '';
      const statsData = await this.secureW3BackendCall(`/api/analytics/stores-stats${queryParams}`);
      
      return {
        totalStores: statsData.totalStores || 0,
        activeStores: statsData.activeStores || 0,
        storesByChannel: statsData.storesByChannel || [
          { canale: 'Diretto', count: 45, percentage: 60 },
          { canale: 'Franchising', count: 25, percentage: 33 },
          { canale: 'Partner', count: 5, percentage: 7 }
        ],
        storesByArea: statsData.storesByArea || [
          { areaCommerciale: 'Nord', count: 30, percentage: 40 },
          { areaCommerciale: 'Centro', count: 25, percentage: 33 },
          { areaCommerciale: 'Sud', count: 20, percentage: 27 }
        ],
        recentStores: statsData.recentStores || [
          { id: '1', nome: 'Store Milano Centro', dataApertura: '2024-01-15', stato: 'active' },
          { id: '2', nome: 'Store Roma EUR', dataApertura: '2024-02-01', stato: 'active' }
        ],
        growth: statsData.growth || {
          thisMonth: 75,
          lastMonth: 70,
          percentage: 7.1
        }
      };
    } catch (error) {
      console.error('Error fetching structure stats:', error);
      
      // Return mock stats for development
      return {
        totalStores: 75,
        activeStores: 70,
        storesByChannel: [
          { canale: 'Diretto', count: 45, percentage: 60 },
          { canale: 'Franchising', count: 25, percentage: 33 },
          { canale: 'Partner', count: 5, percentage: 7 }
        ],
        storesByArea: [
          { areaCommerciale: 'Nord', count: 30, percentage: 40 },
          { areaCommerciale: 'Centro', count: 25, percentage: 33 },
          { areaCommerciale: 'Sud', count: 20, percentage: 27 }
        ],
        recentStores: [
          { id: '1', nome: 'Store Milano Centro', dataApertura: '2024-01-15', stato: 'active' },
          { id: '2', nome: 'Store Roma EUR', dataApertura: '2024-02-01', stato: 'active' }
        ],
        growth: {
          thisMonth: 75,
          lastMonth: 70,
          percentage: 7.1
        }
      };
    }
  }

  // Create new organization (tenant)
  async createOrganization(data: CreateOrganizationDTO): Promise<BrandTenant> {
    try {
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const newTenant: NewBrandTenant = {
        name: data.name,
        slug,
        type: data.type || 'brand_interface',
        brandAdminEmail: data.brandAdminEmail,
        settings: data.settings || {},
        features: data.features || {},
        maxConcurrentUsers: data.maxConcurrentUsers || 50,
        allowedIpRanges: data.allowedIpRanges || []
      };

      return await this.createTenant(newTenant);
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  // Perform bulk operations on stores
  async performBulkOperation(operation: BulkOperationDTO): Promise<BulkOperationResultDTO> {
    try {
      const bulkData = await this.secureW3BackendCall('/api/stores/bulk', {
        method: 'POST',
        body: operation
      });

      return {
        success: bulkData.success || true,
        processedCount: bulkData.processedCount || operation.storeIds.length,
        errorCount: bulkData.errorCount || 0,
        errors: bulkData.errors || [],
        operation: operation.operation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      
      return {
        success: false,
        processedCount: 0,
        errorCount: operation.storeIds.length,
        errors: operation.storeIds.map(id => ({
          storeId: id,
          error: 'Service temporarily unavailable'
        })),
        operation: operation.operation,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Export stores to CSV format
  async exportStoresCSV(filters: StoreFiltersDTO): Promise<string> {
    try {
      const storesData = await this.getStructureStores(filters);
      
      // CSV headers
      const headers = [
        'Codice',
        'Ragione Sociale',
        'Nome Store',
        'Via',
        'Città',
        'Provincia',
        'Stato',
        'Canale',
        'Area Commerciale',
        'Data Apertura',
        'Manager',
        'Telefono',
        'Email',
        'Tenant'
      ];

      // Convert stores to CSV rows
      const rows = storesData.stores.map(store => [
        store.codigo,
        store.ragioneSocialeName,
        store.nome,
        store.via,
        store.citta,
        store.provincia,
        store.stato,
        store.canale,
        store.areaCommerciale,
        store.dataApertura || '',
        store.manager || '',
        store.telefono || '',
        store.email || '',
        store.tenantName
      ]);

      // Format as CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting stores CSV:', error);
      throw error;
    }
  }

  // ==================== AI AGENTS REGISTRY IMPLEMENTATION ====================

  async getAIAgents(filters?: { moduleContext?: string; status?: string; search?: string }): Promise<AIAgent[]> {
    try {
      let query = db.select().from(aiAgentsRegistry);
      
      const conditions = [];
      
      if (filters?.moduleContext && filters.moduleContext !== 'all') {
        conditions.push(eq(aiAgentsRegistry.moduleContext, filters.moduleContext as any));
      }
      
      if (filters?.status && filters.status !== 'all') {
        conditions.push(eq(aiAgentsRegistry.status, filters.status as any));
      }
      
      if (filters?.search) {
        conditions.push(
          or(
            like(aiAgentsRegistry.name, `%${filters.search}%`),
            like(aiAgentsRegistry.agentId, `%${filters.search}%`),
            like(aiAgentsRegistry.description, `%${filters.search}%`)
          )
        );
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(aiAgentsRegistry.updatedAt));
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      return [];
    }
  }

  async getAIAgent(id: string): Promise<AIAgent | null> {
    try {
      const results = await db.select()
        .from(aiAgentsRegistry)
        .where(eq(aiAgentsRegistry.id, id))
        .limit(1);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching AI agent:', error);
      return null;
    }
  }

  async getAIAgentByAgentId(agentId: string): Promise<AIAgent | null> {
    try {
      const results = await db.select()
        .from(aiAgentsRegistry)
        .where(eq(aiAgentsRegistry.agentId, agentId))
        .limit(1);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching AI agent by agentId:', error);
      return null;
    }
  }

  async createAIAgent(data: NewAIAgent): Promise<AIAgent> {
    try {
      const results = await db.insert(aiAgentsRegistry)
        .values({
          ...data,
          id: nanoid(),
          version: 1,
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`✅ AI Agent created: ${data.agentId}`);
      return results[0];
    } catch (error) {
      console.error('Error creating AI agent:', error);
      throw error;
    }
  }

  async updateAIAgent(id: string, data: Partial<AIAgent>): Promise<AIAgent | null> {
    try {
      const results = await db.update(aiAgentsRegistry)
        .set({ 
          ...data, 
          updatedAt: new Date(),
          version: sql`${aiAgentsRegistry.version} + 1`
        })
        .where(eq(aiAgentsRegistry.id, id))
        .returning();
      
      if (results[0]) {
        console.log(`✅ AI Agent updated: ${results[0].agentId}`);
      }
      
      return results[0] || null;
    } catch (error) {
      console.error('Error updating AI agent:', error);
      throw error;
    }
  }

  async deleteAIAgent(id: string): Promise<boolean> {
    try {
      const results = await db.delete(aiAgentsRegistry)
        .where(eq(aiAgentsRegistry.id, id))
        .returning();
      
      const deleted = results.length > 0;
      if (deleted) {
        console.log(`✅ AI Agent deleted: ${id}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      return false;
    }
  }

  async bulkUpdateAIAgents(agentIds: string[], operation: string, values?: any): Promise<{ processedCount: number; errorCount: number }> {
    let processedCount = 0;
    let errorCount = 0;
    
    try {
      for (const agentId of agentIds) {
        try {
          let updateData: Partial<AIAgent> = { updatedAt: new Date() };
          
          switch (operation) {
            case 'activate':
              updateData.status = 'active';
              break;
            case 'deactivate':
              updateData.status = 'inactive';
              break;
            case 'deprecate':
              updateData.status = 'deprecated';
              break;
            case 'delete':
              await this.deleteAIAgent(agentId);
              processedCount++;
              continue;
            default:
              if (values) {
                updateData = { ...updateData, ...values };
              }
          }
          
          const result = await this.updateAIAgent(agentId, updateData);
          if (result) {
            processedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error in bulk operation for agent ${agentId}:`, error);
          errorCount++;
        }
      }
      
      console.log(`✅ Bulk operation completed: ${processedCount} processed, ${errorCount} errors`);
      return { processedCount, errorCount };
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async exportAIAgentsCSV(filters?: { moduleContext?: string; status?: string; search?: string }): Promise<string> {
    try {
      const agents = await this.getAIAgents(filters);
      
      // CSV headers
      const headers = [
        'ID',
        'Agent ID',
        'Nome',
        'Descrizione',
        'Modulo',
        'Stato',
        'Versione',
        'Creato',
        'Aggiornato'
      ];
      
      // Convert agents to CSV rows
      const rows = agents.map(agent => [
        agent.id,
        agent.agentId,
        agent.name,
        agent.description || '',
        agent.moduleContext,
        agent.status,
        agent.version.toString(),
        agent.createdAt.toISOString(),
        agent.updatedAt.toISOString()
      ]);
      
      // Format as CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting AI agents CSV:', error);
      throw error;
    }
  }

  // 🎯 CROSS-TENANT RAG: Recupera knowledge base combinando brand + tenant
  async getAgentCrossTenantKnowledge(agentId: string, options: {
    includeDocuments?: boolean;
    includeUrls?: boolean;
    limit?: number;
  } = {}): Promise<{
    items: any[];
    stats: {
      documents: number;
      urls: number;
      totalEmbeddings: number;
      brandLevel: number;
      tenantLevel: number;
    };
  }> {
    try {
      console.log(`🧠 [CROSS-TENANT RAG] Fetching knowledge for agent: ${agentId}`);
      
      // TODO: Implementare query reale quando vectorEmbeddings schema è aggiornato
      // Query would be:
      // SELECT * FROM w3suite.vector_embeddings 
      // WHERE agent_id = ? AND status = 'ready'
      // AND (origin = 'brand' OR (origin = 'tenant' AND tenant_id = ?))
      // ORDER BY origin, created_at DESC
      
      // Per ora mock data per testing UI
      const mockKnowledge = {
        items: [
          {
            id: '1',
            agentId,
            sourceType: 'pdf_document',
            origin: 'brand',
            filename: 'WindTre_Sales_Guide_2024.pdf',
            contentPreview: 'Guida completa alle vendite WindTre per il 2024...',
            createdAt: '2024-09-20T10:00:00Z',
            tenantId: null // Brand-level
          },
          {
            id: '2',  
            agentId,
            sourceType: 'url_content',
            origin: 'brand',
            sourceUrl: 'https://windtre.it/offerte-mobile',
            contentPreview: 'Tutte le offerte mobile WindTre aggiornate...',
            createdAt: '2024-09-21T15:30:00Z',
            tenantId: null // Brand-level
          }
        ],
        stats: {
          documents: 1,
          urls: 1,
          totalEmbeddings: 2,
          brandLevel: 2, // Brand-managed knowledge
          tenantLevel: 0  // Tenant-specific knowledge
        }
      };
      
      return mockKnowledge;
    } catch (error) {
      console.error('Error fetching cross-tenant knowledge:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const brandStorage = new BrandDrizzleStorage();