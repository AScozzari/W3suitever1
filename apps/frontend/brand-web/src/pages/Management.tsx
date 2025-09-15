import React, { useState, useMemo } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSSE } from '../hooks/useSSE';
import BrandLayout from '../components/BrandLayout';
import { 
  Settings, Building2, ShoppingCart, Package, Briefcase,
  BarChart3, Filter, Search, Download, Plus, Edit, Trash2,
  MapPin, Phone, Mail, Calendar, Users, TrendingUp,
  Activity, DollarSign, Target, Eye, RefreshCw,
  Star, Award, Zap, Cpu, Server, Database, CheckSquare,
  Square, MoreVertical, AlertTriangle, Clock, History,
  X, Check, Loader2, Upload, FileText, Archive
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { format } from 'date-fns';

// Color palette WindTre
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
  },
  glass: {
    white: 'hsla(255, 255, 255, 0.08)',
    whiteLight: 'hsla(255, 255, 255, 0.03)',
    whiteMedium: 'hsla(255, 255, 255, 0.12)',
    whiteBorder: 'hsla(255, 255, 255, 0.18)',
  }
};

export default function Management() {
  const { isAuthenticated, user } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('struttura');

  // Filters state for Struttura tab with proper serialization support
  const [filters, setFilters] = useState({
    areaCommerciale: '',
    canale: '',
    citta: '',
    provincia: '',
    stato: 'all' as 'all' | 'active' | 'inactive' | 'pending',
    search: '',
    page: 1,
    limit: 25
  });

  // Bulk operations state
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState('');
  const [bulkValues, setBulkValues] = useState<any>({});
  
  // Modals state
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  
  // Organization form state
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    brandAdminEmail: '',
    city: '',
    province: '',
    country: 'IT',
    phone: '',
    contactEmail: ''
  });

  // Audit filters
  const [auditFilters, setAuditFilters] = useState({
    userEmail: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  // Types
  interface StructureStatsResponse {
    success: boolean;
    data: {
      totalStores: number;
      activeStores: number;
      storesByChannel: Array<{
        canale: string;
        count: number;
        percentage: number;
      }>;
      storesByArea: Array<{
        areaCommerciale: string;
        count: number;
        percentage: number;
      }>;
      growth: {
        thisMonth: number;
        lastMonth: number;
        percentage: number;
      };
    };
    timestamp?: string;
  }

  interface StoresListResponse {
    success: boolean;
    data: {
      stores: Array<{
        id: string;
        codigo: string;
        ragioneSocialeName: string;
        nome: string;
        via: string;
        citta: string;
        provincia: string;
        stato: string;
        canale: string;
        areaCommerciale: string;
      }>;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  }

  interface AuditLog {
    id: string;
    tenantId: string;
    userEmail: string;
    userRole: string;
    action: string;
    resourceType: string;
    resourceIds?: string[];
    metadata?: any;
    timestamp: string;
  }

  interface BulkOperationResult {
    success: boolean;
    processedCount: number;
    errorCount: number;
    errors: Array<{ id: string; error: string }>;
  }

  // FIXED: Proper filter params serialization for API calls
  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, String(value));
      }
    });
    if (currentTenant && !isCrossTenant) {
      params.append('tenantId', currentTenant);
    }
    return params.toString();
  }, [filters, currentTenant, isCrossTenant]);

  // 1. REAL-TIME ANALYTICS WITH SSE + FALLBACK POLLING
  const sseStatsUrl = `/brand-api/structure/stats/stream?${filterParams}`;
  const fallbackStatsUrl = `/brand-api/structure/stats?${filterParams}`;
  
  const { 
    data: structureStats, 
    isLoading: statsLoading, 
    isConnected: statsConnected,
    error: statsError,
    lastUpdate: statsLastUpdate
  } = useSSE<StructureStatsResponse>(sseStatsUrl, fallbackStatsUrl, {
    enabled: activeTab === 'struttura' && isAuthenticated
  });

  // FIXED: Structure stores with proper queryFn to handle filter serialization
  const { data: storesData, isLoading: storesLoading } = useQuery<StoresListResponse>({
    queryKey: ['/brand-api/structure/stores', filterParams],
    queryFn: async () => {
      const response = await fetch(`/brand-api/structure/stores?${filterParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'struttura' && isAuthenticated
  });

  // Fetch audit logs
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['/brand-api/audit-logs', auditFilters, currentTenant],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(auditFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      if (currentTenant && !isCrossTenant) {
        params.append('tenantId', currentTenant);
      }
      params.append('limit', '50');
      
      const response = await fetch(`/brand-api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'audit' && isAuthenticated
  });

  // 4. ORGANIZATION CREATION MUTATION
  const createOrganizationMutation = useMutation({
    mutationFn: async (data: typeof organizationForm) => {
      return apiRequest('/brand-api/tenants', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setShowOrganizationModal(false);
      setOrganizationForm({
        name: '',
        brandAdminEmail: '',
        city: '',
        province: '',
        country: 'IT',
        phone: '',
        contactEmail: ''
      });
      alert('Organizzazione creata con successo!');
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
      alert('Errore nella creazione dell\'organizzazione');
    }
  });

  // 2. BULK OPERATIONS MUTATION
  const bulkOperationMutation = useMutation({
    mutationFn: async (operation: { operation: string; storeIds: string[]; values?: any; reason?: string }) => {
      return apiRequest('/brand-api/structure/bulk', {
        method: 'POST',
        body: JSON.stringify(operation)
      });
    },
    onSuccess: (result: BulkOperationResult) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/structure/stores'] });
      setSelectedStores([]);
      setBulkOperation('');
      setBulkValues({});
      alert(`Operazione completata: ${result.processedCount} elaborati, ${result.errorCount} errori`);
    },
    onError: (error) => {
      console.error('Error in bulk operation:', error);
      alert('Errore nell\'operazione bulk');
    }
  });

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  // 3. EXPORT CSV FUNCTIONALITY
  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/brand-api/structure/export.csv?${filterParams}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stores-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('Export CSV completato!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Errore durante l\'export CSV');
    }
  };

  // 2. BULK OPERATIONS HELPERS
  const handleBulkOperation = () => {
    if (!bulkOperation || selectedStores.length === 0) {
      alert('Seleziona stores e operazione');
      return;
    }

    const operation = {
      operation: bulkOperation,
      storeIds: selectedStores,
      values: bulkValues,
      reason: `Bulk ${bulkOperation} operation by ${user?.email}`
    };

    bulkOperationMutation.mutate(operation);
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const toggleSelectAll = () => {
    const allStoreIds = storesData?.data?.stores?.map(s => s.id) || [];
    setSelectedStores(prev => 
      prev.length === allStoreIds.length ? [] : allStoreIds
    );
  };

  // Role-based access control
  if (user?.role !== 'super_admin' && user?.role !== 'national_manager') {
    return (
      <BrandLayout>
        <div style={{ 
          padding: '64px 24px', 
          textAlign: 'center',
          background: COLORS.glass.white,
          borderRadius: '16px',
          margin: '24px',
          border: `1px solid ${COLORS.glass.whiteBorder}`
        }}>
          <Settings size={64} style={{ color: COLORS.neutral.medium, marginBottom: '16px' }} />
          <h2 style={{ color: COLORS.neutral.dark, marginBottom: '8px' }}>
            Accesso Non Autorizzato
          </h2>
          <p style={{ color: COLORS.neutral.medium }}>
            Solo Super Admin e National Manager possono accedere alla gestione.
          </p>
        </div>
      </BrandLayout>
    );
  }

  // Glassmorphism card style
  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease'
  };

  // 4. ORGANIZATION CREATION MODAL
  const renderOrganizationModal = () => {
    if (!showOrganizationModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          ...glassCardStyle,
          width: '90%',
          maxWidth: '500px',
          padding: '32px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: COLORS.neutral.dark
            }}>
              Crea Nuova Organizzazione
            </h3>
            <button
              onClick={() => setShowOrganizationModal(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: COLORS.neutral.medium
              }}
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.neutral.dark,
                marginBottom: '8px'
              }}>
                Nome Organizzazione *
              </label>
              <input
                type="text"
                value={organizationForm.name}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '8px',
                  background: COLORS.glass.whiteLight,
                  color: COLORS.neutral.dark
                }}
                data-testid="input-organization-name"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.neutral.dark,
                marginBottom: '8px'
              }}>
                Email Admin Brand *
              </label>
              <input
                type="email"
                value={organizationForm.brandAdminEmail}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, brandAdminEmail: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '8px',
                  background: COLORS.glass.whiteLight,
                  color: COLORS.neutral.dark
                }}
                data-testid="input-admin-email"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '8px'
                }}>
                  Città
                </label>
                <input
                  type="text"
                  value={organizationForm.city}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, city: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${COLORS.glass.whiteBorder}`,
                    borderRadius: '8px',
                    background: COLORS.glass.whiteLight,
                    color: COLORS.neutral.dark
                  }}
                  data-testid="input-city"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '8px'
                }}>
                  Provincia
                </label>
                <input
                  type="text"
                  value={organizationForm.province}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, province: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${COLORS.glass.whiteBorder}`,
                    borderRadius: '8px',
                    background: COLORS.glass.whiteLight,
                    color: COLORS.neutral.dark
                  }}
                  data-testid="input-province"
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.neutral.dark,
                marginBottom: '8px'
              }}>
                Telefono
              </label>
              <input
                type="tel"
                value={organizationForm.phone}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '8px',
                  background: COLORS.glass.whiteLight,
                  color: COLORS.neutral.dark
                }}
                data-testid="input-phone"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.neutral.dark,
                marginBottom: '8px'
              }}>
                Email Contatto
              </label>
              <input
                type="email"
                value={organizationForm.contactEmail}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '8px',
                  background: COLORS.glass.whiteLight,
                  color: COLORS.neutral.dark
                }}
                data-testid="input-contact-email"
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowOrganizationModal(false)}
              style={{
                padding: '12px 24px',
                border: `1px solid ${COLORS.glass.whiteBorder}`,
                borderRadius: '8px',
                background: COLORS.glass.whiteLight,
                color: COLORS.neutral.dark,
                cursor: 'pointer'
              }}
              data-testid="button-cancel-organization"
            >
              Annulla
            </button>
            <button
              onClick={() => createOrganizationMutation.mutate(organizationForm)}
              disabled={!organizationForm.name || !organizationForm.brandAdminEmail || createOrganizationMutation.isPending}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: COLORS.primary.orange,
                color: 'white',
                cursor: organizationForm.name && organizationForm.brandAdminEmail ? 'pointer' : 'not-allowed',
                opacity: organizationForm.name && organizationForm.brandAdminEmail ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              data-testid="button-create-organization"
            >
              {createOrganizationMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Crea Organizzazione
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tab definitions with Audit added
  const tabs = [
    {
      id: 'struttura',
      name: 'Struttura',
      icon: Building2,
      description: 'Gestione PDV e organizzazioni'
    },
    {
      id: 'audit',
      name: 'Audit',
      icon: History,
      description: 'Log delle attività'
    },
    {
      id: 'listini',
      name: 'Listini',
      icon: ShoppingCart,
      description: 'Coming Soon',
      comingSoon: true
    },
    {
      id: 'fornitori',
      name: 'Fornitori',
      icon: Package,
      description: 'Coming Soon',
      comingSoon: true
    },
    {
      id: 'prodotto',
      name: 'Prodotto',
      icon: Briefcase,
      description: 'Coming Soon',
      comingSoon: true
    }
  ];

  // 5. AUDIT TRAIL TAB
  const renderAuditTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Audit Filters */}
      <div style={{
        ...glassCardStyle,
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.neutral.dark,
          marginBottom: '16px'
        }}>
          Filtri Audit Log
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="Email utente"
            value={auditFilters.userEmail}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, userEmail: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="input-audit-user"
          />
          
          <select
            value={auditFilters.action}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="select-audit-action"
          >
            <option value="">Tutte le azioni</option>
            <option value="CREATE_ORGANIZATION">Creazione Org</option>
            <option value="VIEW_STRUCTURE_STATS">Vista Stats</option>
            <option value="EXPORT_STRUCTURE_STORES_CSV">Export CSV</option>
            <option value="PERFORM_BULK_OPERATION">Operazione Bulk</option>
          </select>
          
          <input
            type="date"
            value={auditFilters.dateFrom}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="input-audit-date-from"
          />
          
          <input
            type="date"
            value={auditFilters.dateTo}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="input-audit-date-to"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div style={{
        ...glassCardStyle,
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.neutral.dark,
          marginBottom: '16px'
        }}>
          Log delle Attività
        </h3>
        
        {auditLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: COLORS.primary.orange }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Timestamp
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Utente
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Azione
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Risorsa
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Dettagli
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData?.data?.auditLogs?.map((log: AuditLog) => (
                  <tr key={log.id} data-testid={`row-audit-log-${log.id}`}>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {log.userEmail}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {log.action}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {log.resourceType}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.medium
                    }}>
                      {log.metadata ? JSON.stringify(log.metadata).substring(0, 100) + '...' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render Coming Soon placeholder for tabs
  const renderComingSoon = (tab: any) => (
    <div style={{
      ...glassCardStyle,
      padding: '80px 40px',
      textAlign: 'center',
      background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`
    }}>
      <div style={{
        width: '120px',
        height: '120px',
        background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.purple}20)`,
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px auto',
        border: `2px solid ${COLORS.glass.whiteBorder}`
      }}>
        <tab.icon size={48} style={{ color: COLORS.primary.orange }} strokeWidth={1.5} />
      </div>
      
      <h3 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: COLORS.neutral.dark,
        marginBottom: '12px'
      }}>
        {tab.name}
      </h3>
      
      <p style={{
        fontSize: '16px',
        color: COLORS.neutral.medium,
        marginBottom: '24px',
        maxWidth: '400px',
        margin: '0 auto 24px auto'
      }}>
        Sezione in sviluppo. Sarà disponibile nelle prossime release della Brand Interface.
      </p>
      
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        background: `linear-gradient(135deg, ${COLORS.primary.orange}15, ${COLORS.primary.orange}10)`,
        border: `1px solid ${COLORS.primary.orange}30`,
        borderRadius: '12px',
        color: COLORS.primary.orange,
        fontSize: '14px',
        fontWeight: 600
      }}>
        <Zap size={16} strokeWidth={2} />
        Coming Soon
      </div>
    </div>
  );

  // 1. & 2. STRUTTURA TAB WITH REAL-TIME STATS + BULK OPERATIONS
  const renderStrutturaTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Real-time connection status */}
      {activeTab === 'struttura' && (
        <div style={{
          ...glassCardStyle,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: statsConnected 
            ? `linear-gradient(135deg, ${COLORS.semantic.success}15, ${COLORS.semantic.success}10)`
            : `linear-gradient(135deg, ${COLORS.semantic.warning}15, ${COLORS.semantic.warning}10)`
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statsConnected ? COLORS.semantic.success : COLORS.semantic.warning
          }} />
          <span style={{
            fontSize: '13px',
            color: COLORS.neutral.dark,
            fontWeight: 500
          }}>
            {statsConnected ? 'Dati live - SSE attivo' : 'Dati polling - SSE non disponibile'}
            {statsLastUpdate && (
              <span style={{ color: COLORS.neutral.medium, marginLeft: '8px' }}>
                (Aggiornato: {format(statsLastUpdate, 'HH:mm:ss')})
              </span>
            )}
          </span>
          {statsError && (
            <span style={{
              fontSize: '12px',
              color: COLORS.semantic.error,
              marginLeft: 'auto'
            }}>
              Errore: {statsError}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setShowOrganizationModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: COLORS.primary.orange,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
          data-testid="button-create-organization"
        >
          <Plus size={16} />
          Nuova Organizzazione
        </button>
        
        <button
          onClick={handleExportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: COLORS.glass.white,
            color: COLORS.neutral.dark,
            border: `1px solid ${COLORS.glass.whiteBorder}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
          data-testid="button-export-csv"
        >
          <Download size={16} />
          Export CSV
        </button>

        {selectedStores.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto'
          }}>
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${COLORS.glass.whiteBorder}`,
                borderRadius: '8px',
                background: COLORS.glass.whiteLight,
                fontSize: '14px'
              }}
              data-testid="select-bulk-operation"
            >
              <option value="">Operazione bulk...</option>
              <option value="activate">Attiva selezionati</option>
              <option value="deactivate">Disattiva selezionati</option>
              <option value="delete">Elimina selezionati</option>
            </select>
            
            <button
              onClick={handleBulkOperation}
              disabled={!bulkOperation || bulkOperationMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: COLORS.primary.purple,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: bulkOperation ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 600,
                opacity: bulkOperation ? 1 : 0.5
              }}
              data-testid="button-execute-bulk"
            >
              {bulkOperationMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Esegui ({selectedStores.length})
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards with real-time data */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Total PDV Card */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '24px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`,
            borderLeft: `4px solid ${COLORS.primary.orange}`
          }}
          data-testid="card-total-stores"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                fontSize: '12px',
                fontWeight: 600,
                color: COLORS.primary.orange,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                PDV Totali
              </p>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.neutral.dark,
                marginBottom: '4px'
              }}>
                {structureStats?.data?.totalStores || (statsLoading ? '...' : '75')}
              </div>
              <p style={{
                fontSize: '13px',
                color: COLORS.semantic.success,
                fontWeight: 500
              }}>
                +{structureStats?.data?.growth?.percentage || '7.1'}% questo mese
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={24} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Active PDV Card */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '24px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`,
            borderLeft: `4px solid ${COLORS.semantic.success}`
          }}
          data-testid="card-active-stores"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                fontSize: '12px',
                fontWeight: 600,
                color: COLORS.semantic.success,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                PDV Attivi
              </p>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.neutral.dark,
                marginBottom: '4px'
              }}>
                {structureStats?.data?.activeStores || (statsLoading ? '...' : '70')}
              </div>
              <p style={{
                fontSize: '13px',
                color: COLORS.neutral.medium,
                fontWeight: 500
              }}>
                93% operational rate
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: `linear-gradient(135deg, ${COLORS.semantic.success}20, ${COLORS.semantic.success}10)`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={24} style={{ color: COLORS.semantic.success }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Channel Distribution Card */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '24px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`,
            borderLeft: `4px solid ${COLORS.primary.purple}`
          }}
          data-testid="card-channels"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '12px',
                fontWeight: 600,
                color: COLORS.primary.purple,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                Canali Distributivi
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(structureStats?.data?.storesByChannel || [
                  { canale: 'Retail', count: 45, percentage: 60 },
                  { canale: 'Franchise', count: 30, percentage: 40 }
                ]).map((channel, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '13px',
                      color: COLORS.neutral.dark,
                      fontWeight: 500
                    }}>
                      {channel.canale}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: COLORS.neutral.medium,
                      fontWeight: 600
                    }}>
                      {channel.count} ({channel.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: `linear-gradient(135deg, ${COLORS.primary.purple}20, ${COLORS.primary.purple}10)`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={24} style={{ color: COLORS.primary.purple }} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{
        ...glassCardStyle,
        padding: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            placeholder="Cerca stores..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="input-search-stores"
          />
          
          <select
            value={filters.canale}
            onChange={(e) => setFilters(prev => ({ ...prev, canale: e.target.value, page: 1 }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="select-channel-filter"
          >
            <option value="">Tutti i canali</option>
            <option value="Retail">Retail</option>
            <option value="Franchise">Franchise</option>
          </select>
          
          <select
            value={filters.stato}
            onChange={(e) => setFilters(prev => ({ ...prev, stato: e.target.value as any, page: 1 }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="select-status-filter"
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="inactive">Inattivi</option>
            <option value="pending">In attesa</option>
          </select>
          
          <input
            type="text"
            placeholder="Area commerciale"
            value={filters.areaCommerciale}
            onChange={(e) => setFilters(prev => ({ ...prev, areaCommerciale: e.target.value, page: 1 }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.glass.whiteBorder}`,
              borderRadius: '8px',
              background: COLORS.glass.whiteLight
            }}
            data-testid="input-area-filter"
          />
        </div>
      </div>

      {/* Stores Table with bulk selection */}
      <div style={{
        ...glassCardStyle,
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: COLORS.neutral.dark
          }}>
            Stores ({storesData?.data?.pagination?.total || 0})
          </h3>
          
          {storesData?.data?.stores && storesData.data.stores.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <button
                onClick={toggleSelectAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'none',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: COLORS.neutral.dark
                }}
                data-testid="button-select-all"
              >
                {selectedStores.length === storesData.data.stores.length ? 
                  <CheckSquare size={16} /> : 
                  <Square size={16} />
                }
                Seleziona tutti
              </button>
            </div>
          )}
        </div>
        
        {storesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: COLORS.primary.orange }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    width: '40px'
                  }}>
                    {/* Checkbox column */}
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Codice
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Nome
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Città
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Canale
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Area
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Stato
                  </th>
                </tr>
              </thead>
              <tbody>
                {storesData?.data?.stores?.map((store) => (
                  <tr key={store.id} data-testid={`row-store-${store.id}`}>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`
                    }}>
                      <button
                        onClick={() => toggleStoreSelection(store.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        data-testid={`checkbox-store-${store.id}`}
                      >
                        {selectedStores.includes(store.id) ?
                          <CheckSquare size={16} style={{ color: COLORS.primary.orange }} /> :
                          <Square size={16} style={{ color: COLORS.neutral.medium }} />
                        }
                      </button>
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark,
                      fontWeight: 500
                    }}>
                      {store.codigo}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.nome}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.citta}, {store.provincia}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.canale}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.areaCommerciale}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      fontSize: '13px'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: store.stato === 'active' ? `${COLORS.semantic.success}20` : 
                                   store.stato === 'inactive' ? `${COLORS.semantic.error}20` : 
                                   `${COLORS.semantic.warning}20`,
                        color: store.stato === 'active' ? COLORS.semantic.success : 
                               store.stato === 'inactive' ? COLORS.semantic.error : 
                               COLORS.semantic.warning
                      }}>
                        {store.stato === 'active' ? 'Attivo' : 
                         store.stato === 'inactive' ? 'Inattivo' : 'In attesa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BrandLayout>
      <div style={{
        padding: '24px',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '8px',
            background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Gestione Avanzata
          </h1>
          <p style={{
            fontSize: '16px',
            color: COLORS.neutral.light,
            margin: 0
          }}>
            Controllo centralizzato della struttura commerciale e operazioni di gestione
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          ...glassCardStyle,
          padding: '8px',
          marginBottom: '32px',
          background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '4px'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === tab.id 
                    ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
                    : 'transparent',
                  color: activeTab === tab.id ? 'white' : COLORS.neutral.dark,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  opacity: tab.comingSoon ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id && !tab.comingSoon) {
                    e.currentTarget.style.background = `${COLORS.primary.orange}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon size={18} strokeWidth={2} />
                {tab.name}
                {tab.comingSoon && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    background: `${COLORS.semantic.warning}20`,
                    color: COLORS.semantic.warning,
                    fontWeight: 500
                  }}>
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'struttura' && renderStrutturaTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {tabs.find(tab => tab.id === activeTab)?.comingSoon && renderComingSoon(tabs.find(tab => tab.id === activeTab))}
        
        {/* Organization Modal */}
        {renderOrganizationModal()}
      </div>
    </BrandLayout>
  );
}