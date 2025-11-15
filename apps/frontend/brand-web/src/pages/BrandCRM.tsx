import { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import { BrandCampaignWizard } from '../components/BrandCampaignWizard';
import { 
  LayoutDashboard, Network, GitBranch, Database, 
  TrendingUp, Users, Workflow, Package, 
  FileJson, Download, Upload, Settings, Plus
} from 'lucide-react';

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

type Tab = 'dashboard' | 'templates' | 'workflows';

export default function BrandCRM() {
  const { isAuthenticated } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease'
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'templates' as const, label: 'Struttura Campagne', icon: Database },
    { id: 'workflows' as const, label: 'Workflows Builder', icon: GitBranch }
  ];

  return (
    <BrandLayout>
      <div style={{ padding: '24px', minHeight: '100vh', background: '#ffffff' }}>
        {/* Page Header */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '32px',
            marginBottom: '24px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`
          }}
          data-testid="brand-crm-header"
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px' 
          }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 700,
                background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '8px'
              }}>
                Master Catalog CRM
              </h1>
              <p style={{ 
                fontSize: '14px',
                color: COLORS.neutral.medium,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Network size={18} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
                <span style={{ fontWeight: 500 }}>
                  Governance centralizzato per {isCrossTenant ? '300+ tenant' : `tenant ${currentTenant}`}
                </span>
                {isCrossTenant && (
                  <span style={{
                    background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`,
                    color: COLORS.primary.orange,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    marginLeft: '8px',
                    border: `1px solid ${COLORS.primary.orange}30`
                  }}>
                    HQ MODE
                  </span>
                )}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{
                  background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`,
                  color: COLORS.neutral.dark,
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                data-testid="button-import-templates"
              >
                <Upload size={20} strokeWidth={2.5} />
                Import Templates
              </button>
              
              <button 
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary.purple}, ${COLORS.primary.purpleLight})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 44, 191, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(123, 44, 191, 0.3)';
                }}
                data-testid="button-deploy-bundle"
              >
                <Download size={20} strokeWidth={2.5} />
                Deploy Bundle
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div style={{ 
            display: 'flex',
            gap: '8px',
            borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
            paddingBottom: '0'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 24px',
                    background: isActive 
                      ? `linear-gradient(135deg, ${COLORS.primary.orange}15, ${COLORS.primary.orange}10)`
                      : 'transparent',
                    color: isActive ? COLORS.primary.orange : COLORS.neutral.medium,
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${COLORS.primary.orange}` : '3px solid transparent',
                    borderRadius: '8px 8px 0 0',
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    marginBottom: '-1px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${COLORS.glass.whiteLight}`;
                      e.currentTarget.style.color = COLORS.neutral.dark;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = COLORS.neutral.medium;
                    }
                  }}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '600px' }}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
        </div>
      </div>
    </BrandLayout>
  );
}

function DashboardTab() {
  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease',
    padding: '24px'
  };

  const statCards = [
    {
      title: 'Deployed Bundles',
      value: '23',
      change: '+3 questo mese',
      icon: Package,
      color: COLORS.primary.orange,
      testId: 'card-deployed-bundles'
    },
    {
      title: 'Active Tenants',
      value: '312',
      change: '98% uptime',
      icon: Users,
      color: COLORS.primary.purple,
      testId: 'card-active-tenants'
    },
    {
      title: 'Workflow Versions',
      value: '156',
      change: 'v2.4.1 latest',
      icon: Workflow,
      color: COLORS.semantic.success,
      testId: 'card-workflow-versions'
    },
    {
      title: 'Templates Totali',
      value: '89',
      change: '+12 nuovi',
      icon: FileJson,
      color: COLORS.semantic.info,
      testId: 'card-total-templates'
    }
  ];

  return (
    <div data-testid="dashboard-tab-content">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.testId}
              style={{
                ...glassCardStyle,
                cursor: 'pointer',
                borderLeft: `3px solid ${card.color}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
              }}
              data-testid={card.testId}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: card.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    {card.title}
                  </p>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    marginBottom: '4px'
                  }}>{card.value}</div>
                  <p style={{
                    fontSize: '13px',
                    color: COLORS.neutral.medium,
                    fontWeight: 500
                  }}>{card.change}</p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${card.color}20, ${card.color}10)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={24} style={{ color: card.color }} strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Chart Placeholder */}
      <div 
        style={{
          ...glassCardStyle,
          marginTop: '24px',
          textAlign: 'center',
          padding: '48px'
        }}
        data-testid="activity-chart"
      >
        <TrendingUp size={48} style={{ color: COLORS.neutral.light, margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '8px' }}>
          Deployment Activity
        </h3>
        <p style={{ color: COLORS.neutral.medium, fontSize: '14px' }}>
          Chart placeholder - To be implemented with real analytics
        </p>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [campaignTemplates, setCampaignTemplates] = useState<any[]>([]);

  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    padding: '24px'
  };

  const handleSaveTemplate = (jsonTemplate: any) => {
    console.log('📦 Campaign Template JSON:', jsonTemplate);
    setCampaignTemplates(prev => [...prev, jsonTemplate]);
    // TODO: Save to backend /api/brand/campaigns endpoint
  };

  return (
    <>
      <div style={glassCardStyle} data-testid="templates-tab-content">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '4px' }}>
              Struttura Campagne
            </h3>
            <p style={{ color: COLORS.neutral.medium, fontSize: '14px' }}>
              Gestisci template campagne, pipelines e funnel
            </p>
          </div>
          <button 
            onClick={() => setWizardOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 105, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.3)';
            }}
            data-testid="button-new-campaign-template"
          >
            <Plus size={20} strokeWidth={2.5} />
            Nuova Campagna
          </button>
        </div>

        {campaignTemplates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Database size={48} style={{ color: COLORS.neutral.light, margin: '0 auto 16px' }} />
            <p style={{ color: COLORS.neutral.medium, fontSize: '14px', marginBottom: '24px' }}>
              Nessun template campagna creato
            </p>
            <p style={{ color: COLORS.neutral.light, fontSize: '12px' }}>
              📋 Clicca "Nuova Campagna" per creare il primo template
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {campaignTemplates.map((template, index) => (
              <div 
                key={index}
                style={{
                  ...glassCardStyle,
                  padding: '16px',
                  cursor: 'pointer'
                }}
                data-testid={`campaign-template-${index}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileJson size={20} style={{ color: COLORS.primary.orange }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{template.name}</h4>
                </div>
                <p style={{ fontSize: '12px', color: COLORS.neutral.medium }}>
                  {template.description || 'Nessuna descrizione'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BrandCampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSaveTemplate}
        template={null}
        mode="create"
      />
    </>
  );
}

function WorkflowsTab() {
  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    padding: '24px'
  };

  return (
    <div style={glassCardStyle} data-testid="workflows-tab-content">
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <GitBranch size={48} style={{ color: COLORS.neutral.light, margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '8px' }}>
          Workflows Builder
        </h3>
        <p style={{ color: COLORS.neutral.medium, fontSize: '14px', marginBottom: '24px' }}>
          ReactFlow workflow editor with @w3suite/workflow-builder-ui integration
        </p>
        <p style={{ color: COLORS.neutral.light, fontSize: '12px' }}>
          🔧 Task 10-11: To be implemented with full ReactFlow editor + API
        </p>
      </div>
    </div>
  );
}
