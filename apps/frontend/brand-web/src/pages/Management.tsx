import React, { useState, useMemo, useEffect } from 'react';
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
  X, Check, Loader2, Upload, FileText, Archive,
  Sparkles, Rocket, Brain, Shield, Crown, Layers,
  ChevronRight, ArrowUpRight, CircleDollarSign,
  NetworkIcon, Boxes, LineChart, PieChart, Wallet,
  ShieldCheck, Lock, Unlock, Globe, Link2, 
  Bot, Lightbulb, Gauge, HeartHandshake
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { format } from 'date-fns';

// Modern W3 Suite Color Palette
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    orangeDark: '#e55a00',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
    purpleDark: '#6a24a8',
  },
  semantic: {
    success: '#10b981',
    successLight: '#34d399',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    errorLight: '#f87171',
    info: '#3b82f6',
    infoLight: '#60a5fa',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
    white: '#ffffff',
  },
  gradients: {
    orange: 'linear-gradient(135deg, #FF6900, #ff8533)',
    purple: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
    blue: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    green: 'linear-gradient(135deg, #10b981, #34d399)',
    pinkOrange: 'linear-gradient(135deg, #ff6b6b, #FF6900)',
    purpleBlue: 'linear-gradient(135deg, #7B2CBF, #3b82f6)',
  }
};

// Glassmorphism styles aligned with W3 Suite
const glassStyle = {
  background: 'hsla(255, 255, 255, 0.08)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid hsla(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const cardStyle = {
  background: 'white',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid #e5e7eb',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 10);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 10);
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
};

