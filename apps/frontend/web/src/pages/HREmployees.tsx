// HREmployees.tsx - Employee Management using ListPageTemplate
import { ListPageTemplate } from '@w3suite/frontend-kit/templates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useUsers, useDeleteUser, type User } from '@/hooks/useUsers';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// WindTre Color System - FIXED CSS VARIABLES
const BRAND_COLORS = {
  orange: 'hsl(var(--brand-orange))',
  purple: 'hsl(var(--brand-purple))',
};

export default function HREmployees() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch users using real hook
  const { data: employees = [], isLoading, error, refetch } = useUsers();
  const deleteUser = useDeleteUser();

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    const employeeList = Array.isArray(employees) ? employees : [];
    
    return employeeList.filter((employee: User) => {
      // Search filter
      const searchMatch = !searchTerm || 
        `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === 'all' || employee.status === statusFilter;
      
      return searchMatch && statusMatch;
    });
  }, [employees, searchTerm, statusFilter]);

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (value: any, employee: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {(employee.firstName?.[0] || employee.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <div className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
              {employee.firstName && employee.lastName 
                ? `${employee.firstName} ${employee.lastName}`
                : employee.email?.split('@')[0] || 'N/A'
              }
            </div>
            <div className="text-sm text-muted-foreground">
              ID: {employee.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: any, employee: User) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-employee-email-${employee.id}`}>
            {employee.email || 'N/A'}
          </span>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Ruolo',
      render: (value: any, employee: User) => (
        <Badge 
          variant="outline" 
          data-testid={`badge-employee-role-${employee.id}`}
          style={{ 
            borderColor: BRAND_COLORS.orange,
            color: BRAND_COLORS.orange 
          }}
        >
          {employee.role || employee.position || 'Non specificato'}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      render: (value: any, employee: User) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'attivo': return 'default';
            case 'sospeso': return 'secondary';
            case 'off-boarding': return 'destructive';
            default: return 'outline';
          }
        };

        return (
          <Badge 
            variant={getStatusVariant(employee.status)}
            data-testid={`badge-employee-status-${employee.id}`}
          >
            {employee.status === 'attivo' ? 'Attivo' : 
             employee.status === 'sospeso' ? 'Sospeso' : 
             employee.status === 'off-boarding' ? 'Off-boarding' : 
             'Sconosciuto'}
          </Badge>
        );
      }
    },
    {
      key: 'lastActivity',
      label: 'Ultima Attività',
      render: (value: any, employee: User) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid={`text-employee-activity-${employee.id}`}>
            {employee.lastLoginAt 
              ? format(new Date(employee.lastLoginAt), 'dd/MM/yyyy HH:mm', { locale: it })
              : 'Mai connesso'
            }
          </span>
        </div>
      )
    }
  ];

  // Item actions for each employee
  const itemActions = (employee: User) => [
    {
      id: 'view',
      label: 'Visualizza',
      onClick: () => {
        // Navigate to employee detail view
        window.location.href = `/hr/employee/${employee.id}`;
      }
    },
    {
      id: 'edit',
      label: 'Modifica',
      onClick: () => {
        // Navigate to employee edit form
        window.location.href = `/hr/employee/${employee.id}/edit`;
      }
    },
    {
      id: 'delete',
      label: 'Elimina',
      onClick: async () => {
        if (window.confirm(`Sei sicuro di voler eliminare ${employee.firstName} ${employee.lastName}?`)) {
          try {
            await deleteUser.mutateAsync(employee.id);
            await refetch();
          } catch (error) {
            console.error('Failed to delete employee:', error);
          }
        }
      }
    }
  ];

  // Bulk actions for selected employees
  const bulkActions = [
    {
      id: 'export',
      label: 'Esporta Selezionati',
      onClick: () => {
        // Get selected items from checkboxes in the DOM
        const selectedCheckboxes = document.querySelectorAll('[data-testid^="checkbox-select-"]:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => {
          const testId = cb.getAttribute('data-testid');
          return testId?.replace('checkbox-select-', '');
        });
        const selectedItems = filteredEmployees.filter(emp => selectedIds.includes(emp.id));
        console.log('Exporting employees:', selectedItems);
        // Implement export functionality
      }
    },
    {
      id: 'bulk-email',
      label: 'Invia Email',
      onClick: () => {
        // Get selected items from checkboxes in the DOM
        const selectedCheckboxes = document.querySelectorAll('[data-testid^="checkbox-select-"]:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => {
          const testId = cb.getAttribute('data-testid');
          return testId?.replace('checkbox-select-', '');
        });
        const selectedItems = filteredEmployees.filter(emp => selectedIds.includes(emp.id));
        const emails = selectedItems.map(emp => emp.email).filter(Boolean).join(',');
        window.location.href = `mailto:${emails}`;
      }
    }
  ];

  // Filters configuration
  const filters = [
    {
      key: 'status',
      label: 'Stato',
      type: 'select',
      options: [
        { value: 'all', label: 'Tutti' },
        { value: 'attivo', label: 'Attivo' },
        { value: 'sospeso', label: 'Sospeso' },
        { value: 'off-boarding', label: 'Off-boarding' }
      ],
      value: statusFilter,
      onChange: setStatusFilter
    }
  ];

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'HR', href: '/hr' },
    { label: 'Gestione Dipendenti', href: '/hr/dipendenti' }
  ];

  // Primary action for adding new employee
  const primaryAction = {
    label: 'Nuovo Dipendente',
    icon: <Plus className="h-4 w-4" />,
    onClick: () => {
      window.location.href = '/hr/employee/new';
    },
    'data-testid': 'button-new-employee'
  };

  // Empty state configuration
  const emptyStateProps = {
    title: 'Nessun dipendente trovato',
    description: 'Non ci sono dipendenti che corrispondono ai filtri applicati.',
    icon: <Users className="h-12 w-12 text-muted-foreground" />,
    primaryAction: {
      label: 'Aggiungi Primo Dipendente',
      onClick: () => window.location.href = '/hr/employee/new',
      'data-testid': 'button-add-first-employee'
    }
  };

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div 
        className="glassmorphism-card p-6 space-y-6" 
        style={{ 
          background: `linear-gradient(135deg, ${BRAND_COLORS.orange}10, ${BRAND_COLORS.purple}10)`,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <ListPageTemplate
          title="Gestione Dipendenti"
          subtitle={`${filteredEmployees.length} dipendenti trovati`}
          breadcrumbs={breadcrumbs}
          primaryAction={primaryAction}
          data={filteredEmployees}
          columns={columns}
          searchable={true}
          searchPlaceholder="Cerca dipendenti per nome, email o ruolo..."
          filters={filters}
          bulkActions={bulkActions}
          itemActions={itemActions}
          isLoading={isLoading}
          error={error}
          emptyStateProps={emptyStateProps}
          variant="default"
        />
      </div>
    </Layout>
  );
}