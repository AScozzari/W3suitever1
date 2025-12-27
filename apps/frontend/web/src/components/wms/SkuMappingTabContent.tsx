import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { SupplierCombobox } from './SupplierCombobox';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Search, Plus, Edit, Trash2, Link2, CalendarIcon, Filter, 
  Package, Building2, CheckCircle2, XCircle, RefreshCw, X,
  ArrowRightLeft, ChevronDown, Smartphone, Monitor, Settings, AlertCircle
} from 'lucide-react';

interface SkuMapping {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku: string | null;
  supplierSkuNormalized: string | null;
  supplierBarcode: string | null;
  useInternalSku: boolean;
  isPrimary: boolean;
  standardPurchaseCost: string | null;
  leadTimeDays: number | null;
  minOrderQty: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  categoryId: string | null;
  categoryName?: string;
  typologyId: string | null;
  typologyName?: string;
  productType?: string;
  isSerializable: boolean;
  serialType: string | null;
  serialCount: number;
  validFrom: string | null;
  validTo: string | null;
  status: string;
}

interface Category {
  id: string;
  nome: string;
  productType: string;
  descrizione?: string;
  icona?: string;
  ordine?: number;
}

interface Typology {
  id: string;
  code: string;
  nome: string;
  categoryId: string;
}

interface SessionMapping {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  isSaved: boolean;
  dbId?: string;
}