// Pulse indicator component
const PulseIndicator = ({ color = COLORS.semantic.success }: { color?: string }) => (
  <span style={{
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    position: 'relative',
  }}>
    <span style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color,
      animation: 'pulse 2s infinite',
    }} />
    <style>{`
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(2); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </span>
);

export default function Management() {
  const { isAuthenticated, user } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('structure');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
  const [legalEntityModal, setLegalEntityModal] = useState<{
    isOpen: boolean;
    editingEntity?: any;
    tenantId?: string;
  }>({
    isOpen: false,
    editingEntity: null,
    tenantId: undefined
  });

  // Italian Cities Interface
  interface ItalianCity {
    id: string;
    name: string;
    province: string;
    provinceName: string;
    region: string;
    postalCode: string;
    active: boolean;
  }

  // Fetch Italian Cities from Public Schema
  const { data: italianCities = [], isLoading: citiesLoading, error: citiesError } = useQuery<ItalianCity[]>({
    queryKey: ['/api/reference/italian-cities'],
    queryFn: async (): Promise<ItalianCity[]> => {
      const response = await fetch('/api/reference/italian-cities', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch Italian cities');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });

  // Drill-down state for legal entities view
  const [drillDownView, setDrillDownView] = useState<{
    isActive: boolean;
    tenantId?: string;
    tenantName?: string;
  }>({ isActive: false });
  
  // Organization form state
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    slug: '',
    status: 'active',
    notes: ''
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

  interface OrganizationsListResponse {
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      status: 'active' | 'inactive' | 'suspended';
      createdAt: string;
      notes?: string;
    }>;
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
    enabled: activeTab === 'structure' && isAuthenticated
  });

  // Query for organizations data
  const { data: organizationsData, isLoading: organizationsLoading } = useQuery<OrganizationsListResponse>({
    queryKey: ['/brand-api/organizations'],
    queryFn: async () => {
      const response = await fetch(`/brand-api/organizations`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'structure' && isAuthenticated
  });

  // Query for legal entities (drill-down view)
  const { data: legalEntitiesData, isLoading: legalEntitiesLoading } = useQuery({
    queryKey: ['/brand-api/legal-entities', drillDownView.tenantId],
    queryFn: async () => {
      const response = await fetch(`/brand-api/legal-entities/${drillDownView.tenantId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: drillDownView.isActive && !!drillDownView.tenantId && isAuthenticated
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
      return apiRequest('/brand-api/organizations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setShowOrganizationModal(false);
      setOrganizationForm({
        name: '',
        slug: '',
        status: 'active',
        notes: ''
      });
      console.log('✅ Organizzazione creata con successo!');
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
      console.error('❌ Errore nella creazione dell\'organizzazione');
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
      console.log(`✅ Operazione completata: ${result.processedCount} elaborati, ${result.errorCount} errori`);
    },
    onError: (error) => {
      console.error('Error in bulk operation:', error);
      console.error('❌ Errore nell\'operazione bulk');
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
      
      console.log('✅ Export CSV completato!');
    } catch (error) {
      console.error('Export error:', error);
      console.error('❌ Errore durante l\'export CSV');
    }
  };

  // 2. BULK OPERATIONS HELPERS
  const handleBulkOperation = () => {
    if (!bulkOperation || selectedStores.length === 0) {
      console.warn('⚠️ Seleziona stores e operazione');
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
    const allOrgIds = organizationsData?.organizations?.map(org => org.id) || [];
    setSelectedStores(prev => 
      prev.length === allOrgIds.length ? [] : allOrgIds
    );
  };

  // ==================== LEGAL ENTITY MODAL FUNCTIONS ====================


  // Handle Add Legal Entity
  const handleAddLegalEntity = (tenantId: string, tenantName: string) => {
    setLegalEntityModal({ 
      isOpen: true, 
      editingEntity: null, 
      tenantId: tenantId 
    });
  };

  // Handle View Legal Entities  
  const handleViewLegalEntities = (tenantId: string, tenantName: string) => {
    setDrillDownView({ 
      isActive: true, 
      tenantId: tenantId, 
      tenantName: tenantName 
    });
  };

  // Handle Back to Organizations (exit drill-down)
  const handleBackToOrganizations = () => {
    setDrillDownView({ isActive: false });
  };

  // Handle Close Modal
  const handleCloseLegalEntityModal = () => {
    setLegalEntityModal({ isOpen: false, editingEntity: null, tenantId: undefined });
  };


  // Role-based access control
  if (user?.role !== 'super_admin' && user?.role !== 'national_manager') {
    return (
      <BrandLayout>
        <div style={{ 
          padding: '64px 24px', 
          textAlign: 'center',
          ...cardStyle,
          margin: '24px',
        }}>
          <Shield size={64} style={{ color: COLORS.neutral.medium, marginBottom: '16px' }} />
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
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease'
      }}>
        <div style={{
          ...cardStyle,
          width: '90%',
          maxWidth: '500px',
          padding: '32px',
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'slideUp 0.3s ease'
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
                color: COLORS.neutral.medium,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
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
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  background: COLORS.neutral.white,
                  color: COLORS.neutral.dark,
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
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
                Slug
              </label>
              <input
                type="text"
                value={organizationForm.slug}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="Lascia vuoto per auto-generare dal nome"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  background: COLORS.neutral.white,
                  color: COLORS.neutral.dark,
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                data-testid="input-organization-slug"
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
                Stato
              </label>
              <select
                value={organizationForm.status}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  background: COLORS.neutral.white,
                  color: COLORS.neutral.dark,
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                data-testid="select-organization-status"
              >
                <option value="active">Attivo</option>
                <option value="inactive">Inattivo</option>
                <option value="suspended">Sospeso</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.neutral.dark,
                marginBottom: '8px'
              }}>
                Note
              </label>
              <textarea
                value={organizationForm.notes}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Note aggiuntive sull'organizzazione..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  background: COLORS.neutral.white,
                  color: COLORS.neutral.dark,
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                data-testid="textarea-organization-notes"
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
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                background: COLORS.neutral.white,
                color: COLORS.neutral.dark,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = COLORS.neutral.lightest;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = COLORS.neutral.white;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              data-testid="button-cancel-organization"
            >
              Annulla
            </button>
            <button
              onClick={() => createOrganizationMutation.mutate(organizationForm)}
              disabled={!organizationForm.name || createOrganizationMutation.isPending}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: organizationForm.name ? COLORS.gradients.orange : COLORS.neutral.light,
                color: 'white',
                cursor: organizationForm.name ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (organizationForm.name) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 105, 0, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              data-testid="button-create-organization"
            >
              {createOrganizationMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Crea Organizzazione
            </button>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

  // Modern tab definitions with creative names
  const tabs = [
    {
      id: 'structure',
      name: 'Struttura Organizzativa',
      icon: Building2,
      description: 'Analytics PDV real-time e gestione network',
      color: COLORS.primary.orange,
      gradient: COLORS.gradients.orange,
      badge: null
    },
    {
      id: 'pricing',
      name: 'Pricing & Revenue',
      icon: TrendingUp,
      description: 'Gestione listini dinamici e revenue optimization',
      color: COLORS.primary.purple,
      gradient: COLORS.gradients.purple,
      badge: 'Pro'
    },
    {
      id: 'supply',
      name: 'Supply Chain',
      icon: Package,
      description: 'Network fornitori e logistica intelligente',
      color: COLORS.semantic.info,
      gradient: COLORS.gradients.blue,
      badge: 'Beta'
    },
    {
      id: 'intelligence',
      name: 'Product Intelligence',
      icon: Brain,
      description: 'AI-powered insights e analytics predittive',
      color: COLORS.semantic.success,
      gradient: COLORS.gradients.green,
      badge: 'AI'
    }
  ];

  // 5. AUDIT TRAIL TAB (modernized)
  const renderAuditTab = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      animation: 'fadeInUp 0.5s ease'
    }}>
      {/* Audit Filters */}
      <div style={{
        ...cardStyle,
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
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="input-audit-user"
          />
          
          <select
            value={auditFilters.action}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="select-audit-action"
          >
            <option value="">Tutte le azioni</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>
          
          <input
            type="date"
            value={auditFilters.dateFrom}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="input-audit-date-from"
          />
          
          <input
            type="date"
            value={auditFilters.dateTo}
            onChange={(e) => setAuditFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="input-audit-date-to"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div style={{
        ...cardStyle,
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.neutral.dark,
          marginBottom: '16px'
        }}>
          Log Attività
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
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Timestamp
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Utente
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Azione
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Risorsa
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData?.data?.logs?.map((log: AuditLog) => (
                  <tr key={log.id} style={{
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.medium
                    }}>
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {log.userEmail}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: log.action === 'CREATE' ? `${COLORS.semantic.success}20` : 
                                   log.action === 'DELETE' ? `${COLORS.semantic.error}20` : 
                                   `${COLORS.semantic.info}20`,
                        color: log.action === 'CREATE' ? COLORS.semantic.success : 
                               log.action === 'DELETE' ? COLORS.semantic.error : 
                               COLORS.semantic.info
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {log.resourceType}
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

  // Legal Entities Drill-down View
  const renderLegalEntitiesView = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      animation: 'fadeInUp 0.5s ease'
    }}>
      {/* Back Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <button
          onClick={handleBackToOrganizations}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: COLORS.neutral.dark,
            transition: 'all 0.3s ease'
          }}
          data-testid="button-back-to-organizations"
        >
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          Torna alle Organizzazioni
        </button>
        
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Building2 size={20} style={{ color: COLORS.primary.orange }} />
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: COLORS.neutral.dark,
            margin: 0
          }}>
            Ragioni Sociali - {drillDownView.tenantName}
          </h2>
        </div>

        <button
          onClick={() => handleAddLegalEntity(drillDownView.tenantId!, drillDownView.tenantName!)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: COLORS.gradients.orange,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.3s ease'
          }}
          data-testid="button-add-legal-entity-drill-down"
        >
          <Plus size={16} />
          Aggiungi Ragione Sociale
        </button>
      </div>

      {/* Legal Entities List */}
      {legalEntitiesLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          ...cardStyle
        }}>
          <Loader2 size={24} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: '12px', color: COLORS.neutral.medium }}>
            Caricamento ragioni sociali...
          </span>
        </div>
      ) : (
        <div style={{
          ...cardStyle,
          padding: '24px',
          overflow: 'hidden'
        }}>
          {legalEntitiesData?.legalEntities?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.neutral.lighter}` }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>Nome</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>Codice</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>Forma Giuridica</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>P.IVA</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>PEC</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: COLORS.neutral.dark, fontWeight: 600 }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {legalEntitiesData.legalEntities.map((entity: any, index: number) => (
                    <tr key={entity.id} style={{ 
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      transition: 'background-color 0.2s ease'
                    }}>
                      <td style={{ padding: '12px', color: COLORS.neutral.dark }}>{entity.nome}</td>
                      <td style={{ padding: '12px', color: COLORS.neutral.medium, fontFamily: 'monospace' }}>{entity.codice}</td>
                      <td style={{ padding: '12px', color: COLORS.neutral.dark }}>{entity.formaGiuridica}</td>
                      <td style={{ padding: '12px', color: COLORS.neutral.medium, fontFamily: 'monospace' }}>{entity.pIva}</td>
                      <td style={{ padding: '12px', color: COLORS.neutral.medium }}>{entity.pec}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: entity.stato === 'active' ? COLORS.semantic.success + '20' : COLORS.semantic.warning + '20',
                          color: entity.stato === 'active' ? COLORS.semantic.success : COLORS.semantic.warning
                        }}>
                          {entity.stato === 'active' ? 'Attiva' : entity.stato === 'suspended' ? 'Sospesa' : 'Bozza'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: COLORS.neutral.medium
            }}>
              <Building2 size={48} style={{ color: COLORS.neutral.light, marginBottom: '16px' }} />
              <h3 style={{ color: COLORS.neutral.dark, marginBottom: '8px' }}>Nessuna Ragione Sociale</h3>
              <p>Nessuna ragione sociale trovata per questa organizzazione.</p>
              <button
                onClick={() => handleAddLegalEntity(drillDownView.tenantId!, drillDownView.tenantName!)}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: COLORS.gradients.orange,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
                data-testid="button-add-first-legal-entity"
              >
                <Plus size={16} style={{ marginRight: '8px' }} />
                Aggiungi Prima Ragione Sociale
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Structure Tab (modernized)
  const renderStructureTab = () => {
    // If drill-down is active, show legal entities view
    if (drillDownView.isActive) {
      return renderLegalEntitiesView();
    }

    // Otherwise show normal organizations structure
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        animation: 'fadeInUp 0.5s ease'
      }}>
      {/* Real-time connection indicator */}
      {statsConnected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: `${COLORS.semantic.success}10`,
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          <PulseIndicator />
          <span style={{
            fontSize: '13px',
            color: COLORS.semantic.success,
            fontWeight: 500
          }}>
            Connessione real-time attiva
          </span>
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
            background: COLORS.gradients.orange,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(255, 105, 0, 0.2)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 105, 0, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.2)';
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
            background: COLORS.neutral.white,
            color: COLORS.neutral.dark,
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
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
            marginLeft: 'auto',
            animation: 'slideInRight 0.3s ease'
          }}>
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                background: COLORS.neutral.white,
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none'
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
                background: bulkOperation ? COLORS.gradients.purple : COLORS.neutral.light,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: bulkOperation ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              data-testid="button-execute-bulk"
            >
              {bulkOperationMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Esegui ({selectedStores.length})
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards with animations */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Total PDV Card */}
        <div 
          style={{
            ...cardStyle,
            padding: '24px',
            background: COLORS.neutral.white,
            borderLeft: `4px solid ${COLORS.primary.orange}`,
            cursor: 'pointer',
            transform: hoveredCard === 'total' ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hoveredCard === 'total' ? '0 8px 32px rgba(255, 105, 0, 0.15)' : cardStyle.boxShadow,
            animation: 'fadeInUp 0.5s ease',
            animationDelay: '0.1s',
            animationFillMode: 'both'
          }}
          onMouseEnter={() => setHoveredCard('total')}
          onMouseLeave={() => setHoveredCard(null)}
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
                {structureStats?.data?.totalStores ? (
                  <AnimatedCounter value={structureStats.data.totalStores} />
                ) : (
                  statsLoading ? '...' : <AnimatedCounter value={75} />
                )}
              </div>
              <p style={{
                fontSize: '13px',
                color: COLORS.semantic.success,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <TrendingUp size={14} />
                +{structureStats?.data?.growth?.percentage || '7.1'}% questo mese
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: COLORS.gradients.orange,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 105, 0, 0.2)'
            }}>
              <Building2 size={24} style={{ color: 'white' }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Active PDV Card */}
        <div 
          style={{
            ...cardStyle,
            padding: '24px',
            background: COLORS.neutral.white,
            borderLeft: `4px solid ${COLORS.semantic.success}`,
            cursor: 'pointer',
            transform: hoveredCard === 'active' ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hoveredCard === 'active' ? '0 8px 32px rgba(16, 185, 129, 0.15)' : cardStyle.boxShadow,
            animation: 'fadeInUp 0.5s ease',
            animationDelay: '0.2s',
            animationFillMode: 'both'
          }}
          onMouseEnter={() => setHoveredCard('active')}
          onMouseLeave={() => setHoveredCard(null)}
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
                {structureStats?.data?.activeStores ? (
                  <AnimatedCounter value={structureStats.data.activeStores} />
                ) : (
                  statsLoading ? '...' : <AnimatedCounter value={70} />
                )}
              </div>
              <p style={{
                fontSize: '13px',
                color: COLORS.neutral.medium,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Activity size={14} />
                93% operational rate
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: COLORS.gradients.green,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}>
              <Activity size={24} style={{ color: 'white' }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Channel Distribution Card */}
        <div 
          style={{
            ...cardStyle,
            padding: '24px',
            background: COLORS.neutral.white,
            borderLeft: `4px solid ${COLORS.primary.purple}`,
            cursor: 'pointer',
            transform: hoveredCard === 'channels' ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hoveredCard === 'channels' ? '0 8px 32px rgba(123, 44, 191, 0.15)' : cardStyle.boxShadow,
            animation: 'fadeInUp 0.5s ease',
            animationDelay: '0.3s',
            animationFillMode: 'both'
          }}
          onMouseEnter={() => setHoveredCard('channels')}
          onMouseLeave={() => setHoveredCard(null)}
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
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
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
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: COLORS.neutral.lighter,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${channel.percentage}%`,
                        height: '100%',
                        background: COLORS.gradients.purple,
                        transition: 'width 1s ease',
                        animation: 'progressBar 1s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: COLORS.gradients.purple,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(123, 44, 191, 0.2)'
            }}>
              <BarChart3 size={24} style={{ color: 'white' }} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{
        ...cardStyle,
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
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="input-search-stores"
          />
          
          <select
            value={filters.canale}
            onChange={(e) => setFilters(prev => ({ ...prev, canale: e.target.value, page: 1 }))}
            style={{
              padding: '12px',
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
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
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
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
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '8px',
              background: COLORS.neutral.white,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
            onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
            data-testid="input-area-filter"
          />
        </div>
      </div>

      {/* Stores Table with bulk selection */}
      <div style={{
        ...cardStyle,
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
            Organizzazioni ({organizationsData?.organizations?.length || 0})
          </h3>
          
          {organizationsData?.organizations && organizationsData.organizations.length > 0 && (
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
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: COLORS.neutral.dark,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                data-testid="button-select-all"
              >
                {selectedStores.length === organizationsData.organizations.length ? 
                  <CheckSquare size={16} /> : 
                  <Square size={16} />
                }
                Seleziona tutti
              </button>
            </div>
          )}
        </div>
        
        {organizationsLoading ? (
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
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
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
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Nome
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Slug
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Data Creazione
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Stato
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Note
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    width: '120px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizationsData?.organizations?.map((org) => (
                  <tr key={org.id} 
                    data-testid={`row-org-${org.id}`}
                    style={{
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`
                    }}>
                      <button
                        onClick={() => toggleStoreSelection(org.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        data-testid={`checkbox-org-${org.id}`}
                      >
                        {selectedStores.includes(org.id) ?
                          <CheckSquare size={16} style={{ color: COLORS.primary.orange }} /> :
                          <Square size={16} style={{ color: COLORS.neutral.medium }} />
                        }
                      </button>
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark,
                      fontWeight: 500
                    }}>
                      {org.name}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {org.slug}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {format(new Date(org.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: org.status === 'active' ? `${COLORS.semantic.success}20` : 
                                   org.status === 'inactive' ? `${COLORS.semantic.error}20` : 
                                   `${COLORS.semantic.warning}20`,
                        color: org.status === 'active' ? COLORS.semantic.success : 
                               org.status === 'inactive' ? COLORS.semantic.error : 
                               COLORS.semantic.warning
                      }}>
                        {org.status === 'active' ? 'Attivo' : 
                         org.status === 'inactive' ? 'Inattivo' : 'Sospeso'}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.medium,
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {org.notes || '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {/* Edit Organization (Tenant) */}
                        <button
                          onClick={() => {
                            // TODO: Implementare modal edit organizzazione completo  
                            console.log('Edit organizzazione:', org.name, '- Da implementare!');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            color: COLORS.primary.orange
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = `${COLORS.primary.orange}20`;
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Modifica organizzazione"
                          data-testid={`button-edit-org-${org.id}`}
                        >
                          <Edit size={16} />
                        </button>
                        
                        {/* Add Legal Entity */}
                        <button
                          onClick={() => {
                            handleAddLegalEntity(org.id, org.name);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            color: COLORS.semantic.success
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = `${COLORS.semantic.success}20`;
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Aggiungi ragione sociale"
                          data-testid={`button-add-legal-${org.id}`}
                        >
                          <Plus size={16} />
                        </button>
                        
                        {/* View Legal Entities */}
                        <button
                          onClick={() => {
                            handleViewLegalEntities(org.id, org.name);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            color: COLORS.semantic.info
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = `${COLORS.semantic.info}20`;
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Visualizza ragioni sociali"
                          data-testid={`button-view-legal-${org.id}`}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progressBar {
          from { width: 0; }
          to { width: auto; }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
  };

  // Coming Soon Tab Component
  const renderComingSoonTab = (tab: typeof tabs[0]) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      animation: 'fadeInUp 0.5s ease'
    }}>
      <div style={{
        ...cardStyle,
        padding: '64px',
        textAlign: 'center',
        maxWidth: '500px',
        background: 'white',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Badge */}
        {tab.badge && (
          <span style={{
            position: 'absolute',
            top: '-12px',
            right: '24px',
            padding: '6px 12px',
            background: tab.gradient,
            color: 'white',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            {tab.badge}
          </span>
        )}
        
        {/* Icon */}
        <div style={{
          width: '96px',
          height: '96px',
          background: tab.gradient,
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          animation: 'float 3s ease-in-out infinite'
        }}>
          <tab.icon size={48} style={{ color: 'white' }} strokeWidth={1.5} />
        </div>
        
        {/* Title */}
        <h2 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: COLORS.neutral.dark,
          marginBottom: '12px',
          background: tab.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {tab.name}
        </h2>
        
        {/* Description */}
        <p style={{
          fontSize: '16px',
          color: COLORS.neutral.medium,
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          {tab.description}
        </p>
        
        {/* Coming Soon Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: COLORS.neutral.lightest,
          borderRadius: '30px',
          marginBottom: '24px'
        }}>
          <Rocket size={20} style={{ color: tab.color }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: COLORS.neutral.dark
          }}>
            Coming Q1 2025
          </span>
        </div>
        
        {/* Features Preview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: '32px'
        }}>
          {[
            { icon: Sparkles, text: 'AI Analytics' },
            { icon: Shield, text: 'Enterprise Security' },
            { icon: Zap, text: 'Real-time Updates' },
            { icon: Globe, text: 'Global Scale' }
          ].map((feature, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: COLORS.neutral.lightest,
              borderRadius: '8px',
              fontSize: '13px',
              color: COLORS.neutral.medium,
              animation: `fadeInUp 0.5s ease`,
              animationDelay: `${0.1 * (idx + 1)}s`,
              animationFillMode: 'both'
            }}>
              <feature.icon size={14} />
              {feature.text}
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );

  return (
    <BrandLayout>
      <div style={{
        padding: '24px',
        minHeight: '100vh',
        background: '#ffffff'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '8px',
            background: COLORS.gradients.orange,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Management Center
          </h1>
          <p style={{
            fontSize: '16px',
            color: COLORS.neutral.medium,
            margin: 0
          }}>
            Enterprise control hub per la gestione avanzata del business
          </p>
        </div>

        {/* Modern Tab Navigation */}
        <div style={{
          ...glassStyle,
          padding: '16px',
          marginBottom: '32px',
          background: 'hsla(255, 255, 255, 0.03)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: activeTab === tab.id ? 'none' : `1px solid ${COLORS.neutral.lighter}`,
                  background: activeTab === tab.id ? tab.gradient : COLORS.neutral.white,
                  color: activeTab === tab.id ? 'white' : COLORS.neutral.dark,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `fadeInUp 0.5s ease`,
                  animationDelay: `${0.1 * index}s`,
                  animationFillMode: 'both',
                  transform: activeTab === tab.id ? 'scale(1)' : 'scale(1)',
                  boxShadow: activeTab === tab.id ? `0 8px 24px ${tab.color}30` : 'none'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = activeTab === tab.id ? 'scale(1)' : 'translateY(-2px)';
                }}
                data-testid={`tab-${tab.id}`}
              >
                {/* Badge */}
                {tab.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '4px 8px',
                    background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.2)' : tab.gradient,
                    color: activeTab === tab.id ? 'white' : 'white',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {tab.badge}
                  </span>
                )}
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.2)' : tab.gradient,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <tab.icon size={20} style={{ color: activeTab === tab.id ? 'white' : 'white' }} strokeWidth={2} />
                  </div>
                  
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      marginBottom: '2px'
                    }}>
                      {tab.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.8,
                      fontWeight: 400,
                      color: activeTab === tab.id ? 'rgba(255, 255, 255, 0.9)' : COLORS.neutral.medium
                    }}>
                      {tab.description}
                    </div>
                  </div>
                  
                  <ChevronRight size={16} style={{ 
                    opacity: activeTab === tab.id ? 1 : 0.3,
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'structure' && renderStructureTab()}
          {activeTab === 'audit' && renderAuditTab()}
          {activeTab === 'pricing' && renderComingSoonTab(tabs.find(t => t.id === 'pricing')!)}
          {activeTab === 'supply' && renderComingSoonTab(tabs.find(t => t.id === 'supply')!)}
          {activeTab === 'intelligence' && renderComingSoonTab(tabs.find(t => t.id === 'intelligence')!)}
        </div>

        {/* Organization Modal */}
        {renderOrganizationModal()}

        {/* Modal Ragione Sociale - ESATTA COPIA DEL MODAL W3 SUITE */}
        {legalEntityModal.isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              borderTop: '3px solid transparent',
              borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
              animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              {/* Header Modal */}
              <div style={{
                padding: '24px 32px',
                background: '#ffffff',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Building2 size={20} color="white" />
                      </div>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: 0,
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        {legalEntityModal.editingEntity ? 'Modifica Ragione Sociale' : 'Nuova Ragione Sociale'}
                      </h2>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: 500
                    }}>
                      {legalEntityModal.editingEntity ? 'Modifica i dati dell\'entità giuridica' : 'Inserisci i dati della nuova entità giuridica'}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseLegalEntityModal}
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '8px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: '#64748b',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body Modal */}
              <div style={{ padding: '32px', background: '#ffffff', flex: 1, overflowY: 'auto' }}>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const data = Object.fromEntries(formData);
                  
                  // Generate code if empty
                  if (!data.codice) {
                    data.codice = `8${String(Date.now()).slice(-6)}`;
                  }
                  
                  data.tenantId = legalEntityModal.tenantId || '';
                  
                  console.log('📝 Creazione Legal Entity:', data);
                  
                  try {
                    const response = await fetch('/brand-api/legal-entities', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    });
                    
                    if (response.ok) {
                      console.log('✅ Ragione sociale creata');
                      handleCloseLegalEntityModal();
                      window.location.reload();
                    } else {
                      console.error('❌ Errore creazione:', response.status);
                    }
                  } catch (error) {
                    console.error('❌ Errore:', error);
                  }
                }}>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Codice */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Codice Ragione Sociale
                      </label>
                      <input
                        type="text"
                        name="codice"
                        placeholder="8xxxxxxx (auto-generato, min. 7 cifre)"
                        defaultValue={legalEntityModal.editingEntity?.codice || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Nome */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Nome Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="nome"
                        required
                        placeholder="es. Franchising Ltd"
                        defaultValue={legalEntityModal.editingEntity?.nome || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Forma Giuridica */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Forma Giuridica <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        name="formaGiuridica"
                        defaultValue={legalEntityModal.editingEntity?.formaGiuridica || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="">Seleziona...</option>
                        <option value="SRL">SRL - Società a Responsabilità Limitata</option>
                        <option value="SPA">SPA - Società per Azioni</option>
                        <option value="SNC">SNC - Società in Nome Collettivo</option>
                        <option value="SAS">SAS - Società in Accomandita Semplice</option>
                        <option value="SAPA">SAPA - Società in Accomandita per Azioni</option>
                        <option value="SRLS">SRLS - Società a Responsabilità Limitata Semplificata</option>
                      </select>
                    </div>

                    {/* Partita IVA */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Partita IVA <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="pIva"
                        placeholder="IT12345678901"
                        defaultValue={legalEntityModal.editingEntity?.pIva || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Codice Fiscale */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Codice Fiscale
                      </label>
                      <input
                        type="text"
                        name="codiceFiscale"
                        placeholder="RSSMRA80A01H501U"
                        defaultValue={legalEntityModal.editingEntity?.codiceFiscale || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Capitale Sociale */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Capitale Sociale
                      </label>
                      <input
                        type="text"
                        name="capitaleSociale"
                        placeholder="es. €10.000"
                        defaultValue={legalEntityModal.editingEntity?.capitaleSociale || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Data Costituzione */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Data Costituzione
                      </label>
                      <input
                        type="date"
                        name="dataCostituzione"
                        defaultValue={legalEntityModal.editingEntity?.dataCostituzione || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* REA */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        R.E.A.
                      </label>
                      <input
                        type="text"
                        name="rea"
                        placeholder="es. MI-1234567"
                        defaultValue={legalEntityModal.editingEntity?.rea || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Registro Imprese */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Registro Imprese
                      </label>
                      <input
                        type="text"
                        name="registroImprese"
                        placeholder="es. 123456789012"
                        defaultValue={legalEntityModal.editingEntity?.registroImprese || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Codice SDI */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Codice SDI
                        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                          (Sistema di Interscambio)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="codiceSDI"
                        placeholder="A4707H7"
                        defaultValue={legalEntityModal.editingEntity?.codiceSDI || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Indirizzo - full width */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Indirizzo Sede Legale <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="indirizzo"
                        placeholder="es. Via Roma 123"
                        defaultValue={legalEntityModal.editingEntity?.indirizzo || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Città */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Città <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      {citiesLoading ? (
                        <select disabled style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f9fafb',
                          outline: 'none'
                        }}>
                          <option>Caricamento città...</option>
                        </select>
                      ) : citiesError ? (
                        <select disabled style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #ef4444',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fef2f2',
                          outline: 'none'
                        }}>
                          <option>Errore nel caricamento città</option>
                        </select>
                      ) : (
                        <select
                          name="citta"
                          defaultValue={legalEntityModal.editingEntity?.citta || ''}
                          onChange={(e) => {
                            const selectedCity = italianCities.find(city => city.name === e.target.value);
                            if (selectedCity) {
                              // Auto-popola CAP e provincia
                              const capField = document.querySelector('input[name="cap"]') as HTMLInputElement;
                              const provinciaField = document.querySelector('input[name="provincia"]') as HTMLInputElement;
                              if (capField) capField.value = selectedCity.postalCode;
                              if (provinciaField) provinciaField.value = selectedCity.province;
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#fafbfc',
                            outline: 'none'
                          }}
                        >
                          <option value="">Seleziona una città...</option>
                          {italianCities.map((city) => (
                            <option key={city.id} value={city.name}>
                              {city.name} ({city.province}) - {city.postalCode}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* CAP - Auto-popolato */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        CAP <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>(auto)</span>
                      </label>
                      <input
                        type="text"
                        name="cap"
                        placeholder="Seleziona prima una città"
                        defaultValue={legalEntityModal.editingEntity?.cap || ''}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f9fafb',
                          color: '#6b7280',
                          outline: 'none',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    {/* Provincia - Auto-popolata */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Provincia <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>(auto)</span>
                      </label>
                      <input
                        type="text"
                        name="provincia"
                        placeholder="Seleziona prima una città"
                        maxLength={2}
                        readOnly
                        defaultValue={legalEntityModal.editingEntity?.provincia || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f9fafb',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          outline: 'none',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    {/* Telefono */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Telefono
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        placeholder="+39 02 1234567"
                        defaultValue={legalEntityModal.editingEntity?.telefono || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="info@azienda.it"
                        defaultValue={legalEntityModal.editingEntity?.email || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* PEC */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        PEC <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="pec"
                        placeholder="azienda@pec.it"
                        defaultValue={legalEntityModal.editingEntity?.pec || ''}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Stato */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Stato
                      </label>
                      <select
                        name="stato"
                        defaultValue={legalEntityModal.editingEntity?.stato || 'Attiva'}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="Attiva">Attiva</option>
                        <option value="Sospesa">Sospesa</option>
                        <option value="Bozza">Bozza</option>
                        <option value="Cessata">Cessata</option>
                        <option value="Trasferita">Trasferita</option>
                      </select>
                    </div>
                  </div>

                  {/* Footer Modal */}
                  <div style={{
                    padding: '20px 0 0 0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    borderTop: '1px solid #e5e7eb',
                    marginTop: '32px',
                    paddingTop: '20px'
                  }}>
                    <button
                      type="button"
                      onClick={handleCloseLegalEntityModal}
                      style={{
                        padding: '10px 20px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#475569',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {legalEntityModal.editingEntity ? 'Aggiorna' : 'Salva'} Ragione Sociale
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </BrandLayout>
  );
}