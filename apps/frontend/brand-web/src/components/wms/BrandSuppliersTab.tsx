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
import { brandWmsApi } from '@/services/brandWmsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Plus, Building2, MoreHorizontal, Pencil, Trash2, RefreshCw
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { SupplierFormModal } from './SupplierFormModal';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface BrandSupplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export default function BrandSuppliersTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<BrandSupplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<BrandSupplier | null>(null);

  const { data: suppliersResponse, isLoading } = useQuery({
    queryKey: ['/brand-api/wms/suppliers'],
    queryFn: brandWmsApi.getSuppliers
  });

  const suppliers: BrandSupplier[] = suppliersResponse?.data || [];

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      return brandWmsApi.deleteSupplier(supplierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/suppliers'] });
      setDeleteSupplier(null);
    }
  });

  const columns: ColumnDef<BrandSupplier>[] = [
    {
      accessorKey: 'code',
      header: 'Codice',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: 'rgba(123, 44, 191, 0.1)' }}
          >
            <Building2 className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
          </div>
          <div className="font-medium" data-testid={`text-supplier-code-${row.original.id}`}>
            {row.original.code}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <div>
          <div className="font-medium" data-testid={`text-supplier-name-${row.original.id}`}>
            {row.original.name}
          </div>
          {row.original.legalName && (
            <div className="text-xs text-gray-500">
              {row.original.legalName}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'vatNumber',
      header: 'P.IVA',
      cell: ({ row }) => (
        <div className="font-mono text-sm" data-testid={`text-supplier-vat-${row.original.id}`}>
          {row.original.vatNumber || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="text-sm" data-testid={`text-supplier-email-${row.original.id}`}>
          {row.original.email || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefono',
      cell: ({ row }) => (
        <div className="text-sm" data-testid={`text-supplier-phone-${row.original.id}`}>
          {row.original.phone || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const statusLabels: Record<string, string> = {
          'active': 'Attivo',
          'inactive': 'Inattivo'
        };
        const statusColors: Record<string, string> = {
          'active': 'hsl(142, 76%, 36%)',
          'inactive': 'hsl(0, 84%, 60%)'
        };
        const status = row.original.status;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: statusColors[status], color: statusColors[status] }}
            data-testid={`badge-status-${row.original.id}`}
          >
            {statusLabels[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Azioni',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${row.original.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setEditSupplier(row.original);
              setIsModalOpen(true);
            }} data-testid={`action-edit-${row.original.id}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteSupplier(row.original)}
              className="text-red-600"
              data-testid={`action-delete-${row.original.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: suppliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  return (
    <div className="space-y-6" data-testid="suppliers-content">
      {/* Header */}
      <div className="flex justify-between items-center" data-testid="suppliers-header">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }} data-testid="suppliers-title">
            Fornitori Master
          </h2>
          <p className="text-gray-600" data-testid="suppliers-subtitle">
            Gestisci i fornitori del catalogo master da sincronizzare ai tenant
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/suppliers'] })} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button 
            style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}
            onClick={() => {
              setEditSupplier(null);
              setIsModalOpen(true);
            }}
            data-testid="button-create-supplier"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Fornitore
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2" data-testid="search-bar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca fornitori per codice, nome, P.IVA..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card
        className="overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="suppliers-table-card"
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Caricamento fornitori...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun fornitore</h3>
            <p className="text-gray-600 text-sm">Crea il primo fornitore del catalogo master</p>
          </div>
        ) : (
          <>
            <Table data-testid="suppliers-table">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-testid={`row-supplier-${row.original.id}`}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Mostra {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, suppliers.length)} di{' '}
                {suppliers.length} fornitori
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  data-testid="button-prev-page"
                >
                  Precedente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  data-testid="button-next-page"
                >
                  Successivo
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <SupplierFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditSupplier(null);
        }}
        supplier={editSupplier}
      />

      <DeleteConfirmationDialog
        open={!!deleteSupplier}
        onOpenChange={(open) => !open && setDeleteSupplier(null)}
        onConfirm={() => deleteSupplier && deleteSupplierMutation.mutate(deleteSupplier.id)}
        title="Elimina Fornitore"
        description={`Sei sicuro di voler eliminare il fornitore "${deleteSupplier?.name}"? Questa azione non può essere annullata.`}
      />
    </div>
  );
}
