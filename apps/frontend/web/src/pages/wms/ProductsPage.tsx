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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Plus, Package, MoreHorizontal, Pencil, Trash2, Box
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProductFormModal } from '@/components/wms/ProductFormModal';
import { DeleteConfirmationDialog } from '@/components/crm/DeleteConfirmationDialog';

interface Product {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  ean?: string;
  type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
  isSerializable: boolean;
  unitOfMeasure: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const [currentModule, setCurrentModule] = useState('prodotti-listini');

  const { data: productsResponse, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products'],
  });

  const products: Product[] = productsResponse || [];

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const tenantId = localStorage.getItem('currentTenantId');
      return apiRequest(`/api/wms/products/${tenantId}/${productId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/products'] });
      toast({
        title: 'Prodotto eliminato',
        description: 'Il prodotto è stato eliminato con successo.',
      });
      setDeleteProduct(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare il prodotto.',
      });
    },
  });

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: 'var(--brand-glass-orange)' }}
          >
            <Package className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div>
            <div className="font-medium" data-testid={`text-product-sku-${row.original.id}`}>
              {row.original.sku}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.brand || 'Nessun brand'}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nome Prodotto',
      cell: ({ row }) => (
        <div>
          <div className="font-medium" data-testid={`text-product-name-${row.original.id}`}>
            {row.original.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {row.original.ean ? `EAN: ${row.original.ean}` : 'Nessun EAN'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const typeLabels: Record<string, string> = {
          'PHYSICAL': 'Fisico',
          'DIGITAL': 'Digitale',
          'SERVICE': 'Servizio'
        };
        const typeColors: Record<string, string> = {
          'PHYSICAL': 'hsl(142, 76%, 36%)',
          'DIGITAL': 'hsl(220, 90%, 56%)',
          'SERVICE': 'hsl(25, 95%, 53%)'
        };
        const type = row.original.type;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: typeColors[type], color: typeColors[type] }}
            data-testid={`badge-product-type-${row.original.id}`}
          >
            {typeLabels[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'quantityAvailable',
      header: 'Disponibile',
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-quantity-${row.original.id}`}>
          <div className="font-semibold">{row.original.quantityAvailable}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {row.original.unitOfMeasure}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'quantityReserved',
      header: 'Riservato',
      cell: ({ row }) => (
        <div className="text-center">
          <div 
            className="font-semibold"
            data-testid={`text-quantity-reserved-${row.original.id}`}
          >
            {row.original.quantityReserved}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'isSerializable',
      header: 'Serializzabile',
      cell: ({ row }) => (
        row.original.isSerializable ? (
          <Badge 
            variant="outline" 
            style={{ borderColor: 'hsl(220, 90%, 56%)', color: 'hsl(220, 90%, 56%)' }}
            data-testid={`badge-serializable-${row.original.id}`}
          >
            Sì
          </Badge>
        ) : (
          <Badge 
            variant="outline" 
            style={{ borderColor: 'hsl(0, 0%, 60%)', color: 'hsl(0, 0%, 60%)' }}
            data-testid={`badge-serializable-${row.original.id}`}
          >
            No
          </Badge>
        )
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Stato',
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge 
            variant="outline" 
            style={{ borderColor: 'hsl(142, 76%, 36%)', color: 'hsl(142, 76%, 36%)' }}
            data-testid={`badge-status-${row.original.id}`}
          >
            Attivo
          </Badge>
        ) : (
          <Badge 
            variant="outline" 
            style={{ borderColor: 'hsl(0, 84%, 60%)', color: 'hsl(0, 84%, 60%)' }}
            data-testid={`badge-status-${row.original.id}`}
          >
            Inattivo
          </Badge>
        )
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid={`button-actions-${row.original.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditProduct(row.original);
                setIsModalOpen(true);
              }}
              data-testid={`button-edit-${row.original.id}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteProduct(row.original)}
              className="text-red-600"
              data-testid={`button-delete-${row.original.id}`}
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
    data: products,
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
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Box size={32} style={{ color: 'hsl(var(--brand-orange))' }} />
            <h1 
              style={{ fontSize: '28px', fontWeight: '700', color: 'hsl(var(--foreground))' }}
              data-testid="heading-products"
            >
              Catalogo Prodotti
            </h1>
          </div>
          <p 
            style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}
            data-testid="text-products-subtitle"
          >
            Gestisci il catalogo prodotti del tuo magazzino
          </p>
        </div>

        {/* Filters and Actions */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)'
                }} 
              />
              <Input
                placeholder="Cerca per SKU, nome, brand o EAN..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                data-testid="input-search-products"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            <Button
              onClick={() => {
                setEditProduct(null);
                setIsModalOpen(true);
              }}
              data-testid="button-add-product"
              style={{
                background: 'hsl(var(--brand-orange))',
                color: 'white',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Prodotto
            </Button>
          </div>
        </div>

        {/* Table */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
          }}
        >
          {isLoading ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                border: '4px solid #f3f4f6',
                borderTop: '4px solid hsl(var(--brand-orange))',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
              <p style={{ marginTop: '16px', color: 'var(--text-tertiary)' }}>
                Caricamento prodotti...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--text-tertiary)' }} />
              <p 
                style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}
                data-testid="text-empty-state"
              >
                Nessun prodotto trovato
              </p>
              <Button
                onClick={() => {
                  setEditProduct(null);
                  setIsModalOpen(true);
                }}
                data-testid="button-add-first-product"
                style={{
                  background: 'hsl(var(--brand-orange))',
                  color: 'white',
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi primo prodotto
              </Button>
            </div>
          ) : (
            <>
              <Table>
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
                    <TableRow key={row.id} data-testid={`row-product-${row.original.id}`}>
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
              <div style={{ 
                padding: '16px 24px', 
                borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  {table.getFilteredRowModel().rows.length} prodotti totali
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditProduct(null);
        }}
        product={editProduct}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => {
          if (deleteProduct) {
            deleteProductMutation.mutate(deleteProduct.id);
          }
        }}
        title="Elimina Prodotto"
        description={`Sei sicuro di voler eliminare il prodotto "${deleteProduct?.name}"? Questa azione non può essere annullata.`}
        isLoading={deleteProductMutation.isPending}
      />
    </Layout>
  );
}
