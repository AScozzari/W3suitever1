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
import { format, differenceInCalendarDays } from 'date-fns';

interface Product {
  id: string;
  sku: string;
  name: string;
  model?: string;
  description?: string;
  notes?: string;
  brand?: string;
  ean?: string;
  imageUrl?: string;
  type: 'CANVAS' | 'PHYSICAL' | 'VIRTUAL' | 'SERVICE';
  status: 'active' | 'inactive' | 'discontinued' | 'draft';
  condition?: 'new' | 'used' | 'refurbished' | 'demo';
  isSerializable: boolean;
  serialType?: 'imei' | 'iccid' | 'mac_address' | 'other';
  monthlyFee?: number;
  unitOfMeasure: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint: number;
  isActive: boolean;
  createdAt: string;
  categoryId?: string;
  typeId?: string;
  validFrom?: string;
  validTo?: string;
  categoryName?: string | null;
  typeName?: string | null;
  source?: 'brand' | 'tenant';
  isBrandSynced?: boolean;
}

interface ProductsPageProps {
  /**
   * Se true (default), wrappa il contenuto in Layout.
   * Se false, renderizza solo il contenuto (per embedding in tabs).
   */
  useStandaloneLayout?: boolean;
  /**
   * Modulo corrente per il Layout (usato solo se useStandaloneLayout=true)
   */
  currentModule?: string;
  /**
   * Setter per il modulo corrente (usato solo se useStandaloneLayout=true)
   */
  setCurrentModule?: (module: string) => void;
}

