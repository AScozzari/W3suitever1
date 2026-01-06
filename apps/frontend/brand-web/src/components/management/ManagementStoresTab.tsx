import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  Store, Search, Plus, Eye, Edit2, Clock, Building2,
  ChevronRight, MapPin, Phone, Mail, Users
} from 'lucide-react';
import { Button } from '../ui/button';

const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
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
};

interface StoreItem {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  status?: string;
  tenantName?: string;
  tenantSlug?: string;
  legalEntityName?: string;
}

interface ManagementStoresTabProps {
  onCreateStore: () => void;
  onEditStore: (store: StoreItem) => void;
}

export default function ManagementStoresTab({
  onCreateStore,
  onEditStore,
}: ManagementStoresTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');

  const { data: tenantsData } = useQuery({
    queryKey: ['/brand-api/organizations'],
    queryFn: () => apiRequest('/brand-api/organizations'),
  });

  const tenants = tenantsData?.organizations || [];

  const { data: storesData, isLoading } = useQuery({
    queryKey: ['/brand-api/stores', selectedTenant],
    queryFn: async () => {
      if (selectedTenant === 'all') {
        const allStores: StoreItem[] = [];
        for (const tenant of tenants) {
          try {
            const res = await apiRequest(`/brand-api/organizations/${tenant.id}/stores`);
            const stores = (res?.stores || []).map((s: any) => ({
              ...s,
              tenantName: tenant.name,
              tenantSlug: tenant.slug,
            }));
            allStores.push(...stores);
          } catch (e) {
            console.error(`Error fetching stores for tenant ${tenant.id}`, e);
          }
        }
        return allStores;
      } else {
        const tenant = tenants.find((t: any) => t.id === selectedTenant);
        const res = await apiRequest(`/brand-api/organizations/${selectedTenant}/stores`);
        return (res?.stores || []).map((s: any) => ({
          ...s,
          tenantName: tenant?.name,
          tenantSlug: tenant?.slug,
        }));
      }
    },
    enabled: tenants.length > 0,
  });

  const stores: StoreItem[] = storesData || [];
  
  const filteredStores = stores.filter((store) => {
    const matchesSearch = 
      store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: `${COLORS.semantic.success}15`, color: COLORS.semantic.success, label: 'Attivo' },
      attivo: { bg: `${COLORS.semantic.success}15`, color: COLORS.semantic.success, label: 'Attivo' },
      inactive: { bg: `${COLORS.neutral.lighter}`, color: COLORS.neutral.medium, label: 'Inattivo' },
      suspended: { bg: `${COLORS.semantic.warning}15`, color: COLORS.semantic.warning, label: 'Sospeso' },
    };
    const config = statusMap[status?.toLowerCase() || 'active'] || statusMap.active;

    return (
      <span style={{
        padding: '0.125rem 0.5rem',
        borderRadius: '0.75rem',
        fontSize: '0.6875rem',
        fontWeight: 500,
        background: config.bg,
        color: config.color,
      }}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '4rem',
        color: COLORS.neutral.medium
      }}>
        <Clock className="animate-spin mr-2" size={20} />
        Caricamento punti vendita...
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'white',
            border: `0.0625rem solid ${COLORS.neutral.lighter}`,
            borderRadius: '0.5rem',
            width: '16rem',
          }}>
            <Search size={16} style={{ color: COLORS.neutral.light }} />
            <input
              type="text"
              placeholder="Cerca per nome, codice, città..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-store"
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '0.875rem',
                color: COLORS.neutral.dark,
              }}
            />
          </div>
          
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            data-testid="select-tenant-filter-stores"
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: COLORS.neutral.dark,
              cursor: 'pointer',
            }}
          >
            <option value="all">Tutti i tenant</option>
            {tenants.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={onCreateStore}
          data-testid="button-create-store"
          style={{
            background: 'linear-gradient(135deg, #10b981, #34d399)',
            color: 'white',
            border: 'none',
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Punto Vendita
        </Button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
        gap: '1rem',
      }}>
        {filteredStores.map((store) => (
          <div
            key={store.id}
            data-testid={`card-store-${store.id}`}
            onClick={() => onEditStore(store)}
            style={{
              background: 'white',
              borderRadius: '1rem',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              padding: '1.25rem',
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Store size={16} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ 
                      fontSize: '0.9375rem', 
                      fontWeight: 600, 
                      color: COLORS.neutral.dark,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {store.name}
                    </h4>
                    {getStatusBadge(store.status)}
                  </div>
                  {store.tenantName && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: COLORS.neutral.light,
                      margin: 0,
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <Building2 size={12} />
                      {store.tenantName}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: COLORS.neutral.light, flexShrink: 0 }} />
            </div>

            <div style={{
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}>
              {store.code && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: COLORS.neutral.light,
                    minWidth: '4rem',
                  }}>
                    Codice:
                  </span>
                  <code style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    background: COLORS.neutral.lightest,
                    borderRadius: '0.25rem',
                    color: COLORS.neutral.dark,
                  }}>
                    {store.code}
                  </code>
                </div>
              )}
              {(store.city || store.address) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} style={{ color: COLORS.neutral.light }} />
                  <span style={{ 
                    fontSize: '0.8125rem', 
                    color: COLORS.neutral.medium,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {store.city || store.address}
                    {store.province && ` (${store.province})`}
                  </span>
                </div>
              )}
              {store.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} style={{ color: COLORS.neutral.light }} />
                  <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.medium }}>
                    {store.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          border: `0.0625rem solid ${COLORS.neutral.lighter}`,
          padding: '3rem',
          textAlign: 'center',
          color: COLORS.neutral.medium,
        }}>
          <Store size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ margin: 0 }}>Nessun punto vendita trovato</p>
        </div>
      )}
    </div>
  );
}
