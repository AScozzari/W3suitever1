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
    enabled: activeTab === 'structure' && isAuthenticated
  });

  // FIXED: Structure stores with proper queryFn to handle filter serialization
  const { data: storesData, isLoading: storesLoading } = useQuery<StoresListResponse>({
    queryKey: ['/brand-api/structure/stores', filterParams],
    queryFn: async () => {
      const response = await fetch(`/brand-api/structure/stores?${filterParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'structure' && isAuthenticated
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
                Email Admin Brand *
              </label>
              <input
                type="email"
                value={organizationForm.brandAdminEmail}
                onChange={(e) => setOrganizationForm(prev => ({ ...prev, brandAdminEmail: e.target.value }))}
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
              disabled={!organizationForm.name || !organizationForm.brandAdminEmail || createOrganizationMutation.isPending}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: organizationForm.name && organizationForm.brandAdminEmail ? COLORS.gradients.orange : COLORS.neutral.light,
                color: 'white',
                cursor: organizationForm.name && organizationForm.brandAdminEmail ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (organizationForm.name && organizationForm.brandAdminEmail) {
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

  // Structure Tab (modernized)
  const renderStructureTab = () => (
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
                    Codice
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
                    Città
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Canale
                  </th>
                  <th style={{
                    padding: '12px',
                    borderBottom: `2px solid ${COLORS.neutral.lighter}`,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark
                  }}>
                    Area
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
                </tr>
              </thead>
              <tbody>
                {storesData?.data?.stores?.map((store) => (
                  <tr key={store.id} 
                    data-testid={`row-store-${store.id}`}
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
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark,
                      fontWeight: 500
                    }}>
                      {store.codigo}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.nome}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.citta}, {store.provincia}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.canale}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {store.areaCommerciale}
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
      </div>
    </BrandLayout>
  );
}