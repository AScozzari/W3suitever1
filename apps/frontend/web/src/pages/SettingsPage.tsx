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
  ChevronDown,
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
  Clock
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeSection, setActiveSection] = useState('organization');
  const [activeSubSection, setActiveSubSection] = useState('tenants');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['organization', 'system']);

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

  const mockLegalEntities = [
    {
      id: '1',
      name: 'W3 Suite Technology Srl',
      legalForm: 'Srl',
      vatNumber: 'IT12345678901',
      fiscalCode: 'W3SUITE2024',
      address: 'Via Roma 123, Milano',
      status: 'active',
      tenantId: '1'
    },
    {
      id: '2',
      name: 'Franchising Operations Snc',
      legalForm: 'Snc',
      vatNumber: 'IT09876543210',
      fiscalCode: 'FROPS2024',
      address: 'Corso Venezia 45, Bologna',
      status: 'active',
      tenantId: '1'
    }
  ];

  const settingsStructure = [
    {
      id: 'organization',
      label: 'Gestione Organizzazione',
      icon: Building2,
      color: '#FF6900',
      description: 'Configurazione entità enterprise e gerarchia organizzativa',
      subSections: [
        { id: 'tenants', label: 'Tenant (Organizzazioni)', icon: Building2, count: mockTenants.length, status: undefined },
        { id: 'legal-entities', label: 'Ragioni Sociali', icon: FileText, count: mockLegalEntities.length, status: undefined },
        { id: 'stores', label: 'Punti Vendita', icon: Store, count: 23, status: undefined },
        { id: 'users', label: 'Risorse (Utenti)', icon: Users, count: 85, status: undefined }
      ]
    },
    {
      id: 'business',
      label: 'Configurazione Business',
      icon: Zap,
      color: '#7B2CBF',
      description: 'Driver business e configurazioni operative',
      subSections: [
        { id: 'channels', label: 'Canali e Brand', icon: Globe, count: 4, status: undefined },
        { id: 'products', label: 'Catalogo Prodotti', icon: CreditCard, count: 156, status: undefined },
        { id: 'campaigns', label: 'Campagne Marketing', icon: Bell, count: 12, status: undefined },
        { id: 'pricing', label: 'Listini e Prezzi', icon: FileText, count: 8, status: undefined }
      ]
    },
    {
      id: 'system',
      label: 'Configurazioni Sistema',
      icon: Server,
      color: '#10b981',
      description: 'Impostazioni tecniche e infrastruttura',
      subSections: [
        { id: 'database', label: 'Database PostgreSQL', icon: Database, count: undefined, status: 'connected' },
        { id: 'security', label: 'Sicurezza & OAuth', icon: Shield, count: undefined, status: 'configured' },
        { id: 'integrations', label: 'Integrazioni API', icon: Activity, count: 8, status: undefined },
        { id: 'logs', label: 'Log e Monitoring', icon: FileText, count: undefined, status: 'active' }
      ]
    },
    {
      id: 'preferences',
      label: 'Preferenze & Personalizzazione',
      icon: Palette,
      color: '#f59e0b',
      description: 'Temi, localizzazione e impostazioni utente',
      subSections: [
        { id: 'appearance', label: 'Aspetto e Tema', icon: Palette, count: undefined, status: undefined },
        { id: 'localization', label: 'Localizzazione', icon: Languages, count: undefined, status: undefined },
        { id: 'notifications', label: 'Notifiche', icon: Bell, count: undefined, status: undefined },
        { id: 'timezone', label: 'Fuso Orario', icon: Clock, count: undefined, status: undefined }
      ]
    }
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const renderSidebar = () => (
    <div style={{
      width: '320px',
      background: 'hsla(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: '1px solid hsla(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '24px',
      height: 'fit-content',
      position: 'sticky',
      top: '24px'
    }}>
      <div style={{
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid hsla(255, 255, 255, 0.08)'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Settings size={20} style={{ color: '#FF6900' }} />
          Configurazioni W3 Suite
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0,
          lineHeight: 1.4
        }}>
          Gestione completa dell'architettura enterprise multitenant
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {settingsStructure.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedMenus.includes(section.id);
          const isActive = activeSection === section.id;

          return (
            <div key={section.id}>
              {/* Main Section */}
              <button
                onClick={() => {
                  setActiveSection(section.id);
                  toggleMenu(section.id);
                  if (section.subSections.length > 0) {
                    setActiveSubSection(section.subSections[0].id);
                  }
                }}
                style={{
                  width: '100%',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(255, 105, 0, 0.1), rgba(255, 105, 0, 0.05))'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(255, 105, 0, 0.2)' : '1px solid transparent',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} style={{ color: section.color }} />
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isActive ? '#FF6900' : '#111827',
                      marginBottom: '2px'
                    }}>
                      {section.label}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      lineHeight: 1.2
                    }}>
                      {section.description}
                    </div>
                  </div>
                </div>
                {section.subSections.length > 0 && (
                  <div style={{ color: isActive ? '#FF6900' : '#6b7280' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </button>

              {/* Sub Sections */}
              {isExpanded && section.subSections.length > 0 && (
                <div style={{
                  marginLeft: '16px',
                  marginTop: '8px',
                  paddingLeft: '16px',
                  borderLeft: '2px solid hsla(255, 105, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {section.subSections.map((subSection) => {
                    const SubIcon = subSection.icon;
                    const isSubActive = activeSubSection === subSection.id;

                    return (
                      <button
                        key={subSection.id}
                        onClick={() => setActiveSubSection(subSection.id)}
                        style={{
                          background: isSubActive 
                            ? 'rgba(255, 105, 0, 0.08)'
                            : 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          textAlign: 'left'
                        }}
                        onMouseOver={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <SubIcon size={14} style={{ 
                            color: isSubActive ? '#FF6900' : '#6b7280' 
                          }} />
                          <span style={{
                            fontSize: '13px',
                            fontWeight: isSubActive ? '500' : '400',
                            color: isSubActive ? '#FF6900' : '#374151'
                          }}>
                            {subSection.label}
                          </span>
                        </div>
                        {(subSection.count || subSection.status) && (
                          <div style={{
                            background: subSection.status 
                              ? (subSection.status === 'connected' || subSection.status === 'active' ? '#10b981' : '#f59e0b')
                              : '#FF6900',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            minWidth: subSection.status ? '8px' : '16px',
                            textAlign: 'center'
                          }}>
                            {subSection.count || '●'}
                          </div>
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
  );

  const renderTenantManagement = () => (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Gestione Tenant (Organizzazioni)
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            Configurazione delle organizzazioni enterprise con isolamento RLS
          </p>
        </div>
        <button style={{
          background: 'linear-gradient(135deg, #FF6900, #ff8533)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 20px',
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

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Tenant Attivi', value: mockTenants.filter(t => t.status === 'active').length, color: '#10b981', icon: Building2 },
          { label: 'Totale Ragioni Sociali', value: mockTenants.reduce((acc, t) => acc + t.legalEntities, 0), color: '#FF6900', icon: FileText },
          { label: 'Punti Vendita', value: mockTenants.reduce((acc, t) => acc + t.stores, 0), color: '#7B2CBF', icon: Store },
          { label: 'Utenti Totali', value: mockTenants.reduce((acc, t) => acc + t.users, 0), color: '#3b82f6', icon: Users }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} style={{
              background: 'hsla(255, 255, 255, 0.08)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <Icon size={24} style={{ color: stat.color, margin: '0 auto 12px' }} />
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: stat.color,
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tenants Table */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          padding: '20px 24px',
          borderBottom: '1px solid hsla(255, 255, 255, 0.08)'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Tenant Configurati
          </h4>
        </div>

        <div style={{ padding: '0' }}>
          {mockTenants.map((tenant, index) => (
            <div key={tenant.id} style={{
              padding: '20px 24px',
              borderBottom: index < mockTenants.length - 1 ? '1px solid hsla(255, 255, 255, 0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: `linear-gradient(135deg, ${tenant.type === 'Franchising' ? '#FF6900' : tenant.type === 'Top Dealer' ? '#7B2CBF' : '#10b981'}, ${tenant.type === 'Franchising' ? '#ff8533' : tenant.type === 'Top Dealer' ? '#9333ea' : '#059669'})`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px'
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
                    fontSize: '12px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span>{tenant.type}</span>
                    <span>•</span>
                    <span>{tenant.slug}</span>
                    <span>•</span>
                    <span>{tenant.legalEntities} RS</span>
                    <span>•</span>
                    <span>{tenant.stores} PV</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {tenant.users}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    Utenti
                  </div>
                </div>

                <div style={{
                  background: tenant.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: tenant.status === 'active' ? '#16a34a' : '#d97706',
                  border: `1px solid ${tenant.status === 'active' ? '#bbf7d0' : '#fde68a'}`,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {tenant.status === 'active' ? 'Attivo' : 'Bozza'}
                </div>

                <button style={{
                  background: 'transparent',
                  border: '1px solid hsla(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  transition: 'all 0.2s ease'
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

  const renderContent = () => {
    if (activeSection === 'organization' && activeSubSection === 'tenants') {
      return renderTenantManagement();
    }

    // Placeholder per altre sezioni
    const currentSection = settingsStructure.find(s => s.id === activeSection);
    const currentSubSection = currentSection?.subSections.find(s => s.id === activeSubSection);
    
    return (
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '60px',
        textAlign: 'center'
      }}>
        {currentSubSection && (
          <>
            <currentSubSection.icon size={64} style={{ color: currentSection?.color, margin: '0 auto 24px' }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px'
            }}>
              {currentSubSection.label}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6b7280'
            }}>
              Sezione in sviluppo - Prossimamente disponibile
            </p>
          </>
        )}
      </div>
    );
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: 'calc(100vh - 120px)',
        padding: '24px',
        display: 'flex',
        gap: '24px'
      }}>
        {/* Sidebar */}
        {renderSidebar()}

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}