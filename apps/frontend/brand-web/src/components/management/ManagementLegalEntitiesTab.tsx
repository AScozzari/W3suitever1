import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  Briefcase, Search, Plus, Eye, Edit2, Clock, Building2,
  ChevronRight, MapPin, Phone, Mail, FileText
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

interface LegalEntity {
  id: string;
  businessName: string;
  vatNumber: string;
  fiscalCode?: string;
  pec?: string;
  tenantName?: string;
  tenantSlug?: string;
  storesCount?: number;
  status?: string;
}

interface ManagementLegalEntitiesTabProps {
  onCreateLegalEntity: () => void;
  onEditLegalEntity: (entity: LegalEntity) => void;
}

export default function ManagementLegalEntitiesTab({
  onCreateLegalEntity,
  onEditLegalEntity,
}: ManagementLegalEntitiesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');

  const { data: tenantsData } = useQuery({
    queryKey: ['/brand-api/organizations'],
    queryFn: () => apiRequest('/brand-api/organizations'),
  });

  const tenants = tenantsData?.organizations || [];

  const { data: legalEntitiesData, isLoading } = useQuery({
    queryKey: ['/brand-api/legal-entities', selectedTenant],
    queryFn: async () => {
      if (selectedTenant === 'all') {
        const allEntities: LegalEntity[] = [];
        for (const tenant of tenants) {
          try {
            const res = await apiRequest(`/brand-api/organizations/${tenant.id}/legal-entities`);
            const entities = (res?.legalEntities || []).map((e: any) => ({
              ...e,
              tenantName: tenant.name,
              tenantSlug: tenant.slug,
            }));
            allEntities.push(...entities);
          } catch (e) {
            console.error(`Error fetching entities for tenant ${tenant.id}`, e);
          }
        }
        return allEntities;
      } else {
        const tenant = tenants.find((t: any) => t.id === selectedTenant);
        const res = await apiRequest(`/brand-api/organizations/${selectedTenant}/legal-entities`);
        return (res?.legalEntities || []).map((e: any) => ({
          ...e,
          tenantName: tenant?.name,
          tenantSlug: tenant?.slug,
        }));
      }
    },
    enabled: tenants.length > 0,
  });

  const legalEntities: LegalEntity[] = legalEntitiesData || [];
  
  const filteredEntities = legalEntities.filter((entity) => {
    const matchesSearch = 
      entity.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.vatNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.fiscalCode?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
        Caricamento ragioni sociali...
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
              placeholder="Cerca per ragione sociale, P.IVA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-legal-entity"
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
            data-testid="select-tenant-filter"
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
          onClick={onCreateLegalEntity}
          data-testid="button-create-legal-entity"
          style={{
            background: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
            color: 'white',
            border: 'none',
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova Ragione Sociale
        </Button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
        gap: '1rem',
      }}>
        {filteredEntities.map((entity) => (
          <div
            key={entity.id}
            data-testid={`card-legal-entity-${entity.id}`}
            onClick={() => onEditLegalEntity(entity)}
            style={{
              background: 'white',
              borderRadius: '1rem',
              border: `0.0625rem solid ${COLORS.neutral.lighter}`,
              padding: '1.25rem',
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
                background: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Briefcase size={16} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ 
                  fontSize: '0.9375rem', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {entity.businessName}
                </h4>
                {entity.tenantName && (
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
                    {entity.tenantName}
                  </p>
                )}
              </div>
              <ChevronRight size={16} style={{ color: COLORS.neutral.light }} />
            </div>

            <div style={{
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} style={{ color: COLORS.neutral.light }} />
                <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.medium }}>
                  P.IVA: {entity.vatNumber || '--'}
                </span>
              </div>
              {entity.fiscalCode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={14} style={{ color: COLORS.neutral.light }} />
                  <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.medium }}>
                    C.F.: {entity.fiscalCode}
                  </span>
                </div>
              )}
              {entity.pec && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} style={{ color: COLORS.neutral.light }} />
                  <span style={{ 
                    fontSize: '0.8125rem', 
                    color: COLORS.neutral.medium,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {entity.pec}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredEntities.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          border: `0.0625rem solid ${COLORS.neutral.lighter}`,
          padding: '3rem',
          textAlign: 'center',
          color: COLORS.neutral.medium,
        }}>
          <Briefcase size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ margin: 0 }}>Nessuna ragione sociale trovata</p>
        </div>
      )}
    </div>
  );
}
