import { useState, useMemo, useCallback, useEffect } from 'react';
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
  type ColumnFiltersState,
} from '@tanstack/react-table';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Search, Plus, Package, MoreHorizontal, Pencil, Trash2, Box, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarIcon, RotateCcw, SlidersHorizontal, X, ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProductFormModal } from '@/components/wms/ProductFormModal';
import { DeleteConfirmationDialog } from '@/components/crm/DeleteConfirmationDialog';
import { format, differenceInCalendarDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface Product {
  id: string;
  sku: string;
  name: string;
  model?: string;
  description?: string;
  notes?: string;
  brand?: string;
  ean?: string;
  imei1?: string;
  imei2?: string;
  imei3?: string;
  imeis?: string[];
  memory?: string;
  color?: string;
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
  useStandaloneLayout?: boolean;
  currentModule?: string;
  setCurrentModule?: (module: string) => void;
}

interface Category {
  id: string;
  nome: string;
}

interface ProductType {
  id: string;
  nome: string;
  categoryId?: string;
}

interface AppliedFilters {
  search: string;
  identifierType: string;
  identifierValue: string;
  type: string;
  status: string;
  condition: string;
  brand: string;
  categoryId: string;
  typeId: string;
  dateRange: DateRange | undefined;
}

const initialFilters: AppliedFilters = {
  search: '',
  identifierType: 'sku',
  identifierValue: '',
  type: 'all',
  status: 'all',
  condition: 'all',
  brand: 'all',
  categoryId: 'all',
  typeId: 'all',
  dateRange: undefined,
};

export default function ProductsPage({ 
  useStandaloneLayout = true,
  currentModule: externalCurrentModule,
  setCurrentModule: externalSetCurrentModule
}: ProductsPageProps = {}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [filterSearch, setFilterSearch] = useState('');
  const [filterIdentifierType, setFilterIdentifierType] = useState<string>('sku');
  const [filterIdentifierValue, setFilterIdentifierValue] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(initialFilters);
  
  // Auto-search with debounce after 3 characters (independent from "Applica filtri")
  useEffect(() => {
    if (filterSearch.length >= 3) {
      const debounceTimer = setTimeout(() => {
        setAppliedFilters(prev => ({ ...prev, search: filterSearch }));
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else if (filterSearch.length === 0 && appliedFilters.search.length > 0) {
      // Clear search when input is emptied
      setAppliedFilters(prev => ({ ...prev, search: '' }));
    }
  }, [filterSearch]);

  // Reset typeId when category changes (parent-child relationship)
  useEffect(() => {
    if (filterCategoryId !== appliedFilters.categoryId) {
      setFilterTypeId('all');
    }
  }, [filterCategoryId]);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [internalCurrentModule, setInternalCurrentModule] = useState('prodotti-listini');
  
  const currentModule = externalCurrentModule ?? internalCurrentModule;
  const setCurrentModule = externalSetCurrentModule ?? setInternalCurrentModule;

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products', { limit: 250 }],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  const { data: productTypes = [] } = useQuery<ProductType[]>({
    queryKey: ['/api/wms/product-types'],
  });

  // Filter product types by selected category (parent-child relationship)
  const filteredProductTypes = useMemo(() => {
    if (filterCategoryId === 'all') return [];
    // Product types should have categoryId matching selected category
    return productTypes.filter(pt => pt.categoryId === filterCategoryId);
  }, [productTypes, filterCategoryId]);

  const uniqueBrands = useMemo(() => {
    const brands = allProducts
      .map(p => p.brand)
      .filter((brand): brand is string => !!brand);
    return [...new Set(brands)].sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      // Identifier filter (SKU/EAN)
      if (appliedFilters.identifierValue) {
        const valueLower = appliedFilters.identifierValue.toLowerCase();
        let fieldValue = '';
        switch (appliedFilters.identifierType) {
          case 'sku':
            fieldValue = product.sku?.toLowerCase() || '';
            break;
          case 'ean':
            fieldValue = product.ean?.toLowerCase() || '';
            break;
        }
        if (!fieldValue.includes(valueLower)) return false;
      }

      // General search filter
      if (appliedFilters.search) {
        const searchLower = appliedFilters.search.toLowerCase();
        const matchesSearch = 
          product.sku?.toLowerCase().includes(searchLower) ||
          product.name?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.ean?.toLowerCase().includes(searchLower) ||
          product.model?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (appliedFilters.type !== 'all' && product.type !== appliedFilters.type) {
        return false;
      }

      if (appliedFilters.status !== 'all' && product.status !== appliedFilters.status) {
        return false;
      }

      if (appliedFilters.condition !== 'all' && product.condition !== appliedFilters.condition) {
        return false;
      }

      if (appliedFilters.brand !== 'all' && product.brand !== appliedFilters.brand) {
        return false;
      }

      if (appliedFilters.categoryId !== 'all' && product.categoryId !== appliedFilters.categoryId) {
        return false;
      }

      if (appliedFilters.typeId !== 'all' && product.typeId !== appliedFilters.typeId) {
        return false;
      }

      if (appliedFilters.dateRange?.from) {
        const productDate = new Date(product.createdAt);
        const from = startOfDay(appliedFilters.dateRange.from);
        const to = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(from);
        if (!isWithinInterval(productDate, { start: from, end: to })) {
          return false;
        }
      }

      return true;
    });
  }, [allProducts, appliedFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.search !== '' ||
      appliedFilters.identifierValue !== '' ||
      appliedFilters.type !== 'all' ||
      appliedFilters.status !== 'all' ||
      appliedFilters.condition !== 'all' ||
      appliedFilters.brand !== 'all' ||
      appliedFilters.categoryId !== 'all' ||
      appliedFilters.typeId !== 'all' ||
      appliedFilters.dateRange !== undefined
    );
  }, [appliedFilters]);

  const hasPendingFilters = useMemo(() => {
    // Search is handled separately with auto-apply, exclude from pending changes
    return (
      filterIdentifierType !== appliedFilters.identifierType ||
      filterIdentifierValue !== appliedFilters.identifierValue ||
      filterType !== appliedFilters.type ||
      filterStatus !== appliedFilters.status ||
      filterCondition !== appliedFilters.condition ||
      filterBrand !== appliedFilters.brand ||
      filterCategoryId !== appliedFilters.categoryId ||
      filterTypeId !== appliedFilters.typeId ||
      JSON.stringify(filterDateRange) !== JSON.stringify(appliedFilters.dateRange)
    );
  }, [filterIdentifierType, filterIdentifierValue, filterType, filterStatus, filterCondition, filterBrand, filterCategoryId, filterTypeId, filterDateRange, appliedFilters]);

  const applyFilters = useCallback(() => {
    // Keep the auto-applied search and apply other filters
    setAppliedFilters(prev => ({
      ...prev,
      identifierType: filterIdentifierType,
      identifierValue: filterIdentifierValue,
      type: filterType,
      status: filterStatus,
      condition: filterCondition,
      brand: filterBrand,
      categoryId: filterCategoryId,
      typeId: filterTypeId,
      dateRange: filterDateRange,
    }));
  }, [filterIdentifierType, filterIdentifierValue, filterType, filterStatus, filterCondition, filterBrand, filterCategoryId, filterTypeId, filterDateRange]);

  const resetAllFilters = useCallback(() => {
    setFilterSearch('');
    setFilterIdentifierType('sku');
    setFilterIdentifierValue('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterCondition('all');
    setFilterBrand('all');
    setFilterCategoryId('all');
    setFilterTypeId('all');
    setFilterDateRange(undefined);
    setAppliedFilters(initialFilters);
  }, []);

  const exportToCSV = () => {
    const headers = ['SKU', 'Nome', 'Marca', 'Modello', 'EAN', 'Memoria', 'Colore', 'Tipo', 'Stato', 'Condizioni', 'Serializzabile', 'Tipo Seriale', 'Categoria', 'Tipologia', 'Data Creazione'];
    const rows = filteredProducts.map(p => [
      p.sku,
      p.name,
      p.brand || '',
      p.model || '',
      p.ean || '',
      p.memory || '',
      p.color || '',
      p.type,
      p.status,
      p.condition || '',
      p.isSerializable ? 'Sì' : 'No',
      p.serialType || '',
      p.categoryName || '',
      p.typeName || '',
      p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy') : ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    downloadFile(csvContent, 'prodotti.csv', 'text/csv');
  };

  const exportToExcel = () => {
    const headers = ['SKU', 'Nome', 'Marca', 'Modello', 'EAN', 'Memoria', 'Colore', 'Tipo', 'Stato', 'Condizioni', 'Serializzabile', 'Tipo Seriale', 'Categoria', 'Tipologia', 'Data Creazione'];
    const rows = filteredProducts.map(p => [
      p.sku,
      p.name,
      p.brand || '',
      p.model || '',
      p.ean || '',
      p.memory || '',
      p.color || '',
      p.type,
      p.status,
      p.condition || '',
      p.isSerializable ? 'Sì' : 'No',
      p.serialType || '',
      p.categoryName || '',
      p.typeName || '',
      p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy') : ''
    ]);
    const csvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    downloadFile(csvContent, 'prodotti.xlsx', 'application/vnd.ms-excel');
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(filteredProducts, null, 2);
    downloadFile(jsonContent, 'prodotti.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export completato',
      description: `File ${filename} scaricato con successo.`,
    });
  };

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
          'CANVAS': 'hsl(280, 100%, 50%)',
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
                Brand
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
                Brand
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
        
        if (!validFrom && !validTo) {
          return <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Illimitata</span>;
        }
        
        const validFromDate = validFrom ? new Date(validFrom) : null;
        const validToDate = validTo ? new Date(validTo) : null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (validToDate) {
          const daysUntilExpiry = differenceInCalendarDays(validToDate, today);
          
          if (daysUntilExpiry < 0) {
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {validFromDate && format(validFromDate, 'dd/MM/yyyy')} → {format(validToDate, 'dd/MM/yyyy')}
                </span>
                <Badge variant="destructive" className="gap-1 w-fit">
                  Scaduto
                </Badge>
              </div>
            );
          }
          
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
                  Scade tra {daysUntilExpiry} giorni
                </Badge>
              </div>
            );
          }
          
          return (
            <span className="text-sm">
              {validFromDate && format(validFromDate, 'dd/MM/yyyy')} → {format(validToDate, 'dd/MM/yyyy')}
            </span>
          );
        }
        
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
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 250,
      },
    },
  });

  const content = (
    <>
      <div style={{ padding: '32px', width: '100%' }}>
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
          data-testid="container-filters"
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
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
                placeholder="Cerca per SKU, EAN, marca, nome, descrizione..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                data-testid="input-search-products"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            <Button
              onClick={() => {
                setEditProduct(null);
                setIsModalOpen(true);
              }}
              data-testid="button-new-product"
              style={{
                background: 'hsl(var(--brand-orange))',
                color: 'white',
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Prodotto
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="button-export"
                  style={{
                    borderColor: 'hsl(var(--brand-orange))',
                    color: 'hsl(var(--brand-orange))',
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Esporta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} data-testid="button-export-excel">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToJSON} data-testid="button-export-json">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick Filters Row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-type-all">Tutti i tipi</SelectItem>
                <SelectItem value="PHYSICAL" data-testid="select-type-physical">Fisico</SelectItem>
                <SelectItem value="VIRTUAL" data-testid="select-type-virtual">Digitale</SelectItem>
                <SelectItem value="SERVICE" data-testid="select-type-service">Servizio</SelectItem>
                <SelectItem value="CANVAS" data-testid="select-type-canvas">Canvas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-status-all">Tutti gli stati</SelectItem>
                <SelectItem value="active" data-testid="select-status-active">Attivo</SelectItem>
                <SelectItem value="inactive" data-testid="select-status-inactive">Inattivo</SelectItem>
                <SelectItem value="discontinued" data-testid="select-status-discontinued">Discontinuato</SelectItem>
                <SelectItem value="draft" data-testid="select-status-draft">Bozza</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              data-testid="button-advanced-filters"
              style={{
                borderColor: isAdvancedOpen || hasActiveFilters ? 'hsl(var(--brand-orange))' : undefined,
                color: isAdvancedOpen || hasActiveFilters ? 'hsl(var(--brand-orange))' : undefined,
              }}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtri Avanzati
              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              {hasActiveFilters && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
                  {[
                    appliedFilters.identifierValue !== '',
                    appliedFilters.condition !== 'all',
                    appliedFilters.brand !== 'all',
                    appliedFilters.categoryId !== 'all',
                    appliedFilters.typeId !== 'all',
                    appliedFilters.dateRange !== undefined,
                  ].filter(Boolean).length}
                </Badge>
              )}
            </Button>

            <Button
              onClick={applyFilters}
              data-testid="button-apply-filters"
              size="sm"
              style={{
                background: 'hsl(var(--brand-orange))',
                color: 'white',
              }}
            >
              Applica
            </Button>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                data-testid="button-reset-filters"
                style={{ color: 'hsl(var(--brand-orange))' }}
              >
                <X className="h-4 w-4 mr-1" />
                Resetta
              </Button>
            )}
          </div>

          {/* Advanced Filters Panel (Collapsible) */}
          {isAdvancedOpen && (
            <div 
              style={{ 
                marginTop: '12px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
              }}
              data-testid="panel-advanced-filters"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {/* Identifier filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Ricerca per codice</label>
                  <div className="flex gap-1">
                    <Select value={filterIdentifierType} onValueChange={setFilterIdentifierType}>
                      <SelectTrigger className="w-[80px] h-9 text-xs" data-testid="select-identifier-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sku">SKU</SelectItem>
                        <SelectItem value="ean">EAN</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={filterIdentifierType.toUpperCase()}
                      value={filterIdentifierValue}
                      onChange={(e) => setFilterIdentifierValue(e.target.value)}
                      data-testid="input-identifier-value"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Condizione</label>
                  <Select value={filterCondition} onValueChange={setFilterCondition}>
                    <SelectTrigger className="h-9" data-testid="select-filter-condition">
                      <SelectValue placeholder="Tutte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le condizioni</SelectItem>
                      <SelectItem value="new">Nuovo</SelectItem>
                      <SelectItem value="used">Usato</SelectItem>
                      <SelectItem value="refurbished">Ricondizionato</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Marca</label>
                  <Select value={filterBrand} onValueChange={setFilterBrand}>
                    <SelectTrigger className="h-9" data-testid="select-filter-brand">
                      <SelectValue placeholder="Tutte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le marche</SelectItem>
                      {uniqueBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
                  <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                    <SelectTrigger className="h-9" data-testid="select-filter-category">
                      <SelectValue placeholder="Tutte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le categorie</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipologia (dependent on category - disabled when no category selected) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tipologia</label>
                  <Select 
                    value={filterTypeId} 
                    onValueChange={setFilterTypeId}
                    disabled={filterCategoryId === 'all'}
                  >
                    <SelectTrigger className="h-9" data-testid="select-filter-tipologia" disabled={filterCategoryId === 'all'}>
                      <SelectValue placeholder={filterCategoryId === 'all' ? "Seleziona categoria" : "Tutte"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le tipologie</SelectItem>
                      {filteredProductTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Data creazione</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-9 justify-start text-left font-normal text-sm"
                        data-testid="button-date-range-picker"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filterDateRange?.from ? (
                          filterDateRange.to ? (
                            <span className="text-xs">
                              {format(filterDateRange.from, 'dd/MM', { locale: it })} - {format(filterDateRange.to, 'dd/MM', { locale: it })}
                            </span>
                          ) : (
                            <span className="text-xs">{format(filterDateRange.from, 'dd/MM/yy', { locale: it })}</span>
                          )
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Periodo</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filterDateRange?.from}
                        selected={filterDateRange}
                        onSelect={setFilterDateRange}
                        numberOfMonths={2}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Chips */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
              {appliedFilters.search && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Cerca: {appliedFilters.search}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterSearch(''); setAppliedFilters(prev => ({ ...prev, search: '' })); }} />
                </Badge>
              )}
              {appliedFilters.type !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Tipo: {appliedFilters.type === 'PHYSICAL' ? 'Fisico' : appliedFilters.type === 'VIRTUAL' ? 'Digitale' : appliedFilters.type === 'SERVICE' ? 'Servizio' : 'Canvas'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterType('all'); setAppliedFilters(prev => ({ ...prev, type: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Stato: {appliedFilters.status === 'active' ? 'Attivo' : appliedFilters.status === 'inactive' ? 'Inattivo' : appliedFilters.status === 'discontinued' ? 'Discontinuato' : 'Bozza'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterStatus('all'); setAppliedFilters(prev => ({ ...prev, status: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.identifierValue && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  {appliedFilters.identifierType.toUpperCase()}: {appliedFilters.identifierValue}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterIdentifierValue(''); setAppliedFilters(prev => ({ ...prev, identifierValue: '' })); }} />
                </Badge>
              )}
              {appliedFilters.condition !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Condizione: {appliedFilters.condition === 'new' ? 'Nuovo' : appliedFilters.condition === 'used' ? 'Usato' : appliedFilters.condition === 'refurbished' ? 'Ricondizionato' : 'Demo'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterCondition('all'); setAppliedFilters(prev => ({ ...prev, condition: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.brand !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Marca: {appliedFilters.brand}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterBrand('all'); setAppliedFilters(prev => ({ ...prev, brand: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.categoryId !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Categoria: {categories.find(c => c.id === appliedFilters.categoryId)?.nome || appliedFilters.categoryId}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterCategoryId('all'); setAppliedFilters(prev => ({ ...prev, categoryId: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.typeId !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Tipologia: {productTypes.find(t => t.id === appliedFilters.typeId)?.nome || appliedFilters.typeId}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterTypeId('all'); setAppliedFilters(prev => ({ ...prev, typeId: 'all' })); }} />
                </Badge>
              )}
              {appliedFilters.dateRange && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Data: {format(appliedFilters.dateRange.from!, 'dd/MM/yy', { locale: it })}
                  {appliedFilters.dateRange.to && ` - ${format(appliedFilters.dateRange.to, 'dd/MM/yy', { locale: it })}`}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterDateRange(undefined); setAppliedFilters(prev => ({ ...prev, dateRange: undefined })); }} />
                </Badge>
              )}
            </div>
          )}
        </div>

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
          data-testid="container-products-table"
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
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--text-tertiary)' }} />
              <p 
                style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}
                data-testid="text-empty-state"
              >
                {hasActiveFilters ? 'Nessun prodotto corrisponde ai filtri selezionati' : 'Nessun prodotto trovato'}
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  onClick={resetAllFilters}
                  data-testid="button-clear-filters"
                  style={{ color: 'hsl(var(--brand-orange))' }}
                >
                  Rimuovi tutti i filtri
                </Button>
              ) : (
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
              )}
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

              <div style={{ 
                padding: '16px 24px', 
                borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} data-testid="text-pagination-info">
                  Visualizzati {table.getRowModel().rows.length} di {filteredProducts.length} prodotti
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    data-testid="button-first-page"
                    title="Prima pagina"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Precedente
                  </Button>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '0 12px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Pagina</span>
                    <Select
                      value={String(table.getState().pagination.pageIndex + 1)}
                      onValueChange={(value) => table.setPageIndex(Number(value) - 1)}
                    >
                      <SelectTrigger className="w-[70px] h-8" data-testid="select-page-number">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: table.getPageCount() || 1 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)} data-testid={`select-page-${i + 1}`}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>di {table.getPageCount() || 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    data-testid="button-next-page"
                  >
                    Successivo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    data-testid="button-last-page"
                    title="Ultima pagina"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProductFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditProduct(null);
        }}
        product={editProduct}
      />

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

  return useStandaloneLayout ? (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      {content}
    </Layout>
  ) : content;
}
