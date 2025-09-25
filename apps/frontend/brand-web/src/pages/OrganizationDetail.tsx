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
  PieChart, LineChart, Award, Star, Clock, Globe, Shield, AlertTriangle
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
        
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: COLORS.gradients.orange,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255, 105, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 105, 0, 0.3)';
          }}
          data-testid="button-edit-organization"
        >
          <Edit size={16} />
          Modifica Organizzazione
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        {[
          { label: 'Organization ID', value: organization?.id?.slice(-8) || 'N/A', icon: Target, color: COLORS.semantic.info },
          { label: 'Slug', value: organization?.slug || 'N/A', icon: Globe, color: COLORS.semantic.success },
          { label: 'Created', value: organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString('it-IT') : 'N/A', icon: Calendar, color: COLORS.primary.orange },
          { label: 'Status', value: organization?.status || 'N/A', icon: Shield, color: COLORS.primary.purple },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fafbfc, #ffffff)',
              border: '1px solid #f0f1f3',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div>
              <p style={{
                fontSize: '12px',
                color: COLORS.neutral.medium,
                margin: '0 0 2px 0',
                fontWeight: '500',
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '18px',
                fontWeight: '700',
                color: COLORS.neutral.dark,
                margin: '0',
              }}>
                {stat.value}
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