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
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeCategory, setActiveCategory] = useState('organization');
  const [activeSection, setActiveSection] = useState('tenants');

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
      sections: [
        { id: 'tenants', label: 'Tenant (Organizzazioni)', icon: Building2, description: 'Gestione delle organizzazioni enterprise' },
        { id: 'legal-entities', label: 'Ragioni Sociali', icon: FileText, description: 'Entità giuridiche per ogni tenant' },
        { id: 'stores', label: 'Punti Vendita', icon: Store, description: 'Store fisici e virtuali' },
        { id: 'users', label: 'Risorse (Utenti)', icon: Users, description: 'Dipendenti e permessi enterprise' }
      ]
    },
    {
      id: 'business',
      label: 'Configurazione Business',
      icon: Zap,
      color: '#7B2CBF',
      sections: [
        { id: 'channels', label: 'Canali e Brand', icon: Globe, description: 'WindTre, Very Mobile, configurazioni brand' },
        { id: 'products', label: 'Catalogo Prodotti', icon: CreditCard, description: 'Gestione prodotti e servizi' },
        { id: 'campaigns', label: 'Campagne Marketing', icon: Bell, description: 'Gestione campagne pubblicitarie' },
        { id: 'pricing', label: 'Listini e Prezzi', icon: FileText, description: 'Override pricing per tenant' }
      ]
    },
    {
      id: 'system',
      label: 'Configurazioni Sistema',
      icon: Server,
      color: '#10b981',
      sections: [
        { id: 'database', label: 'Database PostgreSQL', icon: Database, description: 'Monitoring connessioni e RLS' },
        { id: 'security', label: 'Sicurezza & OAuth', icon: Shield, description: 'Configurazione OAuth2/OIDC enterprise' },
        { id: 'integrations', label: 'Integrazioni API', icon: Activity, description: 'Gestione API esterne' },
        { id: 'logs', label: 'Log e Monitoring', icon: FileText, description: 'System health e audit trails' }
      ]
    },
    {
      id: 'preferences',
      label: 'Preferenze Utente',
      icon: Palette,
      color: '#f59e0b',
      sections: [
        { id: 'appearance', label: 'Aspetto e Tema', icon: Palette, description: 'Personalizzazione interfaccia' },
        { id: 'localization', label: 'Localizzazione', icon: Languages, description: 'Lingua e formati regionali' },
        { id: 'notifications', label: 'Notifiche', icon: Bell, description: 'Configurazione alert e notifiche' },
        { id: 'timezone', label: 'Fuso Orario', icon: Clock, description: 'Impostazioni temporali' }
      ]
    }
  ];

  const renderTenantManagement = () => (
    <div style={{ padding: '32px' }}>
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
            margin: '0 0 24px 0',
            lineHeight: 1.5
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

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Tenant Attivi', value: mockTenants.filter(t => t.status === 'active').length, color: '#10b981', icon: Building2, trend: '+12%' },
          { label: 'Ragioni Sociali', value: mockTenants.reduce((acc, t) => acc + t.legalEntities, 0), color: '#FF6900', icon: FileText, trend: '+5%' },
          { label: 'Punti Vendita', value: mockTenants.reduce((acc, t) => acc + t.stores, 0), color: '#7B2CBF', icon: Store, trend: '+18%' },
          { label: 'Utenti Totali', value: mockTenants.reduce((acc, t) => acc + t.users, 0), color: '#3b82f6', icon: Users, trend: '+8%' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `${stat.color}15`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={24} style={{ color: stat.color }} />
                </div>
                <div style={{
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#dcfce7',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  {stat.trend}
                </div>
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: stat.color,
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tenants List */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          background: '#f8f9fa',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Tenant Configurati ({mockTenants.length})
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#374151'
            }}>
              Esporta
            </button>
            <button style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#374151'
            }}>
              Filtri
            </button>
          </div>
        </div>

        <div style={{ padding: '0' }}>
          {mockTenants.map((tenant, index) => (
            <div key={tenant.id} style={{
              padding: '24px',
              borderBottom: index < mockTenants.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `linear-gradient(135deg, ${tenant.type === 'Franchising' ? '#FF6900' : tenant.type === 'Top Dealer' ? '#7B2CBF' : '#10b981'}, ${tenant.type === 'Franchising' ? '#ff8533' : tenant.type === 'Top Dealer' ? '#9333ea' : '#059669'})`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '20px'
                }}>
                  {tenant.name.charAt(0)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '6px'
                  }}>
                    {tenant.name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: '500' }}>{tenant.type}</span>
                    <span>•</span>
                    <span>{tenant.slug}</span>
                    <span>•</span>
                    <span>Creato il {new Date(tenant.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    display: 'flex',
                    gap: '20px'
                  }}>
                    <span>{tenant.legalEntities} Ragioni Sociali</span>
                    <span>{tenant.stores} Punti Vendita</span>
                    <span>{tenant.users} Utenti</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: tenant.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: tenant.status === 'active' ? '#16a34a' : '#d97706',
                  border: `1px solid ${tenant.status === 'active' ? '#bbf7d0' : '#fde68a'}`,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {tenant.status === 'active' ? <Check size={12} /> : <AlertTriangle size={12} />}
                  {tenant.status === 'active' ? 'Attivo' : 'Bozza'}
                </div>

                <button style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlaceholderSection = () => {
    const currentCategory = settingsCategories.find(c => c.id === activeCategory);
    const currentSection = currentCategory?.sections.find(s => s.id === activeSection);
    
    return (
      <div style={{
        padding: '80px 32px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        {currentSection && (
          <>
            <currentSection.icon size={64} style={{ color: currentCategory?.color, margin: '0 auto 24px' }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px'
            }}>
              {currentSection.label}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '32px',
              maxWidth: '500px',
              margin: '0 auto 32px'
            }}>
              {currentSection.description}
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
    if (activeCategory === 'organization' && activeSection === 'tenants') {
      return renderTenantManagement();
    }
    return renderPlaceholderSection();
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: 'calc(100vh - 120px)',
        display: 'flex'
      }}>
        {/* Sidebar Menu Cascading */}
        <div style={{
          width: '350px',
          background: '#f8f9fa',
          borderRight: '1px solid #e5e7eb',
          height: 'calc(100vh - 120px)',
          overflowY: 'auto',
          position: 'sticky',
          top: 0
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff'
          }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Settings size={20} style={{ color: '#FF6900' }} />
              Configurazioni W3 Suite
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.4
            }}>
              Gestione completa dell'architettura enterprise multitenant
            </p>
          </div>

          {/* Categories Menu */}
          <div style={{ padding: '16px 0' }}>
            {settingsCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isActiveCategory = activeCategory === category.id;

              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => {
                      setActiveCategory(category.id);
                      setActiveSection(category.sections[0].id);
                    }}
                    style={{
                      width: '100%',
                      background: isActiveCategory ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderLeft: isActiveCategory ? `3px solid ${category.color}` : '3px solid transparent',
                      padding: '16px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      boxShadow: isActiveCategory ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isActiveCategory) {
                        e.currentTarget.style.background = '#f3f4f6';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActiveCategory) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <CategoryIcon size={18} style={{ color: category.color }} />
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isActiveCategory ? category.color : '#374151',
                        marginBottom: '2px'
                      }}>
                        {category.label}
                      </div>
                    </div>
                  </button>

                  {/* Sections List */}
                  {isActiveCategory && (
                    <div style={{ paddingLeft: '20px' }}>
                      {category.sections.map((section) => {
                        const SectionIcon = section.icon;
                        const isActiveSection = activeSection === section.id;

                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            style={{
                              width: '100%',
                              background: isActiveSection ? category.color + '15' : 'transparent',
                              border: 'none',
                              borderLeft: isActiveSection ? `2px solid ${category.color}` : '2px solid transparent',
                              padding: '12px 24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.2s ease',
                              textAlign: 'left',
                              borderRadius: isActiveSection ? '0 8px 8px 0' : '0'
                            }}
                            onMouseOver={(e) => {
                              if (!isActiveSection) {
                                e.currentTarget.style.background = '#f9fafb';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isActiveSection) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <SectionIcon size={16} style={{ 
                              color: isActiveSection ? category.color : '#6b7280' 
                            }} />
                            <div>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: isActiveSection ? '600' : '500',
                                color: isActiveSection ? category.color : '#374151',
                                marginBottom: '2px'
                              }}>
                                {section.label}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                lineHeight: 1.2
                              }}>
                                {section.description}
                              </div>
                            </div>
                            {isActiveSection && (
                              <ChevronRight size={14} style={{ 
                                color: category.color, 
                                marginLeft: 'auto' 
                              }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}