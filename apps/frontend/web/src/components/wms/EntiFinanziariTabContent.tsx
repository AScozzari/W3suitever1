import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/ApiService';
import { queryClient } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Landmark, Eye, Trash2, RefreshCw, AlertCircle, X, Search, CalendarIcon, Building2, Lock, Store
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FinancialEntityModal from './FinancialEntityModal';

export default function EntiFinanziariTabContent() {
  const [modalState, setModalState] = useState<{ 
    isOpen: boolean; 
    mode: 'create' | 'edit' | 'view'; 
    data: any | null 
  }>({ isOpen: false, mode: 'create', data: null });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { 
    data: entitiesList = [], 
    isLoading, 
    error, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/wms/financial-entities'],
    queryFn: async () => {
      const result = await apiService.getFinancialEntities();
      if (!result.success) throw new Error(result.error || 'Failed to fetch financial entities');
      return result.data || [];
    }
  });

  const safeEntitiesList = Array.isArray(entitiesList) ? entitiesList : [];

  const handleDelete = async (entityId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo ente finanziario?')) return;
    
    try {
      const result = await apiService.deleteFinancialEntity(entityId);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/wms/financial-entities'] });
      } else {
        alert('Errore nell\'eliminazione dell\'ente finanziario. Riprova.');
      }
    } catch (error) {
      alert('Errore nell\'eliminazione dell\'ente finanziario. Riprova.');
    }
  };

  const filteredEntities = safeEntitiesList.filter((entity: any) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches = 
        entity.name?.toLowerCase().includes(search) ||
        entity.code?.toLowerCase().includes(search) ||
        entity.vat_number?.toLowerCase().includes(search) ||
        entity.vatNumber?.toLowerCase().includes(search) ||
        entity.tax_code?.toLowerCase().includes(search) ||
        entity.taxCode?.toLowerCase().includes(search) ||
        entity.fiscalCode?.toLowerCase().includes(search) ||
        entity.registeredAddress?.citta?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    if (sourceFilter !== 'all') {
      if (entity.origin !== sourceFilter) return false;
    }

    if (dateFrom || dateTo) {
      const createdAt = entity.createdAt ? new Date(entity.createdAt) : 
                        entity.created_at ? new Date(entity.created_at) : null;
      if (createdAt) {
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (createdAt > endOfDay) return false;
        }
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchTerm || sourceFilter !== 'all' || dateFrom || dateTo;

  // Separate entities into Brand and Tenant
  const brandEntities = useMemo(() => 
    filteredEntities.filter((e: any) => e.origin === 'brand'), 
    [filteredEntities]
  );
  
  const tenantEntities = useMemo(() => 
    filteredEntities.filter((e: any) => e.origin !== 'brand'), 
    [filteredEntities]
  );

  const getCity = (entity: any) => {
    if (entity.registeredAddress?.citta) return entity.registeredAddress.citta;
    if (entity.city) return entity.city;
    return '-';
  };

  const getProvince = (entity: any) => {
    if (entity.registeredAddress?.provincia) return entity.registeredAddress.provincia;
    if (entity.province) return entity.province;
    return '-';
  };

  return (
    <div className="space-y-6" data-testid="enti-finanziari-content">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Landmark size={22} style={{ color: '#059669' }} />
          Enti Finanziari ({isLoading ? '...' : filteredEntities.length} di {safeEntitiesList.length} elementi)
        </h3>
        <button style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onClick={() => setModalState({ isOpen: true, mode: 'create', data: null })}
        data-testid="button-create-financial-entity">
          <Plus size={16} />
          Nuovo Ente Finanziario
        </button>
      </div>

      <Card className="p-4" style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(229, 231, 235, 0.8)'
      }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Ricerca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome, codice, P.IVA, C.F., città..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-financial-entity"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Origine</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger data-testid="select-source-filter-financial-entity">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Data da</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-from-financial-entity">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: it }) : 'Seleziona...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Data a</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-to-financial-entity">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: it }) : 'Seleziona...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500" data-testid="button-clear-filters-financial-entity">
              <X className="h-4 w-4 mr-1" />
              Pulisci
            </Button>
          )}
        </div>
      </Card>

      {/* Loading/Error State */}
      {isLoading ? (
        <div style={{ 
          padding: '48px 16px', 
          textAlign: 'center', 
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={32} style={{ color: '#d1d5db', animation: 'spin 1s linear infinite' }} />
            <div>Caricamento enti finanziari...</div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : isError ? (
        <div style={{ 
          padding: '48px 16px', 
          textAlign: 'center', 
          color: '#ef4444',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} style={{ color: '#ef4444' }} />
            <div>Errore nel caricamento degli enti finanziari</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {error?.message || 'Si è verificato un errore imprevisto'}
            </div>
            <button
              onClick={() => refetch()}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Riprova
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* BRAND ENTITIES SECTION (Read-only) */}
          <div data-testid="brand-financial-entities-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Enti Finanziari Brand
                  <Lock className="h-4 w-4 text-gray-400" />
                </h4>
                <p className="text-sm text-gray-500">Enti sincronizzati dal brand (sola lettura)</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{brandEntities.length} enti</Badge>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                    <th className="w-[12%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                    <th className="w-[24%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
                    <th className="w-[20%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>P.IVA / C.F.</th>
                    <th className="w-[16%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Città</th>
                    <th className="w-[14%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                    <th className="w-[14%]" style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {brandEntities.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ 
                        padding: '32px 16px', 
                        textAlign: 'center', 
                        color: '#6b7280',
                        fontSize: '14px'
                      }}>
                        Nessun ente finanziario Brand disponibile
                      </td>
                    </tr>
                  ) : (
                    brandEntities.map((entity: any, index: number) => (
                      <tr
                        key={entity.id}
                        data-testid={`row-brand-financial-entity-${entity.id}`}
                        style={{
                          background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa'; }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                          {entity.code}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{entity.name}</div>
                            {entity.parentCompany && (
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{entity.parentCompany}</div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                          <div>
                            <div>P.IVA: {entity.vatNumber || entity.vat_number || 'N/A'}</div>
                            <div>C.F.: {entity.taxCode || entity.tax_code || entity.fiscalCode || 'N/A'}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                          {getCity(entity)} ({getProvince(entity)})
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            background: entity.status === 'active' ? '#dcfce7' : entity.status === 'suspended' ? '#fef3c7' : entity.status === 'blocked' ? '#fecaca' : '#f1f5f9',
                            color: entity.status === 'active' ? '#15803d' : entity.status === 'suspended' ? '#d97706' : entity.status === 'blocked' ? '#dc2626' : '#475569',
                            border: `1px solid ${entity.status === 'active' ? '#bbf7d0' : entity.status === 'suspended' ? '#fcd34d' : entity.status === 'blocked' ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                            {entity.status === 'active' ? 'Attivo' : entity.status === 'suspended' ? 'Sospeso' : entity.status === 'blocked' ? 'Bloccato' : entity.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              data-testid={`button-view-financial-entity-${entity.id}`}
                              onClick={() => setModalState({ isOpen: true, mode: 'view', data: entity })}
                              style={{
                                background: 'transparent',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                              <Eye size={14} style={{ color: '#3b82f6' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TENANT ENTITIES SECTION (Full CRUD) */}
          <div data-testid="tenant-financial-entities-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">Enti Finanziari Personalizzati</h4>
                <p className="text-sm text-gray-500">Enti creati dal tuo negozio</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{tenantEntities.length} enti</Badge>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                    <th className="w-[12%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                    <th className="w-[24%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
                    <th className="w-[20%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>P.IVA / C.F.</th>
                    <th className="w-[16%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Città</th>
                    <th className="w-[14%]" style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                    <th className="w-[14%]" style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantEntities.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ 
                        padding: '32px 16px', 
                        textAlign: 'center', 
                        color: '#6b7280',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <Landmark size={32} style={{ color: '#d1d5db' }} />
                          <div>Nessun ente finanziario personalizzato</div>
                          <div style={{ fontSize: '12px' }}>Crea il primo ente finanziario per iniziare</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tenantEntities.map((entity: any, index: number) => (
                      <tr
                        key={entity.id}
                        data-testid={`row-tenant-financial-entity-${entity.id}`}
                        style={{
                          background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa'; }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                          {entity.code}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{entity.name}</div>
                            {entity.parentCompany && (
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{entity.parentCompany}</div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                          <div>
                            <div>P.IVA: {entity.vatNumber || entity.vat_number || 'N/A'}</div>
                            <div>C.F.: {entity.taxCode || entity.tax_code || entity.fiscalCode || 'N/A'}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                          {getCity(entity)} ({getProvince(entity)})
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            background: entity.status === 'active' ? '#dcfce7' : entity.status === 'suspended' ? '#fef3c7' : entity.status === 'blocked' ? '#fecaca' : '#f1f5f9',
                            color: entity.status === 'active' ? '#15803d' : entity.status === 'suspended' ? '#d97706' : entity.status === 'blocked' ? '#dc2626' : '#475569',
                            border: `1px solid ${entity.status === 'active' ? '#bbf7d0' : entity.status === 'suspended' ? '#fcd34d' : entity.status === 'blocked' ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                            {entity.status === 'active' ? 'Attivo' : entity.status === 'suspended' ? 'Sospeso' : entity.status === 'blocked' ? 'Bloccato' : entity.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              data-testid={`button-view-financial-entity-${entity.id}`}
                              onClick={() => setModalState({ isOpen: true, mode: 'edit', data: entity })}
                              style={{
                                background: 'transparent',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                              <Eye size={14} style={{ color: '#10b981' }} />
                            </button>
                            <button
                              data-testid={`button-delete-financial-entity-${entity.id}`}
                              onClick={() => handleDelete(entity.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <FinancialEntityModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        data={modalState.data}
        onClose={() => setModalState({ isOpen: false, mode: 'create', data: null })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/wms/financial-entities'] });
        }}
      />
    </div>
  );
}
