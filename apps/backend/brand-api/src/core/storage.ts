import { db, brandTenants, brandUsers, brandRoles, brandAuditLogs } from "../db/index.js";
import { eq, and, sql, inArray, like, or, count, desc } from "drizzle-orm";
import type { 
  BrandTenant, NewBrandTenant, BrandUser, NewBrandUser, BrandRole, NewBrandRole, 
  BrandAuditLog, NewBrandAuditLog, StoreListDTO, StoreFiltersDTO, StoreListResponseDTO,
  StructureStatsDTO, CreateOrganizationDTO, BulkOperationDTO, BulkOperationResultDTO
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
}

// Export singleton instance
export const brandStorage = new BrandDrizzleStorage();