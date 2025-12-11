import { useState, useMemo, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Warehouse,
  DollarSign,
  Eye,
  Layers,
  List,
  Calendar as CalendarIcon,
  RotateCcw,
  History,
  Clock,
  Tag,
  Barcode,
  Box,
  FileText,
  Truck,
  ArrowRightCircle,
  CircleDot,
  Cpu,
  Palette,
  HardDrive,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type LogisticStatus = 'in_stock' | 'reserved' | 'preparing' | 'shipping' | 'delivered' | 
  'customer_return' | 'doa_return' | 'in_service' | 'supplier_return' | 
  'in_transfer' | 'lost' | 'damaged' | 'internal_use';

// Vista serializzata - una riga per combinazione prodotto+store
interface InventoryItem {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  productId: string;
  productName: string;
  productSku: string;
  productType: string;
  productCategory: string;
  productBrand: string | null;
  productModel: string | null;
  productDescription: string | null;
  productEan: string | null;
  serialType: 'imei' | 'iccid' | 'mac_address' | 'other' | null;
  serialCount: number;
  serials: Array<{ type: string; value: string }>;
  quantityAvailable: number;
  quantityReserved: number;
  averageCost: number;
  totalValue: number;
  lowStockThreshold: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  logisticStatus: LogisticStatus;
  logisticStatusCounts: Record<string, number>;
  batchCount: number;
  batches: Array<{ batchNumber: string; quantity: number }>;
  lastMovementAt: string | null;
  updatedAt: string;
}

// Vista aggregata - una riga per prodotto (cross-store)
interface AggregatedInventoryItem {
  productId: string;
  productName: string;
  productSku: string;
  productType: string;
  productCategory: string | null;
  productTypeId: string | null;
  productStatus: string;
  productBrand: string | null;
  productModel: string | null;
  productDescription: string | null;
  productEan: string | null;
  serialType: string | null;
  totalAvailable: number;
  totalReserved: number;
  totalValue: number;
  weightedAverageCost: number;
  storeCoverageCount: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  serialCount: number;
  logisticStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
  stockStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
  lastMovementAt: string | null;
}

interface InventoryKPIs {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehouseStore {
  id: string;
  nome: string;
  code: string;
}

interface InventoryViewDataSerialized {
  viewMode: 'serialized';
  items: InventoryItem[];
  pagination: Pagination;
  kpis: InventoryKPIs;
  warehouseStores: WarehouseStore[];
}

interface InventoryViewDataAggregated {
  viewMode: 'aggregated';
  items: AggregatedInventoryItem[];
  pagination: Pagination;
  kpis: InventoryKPIs;
  warehouseStores: WarehouseStore[];
}

type InventoryViewData = InventoryViewDataSerialized | InventoryViewDataAggregated;

interface DocumentReference {
  id: string;
  documentType: 'ddt' | 'fattura' | 'ordine' | 'reso' | 'altro';
  documentNumber: string;
  documentDate: string;
}

interface SerialStatusLog {
  id: string;
  serialId: string;
  previousStatus: string | null;
  newStatus: string;
  changedAt: string;
  changedBy: string | null;
  notes: string | null;
  documents?: DocumentReference[];
  statusChangeGroupId?: string | null;
}

interface SerialDetail {
  id: string;
  serialNumber: string;
  serialType: 'imei' | 'iccid' | 'mac_address' | 'other';
  logisticStatus: LogisticStatus;
  condition: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: SerialStatusLog[];
  ean?: string;
  color?: string;
  memory?: string;
  supplierName?: string;
  unitCost?: number | string;
}

interface ProductSerials {
  productId: string;
  productName: string;
  productSku: string;
  serials: SerialDetail[];
}

interface CrossStoreSummary {
  product: {
    id: string;
    name: string;
    sku: string;
    brand: string | null;
    model: string | null;
    ean: string | null;
    productType: string;
    description: string | null;
    condition: string | null;
    isSerialized: boolean;
    serialType: string | null;
    memory: string | null;
    color: string | null;
    categoryName: string | null;
    typeName: string | null;
    imageUrl: string | null;
    unitCost: number;
    isActive: boolean;
  };
  kpis: {
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    totalValue: number;
    weightedAverageCost: number;
    storeCount: number;
    serialCount: number;
  };
  storeDistribution: Array<{
    storeId: string;
    storeName: string;
    storeCode: string;
    quantity: number;
    reserved: number;
    available: number;
    value: string;
    averageCost: string;
  }>;
  logisticStatusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  stockStatusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  lastMovement: {
    id: string;
    type: string;
    date: string;
    storeId: string;
    storeName: string;
  } | null;
}

type ViewMode = 'aggregated' | 'serialized';

interface Category {
  id: string;
  nome: string;
  descrizione?: string;
}

interface ProductType {
  id: string;
  nome: string;
  categoryId: string;
}

interface Supplier {
  id: string;
  businessName: string;
}

const STOCK_STATUS_CONFIG = {
  in_stock: { label: 'Disponibile', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  low_stock: { label: 'Sotto Scorta', color: 'bg-amber-100 text-amber-800 border-amber-200', dotColor: 'bg-amber-500' },
  out_of_stock: { label: 'Esaurito', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
};


const LOGISTIC_STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  in_stock: { label: 'In Giacenza', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  reserved: { label: 'Prenotato', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
  preparing: { label: 'In Preparazione', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotColor: 'bg-indigo-500' },
  shipping: { label: 'DDT/In Spedizione', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', dotColor: 'bg-cyan-500' },
  delivered: { label: 'Consegnato', color: 'bg-teal-100 text-teal-800 border-teal-200', dotColor: 'bg-teal-500' },
  customer_return: { label: 'Reso Cliente', color: 'bg-orange-100 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  doa_return: { label: 'Reso DOA', color: 'bg-rose-100 text-rose-800 border-rose-200', dotColor: 'bg-rose-500' },
  in_service: { label: 'In Assistenza', color: 'bg-purple-100 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
  supplier_return: { label: 'Restituito Fornitore', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', dotColor: 'bg-fuchsia-500' },
  in_transfer: { label: 'In Trasferimento', color: 'bg-sky-100 text-sky-800 border-sky-200', dotColor: 'bg-sky-500' },
  lost: { label: 'Smarrito', color: 'bg-gray-100 text-gray-800 border-gray-200', dotColor: 'bg-gray-500' },
  damaged: { label: 'Danneggiato/Dismesso', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
  internal_use: { label: 'AD Uso Interno', color: 'bg-lime-100 text-lime-800 border-lime-200', dotColor: 'bg-lime-500' },
};

interface InventoryFilters {
  storeId: string;
  status: string;
  search: string;
  identifierType: 'sku' | 'imei' | 'iccid' | 'ean' | 'mac';
  identifierValue: string;
  supplierId: string;
  categoryId: string;
  typeId: string;
  brand: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: InventoryFilters = {
  storeId: '',
  status: 'all',
  search: '',
  identifierType: 'sku',
  identifierValue: '',
  supplierId: '',
  categoryId: '',
  typeId: '',
  brand: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 250,
  sortBy: 'name',
  sortOrder: 'asc'
};

function useInventoryView() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('aggregated');
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchInput, setSearchInput] = useState('');

  // Auto-search with debounce after 3 characters (independent from other filters)
  useEffect(() => {
    if (searchInput.length >= 3) {
      const debounceTimer = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else if (searchInput.length === 0 && filters.search.length > 0) {
      // Clear search when input is emptied
      setFilters(prev => ({ ...prev, search: '', page: 1 }));
    }
  }, [searchInput]);

  const hasPendingChanges = useMemo(() => {
    // Search is handled separately with auto-apply, exclude from pending changes
    return pendingFilters.storeId !== filters.storeId ||
      pendingFilters.status !== filters.status ||
      pendingFilters.identifierType !== filters.identifierType ||
      pendingFilters.identifierValue !== filters.identifierValue ||
      pendingFilters.supplierId !== filters.supplierId ||
      pendingFilters.categoryId !== filters.categoryId ||
      pendingFilters.typeId !== filters.typeId ||
      pendingFilters.brand !== filters.brand ||
      pendingFilters.dateFrom !== filters.dateFrom ||
      pendingFilters.dateTo !== filters.dateTo;
  }, [pendingFilters, filters]);

  const applyFilters = () => {
    setFilters({ ...pendingFilters, search: filters.search, page: 1 });
  };

  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setDateRange(undefined);
  };

  const { data: inventoryData, isLoading, isError, refetch } = useQuery<InventoryViewData>({
    queryKey: ['/api/wms/inventory-view', { ...filters, viewMode }]
  });

  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handleExport = async (format: 'csv' | 'excel' | 'json', productId?: string) => {
    const params = new URLSearchParams();
    params.append('format', format);
    // If productId is provided, export only serials for that product
    if (productId) {
      params.append('productId', productId);
      params.append('viewMode', 'serialized'); // Force serialized export for product
    }
    if (filters.storeId) params.append('storeId', filters.storeId);
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.search && !productId) params.append('search', filters.search);
    if (filters.identifierType) params.append('identifierType', filters.identifierType);
    if (filters.identifierValue) params.append('identifierValue', filters.identifierValue);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.typeId) params.append('typeId', filters.typeId);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    try {
      // Get tenant ID and auth headers for authenticated export (mirror getCurrentTenantId logic)
      const tenantId = localStorage.getItem('currentTenantId') || localStorage.getItem('tenantId') || '';
      
      // Validate tenant ID before making request
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
        console.error('[EXPORT-ERROR] Invalid tenant ID, cannot proceed with export');
        toast({ title: 'Errore Export', description: 'Contesto tenant non disponibile. Rieffettuare il login.', variant: 'destructive' });
        return;
      }
      
      const demoUserId = localStorage.getItem('demo_user_id') || 'admin-user';
      
      const response = await fetch(`/api/wms/inventory-view/export?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': demoUserId
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use product SKU in filename if exporting specific product
      a.download = productId 
        ? `seriali-prodotto-export.${format === 'excel' ? 'csv' : format}`
        : `inventario-export.${format === 'excel' ? 'csv' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Errore Export', description: 'Impossibile scaricare il file.', variant: 'destructive' });
    }
  };

  const hasActiveFilters = filters.storeId || filters.status !== 'all' || filters.search || 
    filters.identifierValue || filters.supplierId || filters.categoryId || 
    filters.typeId || filters.brand || filters.dateFrom || filters.dateTo;
  
  // Count active advanced filters for badge
  const advancedFiltersCount = [
    filters.identifierValue !== '',
    filters.supplierId !== '',
    filters.categoryId !== '',
    filters.typeId !== '',
    filters.brand !== '',
  ].filter(Boolean).length;

  return {
    viewMode,
    setViewMode,
    filters,
    setFilters,
    pendingFilters,
    setPendingFilters,
    dateRange,
    setDateRange,
    searchInput,
    setSearchInput,
    inventoryData,
    isLoading,
    isError,
    refetch,
    handleSort,
    handleExport,
    applyFilters,
    resetFilters,
    hasActiveFilters,
    hasPendingChanges,
    advancedFiltersCount
  };
}

interface InventoryContentProps {
  showHeader?: boolean;
}

export function InventoryContent({ showHeader = true }: InventoryContentProps) {
  const {
    viewMode,
    setViewMode,
    filters,
    setFilters,
    pendingFilters,
    setPendingFilters,
    dateRange,
    setDateRange,
    searchInput,
    setSearchInput,
    inventoryData,
    isLoading,
    refetch,
    handleSort,
    handleExport,
    applyFilters,
    resetFilters,
    hasActiveFilters,
    hasPendingChanges,
    advancedFiltersCount
  } = useInventoryView();

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedSerialItemId, setSelectedSerialItemId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showSerialsInline, setShowSerialsInline] = useState(false);

  // Query per categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  // Query per product-types
  const { data: productTypes = [] } = useQuery<ProductType[]>({
    queryKey: ['/api/wms/product-types'],
  });

  // Query per suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/wms/suppliers'],
  });

  // Query per brands (lista distinta dai prodotti)
  const { data: brandsData } = useQuery<{ brands: string[] }>({
    queryKey: ['/api/wms/products/brands'],
  });
  const brands = brandsData?.brands || [];

  // Filter product types by selected category
  const filteredProductTypes = useMemo(() => {
    if (!pendingFilters.categoryId) return [];
    return productTypes.filter(pt => pt.categoryId === pendingFilters.categoryId);
  }, [productTypes, pendingFilters.categoryId]);

  // Query per cross-store summary (vista aggregata modal) - DEVE essere prima di productSerials
  const { data: crossStoreSummaryResponse, isLoading: isLoadingCrossStore } = useQuery<{ success: boolean; data: CrossStoreSummary }>({
    queryKey: ['/api/wms/inventory-view', selectedItem?.productId, 'cross-store-summary'],
    queryFn: async () => {
      if (!selectedItem?.productId) return null;
      return await apiRequest(`/api/wms/inventory-view/${selectedItem.productId}/cross-store-summary`);
    },
    enabled: isDetailModalOpen && viewMode === 'aggregated' && !!selectedItem?.productId,
  });
  const crossStoreSummary = crossStoreSummaryResponse?.data;

  // Query per caricare i seriali - URL con productId nel path e storeId come query param
  // Abilitata sia per vista serializzata che per sezione inline nel modal aggregato
  const { data: productSerials, isLoading: isLoadingSerials } = useQuery<ProductSerials>({
    queryKey: ['/api/wms/product-serials', selectedItem?.productId, viewMode === 'aggregated' ? 'cross-store' : selectedItem?.storeId, showSerialsInline],
    queryFn: async () => {
      if (!selectedItem?.productId) return null;
      // Per la vista aggregata (inline), non filtrare per storeId per avere tutti i seriali cross-store
      const storeFilter = viewMode === 'aggregated' ? '' : (selectedItem.storeId ? `?storeId=${selectedItem.storeId}` : '');
      const url = `/api/wms/product-serials/${selectedItem.productId}${storeFilter}`;
      return await apiRequest(url);
    },
    enabled: isDetailModalOpen && !!selectedItem?.productId && 
      ((viewMode === 'serialized' && (selectedItem?.serialCount ?? 0) > 0) || 
       (viewMode === 'aggregated' && showSerialsInline && (crossStoreSummary?.kpis?.serialCount ?? 0) > 0)),
  });

  const handleViewDetails = (item: InventoryItem, itemId?: string) => {
    setSelectedItem(item);
    setSelectedSerialItemId(itemId || null);
    setIsDetailModalOpen(true);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return filters.sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-orange-500" /> 
      : <ArrowDown className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="flex-1">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Inventario Magazzino</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestione scorte e movimenti magazzino
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
              data-testid="btn-refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Aggiorna
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="btn-export">
                  <Download className="h-4 w-4" />
                  Esporta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="export-csv">
                  Esporta CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} data-testid="export-excel">
                  Esporta Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')} data-testid="export-json">
                  Esporta JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {!showHeader && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
              data-testid="btn-refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Aggiorna
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="btn-export">
                  <Download className="h-4 w-4" />
                  Esporta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="export-csv">
                  Esporta CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} data-testid="export-excel">
                  Esporta Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')} data-testid="export-json">
                  Esporta JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wide block">Prodotti Totali</span>
              <div className="text-2xl font-bold text-blue-900 mt-1" data-testid="kpi-total-products">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (inventoryData?.kpis.totalProducts || 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide block">Disponibili</span>
              <div className="text-2xl font-bold text-emerald-900 mt-1" data-testid="kpi-in-stock">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (inventoryData?.kpis.inStockCount || 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide block">Sotto Scorta</span>
              <div className="text-2xl font-bold text-amber-900 mt-1" data-testid="kpi-low-stock">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (inventoryData?.kpis.lowStockCount || 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide block">Esauriti</span>
              <div className="text-2xl font-bold text-red-900 mt-1" data-testid="kpi-out-of-stock">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (inventoryData?.kpis.outOfStockCount || 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-purple-600 uppercase tracking-wide block">Valore Totale</span>
              <div className="text-2xl font-bold text-purple-900 mt-1" data-testid="kpi-total-value">
                {isLoading ? <Skeleton className="h-8 w-20" /> : `€ ${(inventoryData?.kpis.totalValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
              </div>
            </div>
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="SKU, IMEI, EAN, marca, nome... (min 3 caratteri)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-white"
                data-testid="input-search"
              />
              {searchInput.length > 0 && searchInput.length < 3 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">
                  Digita almeno 3 caratteri
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-gray-300 bg-white p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'aggregated' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setViewMode('aggregated'); setFilters(prev => ({ ...prev, page: 1 })); }}
                    className={`h-8 px-3 ${viewMode === 'aggregated' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                    data-testid="btn-view-aggregated"
                  >
                    <Layers className="h-4 w-4 mr-1" />
                    Aggregata
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vista aggregata per prodotto e negozio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'serialized' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setViewMode('serialized'); setFilters(prev => ({ ...prev, page: 1, limit: 50 })); }}
                    className={`h-8 px-3 ${viewMode === 'serialized' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                    data-testid="btn-view-serialized"
                  >
                    <List className="h-4 w-4 mr-1" />
                    Serializzata
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vista per singolo seriale/IMEI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select
            value={String(filters.limit)}
            onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
          >
            <SelectTrigger className="w-[130px] bg-white" data-testid="select-limit">
              <SelectValue placeholder="Righe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 righe</SelectItem>
              <SelectItem value="100">100 righe</SelectItem>
              <SelectItem value="250">250 righe</SelectItem>
              <SelectItem value="500">500 righe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select
            value={pendingFilters.storeId || 'all'}
            onValueChange={(value) => setPendingFilters(prev => ({ ...prev, storeId: value === 'all' ? '' : value }))}
          >
            <SelectTrigger className="w-[200px] bg-white" data-testid="select-store">
              <Warehouse className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Tutti i magazzini" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i magazzini</SelectItem>
              {inventoryData?.warehouseStores?.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.nome} ({store.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pendingFilters.status}
            onValueChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-[180px] bg-white" data-testid="select-status">
              <SelectValue placeholder="Stato logistico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {Object.entries(LOGISTIC_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[220px] justify-start text-left font-normal bg-white"
                data-testid="button-date-range-picker"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy', { locale: it })} - {format(dateRange.to, 'dd/MM/yy', { locale: it })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy', { locale: it })
                  )
                ) : (
                  <span className="text-gray-500">Data carico</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setPendingFilters(prev => ({
                    ...prev,
                    dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
                    dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : ''
                  }));
                }}
                numberOfMonths={2}
                locale={it}
                data-testid="calendar-date-range"
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            data-testid="button-advanced-filters"
            style={{
              borderColor: isAdvancedOpen || advancedFiltersCount > 0 ? 'hsl(var(--brand-orange))' : undefined,
              color: isAdvancedOpen || advancedFiltersCount > 0 ? 'hsl(var(--brand-orange))' : undefined,
            }}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtri Avanzati
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            {advancedFiltersCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
                {advancedFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {isAdvancedOpen && (
          <div 
            style={{ 
              marginBottom: '16px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
            }}
            data-testid="panel-advanced-filters"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {/* Identifier filter (SKU/IMEI/ICCID/MAC/EAN) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Ricerca per codice</label>
                <div className="flex gap-1">
                  <Select 
                    value={pendingFilters.identifierType} 
                    onValueChange={(value) => setPendingFilters(prev => ({ ...prev, identifierType: value as 'sku' | 'imei' | 'iccid' | 'ean' | 'mac' }))}
                  >
                    <SelectTrigger className="w-[80px] h-9 text-xs" data-testid="select-identifier-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sku">SKU</SelectItem>
                      <SelectItem value="imei">IMEI</SelectItem>
                      <SelectItem value="iccid">ICCID</SelectItem>
                      <SelectItem value="mac">MAC</SelectItem>
                      <SelectItem value="ean">EAN</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={pendingFilters.identifierType.toUpperCase()}
                    value={pendingFilters.identifierValue}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, identifierValue: e.target.value }))}
                    data-testid="input-identifier-value"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Fornitore</label>
                <Select 
                  value={pendingFilters.supplierId || 'all'} 
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, supplierId: value === 'all' ? '' : value }))}
                >
                  <SelectTrigger className="h-9" data-testid="select-filter-supplier">
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i fornitori</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Marca</label>
                <Select 
                  value={pendingFilters.brand || 'all'} 
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, brand: value === 'all' ? '' : value }))}
                >
                  <SelectTrigger className="h-9" data-testid="select-filter-brand">
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le marche</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Categoria</label>
                <Select 
                  value={pendingFilters.categoryId || 'all'} 
                  onValueChange={(value) => {
                    setPendingFilters(prev => ({ 
                      ...prev, 
                      categoryId: value === 'all' ? '' : value,
                      typeId: '' // Reset typeId when category changes
                    }));
                  }}
                >
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

              {/* Tipologia (dependent on category) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Tipologia</label>
                <Select 
                  value={pendingFilters.typeId || 'all'} 
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, typeId: value === 'all' ? '' : value }))}
                  disabled={!pendingFilters.categoryId}
                >
                  <SelectTrigger className="h-9" data-testid="select-filter-tipologia" disabled={!pendingFilters.categoryId}>
                    <SelectValue placeholder={pendingFilters.categoryId ? "Tutte" : "Seleziona categoria"} />
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
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
          <Button
            onClick={applyFilters}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-apply-filters"
          >
            Applica Filtri
          </Button>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="border-orange-500 text-orange-500 hover:bg-orange-50"
            data-testid="button-reset-filters"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetta
          </Button>
          {hasPendingChanges && (
            <span className="text-sm text-orange-500 ml-2" data-testid="text-pending-filters">
              Filtri non applicati
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Filtri attivi:</span>
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                Ricerca: "{filters.search}"
              </Badge>
            )}
            {filters.identifierValue && (
              <Badge variant="secondary" className="text-xs">
                {filters.identifierType.toUpperCase()}: "{filters.identifierValue}"
              </Badge>
            )}
            {filters.storeId && (
              <Badge variant="secondary" className="text-xs">
                Magazzino: {inventoryData?.warehouseStores?.find(s => s.id === filters.storeId)?.nome}
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Stato: {LOGISTIC_STATUS_CONFIG[filters.status]?.label}
              </Badge>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <Badge variant="secondary" className="text-xs">
                Data: {filters.dateFrom && format(new Date(filters.dateFrom), 'dd/MM/yy', { locale: it })}
                {filters.dateFrom && filters.dateTo && ' - '}
                {filters.dateTo && format(new Date(filters.dateTo), 'dd/MM/yy', { locale: it })}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead 
                  className="cursor-pointer select-none font-semibold text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Prodotto
                    <SortIcon column="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none font-semibold text-gray-700"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-2">
                    SKU
                    <SortIcon column="sku" />
                  </div>
                </TableHead>
                {/* COLONNE SPECIFICHE PER VISTA */}
                {viewMode === 'aggregated' ? (
                  <>
                    {/* Vista Aggregata: Copertura Store invece di Magazzino singolo */}
                    <TableHead 
                      className="cursor-pointer select-none font-semibold text-gray-700 text-center"
                      onClick={() => handleSort('storeCoverage')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Warehouse className="h-4 w-4" />
                        Magazzini
                        <SortIcon column="storeCoverage" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Stato Stock</TableHead>
                    <TableHead className="font-semibold text-gray-700">Distribuzione Stati</TableHead>
                  </>
                ) : (
                  <>
                    {/* Vista Serializzata: Magazzino singolo + Stato Logistico */}
                    <TableHead className="font-semibold text-gray-700">Magazzino</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Stato Logistico</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Disponibilità</TableHead>
                    <TableHead className="font-semibold text-gray-700">Seriale</TableHead>
                    <TableHead className="font-semibold text-gray-700">Lotto</TableHead>
                  </>
                )}
                <TableHead 
                  className="cursor-pointer select-none font-semibold text-gray-700 text-center"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-center gap-2">
                    {viewMode === 'aggregated' ? 'Tot. Disp.' : 'Quantità'}
                    <SortIcon column="quantity" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">
                  {viewMode === 'aggregated' ? 'Tot. Riservati' : 'Riservati'}
                </TableHead>
                <TableHead className="font-semibold text-gray-700 text-center min-w-[100px]">Costo Medio</TableHead>
                <TableHead 
                  className="cursor-pointer select-none font-semibold text-gray-700 text-center min-w-[100px]"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-center gap-2">
                    {viewMode === 'aggregated' ? 'Valore Tot.' : 'Valore'}
                    <SortIcon column="value" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none font-semibold text-gray-700"
                  onClick={() => handleSort('lastMovement')}
                >
                  <div className="flex items-center gap-2">
                    Ultimo Mov.
                    <SortIcon column="lastMovement" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : inventoryData?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewMode === 'aggregated' ? 11 : 13} className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Nessun prodotto trovato</p>
                    <p className="text-sm">Prova a modificare i filtri o aggiungi prodotti al magazzino</p>
                  </TableCell>
                </TableRow>
              ) : viewMode === 'aggregated' ? (
                /* ==================== VISTA AGGREGATA ==================== */
                (inventoryData?.items as AggregatedInventoryItem[])?.map((item) => {
                  const statusConfig = STOCK_STATUS_CONFIG[item.stockStatus];
                  return (
                    <TableRow 
                      key={item.productId} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails({ productId: item.productId, productName: item.productName, productSku: item.productSku } as any)}
                      data-testid={`row-inventory-${item.productId}`}
                    >
                      {/* Prodotto */}
                      <TableCell className="font-medium text-gray-900">
                        <div>
                          <div className="flex items-center gap-1.5">{item.productName}</div>
                          {item.productBrand && (
                            <div className="text-xs text-gray-400">
                              {item.productBrand} {item.productModel && `• ${item.productModel}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {/* SKU */}
                      <TableCell className="text-gray-600 font-mono text-sm">{item.productSku}</TableCell>
                      {/* Copertura Magazzini */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                          <Warehouse className="h-3 w-3 mr-1" />
                          {item.storeCoverageCount} {item.storeCoverageCount === 1 ? 'magazzino' : 'magazzini'}
                        </Badge>
                      </TableCell>
                      {/* Stato Stock Aggregato */}
                      <TableCell className="text-center">
                        <Badge className={`${statusConfig.color} border`}>
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-1.5`}></span>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      {/* Distribuzione Stati Logistici */}
                      <TableCell>
                        {item.logisticStatusDistribution && item.logisticStatusDistribution.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.logisticStatusDistribution.slice(0, 3).map((dist) => {
                              const config = LOGISTIC_STATUS_CONFIG[dist.status] || LOGISTIC_STATUS_CONFIG.in_stock;
                              return (
                                <TooltipProvider key={dist.status}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block cursor-help">
                                        <Badge variant="outline" className={`${config.color} text-[10px] px-1.5 py-0.5`}>
                                          {dist.count}
                                        </Badge>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{config.label}: {dist.count} ({dist.percentage}%)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                            {item.logisticStatusDistribution.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-gray-500">
                                +{item.logisticStatusDistribution.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      {/* Totale Disponibile */}
                      <TableCell className="text-center font-semibold text-emerald-700">
                        {item.totalAvailable}
                      </TableCell>
                      {/* Totale Riservati */}
                      <TableCell className="text-center text-blue-600">
                        {item.totalReserved > 0 ? item.totalReserved : '-'}
                      </TableCell>
                      {/* Costo Medio Ponderato */}
                      <TableCell className="text-center text-gray-700 min-w-[100px]">
                        € {(item.weightedAverageCost ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      {/* Valore Totale */}
                      <TableCell className="text-center font-semibold text-gray-900 min-w-[100px]">
                        € {(item.totalValue ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      {/* Ultimo Movimento */}
                      <TableCell className="text-gray-500 text-sm">
                        {item.lastMovementAt 
                          ? new Date(item.lastMovementAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'
                        }
                      </TableCell>
                      {/* Azioni */}
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails({ productId: item.productId, productName: item.productName, productSku: item.productSku } as any);
                                }}
                                data-testid={`btn-view-${item.productId}`}
                              >
                                <Eye className="h-4 w-4 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visualizza dettagli cross-store</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                /* ==================== VISTA SERIALIZZATA ==================== */
                (inventoryData?.items as InventoryItem[])?.map((item) => {
                  const statusConfig = STOCK_STATUS_CONFIG[item.stockStatus];
                  const logStatus = LOGISTIC_STATUS_CONFIG[item.logisticStatus] || LOGISTIC_STATUS_CONFIG.in_stock;
                  return (
                    <TableRow 
                      key={item.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      data-testid={`row-inventory-${item.id}`}
                      onClick={() => handleViewDetails(item)}
                    >
                      {/* Prodotto */}
                      <TableCell className="font-medium text-gray-900">
                        <div>
                          <div className="flex items-center gap-1.5">{item.productName}</div>
                          {item.productBrand && (
                            <div className="text-xs text-gray-400">
                              {item.productBrand} {item.productModel && `• ${item.productModel}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {/* SKU */}
                      <TableCell className="text-gray-600 font-mono text-sm">{item.productSku}</TableCell>
                      {/* Magazzino */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{item.storeName}</span>
                          <span className="text-xs text-gray-400">({item.storeCode})</span>
                        </div>
                      </TableCell>
                      {/* Stato Logistico */}
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block cursor-help">
                                <Badge className={`${logStatus.color} border text-xs`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${logStatus.dotColor} mr-1`}></span>
                                  {logStatus.label}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="p-2">
                              <div className="text-xs space-y-1">
                                <p className="font-semibold mb-1">Distribuzione Stati:</p>
                                {Object.entries(item.logisticStatusCounts || {}).map(([status, count]) => (
                                  <div key={status} className="flex justify-between gap-3">
                                    <span>{LOGISTIC_STATUS_CONFIG[status]?.label || status}</span>
                                    <span className="font-mono">{count}</span>
                                  </div>
                                ))}
                                {Object.keys(item.logisticStatusCounts || {}).length === 0 && (
                                  <p className="text-gray-400">Nessun item serializzato</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {/* Disponibilità */}
                      <TableCell className="text-center">
                        <Badge className={`${statusConfig.color} border`}>
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-1.5`}></span>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      {/* Seriale */}
                      <TableCell>
                        {item.serials && item.serials.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {item.serials.slice(0, 2).map((serial, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 uppercase w-8">
                                  {serial.type === 'imei' ? 'IMEI' : 
                                   serial.type === 'iccid' ? 'ICCID' : 
                                   serial.type === 'mac_address' ? 'MAC' : 
                                   serial.type.toUpperCase()}
                                </span>
                                <span className="text-xs font-mono text-gray-700">{serial.value}</span>
                              </div>
                            ))}
                            {item.serialCount > 2 && (
                              <span className="text-[10px] text-gray-400">+{item.serialCount - 2} altri</span>
                            )}
                          </div>
                        ) : item.serialCount > 0 ? (
                          <Badge variant="outline" className="text-xs">{item.serialCount} seriali</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      {/* Lotto */}
                      <TableCell>
                        {item.batchCount > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block cursor-help">
                                  <Badge variant="outline" className="text-xs">
                                    {item.batchCount === 1 ? item.batches[0]?.batchNumber || '-' : `${item.batchCount} lotti`}
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="p-2">
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold mb-1">Lotti:</p>
                                  {item.batches.map((batch, idx) => (
                                    <div key={idx} className="flex justify-between gap-3">
                                      <span className="font-mono">{batch.batchNumber}</span>
                                      <span>({batch.quantity} pz)</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      {/* Quantità */}
                      <TableCell className="text-center font-semibold text-gray-900">
                        {item.quantityAvailable}
                      </TableCell>
                      {/* Riservati */}
                      <TableCell className="text-center text-gray-500">
                        {item.quantityReserved > 0 ? item.quantityReserved : '-'}
                      </TableCell>
                      {/* Costo Medio */}
                      <TableCell className="text-center text-gray-700 min-w-[100px]">
                        € {(item.averageCost ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      {/* Valore */}
                      <TableCell className="text-center font-semibold text-gray-900 min-w-[100px]">
                        € {(item.totalValue ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      {/* Ultimo Movimento */}
                      <TableCell className="text-gray-500 text-sm">
                        {item.lastMovementAt 
                          ? new Date(item.lastMovementAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'
                        }
                      </TableCell>
                      {/* Azioni */}
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => handleViewDetails(item)}
                                data-testid={`btn-view-${item.id}`}
                              >
                                <Eye className="h-4 w-4 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visualizza dettagli</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {inventoryData?.pagination && inventoryData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Mostrati {((filters.page - 1) * filters.limit) + 1} - {Math.min(filters.page * filters.limit, inventoryData.pagination.total)} di {inventoryData.pagination.total} prodotti
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page <= 1}
                data-testid="btn-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedente
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, inventoryData.pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (inventoryData.pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (filters.page <= 3) {
                    pageNum = i + 1;
                  } else if (filters.page >= inventoryData.pagination.totalPages - 2) {
                    pageNum = inventoryData.pagination.totalPages - 4 + i;
                  } else {
                    pageNum = filters.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={filters.page === pageNum ? 'default' : 'ghost'}
                      size="sm"
                      className={`w-8 h-8 ${filters.page === pageNum ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                      data-testid={`btn-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= inventoryData.pagination.totalPages}
                data-testid="btn-next-page"
              >
                Successiva
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={(open) => { 
        setIsDetailModalOpen(open); 
        if (!open) {
          setShowSerialsInline(false);
          setSelectedSerialItemId(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              {viewMode === 'aggregated' ? (crossStoreSummary?.product?.name || selectedItem?.productName) : selectedItem?.productName}
            </DialogTitle>
            <DialogDescription>
              {viewMode === 'aggregated' ? 'Vista Cross-Store - Riepilogo aggregato di tutti i magazzini' : 'Vista serializzata - Dettaglio seriali e storico'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* ==================== VISTA AGGREGATA CROSS-STORE ==================== */}
                {viewMode === 'aggregated' && (
                  <>
                    {isLoadingCrossStore ? (
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-48 w-full" />
                      </div>
                    ) : crossStoreSummary ? (
                      <>
                        {/* 1. HEADER ANAGRAFICA COMPLETA */}
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">SKU</label>
                              <p className="font-mono font-semibold text-gray-900">{crossStoreSummary.product.sku}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Marca</label>
                              <p className="font-medium text-gray-900">{crossStoreSummary.product.brand || '-'}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Modello</label>
                              <p className="font-medium text-gray-900">{crossStoreSummary.product.model || '-'}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">EAN</label>
                              <p className="font-mono text-sm text-gray-900">{crossStoreSummary.product.ean || '-'}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Categoria</label>
                              <p className="font-medium text-gray-900">{crossStoreSummary.product.categoryName || '-'}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Tipologia</label>
                              <p className="font-medium text-gray-900">{crossStoreSummary.product.typeName || '-'}</p>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Tipo Prodotto</label>
                              <Badge variant="outline" className="text-xs mt-1 w-fit">{crossStoreSummary.product.productType}</Badge>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Condizione</label>
                              <p className="font-medium text-gray-900 capitalize">
                                {crossStoreSummary.product.condition === 'new' ? 'Nuovo' : 
                                 crossStoreSummary.product.condition === 'used' ? 'Usato' : 
                                 crossStoreSummary.product.condition === 'refurbished' ? 'Ricondizionato' : 
                                 crossStoreSummary.product.condition === 'demo' ? 'Demo' : 
                                 crossStoreSummary.product.condition || '-'}
                              </p>
                            </div>
                            {crossStoreSummary.product.memory && (
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Memoria</label>
                                <p className="font-medium text-gray-900 mt-1">{crossStoreSummary.product.memory}</p>
                              </div>
                            )}
                            {crossStoreSummary.product.color && (
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Colore</label>
                                <p className="font-medium text-gray-900 mt-1">{crossStoreSummary.product.color}</p>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Serializzabile</label>
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 w-fit ${crossStoreSummary.product.isSerialized ? 'border-emerald-500 text-emerald-700' : 'border-gray-400 text-gray-600'}`}
                              >
                                {crossStoreSummary.product.isSerialized ? `Sì (${crossStoreSummary.product.serialType?.toUpperCase() || 'N/A'})` : 'No'}
                              </Badge>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Stato</label>
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 w-fit ${crossStoreSummary.product.isActive ? 'border-emerald-500 text-emerald-700' : 'border-red-500 text-red-700'}`}
                              >
                                {crossStoreSummary.product.isActive ? 'Attivo' : 'Disattivo'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* 2. KPI CARDS CROSS-STORE */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-2 text-emerald-600 mb-1">
                              <Box className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Disponibile</span>
                            </div>
                            <p className="text-xl font-bold text-emerald-700">{crossStoreSummary.kpis.totalAvailable}</p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                              <Tag className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Riservati</span>
                            </div>
                            <p className="text-xl font-bold text-blue-700">{crossStoreSummary.kpis.totalReserved}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 text-purple-600 mb-1">
                              <Layers className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Totale</span>
                            </div>
                            <p className="text-xl font-bold text-purple-700">{crossStoreSummary.kpis.totalQuantity}</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                              <DollarSign className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Costo Medio</span>
                            </div>
                            <p className="text-xl font-bold text-gray-700">€ {crossStoreSummary.kpis.weightedAverageCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 text-orange-600 mb-1">
                              <DollarSign className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Valore Totale</span>
                            </div>
                            <p className="text-xl font-bold text-orange-700">€ {crossStoreSummary.kpis.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                            <div className="flex items-center gap-2 text-cyan-600 mb-1">
                              <Warehouse className="h-4 w-4" />
                              <span className="text-xs uppercase tracking-wide">Magazzini</span>
                            </div>
                            <p className="text-xl font-bold text-cyan-700">{crossStoreSummary.kpis.storeCount}</p>
                          </div>
                        </div>

                        {/* 3. DISTRIBUZIONE PER STORE */}
                        {crossStoreSummary.storeDistribution.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Warehouse className="h-4 w-4 text-orange-500" />
                              Distribuzione per Magazzino ({crossStoreSummary.storeDistribution.length})
                            </h3>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead>Magazzino</TableHead>
                                    <TableHead className="text-center">Disponibile</TableHead>
                                    <TableHead className="text-center">Riservati</TableHead>
                                    <TableHead className="text-center">Totale</TableHead>
                                    <TableHead className="text-right">Costo Medio</TableHead>
                                    <TableHead className="text-right">Valore</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {crossStoreSummary.storeDistribution.map((store) => (
                                    <TableRow key={store.storeId}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Warehouse className="h-4 w-4 text-gray-400" />
                                          <span className="font-medium">{store.storeName}</span>
                                          <span className="text-xs text-gray-400">({store.storeCode})</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{store.available}</Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">{store.reserved}</Badge>
                                      </TableCell>
                                      <TableCell className="text-center font-semibold">{store.quantity}</TableCell>
                                      <TableCell className="text-right font-mono text-sm">€ {parseFloat(store.averageCost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</TableCell>
                                      <TableCell className="text-right font-mono text-sm font-semibold">€ {parseFloat(store.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* 4. DISTRIBUZIONE STATI LOGISTICI */}
                        {crossStoreSummary.logisticStatusDistribution.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <CircleDot className="h-4 w-4 text-orange-500" />
                              Distribuzione Stati Logistici
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {crossStoreSummary.logisticStatusDistribution.map((status) => (
                                <Badge 
                                  key={status.status} 
                                  variant="outline" 
                                  className={`${LOGISTIC_STATUS_CONFIG[status.status]?.color || ''} text-sm px-3 py-1`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${LOGISTIC_STATUS_CONFIG[status.status]?.dotColor || 'bg-gray-500'} mr-2`}></span>
                                  {status.label}: <span className="font-bold ml-1">{status.count}</span>
                                  <span className="text-gray-500 ml-1">({status.percentage}%)</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. DISTRIBUZIONE STATI STOCK */}
                        {crossStoreSummary.stockStatusDistribution.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Package className="h-4 w-4 text-orange-500" />
                              Distribuzione Stati Stock
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {crossStoreSummary.stockStatusDistribution.map((status) => (
                                <Badge 
                                  key={status.status} 
                                  variant="outline" 
                                  className={`${STOCK_STATUS_CONFIG[status.status as keyof typeof STOCK_STATUS_CONFIG]?.color || ''} text-sm px-3 py-1`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${STOCK_STATUS_CONFIG[status.status as keyof typeof STOCK_STATUS_CONFIG]?.dotColor || 'bg-gray-500'} mr-2`}></span>
                                  {status.label}: <span className="font-bold ml-1">{status.count} magazzini</span>
                                  <span className="text-gray-500 ml-1">({status.percentage}%)</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. ULTIMO MOVIMENTO */}
                        {crossStoreSummary.lastMovement && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">Ultimo Movimento:</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{crossStoreSummary.lastMovement.type}</Badge>
                              <span className="text-sm text-gray-600">
                                {crossStoreSummary.lastMovement.storeName && `@ ${crossStoreSummary.lastMovement.storeName}`}
                              </span>
                              <span className="text-sm text-gray-500">
                                {crossStoreSummary.lastMovement.date && format(new Date(crossStoreSummary.lastMovement.date), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* AZIONI DRILL-DOWN */}
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                          {crossStoreSummary.product.isSerialized && crossStoreSummary.kpis.serialCount > 0 && (
                            <Button 
                              variant={showSerialsInline ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowSerialsInline(!showSerialsInline)}
                              className={`gap-2 ${showSerialsInline ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                              data-testid="btn-view-serials"
                            >
                              <Barcode className="h-4 w-4" />
                              {showSerialsInline ? 'Nascondi Seriali' : `Vedi Seriali (${crossStoreSummary.kpis.serialCount})`}
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleExport('csv', selectedItem?.productId)}
                            className="gap-2"
                            data-testid="btn-export-product"
                          >
                            <Download className="h-4 w-4" />
                            Esporta Seriali
                          </Button>
                        </div>

                        {/* 7. SEZIONE SERIALI INLINE (espandibile) */}
                        {showSerialsInline && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                              <Barcode className="h-4 w-4 text-orange-500" />
                              Dettaglio Seriali Cross-Store ({crossStoreSummary.kpis.serialCount})
                            </h3>
                            {isLoadingSerials ? (
                              <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ) : productSerials?.serials && productSerials.serials.length > 0 ? (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead className="font-semibold text-gray-700">Seriali</TableHead>
                                      <TableHead className="font-semibold text-gray-700">Magazzino</TableHead>
                                      <TableHead className="font-semibold text-gray-700 text-center">Stato Logistico</TableHead>
                                      <TableHead className="font-semibold text-gray-700 text-center">Condizione</TableHead>
                                      <TableHead className="font-semibold text-gray-700 text-center w-12">Info</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(() => {
                                      // Group serials by itemId (physical product unit)
                                      const groupedByItem = productSerials.serials.reduce((acc, serial) => {
                                        const key = serial.itemId || serial.id;
                                        if (!acc[key]) {
                                          acc[key] = {
                                            itemId: key,
                                            serials: [],
                                            storeName: serial.storeName,
                                            logisticStatus: serial.logisticStatus,
                                            condition: serial.condition,
                                            supplierName: serial.supplierName,
                                            supplierSku: serial.supplierSku,
                                            purchaseCost: serial.purchaseCost,
                                            purchaseDate: serial.purchaseDate,
                                            batchNumber: serial.batchNumber,
                                            batchExpiryDate: serial.batchExpiryDate,
                                          };
                                        }
                                        acc[key].serials.push({
                                          id: serial.id,
                                          type: serial.serialType,
                                          number: serial.serialNumber,
                                        });
                                        return acc;
                                      }, {} as Record<string, any>);
                                      
                                      const items = Object.values(groupedByItem).slice(0, 50);
                                      
                                      return items.map((item: any) => {
                                        const logConfig = LOGISTIC_STATUS_CONFIG[item.logisticStatus] || LOGISTIC_STATUS_CONFIG.in_stock;
                                        const hasSupplierInfo = item.supplierName || item.supplierSku || item.purchaseCost;
                                        const hasBatchInfo = item.batchNumber;
                                        return (
                                          <TableRow 
                                            key={item.itemId} 
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => {
                                              setSelectedSerialItemId(item.itemId);
                                              setViewMode('serialized');
                                            }}
                                            title="Clicca per vedere i dettagli di questo item"
                                          >
                                            <TableCell>
                                              <div className="space-y-1">
                                                {item.serials.map((s: any, idx: number) => (
                                                  <div key={s.id} className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                      {s.type === 'imei' ? 'IMEI' : 
                                                       s.type === 'iccid' ? 'ICCID' : 
                                                       s.type === 'mac_address' ? 'MAC' : 
                                                       s.type?.toUpperCase() || '-'}
                                                    </Badge>
                                                    <span className="font-mono text-sm">{s.number}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-700">{item.storeName || '-'}</TableCell>
                                            <TableCell className="text-center">
                                              <Badge className={`text-xs ${logConfig.color}`}>
                                                {logConfig.label}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-sm capitalize">
                                              {item.condition === 'new' ? 'Nuovo' : 
                                               item.condition === 'used' ? 'Usato' : 
                                               item.condition === 'refurbished' ? 'Ricondizionato' : 
                                               item.condition === 'demo' ? 'Demo' : item.condition || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {(hasSupplierInfo || hasBatchInfo) ? (
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <button 
                                                      className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
                                                      data-testid={`button-supplier-info-${item.itemId}`}
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <Eye className="h-5 w-5" />
                                                    </button>
                                                  </PopoverTrigger>
                                                  <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
                                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 rounded-t-lg">
                                                      <h3 className="text-white font-semibold flex items-center gap-2">
                                                        <Truck className="h-5 w-5" />
                                                        Dettagli Approvvigionamento
                                                      </h3>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                      {/* Sezione Fornitore */}
                                                      {hasSupplierInfo && (
                                                        <div className="rounded-lg border border-blue-200 overflow-hidden">
                                                          <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                                                            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                                                              <Truck className="h-4 w-4" />
                                                              Fornitore
                                                            </h4>
                                                          </div>
                                                          <div className="p-3 bg-white">
                                                            <div className="grid grid-cols-2 gap-3">
                                                              <div className="col-span-2">
                                                                <label className="text-xs text-gray-500 uppercase">Nome Fornitore</label>
                                                                <p className="font-semibold text-gray-900">{item.supplierName || '-'}</p>
                                                              </div>
                                                              <div>
                                                                <label className="text-xs text-gray-500 uppercase">SKU Fornitore</label>
                                                                <p className="font-mono text-sm text-gray-900">{item.supplierSku || '-'}</p>
                                                              </div>
                                                              <div>
                                                                <label className="text-xs text-gray-500 uppercase">Costo Unitario</label>
                                                                <p className="font-bold text-lg text-emerald-600">
                                                                  {item.purchaseCost ? `€ ${parseFloat(item.purchaseCost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                                                                </p>
                                                              </div>
                                                              <div>
                                                                <label className="text-xs text-gray-500 uppercase">Data Acquisto</label>
                                                                <p className="text-gray-900">{item.purchaseDate ? format(new Date(item.purchaseDate), 'dd/MM/yyyy', { locale: it }) : '-'}</p>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Sezione Lotto */}
                                                      {hasBatchInfo && (
                                                        <div className="rounded-lg border border-purple-200 overflow-hidden">
                                                          <div className="bg-purple-50 px-3 py-2 border-b border-purple-200">
                                                            <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                                                              <Layers className="h-4 w-4" />
                                                              Lotto
                                                            </h4>
                                                          </div>
                                                          <div className="p-3 bg-white">
                                                            <div className="grid grid-cols-2 gap-3">
                                                              <div>
                                                                <label className="text-xs text-gray-500 uppercase">Numero Lotto</label>
                                                                <p className="font-mono font-semibold text-gray-900">{item.batchNumber || '-'}</p>
                                                              </div>
                                                              <div>
                                                                <label className="text-xs text-gray-500 uppercase">Scadenza</label>
                                                                <p className="text-gray-900">{item.batchExpiryDate ? format(new Date(item.batchExpiryDate), 'dd/MM/yyyy', { locale: it }) : '-'}</p>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Sezione DDT Carico (placeholder) */}
                                                      <div className="rounded-lg border border-green-200 overflow-hidden">
                                                        <div className="bg-green-50 px-3 py-2 border-b border-green-200">
                                                          <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                                            <FileText className="h-4 w-4" />
                                                            DDT Carico
                                                          </h4>
                                                        </div>
                                                        <div className="p-3 bg-white">
                                                          <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                              <label className="text-xs text-gray-500 uppercase">Numero DDT</label>
                                                              <p className="text-gray-400 italic">Da implementare</p>
                                                            </div>
                                                            <div>
                                                              <label className="text-xs text-gray-500 uppercase">Data DDT</label>
                                                              <p className="text-gray-400 italic">-</p>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </PopoverContent>
                                                </Popover>
                                              ) : (
                                                <span className="text-gray-300">-</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      });
                                    })()}
                                  </TableBody>
                                </Table>
                                {productSerials.serials.length > 50 && (
                                  <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 border-t">
                                    Mostrati i primi 50 seriali su {productSerials.serials.length} totali
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <Barcode className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Nessun seriale trovato per questo prodotto</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Nessun dato disponibile per questo prodotto</p>
                      </div>
                    )}
                  </>
                )}

                {/* ==================== VISTA SERIALIZZATA ==================== */}
                {viewMode === 'serialized' && (
                  <div className="space-y-6">
                    {isLoadingSerials ? (
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-48 w-full" />
                      </div>
                    ) : productSerials?.serials && productSerials.serials.length > 0 ? (
                      <>
                        {(() => {
                          // Filter serials by itemId if we clicked on a specific item row from cross-store table
                          const filteredSerials = selectedSerialItemId 
                            ? productSerials.serials.filter(s => s.itemId === selectedSerialItemId)
                            : productSerials.serials;
                          
                          const firstSerial = filteredSerials[0] || productSerials.serials[0];
                          const hasSupplierInfo = firstSerial?.supplierName || firstSerial?.supplierSku || firstSerial?.purchaseCost;
                          const hasBatchInfo = firstSerial?.batchNumber;
                          const logConfig = LOGISTIC_STATUS_CONFIG[firstSerial?.logisticStatus] || LOGISTIC_STATUS_CONFIG.in_stock;
                          
                          // Group serials by type (only filtered ones)
                          const groupedByType = filteredSerials.reduce((acc, serial) => {
                            const type = serial.serialType;
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(serial);
                            return acc;
                          }, {} as Record<string, typeof productSerials.serials>);
                          
                          return (
                            <>
                              {/* TAB 1: ANAGRAFICA PRODOTTO - Arancione (come vista aggregata) */}
                              <div className="rounded-lg border-2 border-orange-200 overflow-hidden">
                                <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                                  <h3 className="font-semibold text-orange-700 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Anagrafica Prodotto
                                  </h3>
                                </div>
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">SKU</label>
                                      <p className="font-mono font-semibold text-gray-900">{selectedItem?.productSku || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">EAN</label>
                                      <p className="font-mono text-sm text-gray-900">{selectedItem?.productEan || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Marca</label>
                                      <p className="font-medium text-gray-900">{selectedItem?.productBrand || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Modello</label>
                                      <p className="font-medium text-gray-900">{selectedItem?.productModel || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Prodotto</label>
                                      <p className="font-medium text-gray-900">{selectedItem?.productName || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Categoria</label>
                                      <p className="font-medium text-gray-900">{selectedItem?.productCategory || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Tipologia</label>
                                      <Badge variant="outline" className="text-xs w-fit mt-1">
                                        {selectedItem?.productType === 'PHYSICAL' ? 'Fisico' : 
                                         selectedItem?.productType === 'VIRTUAL' ? 'Virtuale' : 
                                         selectedItem?.productType === 'SERVICE' ? 'Servizio' : 
                                         selectedItem?.productType || '-'}
                                      </Badge>
                                    </div>
                                    {firstSerial?.memory && (
                                      <div className="flex flex-col">
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Memoria</label>
                                        <p className="font-medium text-gray-900">{firstSerial.memory}</p>
                                      </div>
                                    )}
                                    {firstSerial?.color && (
                                      <div className="flex flex-col">
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Colore</label>
                                        <p className="font-medium text-gray-900">{firstSerial.color}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* TAB 2: STATO & UBICAZIONE - Blu */}
                              <div className="rounded-lg border-2 border-blue-200 overflow-hidden">
                                <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                                  <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                                    <Warehouse className="h-4 w-4" />
                                    Stato & Ubicazione
                                  </h3>
                                </div>
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Stato Logistico</label>
                                      <Badge className={`text-xs w-fit mt-1 ${logConfig.color}`}>
                                        {logConfig.label}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Condizione</label>
                                      <p className="font-medium text-gray-900 capitalize">
                                        {firstSerial?.condition === 'new' ? 'Nuovo' : 
                                         firstSerial?.condition === 'used' ? 'Usato' : 
                                         firstSerial?.condition === 'refurbished' ? 'Ricondizionato' : 
                                         firstSerial?.condition === 'demo' ? 'Demo' : firstSerial?.condition || '-'}
                                      </p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Magazzino</label>
                                      <p className="font-medium text-gray-900">{firstSerial?.storeName || selectedItem?.storeName || '-'}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Stato Stock</label>
                                      <Badge 
                                        className={`text-xs w-fit mt-1 ${STOCK_STATUS_CONFIG[selectedItem?.stockStatus || 'in_stock']?.color || 'bg-gray-100 text-gray-700'}`}
                                      >
                                        {STOCK_STATUS_CONFIG[selectedItem?.stockStatus || 'in_stock']?.label || 'In Stock'}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Lista Seriali */}
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                                      Identificativi ({filteredSerials.length})
                                    </label>
                                    <div className="space-y-2">
                                      {Object.entries(groupedByType).map(([type, serials]) => (
                                        <div key={type} className="flex items-start gap-3">
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            {type === 'imei' ? 'IMEI' : type === 'iccid' ? 'ICCID' : type === 'mac_address' ? 'MAC' : type.toUpperCase()}
                                          </Badge>
                                          <div className="flex flex-wrap gap-2">
                                            {serials.map((serial) => (
                                              <span key={serial.id} className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                {serial.serialNumber}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* TAB 3: FORNITORE & LOTTO - Viola (sempre visibile per mostrare placeholder) */}
                              <div className="rounded-lg border-2 border-purple-200 overflow-hidden">
                                <div className="bg-purple-50 px-4 py-2 border-b border-purple-200">
                                  <h3 className="font-semibold text-purple-700 flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Info Fornitore & Lotto
                                  </h3>
                                </div>
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Fornitore */}
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Fornitore</label>
                                      <p className="font-medium text-gray-900">{firstSerial?.supplierName || <span className="text-gray-400 italic">-</span>}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">SKU Fornitore</label>
                                      <p className="font-mono text-sm text-gray-900">{firstSerial?.supplierSku || <span className="text-gray-400 italic">-</span>}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Costo Acquisto</label>
                                      <p className="font-semibold text-gray-900">
                                        {firstSerial?.purchaseCost ? `€ ${parseFloat(firstSerial.purchaseCost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : <span className="text-gray-400 italic">-</span>}
                                      </p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Aliquota IVA</label>
                                      <p className="text-sm text-gray-400 italic">Da implementare</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Data Acquisto</label>
                                      <p className="text-sm text-gray-900">
                                        {firstSerial?.purchaseDate ? format(new Date(firstSerial.purchaseDate), 'dd/MM/yyyy', { locale: it }) : <span className="text-gray-400 italic">-</span>}
                                      </p>
                                    </div>
                                    {/* Lotto */}
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Numero Lotto</label>
                                      <p className="font-mono font-medium text-gray-900">{firstSerial?.batchNumber || <span className="text-gray-400 italic">-</span>}</p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">Scadenza Lotto</label>
                                      <p className="text-sm text-gray-900">
                                        {firstSerial?.batchExpiryDate ? format(new Date(firstSerial.batchExpiryDate), 'dd/MM/yyyy', { locale: it }) : <span className="text-gray-400 italic">-</span>}
                                      </p>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 uppercase tracking-wide">DDT Carico</label>
                                      <p className="text-sm text-gray-400 italic">Da implementare</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* TAB 4: TIMELINE EVENTI - Verde */}
                              <div className="rounded-lg border-2 border-green-200 overflow-hidden">
                                <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                                  <h3 className="font-semibold text-green-700 flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    Timeline Eventi
                                  </h3>
                                </div>
                                <div className="bg-white overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead>Data</TableHead>
                                        <TableHead>Ora</TableHead>
                                        <TableHead>Tipo Evento</TableHead>
                                        <TableHead>Magazzino</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead className="text-center">Link</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {/* Aggregazione eventi raggruppati per entità fisica */}
                                      {(() => {
                                        // Raggruppa eventi "Carico in Magazzino" per minuto (tolleranza per millisecondi)
                                        const loadEventsByMinute = new Map<string, { date: Date; count: number; storeName: string }>();
                                        filteredSerials.forEach((serial) => {
                                          const date = new Date(serial.createdAt);
                                          const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
                                          if (!loadEventsByMinute.has(minuteKey)) {
                                            loadEventsByMinute.set(minuteKey, { date, count: 1, storeName: serial.storeName || '-' });
                                          } else {
                                            loadEventsByMinute.get(minuteKey)!.count++;
                                          }
                                        });
                                        
                                        // Raggruppa eventi status history per statusChangeGroupId o fallback su timestamp+status
                                        const statusEventsByGroup = new Map<string, {
                                          date: Date;
                                          eventType: string;
                                          storeName: string;
                                          document: { type: string; number: string; date: string; id?: string } | null;
                                          notes: string | null;
                                          serialCount: number;
                                        }>();
                                        
                                        filteredSerials.forEach((serial) => {
                                          if (serial.statusHistory && serial.statusHistory.length > 0) {
                                            serial.statusHistory.forEach((log) => {
                                              // Use groupId if available, otherwise fallback to minute+status combo
                                              const date = new Date(log.changedAt);
                                              const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
                                              const groupKey = log.statusChangeGroupId || `legacy-${minuteKey}-${log.previousStatus || 'null'}-${log.newStatus}`;
                                              
                                              if (!statusEventsByGroup.has(groupKey)) {
                                                const fromLabel = log.previousStatus ? (LOGISTIC_STATUS_CONFIG[log.previousStatus]?.label || log.previousStatus) : '';
                                                const toLabel = LOGISTIC_STATUS_CONFIG[log.newStatus]?.label || log.newStatus;
                                                const eventType = fromLabel ? `${fromLabel} → ${toLabel}` : `Cambio a ${toLabel}`;
                                                
                                                const doc = log.documents && log.documents.length > 0 ? {
                                                  type: log.documents[0].documentType,
                                                  number: log.documents[0].documentNumber,
                                                  date: log.documents[0].documentDate,
                                                  id: log.documents[0].documentId
                                                } : null;
                                                
                                                statusEventsByGroup.set(groupKey, {
                                                  date,
                                                  eventType,
                                                  storeName: serial.storeName || '-',
                                                  document: doc,
                                                  notes: log.notes || null,
                                                  serialCount: 1
                                                });
                                              } else {
                                                statusEventsByGroup.get(groupKey)!.serialCount++;
                                              }
                                            });
                                          }
                                        });
                                        
                                        // Crea array finale eventi aggregati
                                        const allEvents: Array<{
                                          id: string;
                                          date: Date;
                                          eventType: string;
                                          storeName: string;
                                          document: { type: string; number: string; date: string; id?: string } | null;
                                          notes: string | null;
                                        }> = [];
                                        
                                        // Aggiungi eventi carico (uno per minuto = entità fisica singola)
                                        loadEventsByMinute.forEach((event, key) => {
                                          allEvents.push({
                                            id: `load-${key}`,
                                            date: event.date,
                                            eventType: 'Carico in Magazzino',
                                            storeName: event.storeName,
                                            document: null,
                                            notes: null
                                          });
                                        });
                                        
                                        // Aggiungi eventi status change (uno per gruppo)
                                        statusEventsByGroup.forEach((event, key) => {
                                          allEvents.push({
                                            id: `status-${key}`,
                                            date: event.date,
                                            eventType: event.eventType,
                                            storeName: event.storeName,
                                            document: event.document,
                                            notes: event.notes
                                          });
                                        });
                                        
                                        allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
                                        
                                        if (allEvents.length === 0) {
                                          return (
                                            <TableRow>
                                              <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                                Nessun evento registrato
                                              </TableCell>
                                            </TableRow>
                                          );
                                        }
                                        
                                        return allEvents.map((event) => (
                                          <TableRow key={event.id}>
                                            <TableCell className="whitespace-nowrap">
                                              {format(event.date, 'dd/MM/yyyy', { locale: it })}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-mono text-sm">
                                              {format(event.date, 'HH:mm:ss', { locale: it })}
                                            </TableCell>
                                            <TableCell>
                                              <span className={event.eventType === 'Carico in Magazzino' ? 'text-emerald-700 font-medium' : ''}>
                                                {event.eventType}
                                              </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <span className="text-gray-700">{event.storeName}</span>
                                            </TableCell>
                                            <TableCell>
                                              {event.document ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                                                  <span className="font-semibold uppercase">{event.document.type}</span>
                                                  <span className="text-gray-400">|</span>
                                                  <span className="font-mono">{event.document.number}</span>
                                                </div>
                                              ) : (
                                                <span className="text-gray-400 italic">Da implementare</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-gray-600 text-sm max-w-[150px] truncate">
                                              {event.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {event.document?.id ? (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 w-8 p-0 hover:bg-blue-50"
                                                  title="Vai al documento"
                                                >
                                                  <ExternalLink className="h-4 w-4 text-blue-600" />
                                                </Button>
                                              ) : (
                                                <span className="text-gray-300">-</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ));
                                      })()}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <Barcode className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Nessun seriale trovato</p>
                        <p className="text-sm text-gray-400">Questo prodotto non ha seriali registrati</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ultimo Movimento */}
                {selectedItem.lastMovementAt && (
                  <div className="text-sm text-gray-500 pt-4 border-t">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Ultimo movimento: {format(new Date(selectedItem.lastMovementAt), 'dd MMMM yyyy, HH:mm', { locale: it })}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InventoryPageProps {
  useStandaloneLayout?: boolean;
  currentModule?: string;
  setCurrentModule?: (module: string) => void;
}

export default function InventoryPage({
  useStandaloneLayout = true,
  currentModule: externalCurrentModule,
  setCurrentModule: externalSetCurrentModule
}: InventoryPageProps = {}) {
  const [internalCurrentModule, setInternalCurrentModule] = useState('inventario');
  const currentModule = externalCurrentModule ?? internalCurrentModule;
  const setCurrentModule = externalSetCurrentModule ?? setInternalCurrentModule;

  const content = (
    <div className="flex-1 bg-white min-h-screen">
      <div className="max-w-[1800px] mx-auto p-6">
        <InventoryContent showHeader={true} />
      </div>
    </div>
  );

  return useStandaloneLayout ? (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      {content}
    </Layout>
  ) : content;
}
