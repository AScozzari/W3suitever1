import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import BrandLayout from '../components/BrandLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  Store,
  Plus,
  Settings,
  X,
  Users,
  Loader2
} from 'lucide-react';

import ManagementDashboardTab from '@/components/management/ManagementDashboardTab';
import ManagementTenantsTab from '@/components/management/ManagementTenantsTab';
import ManagementLegalEntitiesTab from '@/components/management/ManagementLegalEntitiesTab';
import ManagementStoresTab from '@/components/management/ManagementStoresTab';
import TenantDetailView from '@/components/management/TenantDetailView';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

const COLORS = {
  primary: { orange: '#FF6900', orangeLight: '#ff8533', purple: '#7B2CBF' },
  semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  neutral: { dark: '#1f2937', medium: '#6b7280', light: '#9ca3af', lighter: '#e5e7eb', lightest: '#f9fafb', white: '#ffffff' },
  gradients: { orange: 'linear-gradient(135deg, #FF6900, #ff8533)' }
};

export default function ManagementPage() {
  const { isAuthenticated } = useBrandAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    slug: '',
    status: 'active',
    notes: '',
    admin: {
      email: '',
      password: '',
      firstName: '',
      lastName: ''
    }
  });
  
  const [modals, setModals] = useState({
    createTenant: false,
    createLegalEntity: false,
    createStore: false,
    selectedTenantId: null as string | null,
  });
  
  const createOrganizationMutation = useMutation({
    mutationFn: async (data: typeof organizationForm) => {
      return apiRequest('/brand-api/organizations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setShowCreateTenantModal(false);
      setOrganizationForm({
        name: '', slug: '', status: 'active', notes: '',
        admin: { email: '', password: '', firstName: '', lastName: '' }
      });
    }
  });

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  const tabConfigs = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      testId: 'tab-management-dashboard'
    },
    {
      id: 'tenants',
      label: 'Tenant',
      icon: Building2,
      testId: 'tab-management-tenants'
    },
    {
      id: 'legal-entities',
      label: 'Ragioni Sociali',
      icon: Briefcase,
      testId: 'tab-management-legal-entities'
    },
    {
      id: 'stores',
      label: 'Punti Vendita',
      icon: Store,
      testId: 'tab-management-stores'
    }
  ], []);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  const handleCreateTenant = () => {
    setShowCreateTenantModal(true);
  };

  const handleCreateLegalEntity = (tenantId?: string) => {
    setModals(prev => ({ 
      ...prev, 
      createLegalEntity: true,
      selectedTenantId: tenantId || null
    }));
  };

  const handleCreateStore = (tenantId?: string) => {
    setModals(prev => ({ 
      ...prev, 
      createStore: true,
      selectedTenantId: tenantId || null
    }));
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    console.log('Delete tenant', tenant);
    // TODO: Open delete confirmation dialog
  };

  const handleEditLegalEntity = (entity: any) => {
    console.log('Edit legal entity', entity);
  };

  const handleEditStore = (store: any) => {
    console.log('Edit store', store);
  };

  return (
    <BrandLayout>
      <div className="h-full flex flex-col">
        <div 
          style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(1.5rem) saturate(140%)',
            borderBottom: '0.0625rem solid hsla(255, 255, 255, 0.12)',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0
                }}>
                  <Settings size={24} style={{ color: '#FF6900' }} />
                  Gestione Organizzazione
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
                  Gestione completa di tenant, ragioni sociali e punti vendita
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button 
                  onClick={handleCreateTenant}
                  data-testid="button-header-create-tenant"
                  style={{
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Tenant
                </Button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem' }}>
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={tab.testId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1rem',
                      background: isActive 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                        : 'transparent',
                      color: isActive ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard" className="mt-0">
              {activeTab === 'dashboard' && <ManagementDashboardTab />}
            </TabsContent>

            <TabsContent value="tenants" className="mt-0">
              {activeTab === 'tenants' && (
                selectedTenant ? (
                  <TenantDetailView
                    tenant={selectedTenant}
                    onBack={() => setSelectedTenant(null)}
                    onCreateLegalEntity={handleCreateLegalEntity}
                    onCreateStore={handleCreateStore}
                    onEditTenant={handleEditTenant}
                  />
                ) : (
                  <ManagementTenantsTab 
                    onSelectTenant={handleSelectTenant}
                    onCreateTenant={handleCreateTenant}
                    onEditTenant={handleEditTenant}
                    onDeleteTenant={handleDeleteTenant}
                  />
                )
              )}
            </TabsContent>

            <TabsContent value="legal-entities" className="mt-0">
              {activeTab === 'legal-entities' && (
                <ManagementLegalEntitiesTab 
                  onCreateLegalEntity={() => handleCreateLegalEntity()}
                  onEditLegalEntity={handleEditLegalEntity}
                />
              )}
            </TabsContent>

            <TabsContent value="stores" className="mt-0">
              {activeTab === 'stores' && (
                <ManagementStoresTab 
                  onCreateStore={() => handleCreateStore()}
                  onEditStore={handleEditStore}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showCreateTenantModal && (
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '31.25rem',
            padding: '2rem',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: COLORS.neutral.dark
              }}>
                Crea Nuova Organizzazione
              </h3>
              <button
                onClick={() => setShowCreateTenantModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: COLORS.neutral.medium,
                }}
                data-testid="button-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '0.5rem'
                }}>
                  Nome Organizzazione *
                </label>
                <input
                  type="text"
                  value={organizationForm.name}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    borderRadius: '0.5rem',
                    background: COLORS.neutral.white,
                    color: COLORS.neutral.dark,
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  data-testid="input-organization-name"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '0.5rem'
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
                    padding: '0.75rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    borderRadius: '0.5rem',
                    background: COLORS.neutral.white,
                    color: COLORS.neutral.dark,
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  data-testid="input-organization-slug"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '0.5rem'
                }}>
                  Stato
                </label>
                <select
                  value={organizationForm.status}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    borderRadius: '0.5rem',
                    background: COLORS.neutral.white,
                    color: COLORS.neutral.dark,
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
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
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.neutral.dark,
                  marginBottom: '0.5rem'
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
                    padding: '0.75rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    borderRadius: '0.5rem',
                    background: COLORS.neutral.white,
                    color: COLORS.neutral.dark,
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  data-testid="textarea-organization-notes"
                />
              </div>

              <div style={{
                borderTop: `0.0625rem solid ${COLORS.neutral.lighter}`,
                margin: '0.5rem 0',
                paddingTop: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <Users size={18} style={{ color: COLORS.primary.orange }} />
                  <span style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: COLORS.neutral.dark
                  }}>
                    Amministratore Tenant
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: COLORS.neutral.dark,
                      marginBottom: '0.5rem'
                    }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      value={organizationForm.admin.firstName}
                      onChange={(e) => setOrganizationForm(prev => ({ 
                        ...prev, 
                        admin: { ...prev.admin, firstName: e.target.value } 
                      }))}
                      placeholder="Nome admin"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                        borderRadius: '0.5rem',
                        background: COLORS.neutral.white,
                        color: COLORS.neutral.dark,
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                      data-testid="input-admin-firstname"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: COLORS.neutral.dark,
                      marginBottom: '0.5rem'
                    }}>
                      Cognome
                    </label>
                    <input
                      type="text"
                      value={organizationForm.admin.lastName}
                      onChange={(e) => setOrganizationForm(prev => ({ 
                        ...prev, 
                        admin: { ...prev.admin, lastName: e.target.value } 
                      }))}
                      placeholder="Cognome admin"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                        borderRadius: '0.5rem',
                        background: COLORS.neutral.white,
                        color: COLORS.neutral.dark,
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                      data-testid="input-admin-lastname"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '0.5rem'
                  }}>
                    Email Admin *
                  </label>
                  <input
                    type="email"
                    value={organizationForm.admin.email}
                    onChange={(e) => setOrganizationForm(prev => ({ 
                      ...prev, 
                      admin: { ...prev.admin, email: e.target.value } 
                    }))}
                    placeholder="admin@organizzazione.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                      borderRadius: '0.5rem',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    data-testid="input-admin-email"
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '0.5rem'
                  }}>
                    Password Admin * (min. 8 caratteri)
                  </label>
                  <input
                    type="password"
                    value={organizationForm.admin.password}
                    onChange={(e) => setOrganizationForm(prev => ({ 
                      ...prev, 
                      admin: { ...prev.admin, password: e.target.value } 
                    }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `0.0625rem solid ${organizationForm.admin.password.length > 0 && organizationForm.admin.password.length < 8 ? COLORS.semantic.error : COLORS.neutral.lighter}`,
                      borderRadius: '0.5rem',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    data-testid="input-admin-password"
                  />
                  {organizationForm.admin.password.length > 0 && organizationForm.admin.password.length < 8 && (
                    <span style={{ fontSize: '0.75rem', color: COLORS.semantic.error, marginTop: '0.25rem', display: 'block' }}>
                      La password deve avere almeno 8 caratteri
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1.5rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateTenantModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                  borderRadius: '0.5rem',
                  background: COLORS.neutral.white,
                  color: COLORS.neutral.dark,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
                data-testid="button-cancel-organization"
              >
                Annulla
              </button>
              <button
                onClick={() => createOrganizationMutation.mutate(organizationForm)}
                disabled={
                  !organizationForm.name || 
                  !organizationForm.admin.email || 
                  organizationForm.admin.password.length < 8 || 
                  createOrganizationMutation.isPending
                }
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: (organizationForm.name && organizationForm.admin.email && organizationForm.admin.password.length >= 8) 
                    ? COLORS.gradients.orange 
                    : COLORS.neutral.light,
                  color: 'white',
                  cursor: (organizationForm.name && organizationForm.admin.email && organizationForm.admin.password.length >= 8) 
                    ? 'pointer' 
                    : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
                data-testid="button-create-organization"
              >
                {createOrganizationMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Crea Organizzazione + Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </BrandLayout>
  );
}
