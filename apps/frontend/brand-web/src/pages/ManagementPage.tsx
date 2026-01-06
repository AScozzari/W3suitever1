import { useState, useMemo } from 'react';
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
  Settings
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

export default function ManagementPage() {
  const { isAuthenticated } = useBrandAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  const [modals, setModals] = useState({
    createTenant: false,
    createLegalEntity: false,
    createStore: false,
    selectedTenantId: null as string | null,
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
    setModals(prev => ({ ...prev, createTenant: true }));
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
    console.log('Edit tenant', tenant);
    // TODO: Open edit tenant modal
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
                  variant="outline"
                  onClick={handleCreateLegalEntity}
                  data-testid="button-header-create-legal-entity"
                  style={{
                    borderColor: '#7B2CBF',
                    color: '#7B2CBF',
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova RS
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleCreateStore}
                  data-testid="button-header-create-store"
                  style={{
                    borderColor: '#10b981',
                    color: '#10b981',
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Store
                </Button>
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

    </BrandLayout>
  );
}
