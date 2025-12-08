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
  Search, Plus, Package, MoreHorizontal, Pencil, Trash2, Eye, RefreshCw
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { ProductFormModal } from './ProductFormModal';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface BrandProduct {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  basePrice: number;
  stockQuantity: number;
  status: 'active' | 'inactive' | 'draft';
  createdAt?: string;
}

export default function BrandProductsTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<BrandProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<BrandProduct | null>(null);

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['/brand-api/wms/products'],
    queryFn: brandWmsApi.getProducts
  });

  const products: BrandProduct[] = productsResponse?.data || [];

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return brandWmsApi.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/products'] });
      setDeleteProduct(null);
    }
  });

  const columns: ColumnDef<BrandProduct>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: 'rgba(255, 105, 0, 0.1)' }}
          >
            <Package className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div className="font-medium" data-testid={`text-product-sku-${row.original.id}`}>
            {row.original.sku}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nome Prodotto',
      cell: ({ row }) => (
        <div className="font-medium" data-testid={`text-product-name-${row.original.id}`}>
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Categoria',
      cell: ({ row }) => (
        <div data-testid={`text-product-category-${row.original.id}`}>
          {row.original.categoryName || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: 'Prezzo Base',
      cell: ({ row }) => (
        <div className="font-medium" data-testid={`text-product-price-${row.original.id}`}>
          €{row.original.basePrice.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'stockQuantity',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.stockQuantity;
        const color = stock > 10 ? 'hsl(142, 76%, 36%)' : stock > 0 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)';
        return (
          <Badge variant="outline" style={{ borderColor: color, color }} data-testid={`badge-stock-${row.original.id}`}>
            {stock}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const statusLabels: Record<string, string> = {
          'active': 'Attivo',
          'inactive': 'Inattivo',
          'draft': 'Bozza'
        };
        const statusColors: Record<string, string> = {
          'active': 'hsl(142, 76%, 36%)',
          'inactive': 'hsl(45, 93%, 47%)',
          'draft': 'hsl(215, 20%, 65%)'
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
              setEditProduct(row.original);
              setIsModalOpen(true);
            }} data-testid={`action-edit-${row.original.id}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteProduct(row.original)}
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
  });

  return (
    <div className="space-y-6" data-testid="products-content">
      {/* Header */}
      <div className="flex justify-between items-center" data-testid="products-header">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }} data-testid="products-title">
            Prodotti Master
          </h2>
          <p className="text-gray-600" data-testid="products-subtitle">
            Gestisci il catalogo master prodotti da sincronizzare ai tenant
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/products'] })} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button 
            style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
            onClick={() => {
              setEditProduct(null);
              setIsModalOpen(true);
            }}
            data-testid="button-create-product"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Prodotto
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2" data-testid="search-bar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca prodotti per SKU, nome, categoria..."
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
        data-testid="products-table-card"
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Caricamento prodotti...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun prodotto</h3>
            <p className="text-gray-600 text-sm">Crea il primo prodotto del catalogo master</p>
          </div>
        ) : (
          <>
            <Table data-testid="products-table">
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
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Mostra {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, products.length)} di{' '}
                {products.length} prodotti
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
      <ProductFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditProduct(null);
        }}
        product={editProduct}
      />

      <DeleteConfirmationDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        onConfirm={() => deleteProduct && deleteProductMutation.mutate(deleteProduct.id)}
        title="Elimina Prodotto"
        description={`Sei sicuro di voler eliminare il prodotto "${deleteProduct?.name}"? Questa azione non può essere annullata.`}
      />
    </div>
  );
}
