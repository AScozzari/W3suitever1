import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  Building2, ArrowLeft, BarChart3, Briefcase, Store, Plus,
  Calendar, Globe, Shield, TrendingUp, MapPin, Phone, Mail,
  Edit2, Loader2, ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';

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
  gradients: {
    orange: 'linear-gradient(135deg, #FF6900, #ff8533)',
    purple: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
    green: 'linear-gradient(135deg, #10b981, #34d399)',
  }
};

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

interface TenantDetailViewProps {
  tenant: Tenant;
  onBack: () => void;
  onCreateLegalEntity: (tenantId: string) => void;
  onCreateStore: (tenantId: string) => void;
  onEditTenant: (tenant: Tenant) => void;
}

type DetailTab = 'dashboard' | 'legal-entities' | 'stores';

export default function TenantDetailView({
  tenant,
  onBack,
  onCreateLegalEntity,
  onCreateStore,
  onEditTenant,
}: TenantDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('dashboard');

  const { data: legalEntitiesData, isLoading: legalEntitiesLoading } = useQuery({
    queryKey: ['/brand-api/organizations', tenant.id, 'legal-entities'],
    queryFn: () => apiRequest(`/brand-api/organizations/${tenant.id}/legal-entities`),
  });

  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['/brand-api/organizations', tenant.id, 'stores'],
    queryFn: () => apiRequest(`/brand-api/organizations/${tenant.id}/stores`),
  });

  const legalEntities = legalEntitiesData?.legalEntities || [];
  const stores = storesData?.stores || [];

  const tabs: { id: DetailTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'legal-entities', label: 'Ragioni Sociali', icon: Briefcase, count: legalEntities.length },
    { id: 'stores', label: 'Punti Vendita', icon: Store, count: stores.length },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      active: { bg: `${COLORS.semantic.success}15`, color: COLORS.semantic.success, label: 'Attivo' },
      suspended: { bg: `${COLORS.semantic.warning}15`, color: COLORS.semantic.warning, label: 'Sospeso' },
      pending: { bg: `${COLORS.semantic.info}15`, color: COLORS.semantic.info, label: 'In attesa' },
    }[status] || { bg: COLORS.neutral.lighter, color: COLORS.neutral.medium, label: status };

    return (
      <span 
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '1rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          background: config.bg,
          color: config.color,
        }}
        data-testid={`badge-status-${status}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div style={{
        background: COLORS.gradients.orange,
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={onBack}
              data-testid="button-back-to-list"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                margin: 0,
                marginBottom: '0.25rem'
              }}>
                {tenant.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <code style={{
                  fontSize: '0.8125rem',
                  padding: '0.125rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.25rem',
                }}>
                  {tenant.slug}
                </code>
                {getStatusBadge(tenant.status)}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              onClick={() => onEditTenant(tenant)}
              data-testid="button-edit-tenant-detail"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '0.25rem',
          borderTop: '0.0625rem solid rgba(255, 255, 255, 0.2)',
          paddingTop: '1rem',
          marginTop: '0.5rem',
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-detail-${tab.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.625rem 1rem',
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  opacity: isActive ? 1 : 0.8,
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {[
              { label: 'Ragioni Sociali', value: legalEntities.length, icon: Briefcase, color: COLORS.primary.purple },
              { label: 'Punti Vendita', value: stores.length, icon: Store, color: COLORS.semantic.success },
              { label: 'ID Tenant', value: tenant.id.slice(0, 8) + '...', icon: Globe, color: COLORS.semantic.info },
              { label: 'Creato il', value: format(new Date(tenant.createdAt), 'dd/MM/yyyy'), icon: Calendar, color: COLORS.primary.orange },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      background: `${stat.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={16} style={{ color: stat.color }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.medium }}>
                      {stat.label}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    color: COLORS.neutral.dark,
                    margin: 0 
                  }}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              onClick={() => onCreateLegalEntity(tenant.id)}
              data-testid="button-dashboard-add-legal-entity"
              style={{
                background: COLORS.gradients.purple,
                color: 'white',
                border: 'none',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova Ragione Sociale
            </Button>
            <Button
              onClick={() => onCreateStore(tenant.id)}
              data-testid="button-dashboard-add-store"
              style={{
                background: COLORS.gradients.green,
                color: 'white',
                border: 'none',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Punto Vendita
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'legal-entities' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: COLORS.neutral.dark,
              margin: 0,
            }}>
              Ragioni Sociali ({legalEntities.length})
            </h3>
            <Button
              onClick={() => onCreateLegalEntity(tenant.id)}
              data-testid="button-tab-add-legal-entity"
              style={{
                background: COLORS.gradients.purple,
                color: 'white',
                border: 'none',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova
            </Button>
          </div>

          {legalEntitiesLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.neutral.medium }}>
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              Caricamento...
            </div>
          ) : legalEntities.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '3rem',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              textAlign: 'center',
            }}>
              <Briefcase size={48} style={{ color: COLORS.neutral.lighter, marginBottom: '1rem' }} />
              <p style={{ color: COLORS.neutral.medium, margin: 0, marginBottom: '1rem' }}>
                Nessuna ragione sociale
              </p>
              <Button
                onClick={() => onCreateLegalEntity(tenant.id)}
                style={{
                  background: COLORS.gradients.purple,
                  color: 'white',
                  border: 'none',
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea la prima
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {legalEntities.map((entity: any) => (
                <div
                  key={entity.id}
                  data-testid={`card-legal-entity-${entity.id}`}
                  style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.primary.purple;
                    e.currentTarget.style.boxShadow = '0 0.25rem 1rem rgba(123, 44, 191, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.neutral.lighter;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: COLORS.gradients.purple,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Briefcase size={16} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '0.9375rem', 
                        fontWeight: 600, 
                        color: COLORS.neutral.dark,
                        margin: 0,
                        marginBottom: '0.25rem',
                      }}>
                        {entity.businessName || entity.nome}
                      </p>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: COLORS.neutral.light,
                        margin: 0,
                        marginBottom: '0.5rem',
                      }}>
                        P.IVA: {entity.vatNumber || entity.pIva || '--'}
                      </p>
                      {entity.fiscalCode && (
                        <p style={{ 
                          fontSize: '0.75rem', 
                          color: COLORS.neutral.light,
                          margin: 0 
                        }}>
                          CF: {entity.fiscalCode}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stores' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: COLORS.neutral.dark,
              margin: 0,
            }}>
              Punti Vendita ({stores.length})
            </h3>
            <Button
              onClick={() => onCreateStore(tenant.id)}
              data-testid="button-tab-add-store"
              style={{
                background: COLORS.gradients.green,
                color: 'white',
                border: 'none',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo
            </Button>
          </div>

          {storesLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.neutral.medium }}>
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              Caricamento...
            </div>
          ) : stores.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '3rem',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              textAlign: 'center',
            }}>
              <Store size={48} style={{ color: COLORS.neutral.lighter, marginBottom: '1rem' }} />
              <p style={{ color: COLORS.neutral.medium, margin: 0, marginBottom: '1rem' }}>
                Nessun punto vendita
              </p>
              <Button
                onClick={() => onCreateStore(tenant.id)}
                style={{
                  background: COLORS.gradients.green,
                  color: 'white',
                  border: 'none',
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea il primo
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {stores.map((store: any) => (
                <div
                  key={store.id}
                  data-testid={`card-store-${store.id}`}
                  style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.semantic.success;
                    e.currentTarget.style.boxShadow = '0 0.25rem 1rem rgba(16, 185, 129, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.neutral.lighter;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: COLORS.gradients.green,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Store size={16} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '0.9375rem', 
                        fontWeight: 600, 
                        color: COLORS.neutral.dark,
                        margin: 0,
                        marginBottom: '0.25rem',
                      }}>
                        {store.name || store.nome}
                      </p>
                      {store.code && (
                        <code style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          background: COLORS.neutral.lightest,
                          borderRadius: '0.25rem',
                          color: COLORS.neutral.medium,
                        }}>
                          {store.code}
                        </code>
                      )}
                      {(store.city || store.citta) && (
                        <p style={{ 
                          fontSize: '0.75rem', 
                          color: COLORS.neutral.light,
                          margin: 0,
                          marginTop: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          <MapPin size={12} />
                          {store.city || store.citta}
                          {(store.province || store.provincia) && ` (${store.province || store.provincia})`}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