export default function ProductsPage({ 
  useStandaloneLayout = true,
  currentModule: externalCurrentModule,
  setCurrentModule: externalSetCurrentModule
}: ProductsPageProps = {}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  // Internal state for standalone mode
  const [internalCurrentModule, setInternalCurrentModule] = useState('prodotti-listini');
  
  // Use props if provided, otherwise fall back to internal state
  // This ensures standalone usage works correctly even without explicit props
  const currentModule = externalCurrentModule ?? internalCurrentModule;
  const setCurrentModule = externalSetCurrentModule ?? setInternalCurrentModule;

  const { data: productsResponse, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products'],
  });

  const products: Product[] = productsResponse || [];

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest(`/api/wms/products/${productId}`, {
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
          {/* Image Thumbnail or Package Icon */}
          {row.original.imageUrl ? (
            <img 
              src={row.original.imageUrl} 
              alt={row.original.name}
              className="h-10 w-10 rounded-lg object-cover"
              data-testid={`img-product-${row.original.id}`}
            />
          ) : (
            <div 
              className="p-2 rounded-lg"
              style={{ background: 'var(--brand-glass-orange)' }}
            >
              <Package className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
            </div>
          )}
          <div>
            <div className="font-medium" data-testid={`text-product-sku-${row.original.id}`}>
              {row.original.sku}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'brand',
      header: 'Marca',
      cell: ({ row }) => (
        <div data-testid={`text-product-brand-${row.original.id}`}>
          {row.original.brand || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'model',
      header: 'Modello',
      cell: ({ row }) => (
        <div>
          <div className="font-medium" data-testid={`text-product-model-${row.original.id}`}>
            {row.original.model || row.original.name}
          </div>
          {row.original.model && row.original.name && (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.name}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'ean',
      header: 'EAN',
      cell: ({ row }) => (
        <div className="font-mono text-sm" data-testid={`text-product-ean-${row.original.id}`}>
          {row.original.ean || <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'memory',
      header: 'Memoria',
      cell: ({ row }) => {
        if (!row.original.memory) {
          return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: 'hsl(220, 90%, 56%)', color: 'hsl(220, 90%, 56%)' }}
            data-testid={`badge-memory-${row.original.id}`}
          >
            {row.original.memory}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'color',
      header: 'Colore',
      cell: ({ row }) => {
        if (!row.original.color) {
          return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }
        
        // Map common colors to HSL values
        const colorMap: Record<string, string> = {
          'nero': 'hsl(0, 0%, 20%)',
          'bianco': 'hsl(0, 0%, 95%)',
          'grigio': 'hsl(0, 0%, 60%)',
          'blu': 'hsl(220, 90%, 56%)',
          'rosso': 'hsl(0, 84%, 60%)',
          'verde': 'hsl(142, 76%, 36%)',
          'giallo': 'hsl(45, 93%, 47%)',
          'viola': 'hsl(280, 100%, 50%)',
          'arancione': 'hsl(25, 95%, 53%)',
        };
        
        const colorKey = row.original.color.toLowerCase();
        const colorValue = colorMap[colorKey] || 'hsl(0, 0%, 60%)';
        
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: colorValue, color: colorValue }}
            data-testid={`badge-color-${row.original.id}`}
          >
            {row.original.color}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'serialType',
      header: 'IMEI/ICCID',
      cell: ({ row }) => {
        if (!row.original.isSerializable || !row.original.serialType) {
          return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }
        
        const serialTypeLabels: Record<string, string> = {
          'imei': 'IMEI',
          'iccid': 'ICCID',
          'mac_address': 'MAC',
          'other': 'Altro'
        };
        const serialTypeColors: Record<string, string> = {
          'imei': 'hsl(142, 76%, 36%)',
          'iccid': 'hsl(220, 90%, 56%)',
          'mac_address': 'hsl(280, 100%, 50%)',
          'other': 'hsl(0, 0%, 60%)'
        };
        const serialType = row.original.serialType;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: serialTypeColors[serialType] || serialTypeColors['other'], color: serialTypeColors[serialType] || serialTypeColors['other'] }}
            data-testid={`badge-serial-type-${row.original.id}`}
          >
            {serialTypeLabels[serialType] || serialType}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const typeLabels: Record<string, string> = {
          'CANVAS': 'Canvas',
          'PHYSICAL': 'Fisico',
          'VIRTUAL': 'Digitale',
          'SERVICE': 'Servizio'
        };
        const typeColors: Record<string, string> = {
          'CANVAS': 'hsl(280, 100%, 50%)', // Purple for Canvas
          'PHYSICAL': 'hsl(142, 76%, 36%)',
          'VIRTUAL': 'hsl(220, 90%, 56%)',
          'SERVICE': 'hsl(25, 95%, 53%)'
        };
        const type = row.original.type;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: typeColors[type] || typeColors['PHYSICAL'], color: typeColors[type] || typeColors['PHYSICAL'] }}
            data-testid={`badge-product-type-${row.original.id}`}
          >
            {typeLabels[type] || type}
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
          'discontinued': 'Discontinuato',
          'draft': 'Bozza'
        };
        const statusColors: Record<string, string> = {
          'active': 'hsl(142, 76%, 36%)',
          'inactive': 'hsl(45, 93%, 47%)',
          'discontinued': 'hsl(0, 84%, 60%)',
          'draft': 'hsl(215, 20%, 65%)'
        };
        const status = row.original.status;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: statusColors[status] || statusColors['active'], color: statusColors[status] || statusColors['active'] }}
            data-testid={`badge-product-status-${row.original.id}`}
          >
            {statusLabels[status] || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'condition',
      header: 'Condizioni',
      cell: ({ row }) => {
        if (!row.original.condition) return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        
        const conditionLabels: Record<string, string> = {
          'new': 'Nuovo',
          'used': 'Usato',
          'refurbished': 'Ricondizionato',
          'demo': 'Demo'
        };
        const conditionColors: Record<string, string> = {
          'new': 'hsl(142, 76%, 36%)',
          'used': 'hsl(45, 93%, 47%)',
          'refurbished': 'hsl(220, 90%, 56%)',
          'demo': 'hsl(280, 100%, 50%)'
        };
        const condition = row.original.condition;
        return (
          <Badge 
            variant="outline" 
            style={{ borderColor: conditionColors[condition] || conditionColors['new'], color: conditionColors[condition] || conditionColors['new'] }}
            data-testid={`badge-product-condition-${row.original.id}`}
          >
            {conditionLabels[condition] || condition}
          </Badge>
        );
      },
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
      accessorKey: 'categoryName',
      header: 'Categoria',
      cell: ({ row }) => {
        const { categoryName, source, isBrandSynced } = row.original;
        
        if (!categoryName) {
          return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{categoryName}</span>
            {source === 'brand' && isBrandSynced && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(var(--brand-orange))', color: 'hsl(var(--brand-orange))' }}>
                🏢 Brand
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'typeName',
      header: 'Tipologia',
      cell: ({ row }) => {
        const { typeName, source, isBrandSynced } = row.original;
        
        if (!typeName) {
          return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{typeName}</span>
            {source === 'brand' && isBrandSynced && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(var(--brand-orange))', color: 'hsl(var(--brand-orange))' }}>
                🏢 Brand
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'validTo',
      header: 'Validità',
      cell: ({ row }) => {
        const { validFrom, validTo } = row.original;
        
        // No validity period set
        if (!validFrom && !validTo) {
          return <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Illimitata</span>;
        }
        
        // Show validity range
        const validFromDate = validFrom ? new Date(validFrom) : null;
        const validToDate = validTo ? new Date(validTo) : null;
        
        // Calculate days until expiry
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        
        if (validToDate) {
          const daysUntilExpiry = differenceInCalendarDays(validToDate, today);
          
          // Expired
          if (daysUntilExpiry < 0) {
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {validFromDate && format(validFromDate, 'dd/MM/yyyy')} → {format(validToDate, 'dd/MM/yyyy')}
                </span>
                <Badge variant="destructive" className="gap-1 w-fit">
                  ❌ Scaduto
                </Badge>
              </div>
            );
          }
          
          // Expiring soon (< 30 days)
          if (daysUntilExpiry <= 30) {
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {validFromDate && format(validFromDate, 'dd/MM/yyyy')} → {format(validToDate, 'dd/MM/yyyy')}
                </span>
                <Badge 
                  variant="outline" 
                  className="gap-1 w-fit" 
                  style={{ borderColor: 'hsl(45, 93%, 47%)', color: 'hsl(45, 93%, 47%)' }}
                  data-testid={`badge-expiring-${row.original.id}`}
                >
                  ⏰ Scade tra {daysUntilExpiry} giorni
                </Badge>
              </div>
            );
          }
          
          // Valid (> 30 days)
          return (
            <span className="text-sm">
              {validFromDate && format(validFromDate, 'dd/MM/yyyy')} → {format(validToDate, 'dd/MM/yyyy')}
            </span>
          );
        }
        
        // Only validFrom set (no expiry)
        if (validFromDate) {
          return (
            <span className="text-sm">
              Dal {format(validFromDate, 'dd/MM/yyyy')}
            </span>
          );
        }
        
        return <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>-</span>;
      },
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

  // Content rendering (with or without Layout wrapper based on mode)
  const content = (
    <>
      <div style={{ padding: '32px', width: '100%' }}>
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
          className="w-full"
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
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
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
            </div>
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
    </>
  );

  // Conditional Layout wrapper
  return useStandaloneLayout ? (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      {content}
    </Layout>
  ) : content;
}
