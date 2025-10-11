import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, Building, User, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CustomerFormModal } from '@/components/crm/CustomerFormModal';
import { DeleteConfirmationDialog } from '@/components/crm/DeleteConfirmationDialog';

interface Customer {
  id: string;
  personId: string;
  customerType: 'b2b' | 'b2c';
  status: 'active' | 'inactive' | 'prospect';
  
  // B2C fields
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  
  // B2B fields
  companyName?: string;
  legalForm?: string;
  vatNumber?: string;
  
  // Common contact fields (from person)
  email?: string;
  phone?: string;
  
  // B2B primary contact
  primaryContactName?: string;
  
  createdAt: string;
}

const B2BCustomersTable = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customersResponse, isLoading } = useQuery<{ data: Customer[] }>({
    queryKey: ['/api/crm/customers', { customerType: 'b2b' }],
  });

  const customers: Customer[] = customersResponse?.data || [];

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return apiRequest(`/api/crm/customers/${customerId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      toast({
        title: 'Cliente eliminato',
        description: 'Il cliente è stato eliminato con successo.',
      });
      setDeleteCustomer(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare il cliente.',
      });
    },
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'companyName',
      header: 'Ragione Sociale',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: 'var(--brand-glass-orange)' }}
          >
            <Building className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div>
            <div className="font-medium">{row.original.companyName || 'N/D'}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.vatNumber || 'Nessuna P.IVA'}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'legalForm',
      header: 'Forma Giuridica',
      cell: ({ row }) => {
        const legalFormLabels: Record<string, string> = {
          'srl': 'S.r.l.',
          'spa': 'S.p.A.',
          'snc': 'S.n.c.',
          'sas': 'S.a.s.',
          'ss': 'S.S.',
          'ditta_individuale': 'Ditta Individuale',
          'srl_semplificata': 'S.r.l. Semplificata',
          'srl_unipersonale': 'S.r.l. Unipersonale',
          'cooperativa': 'Cooperativa',
          'consorzio': 'Consorzio',
          'fondazione': 'Fondazione',
          'associazione': 'Associazione',
          'altro': 'Altro'
        };
        return legalFormLabels[row.original.legalForm || ''] || 'N/D';
      },
    },
    {
      accessorKey: 'primaryContactName',
      header: 'Referente Principale',
      cell: ({ row }) => (
        <div>
          <div>{row.original.primaryContactName || 'N/D'}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {row.original.email || 'Nessuna email'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefono',
      cell: ({ row }) => row.original.phone || 'N/D',
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const statusConfig = {
          active: { label: 'Attivo', color: 'hsl(142, 76%, 36%)' },
          inactive: { label: 'Inattivo', color: 'hsl(0, 84%, 60%)' },
          prospect: { label: 'Prospect', color: 'hsl(220, 90%, 56%)' }
        };
        const config = statusConfig[row.original.status];
        return (
          <Badge variant="outline" style={{ borderColor: config.color, color: config.color }}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Azioni',
      cell: ({ row }) => {
        const tenantSlug = window.location.pathname.split('/')[1];
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`actions-b2b-customer-${row.original.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/${tenantSlug}/crm/customers/${row.original.id}`}>
                <DropdownMenuItem data-testid={`view-b2b-customer-${row.original.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem 
                onClick={() => setEditCustomer(row.original)}
                data-testid={`edit-b2b-customer-${row.original.id}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteCustomer(row.original)}
                className="text-red-600"
                data-testid={`delete-b2b-customer-${row.original.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
               style={{ borderColor: 'hsl(var(--brand-orange))' }} />
          <p style={{ color: 'var(--text-tertiary)' }}>Caricamento clienti B2B...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          <Input
            placeholder="Cerca clienti B2B..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
            data-testid="search-b2b-customers"
          />
        </div>
        <Button 
          style={{ background: 'hsl(var(--brand-orange))' }} 
          data-testid="create-b2b-customer"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Cliente B2B
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-b2b-customer-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} />
                    <p style={{ color: 'var(--text-tertiary)' }}>Nessun cliente B2B trovato</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        defaultType="b2b"
      />

      <CustomerFormModal 
        open={!!editCustomer} 
        onOpenChange={(open) => !open && setEditCustomer(null)}
        defaultType="b2b"
        editMode={true}
        customerId={editCustomer?.id}
        initialData={editCustomer as any}
      />

      <DeleteConfirmationDialog
        open={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
        onConfirm={() => deleteCustomer && deleteCustomerMutation.mutate(deleteCustomer.id)}
        title="Elimina Cliente B2B"
        itemName={deleteCustomer?.companyName || 'questo cliente'}
        isPending={deleteCustomerMutation.isPending}
      />
    </div>
  );
};

const B2CCustomersTable = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customersResponse, isLoading } = useQuery<{ data: Customer[] }>({
    queryKey: ['/api/crm/customers', { customerType: 'b2c' }],
  });

  const customers: Customer[] = customersResponse?.data || [];

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return apiRequest(`/api/crm/customers/${customerId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      toast({
        title: 'Cliente eliminato',
        description: 'Il cliente è stato eliminato con successo.',
      });
      setDeleteCustomer(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare il cliente.',
      });
    },
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'firstName',
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
              {row.original.firstName?.[0] || 'N'}{row.original.lastName?.[0] || 'D'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.original.firstName} {row.original.lastName}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.email || 'Nessuna email'}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'fiscalCode',
      header: 'Codice Fiscale',
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.original.fiscalCode || 'N/D'}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefono',
      cell: ({ row }) => row.original.phone || 'N/D',
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const statusConfig = {
          active: { label: 'Attivo', color: 'hsl(142, 76%, 36%)' },
          inactive: { label: 'Inattivo', color: 'hsl(0, 84%, 60%)' },
          prospect: { label: 'Prospect', color: 'hsl(220, 90%, 56%)' }
        };
        const config = statusConfig[row.original.status];
        return (
          <Badge variant="outline" style={{ borderColor: config.color, color: config.color }}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Azioni',
      cell: ({ row }) => {
        const tenantSlug = window.location.pathname.split('/')[1];
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`actions-b2c-customer-${row.original.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/${tenantSlug}/crm/customers/${row.original.id}`}>
                <DropdownMenuItem data-testid={`view-b2c-customer-${row.original.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem 
                onClick={() => setEditCustomer(row.original)}
                data-testid={`edit-b2c-customer-${row.original.id}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteCustomer(row.original)}
                className="text-red-600"
                data-testid={`delete-b2c-customer-${row.original.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
               style={{ borderColor: 'hsl(var(--brand-orange))' }} />
          <p style={{ color: 'var(--text-tertiary)' }}>Caricamento clienti B2C...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          <Input
            placeholder="Cerca clienti B2C..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
            data-testid="search-b2c-customers"
          />
        </div>
        <Button 
          style={{ background: 'hsl(var(--brand-orange))' }} 
          data-testid="create-b2c-customer"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Cliente B2C
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-b2c-customer-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} />
                    <p style={{ color: 'var(--text-tertiary)' }}>Nessun cliente B2C trovato</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        defaultType="b2c"
      />

      <CustomerFormModal 
        open={!!editCustomer} 
        onOpenChange={(open) => !open && setEditCustomer(null)}
        defaultType="b2c"
        editMode={true}
        customerId={editCustomer?.id}
        initialData={editCustomer as any}
      />

      <DeleteConfirmationDialog
        open={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
        onConfirm={() => deleteCustomer && deleteCustomerMutation.mutate(deleteCustomer.id)}
        title="Elimina Cliente B2C"
        itemName={deleteCustomer ? `${deleteCustomer.firstName} ${deleteCustomer.lastName}` : 'questo cliente'}
        isPending={deleteCustomerMutation.isPending}
      />
    </div>
  );
};

export default function CustomersPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca clienti..."
        />

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="b2b" className="h-full">
            <TabsList className="mb-6">
              <TabsTrigger value="b2b" data-testid="tab-b2b-customers">
                <Building className="mr-2 h-4 w-4" />
                Clienti B2B
              </TabsTrigger>
              <TabsTrigger value="b2c" data-testid="tab-b2c-customers">
                <User className="mr-2 h-4 w-4" />
                Clienti B2C
              </TabsTrigger>
            </TabsList>

            <TabsContent value="b2b">
              <B2BCustomersTable />
            </TabsContent>

            <TabsContent value="b2c">
              <B2CCustomersTable />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
