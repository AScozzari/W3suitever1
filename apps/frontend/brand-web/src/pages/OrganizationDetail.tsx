import React, { useState, useMemo } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import BrandLayout from '../components/BrandLayout';
import { 
  Building2, ArrowLeft, BarChart3, Users, MapPin, Phone, Mail, 
  Calendar, TrendingUp, Activity, DollarSign, Target, Eye, 
  ChevronRight, Settings, Edit, Briefcase, Store, FileText,
  PieChart, LineChart, Award, Star, Clock, Globe, Shield, AlertTriangle,
  RefreshCw, Archive, MoreVertical
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { useLocation } from 'wouter';

// Organization interface for type safety
interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

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
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

export default function OrganizationDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/organizations/:orgId');
  const { currentTenant } = useBrandTenant();
  const orgId = params?.orgId;

  // Active tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch organization data
  const { data: organizationResponse, isLoading: orgLoading, error: orgError } = useQuery<{organization: Organization}>({
    queryKey: [`/brand-api/organizations/${orgId}`],
    enabled: !!orgId,
  });

  const isLoading = orgLoading;
  const organization = organizationResponse?.organization;

  const handleBackClick = () => {
    setLocation('/management');
  };

  // Tab configuration
  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3,
      description: 'Overview e metriche principali'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: TrendingUp,
      description: 'Analisi dettagliate e report'
    },
    { 
      id: 'legal-entities', 
      label: 'Legal Entities', 
      icon: Briefcase,
      description: 'Gestione ragioni sociali'
    },
    { 
      id: 'stores', 
      label: 'Stores', 
      icon: Store,
      description: 'Gestione punti vendita'
    },
  ];

  // Show error state if organization fetch failed
  if (orgError) {
    return (
      <BrandLayout>
        <div style={{ padding: '24px', background: '#fafbfc', minHeight: '100vh' }}>
          <div style={{
            ...cardStyle,
            padding: '48px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fef2f2, #ffffff)',
            border: '1px solid #fecaca',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: COLORS.semantic.error,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={32} style={{ color: 'white' }} />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '8px',
            }}>
              Organizzazione Non Trovata
            </h2>
            <p style={{ color: COLORS.neutral.medium, marginBottom: '24px' }}>
              L'organizzazione richiesta non esiste o non hai i permessi per accedervi.
            </p>
            <button
              onClick={handleBackClick}
              style={{
                padding: '12px 24px',
                background: COLORS.gradients.orange,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              data-testid="button-back-to-management"
            >
              Torna al Management
            </button>
          </div>
        </div>
      </BrandLayout>
    );
  }

  // Show loading state while fetching
  if (isLoading) {
    return (
      <BrandLayout>
        <div style={{ padding: '24px', background: '#fafbfc', minHeight: '100vh' }}>
          <div style={{
            ...cardStyle,
            padding: '48px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: COLORS.gradients.orange,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              animation: 'pulse 2s infinite',
            }}>
              <Building2 size={32} style={{ color: 'white' }} />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '8px',
            }}>
              Caricamento Organizzazione...
            </h2>
            <p style={{ color: COLORS.neutral.medium }}>
              Stiamo recuperando i dettagli dell'organizzazione
            </p>
          </div>
        </div>
      </BrandLayout>
    );
  }



  const renderBreadcrumb = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '24px',
      padding: '12px 16px',
      ...cardStyle,
      background: 'linear-gradient(135deg, #fafbfc, #ffffff)',
    }}>
      <button
        onClick={handleBackClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: COLORS.neutral.medium,
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = COLORS.neutral.lightest;
          e.currentTarget.style.color = COLORS.primary.orange;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = COLORS.neutral.medium;
        }}
        data-testid="button-back-management"
      >
        <ArrowLeft size={16} />
        Management
      </button>
      
      <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
      
      <span style={{
        color: COLORS.neutral.dark,
        fontSize: '14px',
        fontWeight: '600',
      }}>
        Organizations
      </span>
      
      <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
      
      <span style={{
        color: COLORS.primary.orange,
        fontSize: '14px',
        fontWeight: '600',
      }}>
        {organization?.name || 'Organizzazione'}
      </span>
    </div>
  );

  const renderOrganizationHeader = () => (
    <div style={{
      ...cardStyle,
      padding: '24px',
      marginBottom: '24px',
      background: 'linear-gradient(135deg, #ffffff, #fafbfc)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: COLORS.gradients.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
          }}>
            <Building2 size={32} style={{ color: 'white' }} />
          </div>
          
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: COLORS.neutral.dark,
              margin: '0 0 4px 0',
              lineHeight: '1.2',
            }}>
              {organization?.name || 'Caricamento...'}
            </h1>
            <p style={{
              fontSize: '16px',
              color: COLORS.neutral.medium,
              margin: '0 0 8px 0',
            }}>
              {organization?.notes || 'Gestione completa dell\'organizzazione'}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              color: COLORS.neutral.light,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={14} />
                ID: {organization?.id}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} />
                Creata: {organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString('it-IT') : 'N/A'}
              </div>
              <div style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: organization?.status === 'active' ? COLORS.semantic.success : COLORS.neutral.light,
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}>
                {organization?.status || 'unknown'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Professional Action Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Primary Action - Edit */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: COLORS.gradients.orange,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(255, 105, 0, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 105, 0, 0.4)';
              e.currentTarget.style.background = COLORS.primary.orangeLight;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 12px rgba(255, 105, 0, 0.3)';
              e.currentTarget.style.background = COLORS.gradients.orange;
            }}
            data-testid="button-edit-organization"
          >
            <Edit size={16} />
            Modifica
          </button>

          {/* Secondary Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            background: 'white',
            borderRadius: '10px',
            border: `1px solid ${COLORS.neutral.lighter}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}>
            {[
              { icon: RefreshCw, label: 'Aggiorna', color: COLORS.semantic.info, testId: 'refresh' },
              { icon: Archive, label: 'Archivia', color: COLORS.neutral.medium, testId: 'archive' },
              { icon: Settings, label: 'Impostazioni', color: COLORS.neutral.medium, testId: 'settings' },
              { icon: MoreVertical, label: 'Altri', color: COLORS.neutral.medium, testId: 'more' },
            ].map((action, index) => (
              <button
                key={index}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  color: action.color,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = `${action.color}15`;
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title={action.label}
                data-testid={`button-${action.testId}-organization`}
              >
                <action.icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Professional KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {[
          { 
            label: 'Organization ID', 
            value: organization?.id?.slice(-8) || 'N/A', 
            icon: Target, 
            color: COLORS.semantic.info,
            trend: null,
            description: 'Identificativo univoco'
          },
          { 
            label: 'Organization Slug', 
            value: organization?.slug || 'N/A', 
            icon: Globe, 
            color: COLORS.semantic.success,
            trend: null,
            description: 'URL-friendly identifier'
          },
          { 
            label: 'Data Creazione', 
            value: organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString('it-IT') : 'N/A', 
            icon: Calendar, 
            color: COLORS.primary.orange,
            trend: null,
            description: 'Data di registrazione'
          },
          { 
            label: 'Status Operativo', 
            value: organization?.status || 'N/A', 
            icon: Shield, 
            color: organization?.status === 'active' ? COLORS.semantic.success : COLORS.semantic.warning,
            trend: organization?.status === 'active' ? '+0%' : null,
            description: organization?.status === 'active' ? 'Sistema operativo' : 'Verifica richiesta'
          },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffffff, #fafbfc)',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = stat.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
            data-testid={`kpi-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {/* Gradient accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${stat.color}, ${stat.color}80)`,
            }} />
            
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}25)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${stat.color}20`,
              }}>
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
              
              {stat.trend && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  background: `${COLORS.semantic.success}15`,
                  color: COLORS.semantic.success,
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  <TrendingUp size={12} />
                  {stat.trend}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '13px',
                color: COLORS.neutral.medium,
                margin: '0 0 8px 0',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '24px',
                fontWeight: '700',
                color: COLORS.neutral.dark,
                margin: '0 0 8px 0',
                lineHeight: '1.2',
              }}>
                {stat.value}
              </p>
              <p style={{
                fontSize: '12px',
                color: COLORS.neutral.light,
                margin: '0',
                fontStyle: 'italic',
              }}>
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabNavigation = () => (
    <div style={{
      ...cardStyle,
      padding: '0',
      marginBottom: '24px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #f0f1f3',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 20px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #fff5f0, #ffffff)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${COLORS.primary.orange}` : '3px solid transparent',
              color: activeTab === tab.id ? COLORS.primary.orange : COLORS.neutral.medium,
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = '#fafbfc';
                e.currentTarget.style.color = COLORS.neutral.dark;
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = COLORS.neutral.medium;
              }
            }}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '16px',
            }}>
              Dashboard Overview
            </h3>
            <p style={{ color: COLORS.neutral.medium, fontSize: '16px' }}>
              Panoramica generale delle metriche e performance dell'organizzazione.
              Questa sezione verrà implementata nella Task 6.
            </p>
          </div>
        );
      
      case 'analytics':
        return (
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '16px',
            }}>
              Analytics Avanzate
            </h3>
            <p style={{ color: COLORS.neutral.medium, fontSize: '16px' }}>
              Analisi dettagliate, report e metriche business approfondite.
              Questa sezione verrà implementata nella Task 7.
            </p>
          </div>
        );
      
      case 'legal-entities':
        return (
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '16px',
            }}>
            Legal Entities Management
            </h3>
            <p style={{ color: COLORS.neutral.medium, fontSize: '16px' }}>
              Gestione completa delle ragioni sociali associate a questa organizzazione.
              Questa sezione verrà implementata nella Task 8.
            </p>
          </div>
        );
      
      case 'stores':
        return (
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: COLORS.neutral.dark,
              marginBottom: '16px',
            }}>
              Stores Management
            </h3>
            <p style={{ color: COLORS.neutral.medium, fontSize: '16px' }}>
              Gestione completa dei punti vendita con gerarchia legal entity → stores.
              Questa sezione verrà implementata nella Task 9.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <BrandLayout>
      <div style={{ padding: '24px', background: '#fafbfc', minHeight: '100vh' }}>
        {/* Breadcrumb Navigation */}
        {renderBreadcrumb()}
        
        {/* Organization Header */}
        {renderOrganizationHeader()}
        
        {/* Tab Navigation */}
        {renderTabNavigation()}
        
        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </BrandLayout>
  );
}