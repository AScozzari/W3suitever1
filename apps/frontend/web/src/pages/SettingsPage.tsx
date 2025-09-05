import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
  Settings,
  Building2,
  Users,
  Store,
  Shield,
  Bell,
  Database,
  Server,
  Activity,
  FileText,
  Globe,
  Lock,
  Cpu,
  HardDrive,
  Plus,
  Edit3,
  MoreVertical,
  ChevronRight,
  User,
  UserCog,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Zap,
  Palette,
  Languages,
  Clock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Home
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeView, setActiveView] = useState('overview'); // overview, category, section
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Mock data enterprise
  const mockTenants = [
    { 
      id: '1', 
      name: 'WindTre Franchise Nord', 
      slug: 'windtre-nord',
      type: 'Franchising', 
      status: 'active',
      legalEntities: 3,
      stores: 12,
      users: 45,
      createdAt: '2024-01-15'
    },
    { 
      id: '2', 
      name: 'Very Mobile Premium', 
      slug: 'very-premium',
      type: 'Top Dealer', 
      status: 'active',
      legalEntities: 2,
      stores: 8,
      users: 28,
      createdAt: '2024-02-10'
    },
    { 
      id: '3', 
      name: 'Digital Solutions Hub', 
      slug: 'digital-hub',
      type: 'Dealer', 
      status: 'draft',
      legalEntities: 1,
      stores: 3,
      users: 12,
      createdAt: '2024-03-05'
    }
  ];

  const settingsCategories = [
    {
      id: 'organization',
      label: 'Gestione Organizzazione',
      icon: Building2,
      color: '#FF6900',
      description: 'Configurazione entità enterprise e gerarchia organizzativa',
      sections: [
        { id: 'tenants', label: 'Tenant (Organizzazioni)', icon: Building2, description: 'Gestione delle organizzazioni enterprise', count: mockTenants.length },
        { id: 'legal-entities', label: 'Ragioni Sociali', icon: FileText, description: 'Entità giuridiche per ogni tenant', count: 6 },
        { id: 'stores', label: 'Punti Vendita', icon: Store, description: 'Store fisici e virtuali', count: 23 },
        { id: 'users', label: 'Risorse (Utenti)', icon: Users, description: 'Dipendenti e permessi enterprise', count: 85 }
      ]
    },
    {
      id: 'business',
      label: 'Configurazione Business',
      icon: Zap,
      color: '#7B2CBF',
      description: 'Driver business e configurazioni operative',
      sections: [
        { id: 'channels', label: 'Canali e Brand', icon: Globe, description: 'WindTre, Very Mobile, configurazioni brand', count: 4 },
        { id: 'products', label: 'Catalogo Prodotti', icon: CreditCard, description: 'Gestione prodotti e servizi', count: 156 },
        { id: 'campaigns', label: 'Campagne Marketing', icon: Bell, description: 'Gestione campagne pubblicitarie', count: 12 },
        { id: 'pricing', label: 'Listini e Prezzi', icon: FileText, description: 'Override pricing per tenant', count: 8 }
      ]
    },
    {
      id: 'system',
      label: 'Configurazioni Sistema',
      icon: Server,
      color: '#10b981',
      description: 'Impostazioni tecniche e infrastruttura',
      sections: [
        { id: 'database', label: 'Database PostgreSQL', icon: Database, description: 'Monitoring connessioni e RLS', status: 'Connesso', count: undefined },
        { id: 'security', label: 'Sicurezza & OAuth', icon: Shield, description: 'Configurazione OAuth2/OIDC enterprise', status: 'Configurato', count: undefined },
        { id: 'integrations', label: 'Integrazioni API', icon: Activity, description: 'Gestione API esterne', count: 8, status: undefined },
        { id: 'logs', label: 'Log e Monitoring', icon: FileText, description: 'System health e audit trails', status: 'Attivo', count: undefined }
      ]
    },
    {
      id: 'preferences',
      label: 'Preferenze Utente',
      icon: Palette,
      color: '#f59e0b',
      description: 'Temi, localizzazione e impostazioni utente',
      sections: [
        { id: 'appearance', label: 'Aspetto e Tema', icon: Palette, description: 'Personalizzazione interfaccia', count: undefined, status: undefined },
        { id: 'localization', label: 'Localizzazione', icon: Languages, description: 'Lingua e formati regionali', count: undefined, status: undefined },
        { id: 'notifications', label: 'Notifiche', icon: Bell, description: 'Configurazione alert e notifiche', count: undefined, status: undefined },
        { id: 'timezone', label: 'Fuso Orario', icon: Clock, description: 'Impostazioni temporali', count: undefined, status: undefined }
      ]
    }
  ];

  const renderBreadcrumb = () => {
    const items = [
      { label: 'Configurazioni', onClick: () => setActiveView('overview') }
    ];

    if (selectedCategory) {
      const category = settingsCategories.find(c => c.id === selectedCategory);
      if (category) {
        items.push({ label: category.label, onClick: () => setActiveView('category') });
      }
    }

    if (selectedSection) {
      const category = settingsCategories.find(c => c.id === selectedCategory);
      const section = category?.sections.find(s => s.id === selectedSection);
      if (section) {
        items.push({ label: section.label, onClick: undefined });
      }
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 0',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <Home size={16} style={{ color: '#6b7280' }} />
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} style={{ color: '#d1d5db' }} />}
            <button
              onClick={item.onClick || (() => {})}
              disabled={!item.onClick}
              style={{
                background: 'transparent',
                border: 'none',
                color: item.onClick ? '#3b82f6' : '#111827',
                fontSize: '14px',
                fontWeight: item.onClick ? '500' : '600',
                cursor: item.onClick ? 'pointer' : 'default',
                textDecoration: 'none'
              }}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderOverview = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Configurazioni W3 Suite
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestione completa dell'architettura enterprise multitenant
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setActiveView('category');
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${category.color}20`;
                e.currentTarget.style.borderColor = category.color + '40';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: category.color + '15',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Icon size={24} style={{ color: category.color }} />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  {category.label}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 16px 0',
                  lineHeight: 1.5
                }}>
                  {category.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {category.sections.length} sezioni
                </span>
                <ChevronRight size={16} style={{ color: category.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCategoryView = () => {
    const category = settingsCategories.find(c => c.id === selectedCategory);
    if (!category) return null;

    const CategoryIcon = category.icon;

    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setActiveView('overview')}
            style={{
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            <ArrowLeft size={14} />
            Torna alle configurazioni
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: category.color + '15',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CategoryIcon size={28} style={{ color: category.color }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#111827',
                margin: '0 0 4px 0'
              }}>
                {category.label}
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                margin: 0
              }}>
                {category.description}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {category.sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div
                key={section.id}
                onClick={() => {
                  setSelectedSection(section.id);
                  setActiveView('section');
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = category.color + '40';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: category.color + '15',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <SectionIcon size={20} style={{ color: category.color }} />
                  </div>
                  {(section.count || section.status) && (
                    <div style={{
                      background: section.status ? '#10b981' : category.color,
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      {section.count || section.status}
                    </div>
                  )}
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  {section.label}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 16px 0',
                  lineHeight: 1.4
                }}>
                  {section.description}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: category.color,
                    fontWeight: '500'
                  }}>
                    Configura
                  </span>
                  <ChevronRight size={14} style={{ color: category.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTenantManagement = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => setActiveView('category')}
          style={{
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          <ArrowLeft size={14} />
          Torna a Gestione Organizzazione
        </button>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              Gestione Tenant (Organizzazioni)
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: 0
            }}>
              Configurazione delle organizzazioni enterprise con isolamento Row Level Security (RLS)
            </p>
          </div>
          <button style={{
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            <Plus size={16} />
            Nuovo Tenant
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Tenant Attivi', value: mockTenants.filter(t => t.status === 'active').length, color: '#10b981', icon: Building2 },
          { label: 'Ragioni Sociali', value: mockTenants.reduce((acc, t) => acc + t.legalEntities, 0), color: '#FF6900', icon: FileText },
          { label: 'Punti Vendita', value: mockTenants.reduce((acc, t) => acc + t.stores, 0), color: '#7B2CBF', icon: Store },
          { label: 'Utenti Totali', value: mockTenants.reduce((acc, t) => acc + t.users, 0), color: '#3b82f6', icon: Users }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Icon size={20} style={{ color: stat.color }} />
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</span>
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: stat.color
              }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tenants List */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          background: '#f8f9fa',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Tenant Configurati ({mockTenants.length})
          </h3>
        </div>

        <div>
          {mockTenants.map((tenant, index) => (
            <div key={tenant.id} style={{
              padding: '20px',
              borderBottom: index < mockTenants.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${tenant.type === 'Franchising' ? '#FF6900' : tenant.type === 'Top Dealer' ? '#7B2CBF' : '#10b981'}, ${tenant.type === 'Franchising' ? '#ff8533' : tenant.type === 'Top Dealer' ? '#9333ea' : '#059669'})`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '16px'
                }}>
                  {tenant.name.charAt(0)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    {tenant.name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span>{tenant.type}</span>
                    <span>•</span>
                    <span>{tenant.legalEntities} RS</span>
                    <span>•</span>
                    <span>{tenant.stores} PV</span>
                    <span>•</span>
                    <span>{tenant.users} Utenti</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: tenant.status === 'active' ? '#dcfce7' : '#fef3c7',
                color: tenant.status === 'active' ? '#16a34a' : '#d97706',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {tenant.status === 'active' ? 'Attivo' : 'Bozza'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    if (selectedCategory === 'organization' && selectedSection === 'tenants') {
      return renderTenantManagement();
    }
    
    // Placeholder per altre sezioni
    const category = settingsCategories.find(c => c.id === selectedCategory);
    const section = category?.sections.find(s => s.id === selectedSection);
    
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <button
          onClick={() => setActiveView('category')}
          style={{
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto 32px',
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          <ArrowLeft size={14} />
          Torna a {category?.label}
        </button>
        
        {section && (
          <>
            <section.icon size={64} style={{ color: category?.color, margin: '0 auto 24px' }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px'
            }}>
              {section.label}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              {section.description}
            </p>
            <div style={{
              background: '#f3f4f6',
              color: '#6b7280',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-block'
            }}>
              Sezione in sviluppo - Prossimamente disponibile
            </div>
          </>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'category':
        return renderCategoryView();
      case 'section':
        return renderSectionContent();
      default:
        return renderOverview();
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: 'calc(100vh - 120px)',
        padding: '32px'
      }}>
        {renderBreadcrumb()}
        {renderContent()}
      </div>
    </Layout>
  );
}