export default function SkuMappingTabContent() {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typologyFilter, setTypologyFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [validFromDate, setValidFromDate] = useState<Date | undefined>();
  const [validToDate, setValidToDate] = useState<Date | undefined>();
  
  const [editModal, setEditModal] = useState<{ open: boolean; mapping: SkuMapping | null }>({ open: false, mapping: null });
  const [createModal, setCreateModal] = useState(false);
  const createModalRef = useRef<HTMLDivElement>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; mapping: SkuMapping | null }>({ open: false, mapping: null });
  
  // New modal state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSkuInput, setSupplierSkuInput] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  
  // Search state
  const [productSearchMode, setProductSearchMode] = useState<'sku' | 'filters'>('sku');
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [filterProductType, setFilterProductType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTypology, setFilterTypology] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [composerSupplierSku, setComposerSupplierSku] = useState('');
  
  // Session mappings
  const [sessionMappings, setSessionMappings] = useState<SessionMapping[]>([]);
  const [editingSessionMapping, setEditingSessionMapping] = useState<SessionMapping | null>(null);
  
  const [editMappingData, setEditMappingData] = useState({
    supplierSku: ''
  });

  const { data: mappingsResponse, isLoading: mappingsLoading, refetch: refetchMappings } = useQuery({
    queryKey: ['/api/wms/product-supplier-mappings'],
  });
  
  const { data: suppliersData = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/wms/suppliers'],
  });
  
  const { data: productsResponse } = useQuery({
    queryKey: ['/api/wms/products'],
  });
  
  const { data: categoriesResponse } = useQuery({
    queryKey: ['/api/wms/categories'],
  });
  
  const { data: typologiesResponse } = useQuery({
    queryKey: ['/api/wms/product-types'],
  });

  const mappings: SkuMapping[] = useMemo(() => {
    const data = (mappingsResponse as any)?.data;
    return Array.isArray(data) ? data : [];
  }, [mappingsResponse]);
  
  const products: Product[] = useMemo(() => {
    const data = (productsResponse as any)?.data || productsResponse;
    return Array.isArray(data) ? data : [];
  }, [productsResponse]);
  
  const categories: Category[] = useMemo(() => {
    const data = (categoriesResponse as any)?.data || categoriesResponse;
    const cats = Array.isArray(data) ? data : [];
    return cats.filter((c: Category) => c.productType !== 'CANVAS');
  }, [categoriesResponse]);
  
  const typologies: Typology[] = useMemo(() => {
    const data = (typologiesResponse as any)?.data || typologiesResponse;
    return Array.isArray(data) ? data : [];
  }, [typologiesResponse]);
  
  const suppliers: Supplier[] = useMemo(() => {
    return Array.isArray(suppliersData) ? suppliersData : [];
  }, [suppliersData]);

  const filteredTypologies = useMemo(() => {
    if (categoryFilter === 'all') return typologies;
    return typologies.filter(t => t.categoryId === categoryFilter);
  }, [typologies, categoryFilter]);
  
  // Filter categories by product type for modal
  const modalFilteredCategories = useMemo(() => {
    if (!filterProductType) return categories;
    return categories.filter(c => c.productType === filterProductType);
  }, [categories, filterProductType]);
  
  const modalFilteredTypologies = useMemo(() => {
    if (!filterCategory) return [];
    return typologies.filter(t => t.categoryId === filterCategory);
  }, [typologies, filterCategory]);
  
  // Filter suppliers by search term
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm.trim()) return suppliers;
    const search = supplierSearchTerm.toLowerCase();
    return suppliers.filter(s => 
      s.name?.toLowerCase().includes(search) || 
      s.code?.toLowerCase().includes(search)
    );
  }, [suppliers, supplierSearchTerm]);

  const getProductById = (id: string) => products.find(p => p.id === id);
  const getSupplierById = (id: string) => suppliers.find(s => s.id === id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const enrichedMappings = useMemo(() => {
    return mappings.map(mapping => ({
      ...mapping,
      product: getProductById(mapping.productId),
      supplier: getSupplierById(mapping.supplierId)
    }));
  }, [mappings, products, suppliers]);

  const filteredMappings = useMemo(() => {
    return enrichedMappings.filter(mapping => {
      const product = mapping.product;
      const supplier = mapping.supplier;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          product?.sku?.toLowerCase().includes(search) ||
          product?.name?.toLowerCase().includes(search) ||
          mapping.supplierSku?.toLowerCase().includes(search) ||
          supplier?.name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      if (supplierFilter !== 'all' && mapping.supplierId !== supplierFilter) return false;
      
      if (statusFilter === 'mapped' && !mapping.supplierSku) return false;
      if (statusFilter === 'unmapped' && mapping.supplierSku) return false;
      
      if (categoryFilter !== 'all' && product?.categoryId !== categoryFilter) return false;
      if (typologyFilter !== 'all' && product?.typologyId !== typologyFilter) return false;
      
      if (productTypeFilter !== 'all') {
        const cat = product?.categoryId ? getCategoryById(product.categoryId) : null;
        if (cat?.productType !== productTypeFilter) return false;
      }
      
      if (validFromDate && product?.validFrom) {
        const productValidFrom = new Date(product.validFrom);
        if (productValidFrom < validFromDate) return false;
      }
      if (validToDate && product?.validTo) {
        const productValidTo = new Date(product.validTo);
        if (productValidTo > validToDate) return false;
      }
      
      return true;
    });
  }, [enrichedMappings, searchTerm, supplierFilter, statusFilter, categoryFilter, typologyFilter, productTypeFilter, validFromDate, validToDate]);

  // Search products
  const handleSearch = () => {
    let results = products.filter(p => p.productType !== 'CANVAS');
    
    if (productSearchMode === 'sku') {
      if (!skuSearchTerm.trim()) {
        toast({ title: "Inserisci SKU", description: "Inserisci uno SKU o EAN per cercare", variant: "destructive" });
        return;
      }
      const search = skuSearchTerm.toLowerCase().trim();
      results = results.filter(p => 
        p.sku?.toLowerCase() === search ||
        p.ean?.toLowerCase() === search ||
        p.sku?.toLowerCase().includes(search) ||
        p.ean?.toLowerCase().includes(search)
      );
    } else {
      // Filter mode
      if (!filterProductType) {
        toast({ title: "Seleziona tipo prodotto", description: "Il tipo prodotto è obbligatorio per la ricerca con filtri", variant: "destructive" });
        return;
      }
      
      // Filter by product type (via category)
      if (filterProductType) {
        const categoryIds = categories.filter(c => c.productType === filterProductType).map(c => c.id);
        results = results.filter(p => p.categoryId && categoryIds.includes(p.categoryId));
      }
      
      if (filterCategory) {
        results = results.filter(p => p.categoryId === filterCategory);
      }
      
      if (filterTypology) {
        results = results.filter(p => p.typologyId === filterTypology);
      }
    }
    
    setSearchResults(results.slice(0, 50));
    setHasSearched(true);
  };

  const updateMappingMutation = useMutation({
    mutationFn: async (data: { id: string; supplierSku: string }) => {
      return apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify({
          productId: editModal.mapping?.productId,
          supplierId: editModal.mapping?.supplierId,
          supplierSku: data.supplierSku
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Mapping aggiornato", description: "Le modifiche sono state salvate" });
      setEditModal({ open: false, mapping: null });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare le modifiche", variant: "destructive" });
    }
  });

  const createMappingMutation = useMutation({
    mutationFn: async (data: { productId: string; supplierId: string; supplierSku: string }) => {
      return apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (response, variables) => {
      const product = getProductById(variables.productId);
      const supplier = getSupplierById(variables.supplierId);
      
      // Add to session mappings
      const newSessionMapping: SessionMapping = {
        id: crypto.randomUUID(),
        productId: variables.productId,
        productSku: product?.sku || '',
        productName: product?.name || '',
        supplierId: variables.supplierId,
        supplierName: supplier?.name || '',
        supplierSku: variables.supplierSku,
        isSaved: true,
        dbId: (response as any)?.data?.id
      };
      
      setSessionMappings(prev => [...prev, newSessionMapping]);
      
      toast({ title: "Mapping creato", description: `${product?.sku} → ${variables.supplierSku}` });
      
      // Reset for next mapping
      setSelectedProduct(null);
      setComposerSupplierSku('');
      setSearchResults([]);
      setHasSearched(false);
      setSkuSearchTerm('');
      
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare il mapping", variant: "destructive" });
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wms/product-supplier-mappings/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: "Mapping eliminato" });
      setDeleteModal({ open: false, mapping: null });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il mapping", variant: "destructive" });
    }
  });

  const handleOpenEdit = (mapping: SkuMapping) => {
    setEditMappingData({
      supplierSku: mapping.supplierSku || ''
    });
    setEditModal({ open: true, mapping });
  };
  
  const resetCreateModal = () => {
    setSelectedSupplierId('');
    setSupplierSkuInput('');
    setSupplierSearchTerm('');
    setProductSearchMode('sku');
    setSkuSearchTerm('');
    setFilterProductType('');
    setFilterCategory('');
    setFilterTypology('');
    setHasSearched(false);
    setSearchResults([]);
    setSelectedProduct(null);
    setComposerSupplierSku('');
    setSessionMappings([]);
    setEditingSessionMapping(null);
  };
  
  const handleCloseCreateModal = () => {
    setCreateModal(false);
    resetCreateModal();
  };
  
  const handleAddMapping = () => {
    if (!selectedProduct || !selectedSupplierId) return;
    
    const skuToUse = composerSupplierSku || supplierSkuInput;
    if (!skuToUse.trim()) {
      toast({ title: "SKU Fornitore obbligatorio", description: "Inserisci lo SKU del fornitore", variant: "destructive" });
      return;
    }
    
    // Check if we're editing an existing session mapping
    if (editingSessionMapping && editingSessionMapping.dbId) {
      // Use the supplier from the editing mapping to ensure consistency
      const editSupplierId = editingSessionMapping.supplierId;
      const supplier = getSupplierById(editSupplierId);
      
      // Update existing mapping via POST (API uses upsert)
      apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          supplierId: editSupplierId,
          supplierSku: skuToUse.trim()
        })
      }).then(() => {
        // Update session mapping in local state with complete data
        setSessionMappings(prev => prev.map(m => 
          m.id === editingSessionMapping.id 
            ? { 
                ...m, 
                productId: selectedProduct.id,
                productSku: selectedProduct.sku,
                productName: selectedProduct.name,
                supplierId: editSupplierId,
                supplierName: supplier?.name || m.supplierName,
                supplierSku: skuToUse.trim() 
              }
            : m
        ));
        
        toast({ title: "Mapping aggiornato", description: `${selectedProduct.sku} → ${skuToUse.trim()}` });
        
        // Reset editing state
        setEditingSessionMapping(null);
        setSelectedProduct(null);
        setComposerSupplierSku('');
        
        queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
      }).catch(() => {
        toast({ title: "Errore", description: "Impossibile aggiornare il mapping", variant: "destructive" });
      });
    } else {
      // Create new mapping
      createMappingMutation.mutate({
        productId: selectedProduct.id,
        supplierId: selectedSupplierId,
        supplierSku: skuToUse.trim()
      });
    }
  };
  
  const handleDeleteSessionMapping = (mapping: SessionMapping) => {
    if (mapping.dbId) {
      // Delete from DB
      deleteMappingMutation.mutate(mapping.dbId);
    }
    setSessionMappings(prev => prev.filter(m => m.id !== mapping.id));
  };
  
  const handleEditSessionMapping = (mapping: SessionMapping) => {
    setEditingSessionMapping(mapping);
    setSelectedSupplierId(mapping.supplierId);
    setSelectedProduct(getProductById(mapping.productId) || null);
    setComposerSupplierSku(mapping.supplierSku);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSupplierFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setTypologyFilter('all');
    setProductTypeFilter('all');
    setValidFromDate(undefined);
    setValidToDate(undefined);
  };

  const hasActiveFilters = searchTerm || supplierFilter !== 'all' || statusFilter !== 'all' || 
    categoryFilter !== 'all' || typologyFilter !== 'all' || productTypeFilter !== 'all' ||
    validFromDate || validToDate;

  const stats = useMemo(() => {
    const total = mappings.length;
    const mapped = mappings.filter(m => m.supplierSku).length;
    const unmapped = total - mapped;
    return { total, mapped, unmapped };
  }, [mappings]);

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case 'PHYSICAL': return <Smartphone className="h-4 w-4" />;
      case 'DIGITAL': return <Monitor className="h-4 w-4" />;
      case 'SERVICE': return <Settings className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Totale Mapping</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
              <Link2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Mappati</p>
                <p className="text-2xl font-bold text-green-700">{stats.mapped}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Non Mappati</p>
                <p className="text-2xl font-bold text-amber-700">{stats.unmapped}</p>
              </div>
              <XCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Fornitori</p>
                <p className="text-2xl font-bold text-purple-700">{suppliers.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              Filtri
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="btn-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Pulisci Filtri
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Ricerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="SKU, nome, codice fornitore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Fornitore</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue placeholder="Tutti i fornitori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i fornitori</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Stato Mapping</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="mapped">Mappati</SelectItem>
                  <SelectItem value="unmapped">Non Mappati</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto</Label>
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                <SelectTrigger data-testid="select-product-type">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="PHYSICAL">Fisico</SelectItem>
                  <SelectItem value="DIGITAL">Digitale</SelectItem>
                  <SelectItem value="SERVICE">Servizio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setTypologyFilter('all'); }}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tipologia</Label>
              <Select value={typologyFilter} onValueChange={setTypologyFilter} disabled={categoryFilter === 'all'}>
                <SelectTrigger data-testid="select-typology">
                  <SelectValue placeholder={categoryFilter === 'all' ? 'Seleziona categoria' : 'Tutte'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le tipologie</SelectItem>
                  {filteredTypologies.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valido Da</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-valid-from">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validFromDate ? format(validFromDate, 'dd/MM/yyyy', { locale: it }) : 'Qualsiasi data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validFromDate}
                    onSelect={setValidFromDate}
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valido Fino A</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-valid-to">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validToDate ? format(validToDate, 'dd/MM/yyyy', { locale: it }) : 'Qualsiasi data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validToDate}
                    onSelect={setValidToDate}
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-gray-500" />
              Mapping SKU ({filteredMappings.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchMappings()} data-testid="btn-refresh">
                <RefreshCw className="h-4 w-4 mr-1" />
                Aggiorna
              </Button>
              <Button onClick={() => setCreateModal(true)} data-testid="btn-new-mapping">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Mapping
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nessun mapping trovato</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters}>
                  Pulisci filtri
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Prodotto</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">SKU Interno</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Fornitore</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">SKU Fornitore</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Stato</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMappings.map(mapping => (
                    <tr key={mapping.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-sm">{mapping.product?.name || '-'}</p>
                        <p className="text-xs text-gray-500">{mapping.product?.ean || '-'}</p>
                      </td>
                      <td className="p-3">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {mapping.product?.sku || '-'}
                        </code>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{mapping.supplier?.name || '-'}</p>
                      </td>
                      <td className="p-3">
                        {mapping.supplierSku ? (
                          <code className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {mapping.supplierSku}
                          </code>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Non mappato</span>
                        )}
                      </td>
                      <td className="p-3">
                        {mapping.supplierSku ? (
                          <Badge className="bg-green-100 text-green-700">Mappato</Badge>
                        ) : (
                          <Badge variant="secondary">Non Mappato</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(mapping)}
                            data-testid={`btn-edit-${mapping.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteModal({ open: true, mapping })}
                            data-testid={`btn-delete-${mapping.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => !open && setEditModal({ open: false, mapping: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Modifica Mapping
            </DialogTitle>
            <DialogDescription>
              Modifica l'associazione SKU interno ↔ SKU fornitore
            </DialogDescription>
          </DialogHeader>
          
          {editModal.mapping && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Prodotto</p>
                <p className="font-medium">{getProductById(editModal.mapping.productId)?.name}</p>
                <code className="text-xs bg-gray-200 px-1 rounded">
                  {getProductById(editModal.mapping.productId)?.sku}
                </code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Fornitore</p>
                <p className="font-medium">{getSupplierById(editModal.mapping.supplierId)?.name}</p>
              </div>
              
              <div>
                <Label>SKU Fornitore</Label>
                <Input
                  value={editMappingData.supplierSku}
                  onChange={(e) => setEditMappingData({ ...editMappingData, supplierSku: e.target.value })}
                  placeholder="Inserisci codice fornitore..."
                  data-testid="input-edit-supplier-sku"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, mapping: null })}>
              Annulla
            </Button>
            <Button 
              onClick={() => updateMappingMutation.mutate({ 
                id: editModal.mapping!.id, 
                ...editMappingData 
              })}
              disabled={updateMappingMutation.isPending}
              data-testid="btn-save-edit"
            >
              {updateMappingMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal - Refactored */}
      <Dialog open={createModal} onOpenChange={(open) => !open && handleCloseCreateModal()}>
        <DialogContent 
          ref={createModalRef}
          className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-500" />
                Nuovo Mapping SKU
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseCreateModal}
                className="h-8 w-8 p-0"
                data-testid="btn-close-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Crea associazioni tra SKU interno e SKU fornitore
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* SEZIONE 1: Fornitore */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="font-semibold">Seleziona Fornitore</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fornitore <span className="text-red-500">*</span></Label>
                  <SupplierCombobox
                    suppliers={suppliers.map(s => ({ id: s.id, name: s.name, code: s.code }))}
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                    placeholder="Seleziona fornitore..."
                    searchPlaceholder="Cerca fornitore..."
                    portalContainer={createModalRef.current}
                    data-testid="select-supplier-modal"
                  />
                </div>
                
                <div>
                  <Label>SKU Fornitore</Label>
                  <Input
                    value={supplierSkuInput}
                    onChange={(e) => setSupplierSkuInput(e.target.value)}
                    placeholder="Codice articolo fornitore..."
                    data-testid="input-supplier-sku-modal"
                  />
                  <p className="text-xs text-gray-500 mt-1">Il codice che il fornitore usa per questo prodotto</p>
                </div>
              </div>
            </div>
            
            {/* SEZIONE 2: Ricerca Prodotto */}
            <div className={`space-y-4 p-4 border rounded-lg ${!selectedSupplierId ? 'opacity-50 pointer-events-none bg-gray-100' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full ${selectedSupplierId ? 'bg-orange-500' : 'bg-gray-400'} text-white flex items-center justify-center text-sm font-bold`}>2</div>
                <h3 className="font-semibold">Cerca Prodotto</h3>
                {!selectedSupplierId && <span className="text-xs text-gray-500">(seleziona prima un fornitore)</span>}
              </div>
              
              <div className="flex gap-2 mb-3">
                <Button
                  variant={productSearchMode === 'sku' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProductSearchMode('sku')}
                  data-testid="btn-search-mode-sku"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Cerca per SKU/EAN
                </Button>
                <Button
                  variant={productSearchMode === 'filters' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProductSearchMode('filters')}
                  data-testid="btn-search-mode-filters"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Usa Filtri
                </Button>
              </div>
              
              {productSearchMode === 'sku' ? (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={skuSearchTerm}
                      onChange={(e) => setSkuSearchTerm(e.target.value)}
                      placeholder="Inserisci SKU interno o EAN..."
                      className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      data-testid="input-sku-search"
                    />
                  </div>
                  <Button onClick={handleSearch} data-testid="btn-search">
                    Cerca
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto <span className="text-red-500">*</span></Label>
                      <Select 
                        value={filterProductType} 
                        onValueChange={(v) => { 
                          setFilterProductType(v); 
                          setFilterCategory(''); 
                          setFilterTypology(''); 
                        }}
                      >
                        <SelectTrigger data-testid="select-filter-product-type">
                          <SelectValue placeholder="Seleziona tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PHYSICAL">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              Fisico
                            </div>
                          </SelectItem>
                          <SelectItem value="DIGITAL">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              Digitale
                            </div>
                          </SelectItem>
                          <SelectItem value="SERVICE">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Servizio
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
                      <Select 
                        value={filterCategory} 
                        onValueChange={(v) => { setFilterCategory(v); setFilterTypology(''); }}
                        disabled={!filterProductType}
                      >
                        <SelectTrigger data-testid="select-filter-category">
                          <SelectValue placeholder={filterProductType ? "Tutte" : "Seleziona tipo"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tutte le categorie</SelectItem>
                          {modalFilteredCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Tipologia</Label>
                      <Select 
                        value={filterTypology} 
                        onValueChange={setFilterTypology}
                        disabled={!filterCategory}
                      >
                        <SelectTrigger data-testid="select-filter-typology">
                          <SelectValue placeholder={filterCategory ? "Tutte" : "Seleziona cat."} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tutte le tipologie</SelectItem>
                          {modalFilteredTypologies.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button onClick={handleSearch} className="w-full" data-testid="btn-search-filters">
                    <Search className="h-4 w-4 mr-2" />
                    Cerca Prodotti
                  </Button>
                </div>
              )}
            </div>
            
            {/* SEZIONE 3: Risultati */}
            <div className={`space-y-3 p-4 border rounded-lg ${!selectedSupplierId ? 'opacity-50 pointer-events-none bg-gray-100' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${selectedSupplierId ? 'bg-orange-500' : 'bg-gray-400'} text-white flex items-center justify-center text-sm font-bold`}>3</div>
                  <h3 className="font-semibold">Risultati</h3>
                </div>
                {hasSearched && <span className="text-sm text-gray-500">{searchResults.length} prodotti trovati</span>}
              </div>
              
              {!hasSearched ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Cerca un prodotto per SKU/EAN oppure usa i filtri</p>
                  <p className="text-xs mt-1">I risultati appariranno qui</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-400" />
                  <p>Nessun prodotto trovato</p>
                  <p className="text-xs mt-1">Prova con altri criteri di ricerca</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {searchResults.map(p => {
                      const cat = p.categoryId ? getCategoryById(p.categoryId) : null;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setComposerSupplierSku(supplierSkuInput);
                          }}
                          className={`p-3 rounded-md cursor-pointer border transition-colors ${
                            selectedProduct?.id === p.id 
                              ? 'bg-orange-50 border-orange-300' 
                              : 'hover:bg-gray-50 border-transparent'
                          }`}
                          data-testid={`product-result-${p.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-gray-100 px-1 rounded">{p.sku}</code>
                                {p.ean && <span className="text-xs text-gray-500">EAN: {p.ean}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cat && (
                                <Badge variant="outline" className="text-xs">
                                  {getProductTypeIcon(cat.productType)}
                                  <span className="ml-1">{cat.productType === 'PHYSICAL' ? 'Fisico' : cat.productType === 'DIGITAL' ? 'Digitale' : 'Servizio'}</span>
                                </Badge>
                              )}
                              {p.isSerializable && (
                                <Badge variant="secondary" className="text-xs">
                                  {(p.serialCount || 1) > 1 ? 'Dual-Serial' : 'Serial'}
                                </Badge>
                              )}
                              {selectedProduct?.id === p.id && (
                                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
            
            {/* SEZIONE 4: Composer Mapping */}
            {selectedProduct && (
              <div className="space-y-3 p-4 border-2 border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                  <h3 className="font-semibold text-green-800">Crea Mapping</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Prodotto Selezionato</p>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <code className="text-xs bg-gray-100 px-1 rounded">{selectedProduct.sku}</code>
                  </div>
                  
                  <div>
                    <Label>SKU Fornitore <span className="text-red-500">*</span></Label>
                    <Input
                      value={composerSupplierSku}
                      onChange={(e) => setComposerSupplierSku(e.target.value)}
                      placeholder="Codice fornitore..."
                      data-testid="input-composer-supplier-sku"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => { setSelectedProduct(null); setEditingSessionMapping(null); }}
                    data-testid="btn-cancel-selection"
                  >
                    Annulla Selezione
                  </Button>
                  <Button 
                    onClick={handleAddMapping}
                    disabled={!composerSupplierSku.trim() || createMappingMutation.isPending}
                    className={editingSessionMapping ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
                    data-testid="btn-add-mapping"
                  >
                    {createMappingMutation.isPending ? 'Salvataggio...' : (
                      editingSessionMapping ? (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          Aggiorna Mapping
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Aggiungi Mapping
                        </>
                      )
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {/* SEZIONE 5: Tabella Sessione */}
            {sessionMappings.length > 0 && (
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-blue-800">Mapping Sessione Corrente</h3>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{sessionMappings.length} mapping creati</Badge>
                </div>
                
                <div className="overflow-x-auto bg-white rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 text-xs font-medium text-gray-500">SKU Interno</th>
                        <th className="text-left p-2 text-xs font-medium text-gray-500">Prodotto</th>
                        <th className="text-left p-2 text-xs font-medium text-gray-500">SKU Fornitore</th>
                        <th className="text-right p-2 text-xs font-medium text-gray-500">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sessionMappings.map(mapping => (
                        <tr key={mapping.id} className="hover:bg-gray-50">
                          <td className="p-2">
                            <code className="text-xs bg-gray-100 px-1 rounded">{mapping.productSku}</code>
                          </td>
                          <td className="p-2">{mapping.productName}</td>
                          <td className="p-2">
                            <code className="text-xs bg-blue-50 text-blue-700 px-1 rounded">{mapping.supplierSku}</code>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSessionMapping(mapping)}
                                data-testid={`btn-edit-session-${mapping.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteSessionMapping(mapping)}
                                data-testid={`btn-delete-session-${mapping.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, mapping: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo mapping?
            </DialogDescription>
          </DialogHeader>
          
          {deleteModal.mapping && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 my-4">
              <p className="font-medium">{getProductById(deleteModal.mapping.productId)?.name}</p>
              <p className="text-sm text-gray-600">
                {getProductById(deleteModal.mapping.productId)?.sku} → {deleteModal.mapping.supplierSku || 'Non mappato'}
              </p>
              <p className="text-sm text-gray-500">
                Fornitore: {getSupplierById(deleteModal.mapping.supplierId)?.name}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, mapping: null })}>
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteModal.mapping && deleteMappingMutation.mutate(deleteModal.mapping.id)}
              disabled={deleteMappingMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMappingMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
