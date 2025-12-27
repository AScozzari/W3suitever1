import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SupplierCombobox } from './SupplierCombobox';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Search, Plus, Edit, Trash2, Link2, CalendarIcon, Filter, 
  Package, Building2, CheckCircle2, XCircle, RefreshCw, X,
  ArrowRightLeft, ChevronDown, Smartphone, Monitor, Settings, AlertCircle,
  Lock, Unlock, Save, Check, Square, CheckSquare
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

interface SelectedProductForMapping {
  product: Product;
  supplierSku: string;
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
  const [createModalContainer, setCreateModalContainer] = useState<HTMLDivElement | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; mapping: SkuMapping | null }>({ open: false, mapping: null });
  
  // New modal state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSkuInput, setSupplierSkuInput] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  
  // Search state - unified search + advanced filters
  const [unifiedSearchTerm, setUnifiedSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterProductType, setFilterProductType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTypology, setFilterTypology] = useState<string>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  // Selection state - Multi-product selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [composerSupplierSku, setComposerSupplierSku] = useState('');
  const [selectedProductsForMapping, setSelectedProductsForMapping] = useState<SelectedProductForMapping[]>([]);
  const [isSupplierLocked, setIsSupplierLocked] = useState(false);
  
  // Session mappings
  const [sessionMappings, setSessionMappings] = useState<SessionMapping[]>([]);
  const [editingSessionMapping, setEditingSessionMapping] = useState<SessionMapping | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [activeTab, setActiveTab] = useState<'staging' | 'existing'>('staging');
  
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
    if (!filterCategory || filterCategory === 'all') return [];
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

  // Unified search - searches SKU, EAN, and description
  const performUnifiedSearch = (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    let results = products.filter(p => p.productType !== 'CANVAS');
    const search = searchTerm.toLowerCase().trim();
    
    results = results.filter(p => 
      p.sku?.toLowerCase().includes(search) ||
      p.ean?.toLowerCase().includes(search) ||
      p.name?.toLowerCase().includes(search)
    );
    
    setSearchResults(results.slice(0, 50));
    setHasSearched(true);
  };
  
  // Auto-search when unified search term changes (3+ chars)
  useEffect(() => {
    if (!showAdvancedFilters && unifiedSearchTerm.length >= 3) {
      const timer = setTimeout(() => {
        performUnifiedSearch(unifiedSearchTerm);
      }, 300); // debounce 300ms
      return () => clearTimeout(timer);
    } else if (unifiedSearchTerm.length < 3 && unifiedSearchTerm.length > 0) {
      // Only clear results when user is actively typing but has < 3 chars
      // Don't clear when unifiedSearchTerm is empty (preserves filter results)
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [unifiedSearchTerm, showAdvancedFilters, products]);
  
  // Apply advanced filters
  const handleApplyFilters = () => {
    if (!filterProductType) {
      toast({ title: "Seleziona tipo prodotto", description: "Il tipo prodotto è obbligatorio per la ricerca con filtri", variant: "destructive" });
      return;
    }
    
    let results = products.filter(p => p.productType !== 'CANVAS');
    
    // Filter by product type (via category)
    const categoryIds = categories.filter(c => c.productType === filterProductType).map(c => c.id);
    results = results.filter(p => p.categoryId && categoryIds.includes(p.categoryId));
    
    if (filterCategory && filterCategory !== 'all') {
      results = results.filter(p => p.categoryId === filterCategory);
    }
    
    if (filterTypology && filterTypology !== 'all') {
      results = results.filter(p => p.typologyId === filterTypology);
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
      setUnifiedSearchTerm('');
      
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
    setUnifiedSearchTerm('');
    setShowAdvancedFilters(false);
    setFilterProductType('');
    setFilterCategory('all');
    setFilterTypology('all');
    setHasSearched(false);
    setSearchResults([]);
    setSelectedProduct(null);
    setComposerSupplierSku('');
    setSessionMappings([]);
    setEditingSessionMapping(null);
    setSelectedProductsForMapping([]);
    setIsSupplierLocked(false);
    setActiveTab('staging');
  };
  
  // Toggle product selection for multi-mapping
  const toggleProductSelection = (product: Product) => {
    setSelectedProductsForMapping(prev => {
      const exists = prev.find(p => p.product.id === product.id);
      if (exists) {
        const newList = prev.filter(p => p.product.id !== product.id);
        // Unlock supplier if no products selected
        if (newList.length === 0) {
          setIsSupplierLocked(false);
        }
        return newList;
      } else {
        // Lock supplier when first product is added
        if (prev.length === 0) {
          setIsSupplierLocked(true);
        }
        return [...prev, { product, supplierSku: '' }];
      }
    });
  };
  
  // Update SKU for a selected product
  const updateSelectedProductSku = (productId: string, sku: string) => {
    setSelectedProductsForMapping(prev => 
      prev.map(p => p.product.id === productId ? { ...p, supplierSku: sku } : p)
    );
  };
  
  // Remove product from selection
  const removeSelectedProduct = (productId: string) => {
    setSelectedProductsForMapping(prev => {
      const newList = prev.filter(p => p.product.id !== productId);
      if (newList.length === 0) {
        setIsSupplierLocked(false);
      }
      return newList;
    });
  };
  
  // Count products with missing SKU
  const productsWithMissingSku = useMemo(() => {
    return selectedProductsForMapping.filter(p => !p.supplierSku.trim()).length;
  }, [selectedProductsForMapping]);
  
  // Check if all selected products have SKU
  const canSaveMapping = useMemo(() => {
    return selectedProductsForMapping.length > 0 && 
           selectedProductsForMapping.every(p => p.supplierSku.trim()) &&
           selectedSupplierId;
  }, [selectedProductsForMapping, selectedSupplierId]);
  
  // Batch save all mappings
  const handleBatchSave = async () => {
    if (!canSaveMapping) return;
    
    setIsSavingBatch(true);
    const supplier = getSupplierById(selectedSupplierId);
    
    try {
      const results = await Promise.all(
        selectedProductsForMapping.map(({ product, supplierSku }) =>
          apiRequest('/api/wms/product-supplier-mappings', {
            method: 'POST',
            body: JSON.stringify({
              productId: product.id,
              supplierId: selectedSupplierId,
              supplierSku: supplierSku.trim()
            })
          }).then(response => ({
            success: true,
            product,
            supplierSku,
            dbId: (response as any)?.data?.id
          })).catch(() => ({
            success: false,
            product,
            supplierSku,
            dbId: undefined
          }))
        )
      );
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Add successful mappings to session
      const newSessionMappings: SessionMapping[] = successful.map(r => ({
        id: crypto.randomUUID(),
        productId: r.product.id,
        productSku: r.product.sku,
        productName: r.product.name,
        supplierId: selectedSupplierId,
        supplierName: supplier?.name || '',
        supplierSku: r.supplierSku,
        isSaved: true,
        dbId: r.dbId
      }));
      
      setSessionMappings(prev => [...prev, ...newSessionMappings]);
      
      if (successful.length > 0) {
        toast({ 
          title: `${successful.length} mapping salvati`, 
          description: failed.length > 0 ? `${failed.length} errori` : 'Tutti i mapping sono stati salvati'
        });
      }
      
      if (failed.length > 0) {
        toast({ 
          title: "Alcuni mapping non salvati", 
          description: `${failed.length} prodotti non sono stati mappati`,
          variant: "destructive"
        });
      }
      
      // Clear selection and refresh
      setSelectedProductsForMapping([]);
      setSearchResults([]);
      setHasSearched(false);
      setUnifiedSearchTerm('');
      // Unlock supplier after save so user can change it
      setIsSupplierLocked(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile salvare i mapping", variant: "destructive" });
    } finally {
      setIsSavingBatch(false);
    }
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

      {/* Create Modal - Two Column Layout */}
      <Dialog open={createModal} onOpenChange={(open) => !open && handleCloseCreateModal()}>
        <DialogContent 
          ref={setCreateModalContainer}
          className="max-w-6xl max-h-[95vh] flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header with Supplier Selection */}
          <DialogHeader className="flex-shrink-0 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-500" />
                  Nuovo Mapping SKU
                </DialogTitle>
                <DialogDescription>
                  Seleziona un fornitore e cerca i prodotti da mappare
                </DialogDescription>
              </div>
              
              {/* Supplier Selection - Sticky Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isSupplierLocked ? (
                    <Lock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Building2 className="h-4 w-4 text-gray-500" />
                  )}
                  <Label className="text-sm font-medium">Fornitore:</Label>
                </div>
                <div className="w-72">
                  <SupplierCombobox
                    suppliers={suppliers.map(s => ({ id: s.id, name: s.name, code: s.code }))}
                    value={selectedSupplierId}
                    onValueChange={(val) => {
                      if (isSupplierLocked && selectedProductsForMapping.length > 0) {
                        toast({ 
                          title: "Fornitore bloccato", 
                          description: "Rimuovi tutti i prodotti selezionati per cambiare fornitore",
                          variant: "destructive"
                        });
                        return;
                      }
                      setSelectedSupplierId(val);
                    }}
                    placeholder="Seleziona fornitore..."
                    searchPlaceholder="Cerca fornitore..."
                    portalContainer={createModalContainer}
                    data-testid="select-supplier-modal"
                  />
                </div>
                {isSupplierLocked && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Bloccato
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {!selectedSupplierId ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">Seleziona un fornitore</p>
                <p className="text-sm text-gray-500">Per iniziare a creare i mapping, seleziona prima un fornitore</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex gap-4">
              {/* LEFT COLUMN - Search & Results */}
              <div className="flex-1 flex flex-col overflow-hidden border rounded-lg">
                {/* Search Header */}
                <div className="p-4 border-b bg-gray-50 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={unifiedSearchTerm}
                      onChange={(e) => {
                        setUnifiedSearchTerm(e.target.value);
                        if (showAdvancedFilters) {
                          setShowAdvancedFilters(false);
                        }
                      }}
                      placeholder="Cerca per SKU, EAN o nome prodotto... (min 3 caratteri)"
                      className="pl-9"
                      data-testid="input-unified-search"
                    />
                    {unifiedSearchTerm.length > 0 && unifiedSearchTerm.length < 3 && !showAdvancedFilters && (
                      <p className="text-xs text-amber-600 mt-1">Inserisci almeno 3 caratteri per cercare</p>
                    )}
                  </div>
                  
                  {/* Toggle Filtri Avanzati */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAdvancedFilters(!showAdvancedFilters);
                      if (!showAdvancedFilters) {
                        setUnifiedSearchTerm('');
                        setSearchResults([]);
                        setHasSearched(false);
                      }
                    }}
                    className="text-gray-600 hover:text-gray-900"
                    data-testid="btn-toggle-filters"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    {showAdvancedFilters ? 'Nascondi Filtri' : 'Filtri Avanzati'}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </Button>
                
                {/* Filtri Avanzati Collapsibili */}
                {showAdvancedFilters && (
                  <div className="border rounded-lg p-3 bg-white space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto <span className="text-red-500">*</span></Label>
                        <Select 
                          value={filterProductType} 
                          onValueChange={(v) => { 
                            setFilterProductType(v); 
                            setFilterCategory('all'); 
                            setFilterTypology('all'); 
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
                          onValueChange={(v) => { setFilterCategory(v); setFilterTypology('all'); }}
                          disabled={!filterProductType}
                        >
                          <SelectTrigger data-testid="select-filter-category">
                            <SelectValue placeholder={filterProductType ? "Tutte" : "Seleziona tipo"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutte le categorie</SelectItem>
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
                          disabled={!filterCategory || filterCategory === 'all'}
                        >
                          <SelectTrigger data-testid="select-filter-typology">
                            <SelectValue placeholder={filterCategory && filterCategory !== 'all' ? "Tutte" : "Seleziona cat."} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutte le tipologie</SelectItem>
                            {modalFilteredTypologies.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => {
                        handleApplyFilters();
                        setShowAdvancedFilters(false);
                      }} 
                      className="w-full" 
                      data-testid="btn-apply-filters"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Applica Filtri
                    </Button>
                  </div>
                )}
              </div>
                
                {/* Results with Checkbox Multi-Select */}
                <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(95vh - 280px)' }}>
                  {!hasSearched ? (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Cerca un prodotto per SKU/EAN</p>
                      <p className="text-xs mt-1">oppure usa i filtri avanzati</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-400" />
                      <p>Nessun prodotto trovato</p>
                      <p className="text-xs mt-1">Prova con altri criteri di ricerca</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
                        <span>{searchResults.length} prodotti trovati</span>
                        <span>{selectedProductsForMapping.length} selezionati</span>
                      </div>
                      {searchResults.map(p => {
                        const cat = p.categoryId ? getCategoryById(p.categoryId) : null;
                        const isSelected = selectedProductsForMapping.some(sp => sp.product.id === p.id);
                        return (
                          <div 
                            key={p.id}
                            onClick={() => toggleProductSelection(p)}
                            className={`p-3 rounded-md cursor-pointer border transition-colors ${
                              isSelected 
                                ? 'bg-green-50 border-green-300' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            data-testid={`product-result-${p.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={isSelected}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => toggleProductSelection(p)}
                                data-testid={`checkbox-product-${p.id}`}
                              />
                              <div className="flex-1">
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
                                  </Badge>
                                )}
                                {p.isSerializable && (
                                  <Badge variant="secondary" className="text-xs">
                                    {(p.serialCount || 1) > 1 ? 'Dual' : 'Serial'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              {/* RIGHT COLUMN - Staging & Save */}
              <div className="w-[420px] flex flex-col overflow-hidden border rounded-lg">
                {/* Header with Summary */}
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Prodotti Selezionati</span>
                  </div>
                  {selectedProductsForMapping.length > 0 && (
                    <div className="flex items-center gap-2">
                      {productsWithMissingSku > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {productsWithMissingSku} senza SKU
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Pronti
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected Products List with SKU Input */}
                <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(95vh - 350px)' }}>
                  {selectedProductsForMapping.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Seleziona i prodotti</p>
                      <p className="text-xs mt-1">Usa i checkbox a sinistra</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {selectedProductsForMapping.map(({ product, supplierSku }) => (
                        <div 
                          key={product.id} 
                          className={`p-3 rounded-lg border ${supplierSku.trim() ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <code className="text-xs bg-gray-100 px-1 rounded">{product.sku}</code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                              onClick={() => removeSelectedProduct(product.id)}
                              data-testid={`btn-remove-selected-${product.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">SKU Fornitore <span className="text-red-500">*</span></Label>
                            <Input
                              value={supplierSku}
                              onChange={(e) => updateSelectedProductSku(product.id, e.target.value)}
                              placeholder="Codice fornitore..."
                              className={`h-8 text-sm ${supplierSku.trim() ? 'border-green-300' : ''}`}
                              data-testid={`input-sku-${product.id}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                {/* Save Button Footer */}
                <div className="p-3 border-t bg-gray-50">
                  <Button 
                    onClick={handleBatchSave}
                    disabled={!canSaveMapping || isSavingBatch}
                    className="w-full bg-green-600 hover:bg-green-700"
                    data-testid="btn-save-mappings"
                  >
                    {isSavingBatch ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salva Mapping ({selectedProductsForMapping.length})
                      </>
                    )}
                  </Button>
                  {selectedProductsForMapping.length > 0 && productsWithMissingSku > 0 && (
                    <p className="text-xs text-amber-600 text-center mt-2">
                      Compila tutti gli SKU fornitore per salvare
                    </p>
                  )}
                </div>
                
                {/* Session Mappings - Saved in this session */}
                {sessionMappings.length > 0 && (
                  <div className="border-t">
                    <div className="p-2 bg-blue-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Salvati in questa sessione
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">{sessionMappings.length}</Badge>
                    </div>
                    <ScrollArea className="max-h-[150px]">
                      <div className="p-2 space-y-1">
                        {sessionMappings.map(mapping => (
                          <div key={mapping.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                            <div>
                              <code className="text-xs bg-gray-100 px-1 rounded">{mapping.productSku}</code>
                              <span className="mx-2 text-gray-400">→</span>
                              <code className="text-xs bg-blue-50 text-blue-700 px-1 rounded">{mapping.supplierSku}</code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                              onClick={() => handleDeleteSessionMapping(mapping)}
                              data-testid={`btn-delete-session-${mapping.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
          
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
