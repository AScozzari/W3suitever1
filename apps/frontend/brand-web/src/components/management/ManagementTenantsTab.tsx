import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  Building2, Search, Filter, Eye, Pause, Play, Trash2,
  ChevronRight, Clock, MoreVertical, CheckCircle, AlertCircle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

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

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  storesCount?: number;
  usersCount?: number;
}

interface ManagementTenantsTabProps {
  onSelectTenant: (tenant: Tenant) => void;
  onCreateTenant: () => void;
}

export default function ManagementTenantsTab({ 
  onSelectTenant, 
  onCreateTenant 
}: ManagementTenantsTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'delete' | 'reactivate';
    tenant: Tenant | null;
  }>({ open: false, type: 'suspend', tenant: null });

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['/brand-api/organizations'],
    queryFn: () => apiRequest('/brand-api/organizations'),
  });

  const suspendMutation = useMutation({
    mutationFn: (tenantId: string) => 
      apiRequest(`/brand-api/organizations/${tenantId}/suspend`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setConfirmDialog({ open: false, type: 'suspend', tenant: null });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (tenantId: string) => 
      apiRequest(`/brand-api/organizations/${tenantId}/reactivate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setConfirmDialog({ open: false, type: 'reactivate', tenant: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) => 
      apiRequest(`/brand-api/organizations/${tenantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      setConfirmDialog({ open: false, type: 'delete', tenant: null });
    },
  });

  const tenants: Tenant[] = tenantsData?.organizations || [];
  
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      active: { bg: `${COLORS.semantic.success}15`, color: COLORS.semantic.success, label: 'Attivo' },
      suspended: { bg: `${COLORS.semantic.warning}15`, color: COLORS.semantic.warning, label: 'Sospeso' },
      pending: { bg: `${COLORS.semantic.info}15`, color: COLORS.semantic.info, label: 'In attesa' },
    }[status] || { bg: COLORS.neutral.lighter, color: COLORS.neutral.medium, label: status };

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '1rem',
        fontSize: '0.75rem',
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
        Caricamento tenant...
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
              placeholder="Cerca tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-tenant"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            data-testid="select-status-filter"
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
            <option value="all">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="suspended">Sospesi</option>
          </select>
        </div>

        <Button
          onClick={onCreateTenant}
          data-testid="button-create-tenant"
          style={{
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            color: 'white',
            border: 'none',
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Tenant
        </Button>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '1rem',
        border: `0.0625rem solid ${COLORS.neutral.lighter}`,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: COLORS.neutral.lightest }}>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'left', 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLORS.neutral.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Organizzazione
              </th>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'left', 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLORS.neutral.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Slug
              </th>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLORS.neutral.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Stato
              </th>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'left', 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLORS.neutral.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Creato
              </th>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLORS.neutral.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant, index) => (
              <tr 
                key={tenant.id}
                data-testid={`row-tenant-${tenant.id}`}
                style={{ 
                  borderTop: index > 0 ? `0.0625rem solid ${COLORS.neutral.lighter}` : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => onSelectTenant(tenant)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.neutral.lightest;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Building2 size={16} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 600, 
                        color: COLORS.neutral.dark,
                        margin: 0 
                      }}>
                        {tenant.name}
                      </p>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: COLORS.neutral.light,
                        margin: 0 
                      }}>
                        ID: {tenant.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <code style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    background: COLORS.neutral.lightest,
                    borderRadius: '0.25rem',
                    color: COLORS.neutral.dark,
                  }}>
                    {tenant.slug}
                  </code>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {getStatusBadge(tenant.status)}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                    {format(new Date(tenant.createdAt), 'dd/MM/yyyy')}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectTenant(tenant)}
                      data-testid={`button-view-${tenant.id}`}
                      style={{ padding: '0.5rem' }}
                    >
                      <Eye size={16} style={{ color: COLORS.primary.orange }} />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-actions-${tenant.id}`}
                          style={{ padding: '0.5rem' }}
                        >
                          <MoreVertical size={16} style={{ color: COLORS.neutral.medium }} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectTenant(tenant)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza Dettagli
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tenant.status === 'active' ? (
                          <DropdownMenuItem 
                            onClick={() => setConfirmDialog({ open: true, type: 'suspend', tenant })}
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Sospendi
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => setConfirmDialog({ open: true, type: 'reactivate', tenant })}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Riattiva
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setConfirmDialog({ open: true, type: 'delete', tenant })}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTenants.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: COLORS.neutral.medium,
          }}>
            <Building2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ margin: 0 }}>Nessun tenant trovato</p>
          </div>
        )}
      </div>

      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'suspend' && 'Sospendi Tenant'}
              {confirmDialog.type === 'reactivate' && 'Riattiva Tenant'}
              {confirmDialog.type === 'delete' && 'Elimina Tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'suspend' && 
                `Sei sicuro di voler sospendere "${confirmDialog.tenant?.name}"? Gli utenti non potranno accedere.`}
              {confirmDialog.type === 'reactivate' && 
                `Sei sicuro di voler riattivare "${confirmDialog.tenant?.name}"?`}
              {confirmDialog.type === 'delete' && 
                `Sei sicuro di voler eliminare "${confirmDialog.tenant?.name}"? Questa azione è irreversibile.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.tenant) {
                  if (confirmDialog.type === 'suspend') {
                    suspendMutation.mutate(confirmDialog.tenant.id);
                  } else if (confirmDialog.type === 'reactivate') {
                    reactivateMutation.mutate(confirmDialog.tenant.id);
                  } else {
                    deleteMutation.mutate(confirmDialog.tenant.id);
                  }
                }
              }}
              style={{
                background: confirmDialog.type === 'delete' 
                  ? COLORS.semantic.error 
                  : COLORS.primary.orange,
              }}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
