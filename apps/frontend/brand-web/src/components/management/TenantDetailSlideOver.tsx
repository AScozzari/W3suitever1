import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  X, Building2, Store, Briefcase, Users, Edit2, Plus,
  Clock, CheckCircle, AlertCircle, ChevronRight, BarChart3,
  MapPin, Phone, Mail, Calendar, TrendingUp, Activity,
  FileText, Settings, Save, Loader2
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

interface TenantDetailSlideOverProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateLegalEntity: (tenantId: string) => void;
  onCreateStore: (tenantId: string) => void;
}

type DetailTab = 'overview' | 'legal-entities' | 'stores' | 'users';

export default function TenantDetailSlideOver({
  tenant,
  isOpen,
  onClose,
  onCreateLegalEntity,
  onCreateStore,
}: TenantDetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const { data: legalEntitiesData, isLoading: legalEntitiesLoading } = useQuery({
    queryKey: ['/brand-api/organizations', tenant?.id, 'legal-entities'],
    queryFn: () => apiRequest(`/brand-api/organizations/${tenant?.id}/legal-entities`),
    enabled: isOpen && !!tenant?.id,
  });

  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['/brand-api/organizations', tenant?.id, 'stores'],
    queryFn: () => apiRequest(`/brand-api/organizations/${tenant?.id}/stores`),
    enabled: isOpen && !!tenant?.id,
  });

  const legalEntities = legalEntitiesData?.legalEntities || [];
  const stores = storesData?.stores || [];

  if (!isOpen || !tenant) return null;

  const tabs: { id: DetailTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Panoramica', icon: BarChart3 },
    { id: 'legal-entities', label: 'Ragioni Sociali', icon: Briefcase, count: legalEntities.length },
    { id: 'stores', label: 'Punti Vendita', icon: Store, count: stores.length },
    { id: 'users', label: 'Utenti', icon: Users },
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
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(0.25rem)',
          zIndex: 50,
        }}
        onClick={onClose}
      />
      
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(50rem, 90vw)',
          background: COLORS.neutral.lightest,
          boxShadow: '-0.5rem 0 2rem rgba(0, 0, 0, 0.1)',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out',
        }}
        data-testid="slide-over-tenant-detail"
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        <div style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #FF6900, #ff8533)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
            <button
              onClick={onClose}
              data-testid="button-close-slide-over"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.25rem', 
            marginTop: '1.5rem',
            borderBottom: '0.0625rem solid rgba(255, 255, 255, 0.2)',
            paddingBottom: '-0.0625rem',
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.625rem 1rem',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem 0.5rem 0 0',
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

        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {activeTab === 'overview' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Briefcase size={16} style={{ color: COLORS.primary.purple }} />
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.medium }}>
                      Ragioni Sociali
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 700, 
                    color: COLORS.neutral.dark,
                    margin: 0 
                  }}>
                    {legalEntities.length}
                  </p>
                </div>
                <div style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Store size={16} style={{ color: COLORS.semantic.success }} />
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.medium }}>
                      Punti Vendita
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 700, 
                    color: COLORS.neutral.dark,
                    margin: 0 
                  }}>
                    {stores.length}
                  </p>
                </div>
                <div style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={16} style={{ color: COLORS.semantic.info }} />
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.medium }}>
                      Creato il
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: COLORS.neutral.dark,
                    margin: 0 
                  }}>
                    {format(new Date(tenant.createdAt), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                marginBottom: '1rem',
              }}>
                <h4 style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  margin: 0,
                  marginBottom: '1rem',
                }}>
                  Informazioni Tenant
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.light }}>ID</span>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: COLORS.neutral.dark, 
                      margin: 0,
                      marginTop: '0.25rem',
                      fontFamily: 'monospace',
                    }}>
                      {tenant.id}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: COLORS.neutral.light }}>Slug</span>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: COLORS.neutral.dark, 
                      margin: 0,
                      marginTop: '0.25rem',
                    }}>
                      {tenant.slug}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  onClick={() => onCreateLegalEntity(tenant.id)}
                  data-testid="button-add-legal-entity"
                  style={{
                    background: COLORS.gradients.purple,
                    color: 'white',
                    border: 'none',
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Ragione Sociale
                </Button>
                <Button
                  onClick={() => onCreateStore(tenant.id)}
                  data-testid="button-add-store"
                  style={{
                    background: COLORS.gradients.green,
                    color: 'white',
                    border: 'none',
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Store
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
                <h4 style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  margin: 0,
                }}>
                  Ragioni Sociali ({legalEntities.length})
                </h4>
                <Button
                  size="sm"
                  onClick={() => onCreateLegalEntity(tenant.id)}
                  data-testid="button-add-legal-entity-tab"
                  style={{
                    background: COLORS.gradients.purple,
                    color: 'white',
                    border: 'none',
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
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
                  padding: '2rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                  textAlign: 'center',
                }}>
                  <Briefcase size={40} style={{ color: COLORS.neutral.lighter, marginBottom: '0.75rem' }} />
                  <p style={{ color: COLORS.neutral.medium, margin: 0 }}>
                    Nessuna ragione sociale
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {legalEntities.map((entity: any) => (
                    <div
                      key={entity.id}
                      data-testid={`item-legal-entity-${entity.id}`}
                      style={{
                        background: 'white',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.primary.purple;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.neutral.lighter;
                      }}
                    >
                      <Briefcase size={18} style={{ color: COLORS.primary.purple }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: 500, 
                          color: COLORS.neutral.dark,
                          margin: 0 
                        }}>
                          {entity.businessName}
                        </p>
                        <p style={{ 
                          fontSize: '0.75rem', 
                          color: COLORS.neutral.light,
                          margin: 0 
                        }}>
                          P.IVA: {entity.vatNumber || '--'}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
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
                <h4 style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  margin: 0,
                }}>
                  Punti Vendita ({stores.length})
                </h4>
                <Button
                  size="sm"
                  onClick={() => onCreateStore(tenant.id)}
                  data-testid="button-add-store-tab"
                  style={{
                    background: COLORS.gradients.green,
                    color: 'white',
                    border: 'none',
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
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
                  padding: '2rem',
                  border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                  textAlign: 'center',
                }}>
                  <Store size={40} style={{ color: COLORS.neutral.lighter, marginBottom: '0.75rem' }} />
                  <p style={{ color: COLORS.neutral.medium, margin: 0 }}>
                    Nessun punto vendita
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stores.map((store: any) => (
                    <div
                      key={store.id}
                      data-testid={`item-store-${store.id}`}
                      style={{
                        background: 'white',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        border: `0.0625rem solid ${COLORS.neutral.lighter}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.semantic.success;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.neutral.lighter;
                      }}
                    >
                      <Store size={18} style={{ color: COLORS.semantic.success }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: 500, 
                          color: COLORS.neutral.dark,
                          margin: 0 
                        }}>
                          {store.name}
                        </p>
                        {store.city && (
                          <p style={{ 
                            fontSize: '0.75rem', 
                            color: COLORS.neutral.light,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}>
                            <MapPin size={12} />
                            {store.city}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              textAlign: 'center',
            }}>
              <Users size={40} style={{ color: COLORS.neutral.lighter, marginBottom: '0.75rem' }} />
              <p style={{ color: COLORS.neutral.medium, margin: 0 }}>
                Gestione utenti in arrivo
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
