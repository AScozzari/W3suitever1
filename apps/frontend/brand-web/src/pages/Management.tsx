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

  // Filters state for Organizations Management (simplified)
  const [filters, setFilters] = useState({
    stato: 'all' as 'all' | 'active' | 'inactive' | 'pending',
    search: '',
    page: 1,
    limit: 25
  });

  // Organizations management state
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  
  // Modals state
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  
  // Organization form state (for creating new organizations)
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    slug: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    notes: ''
  });

  // Audit filters
  const [auditFilters, setAuditFilters] = useState({
    userEmail: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  // Types for Organizations Management
  interface OrganizationsStatsResponse {
    success: boolean;
    data: {
      totalOrganizations: number;
      activeOrganizations: number;
      organizationsByStatus: Array<{
        status: string;
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
    success: boolean;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      notes?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
    context?: string;
    message?: string;
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

  // 1. ORGANIZATIONS DATA FETCHING (Management Center Transformation)
  const organizationsParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.stato && filters.stato !== 'all') params.append('status', filters.stato);
    return params.toString();
  }, [filters.search, filters.stato]);

  // Fetch organizations list from w3suite.tenants  
  const { data: organizationsData, isLoading: organizationsLoading } = useQuery<OrganizationsListResponse>({
    queryKey: ['/brand-api/organizations', organizationsParams],
    queryFn: async () => {
      const response = await fetch(`/brand-api/organizations?${organizationsParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'structure' && isAuthenticated,
    refetchInterval: 30000
  });

  // Calculate stats from organizations data
  const organizationsStats = useMemo(() => {
    if (!organizationsData?.organizations) return null;
    
    const orgs = organizationsData.organizations;
    const totalOrgs = orgs.length;
    const activeOrgs = orgs.filter(org => org.status === 'active').length;
    const statusCounts = orgs.reduce((acc, org) => {
      acc[org.status] = (acc[org.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        organizationsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: Math.round((count / totalOrgs) * 100)
        })),
        growth: {
          thisMonth: totalOrgs,
          lastMonth: Math.max(0, totalOrgs - 2), // Mock growth calculation
          percentage: 5.2 // Mock growth percentage
        }
      }
    };
  }, [organizationsData]);

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

  // 4. ORGANIZATION CREATION MUTATION (New W3 Suite Tenants)
  const createOrganizationMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; status: string; notes?: string }) => {
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
    },
    onError: (error: any) => {
      console.error('Error creating organization:', error);
      // TODO: Show error toast notification
    }
  });

  // 5. SLUG VALIDATION QUERY
  const { data: slugValidation } = useQuery({
    queryKey: ['/brand-api/organizations/validate-slug', organizationForm.slug],
    queryFn: async () => {
      if (!organizationForm.slug || organizationForm.slug.length < 2) return null;
      const response = await fetch(`/brand-api/organizations/validate-slug/${organizationForm.slug}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!organizationForm.slug && organizationForm.slug.length >= 2,
    staleTime: 1000 // Cache for 1 second to avoid excessive requests
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
                Organizzazioni Totali
              </p>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.neutral.dark,
                marginBottom: '4px'
              }}>
                {organizationsStats?.data?.totalOrganizations ? (
                  <AnimatedCounter value={organizationsStats.data.totalOrganizations} />
                ) : (
                  organizationsLoading ? '...' : <AnimatedCounter value={0} />
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
                +{organizationsStats?.data?.growth?.percentage || '5.2'}% questo mese
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
                Organizzazioni Attive
              </p>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.neutral.dark,
                marginBottom: '4px'
              }}>
                {organizationsStats?.data?.activeOrganizations ? (
                  <AnimatedCounter value={organizationsStats.data.activeOrganizations} />
                ) : (
                  organizationsLoading ? '...' : <AnimatedCounter value={0} />
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
            placeholder="Cerca organizzazioni..."
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
            data-testid="input-search-organizations"
          />
          
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
            <option value="suspended">Sospesi</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
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
          
          <button
            onClick={() => setShowOrganizationModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: COLORS.gradients.orange,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(255, 105, 0, 0.2)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            data-testid="button-new-organization"
          >
            <Plus size={16} />
            Nuova Organizzazione
          </button>
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
                </tr>
              </thead>
              <tbody>
                {organizationsData?.organizations?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: COLORS.neutral.medium,
                      fontSize: '14px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <Building2 size={48} style={{ color: COLORS.neutral.light, margin: '0 auto 16px' }} />
                      </div>
                      Nessuna organizzazione trovata
                    </td>
                  </tr>
                ) : organizationsData?.organizations?.map((org) => (
                  <tr key={org.id} 
                    data-testid={`row-organization-${org.id}`}
                    style={{
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: COLORS.neutral.dark
                    }}>
                      {org.name}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.primary.orange,
                      fontFamily: 'monospace'
                    }}>
                      {org.slug}
                    </td>
                    <td style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                      fontSize: '13px',
                      color: COLORS.neutral.dark
                    }}>
                      {org.createdAt ? format(new Date(org.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
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
                        color: org.status === 'active' ? '#22c55e' : 
                               org.status === 'inactive' ? '#ef4444' : '#f59e0b',
                        backgroundColor: org.status === 'active' ? '#dcfce7' : 
                                        org.status === 'inactive' ? '#fee2e2' : '#fef3c7'
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{
              fontSize: '14px',
              color: COLORS.neutral.medium
            }}>
              Totale: {organizationsData?.organizations?.length || 0} organizzazioni
            </span>
          </div>
        </div>
      );
    }

    // Empty state quando non ci sono dati
    return (
      <div style={{ 
        padding: '40px',
        textAlign: 'center',
        color: COLORS.neutral.medium,
        borderRadius: '8px',
        background: 'white'
      }}>
        <Building2 size={64} style={{ margin: '0 auto 20px', display: 'block', color: COLORS.neutral.light }} />
        <h3 style={{ margin: '0 0 8px', color: COLORS.neutral.dark }}>
          Nessuna organizzazione trovata
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px' }}>
          Inizia creando la tua prima organizzazione
        </p>
        <button
          onClick={() => setNewOrgModalOpen(true)}
          style={{
            background: COLORS.primary.orange,
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
          data-testid="button-create-first-organization"
        >
          <Plus size={16} />
          Crea Organizzazione
        </button>
      </div>
    );
  };

  const renderNewOrganizationModal = () => {
    if (!newOrgModalOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: COLORS.neutral.dark
            }}>
              Nuova Organizzazione
            </h2>
            <button
              onClick={() => setNewOrgModalOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                color: COLORS.neutral.medium
              }}
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateOrganization}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.neutral.dark
              }}>
                Nome Organizzazione *
              </label>
              <input
                type="text"
                value={newOrgForm.name}
                onChange={(e) => setNewOrgForm(prev => ({ 
                  ...prev, 
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Es. Acme Corporation"
                required
                data-testid="input-organization-name"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.neutral.dark
              }}>
                Slug URL *
              </label>
              <input
                type="text"
                value={newOrgForm.slug}
                onChange={(e) => setNewOrgForm(prev => ({
                  ...prev,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${slugValidation.isValid ? COLORS.semantic.success : COLORS.semantic.error}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="acme-corp"
                required
                data-testid="input-organization-slug"
              />
              <div style={{ 
                marginTop: '6px',
                fontSize: '12px',
                color: slugValidation.isValid ? COLORS.semantic.success : COLORS.semantic.error
              }}>
                {slugValidation.message}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.neutral.dark
              }}>
                Stato
              </label>
              <select
                value={newOrgForm.status}
                onChange={(e) => setNewOrgForm(prev => ({ ...prev, status: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                data-testid="select-organization-status"
              >
                <option value="active">Attivo</option>
                <option value="inactive">Inattivo</option>
                <option value="pending">Sospeso</option>
              </select>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.neutral.dark
              }}>
                Note (opzionale)
              </label>
              <textarea
                value={newOrgForm.notes}
                onChange={(e) => setNewOrgForm(prev => ({ ...prev, notes: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                placeholder="Aggiungi note o descrizione..."
                data-testid="textarea-organization-notes"
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setNewOrgModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `2px solid ${COLORS.neutral.lighter}`,
                  color: COLORS.neutral.dark,
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                data-testid="button-cancel-organization"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={createOrgMutation.isPending || !slugValidation.isValid}
                style={{
                  background: createOrgMutation.isPending || !slugValidation.isValid ? COLORS.neutral.light : COLORS.primary.orange,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: createOrgMutation.isPending || !slugValidation.isValid ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                data-testid="button-create-organization"
              >
                {createOrgMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Building2 size={16} />
                    Crea Organizzazione
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  // Main render del componente
  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${COLORS.primary.orange}08 0%, ${COLORS.primary.purple}08 100%)`,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {renderHeader()}
      {renderTabsNavigation()}
      {renderFilterSection()}
      {activeTab === 'gestione' && renderStructureTab()}
      {renderNewOrganizationModal()}
    </div>
  );
};
