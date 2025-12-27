import { useState, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Search, Plus, Edit, Trash2, Link2, CalendarIcon, Filter, 
  Package, Building2, CheckCircle2, XCircle, RefreshCw, X,
  ArrowRightLeft
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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; mapping: SkuMapping | null }>({ open: false, mapping: null });
  
  const [newMappingData, setNewMappingData] = useState({
    productId: '',
    supplierId: '',
    supplierSku: '',
    useInternalSku: false,
    isPrimary: false
  });
  
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('all');
  const [modalTypologyFilter, setModalTypologyFilter] = useState<string>('all');
  const [modalProductTypeFilter, setModalProductTypeFilter] = useState<string>('all');
  
  const [editMappingData, setEditMappingData] = useState({
    supplierSku: '',
    useInternalSku: false,
    isPrimary: false
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
  
  const modalFilteredTypologies = useMemo(() => {
    if (modalCategoryFilter === 'all') return typologies;
    return typologies.filter(t => t.categoryId === modalCategoryFilter);
  }, [typologies, modalCategoryFilter]);

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
      
      if (productTypeFilter === 'serializable' && !product?.isSerializable) return false;
      if (productTypeFilter === 'non-serializable' && product?.isSerializable) return false;
      if (productTypeFilter === 'dual-serial' && (product?.serialCount || 1) < 2) return false;
      
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

  const modalFilteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.productType !== 'CANVAS');
    
    if (modalProductSearch) {
      const search = modalProductSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.sku?.toLowerCase().includes(search) ||
        p.name?.toLowerCase().includes(search) ||
        p.ean?.toLowerCase().includes(search)
      );
    }
    
    if (modalCategoryFilter !== 'all') {
      filtered = filtered.filter(p => p.categoryId === modalCategoryFilter);
    }
    
    if (modalTypologyFilter !== 'all') {
      filtered = filtered.filter(p => p.typologyId === modalTypologyFilter);
    }
    
    if (modalProductTypeFilter === 'serializable') {
      filtered = filtered.filter(p => p.isSerializable);
    } else if (modalProductTypeFilter === 'non-serializable') {
      filtered = filtered.filter(p => !p.isSerializable);
    } else if (modalProductTypeFilter === 'dual-serial') {
      filtered = filtered.filter(p => (p.serialCount || 1) >= 2);
    }
    
    return filtered.slice(0, 100);
  }, [products, modalProductSearch, modalCategoryFilter, modalTypologyFilter, modalProductTypeFilter]);

  const updateMappingMutation = useMutation({
    mutationFn: async (data: { id: string; supplierSku: string; useInternalSku: boolean; isPrimary: boolean }) => {
      return apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify({
          productId: editModal.mapping?.productId,
          supplierId: editModal.mapping?.supplierId,
          supplierSku: data.supplierSku,
          useInternalSku: data.useInternalSku,
          isPrimary: data.isPrimary
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
    mutationFn: async (data: typeof newMappingData) => {
      return apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({ title: "Mapping creato", description: "Il nuovo mapping è stato salvato" });
      setCreateModal(false);
      resetModalFilters();
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
      supplierSku: mapping.supplierSku || '',
      useInternalSku: mapping.useInternalSku,
      isPrimary: mapping.isPrimary
    });
    setEditModal({ open: true, mapping });
  };
  
  const resetModalFilters = () => {
    setNewMappingData({ productId: '', supplierId: '', supplierSku: '', useInternalSku: false, isPrimary: false });
    setModalProductSearch('');
    setModalCategoryFilter('all');
    setModalTypologyFilter('all');
    setModalProductTypeFilter('all');
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
              <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setTypologyFilter('all'); }}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Tutte le categorie" />
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
                  <SelectValue placeholder={categoryFilter === 'all' ? 'Seleziona categoria' : 'Tutte le tipologie'} />
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
              <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto</Label>
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                <SelectTrigger data-testid="select-product-type">
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="serializable">Serializzabile</SelectItem>
                  <SelectItem value="non-serializable">Non Serializzabile</SelectItem>
                  <SelectItem value="dual-serial">Dual-Serial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valido Dal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="btn-valid-from">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validFromDate ? format(validFromDate, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={validFromDate} onSelect={setValidFromDate} locale={it} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valido Al</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="btn-valid-to">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validToDate ? format(validToDate, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={validToDate} onSelect={setValidToDate} locale={it} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-orange-500" />
              Mapping SKU ({filteredMappings.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchMappings()} data-testid="btn-refresh">
                <RefreshCw className="h-4 w-4 mr-1" />
                Aggiorna
              </Button>
              <Button size="sm" onClick={() => { resetModalFilters(); setCreateModal(true); }} data-testid="btn-new-mapping">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Mapping
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Caricamento...</p>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nessun mapping trovato</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Pulisci filtri
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">SKU Interno</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Prodotto</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">SKU Fornitore</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fornitore</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Stato</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map((mapping) => (
                    <tr key={mapping.id} className="border-b hover:bg-gray-50" data-testid={`row-mapping-${mapping.id}`}>
                      <td className="px-4 py-3">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {mapping.product?.sku || mapping.productId}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{mapping.product?.name || '-'}</p>
                          {mapping.product?.ean && (
                            <p className="text-xs text-gray-500">EAN: {mapping.product.ean}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mapping.supplierSku ? (
                          <code className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-mono">
                            {mapping.supplierSku}
                          </code>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            Non mappato
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{mapping.supplier?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mapping.product?.isSerializable ? (
                          <Badge variant="secondary" className="text-xs">
                            {(mapping.product?.serialCount || 1) > 1 ? 'Dual-Serial' : 'Serializzabile'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Non Serial.</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mapping.isActive ? (
                          <Badge className="bg-green-100 text-green-700">Attivo</Badge>
                        ) : (
                          <Badge variant="secondary">Inattivo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenEdit(mapping)}
                            title="Modifica"
                            data-testid={`btn-edit-${mapping.id}`}
                          >
                            <Edit className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeleteModal({ open: true, mapping })}
                            title="Elimina"
                            data-testid={`btn-delete-${mapping.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

      <Dialog open={editModal.open} onOpenChange={(open) => !open && setEditModal({ open: false, mapping: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-orange-500" />
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
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editMappingData.useInternalSku}
                    onChange={(e) => setEditMappingData({ ...editMappingData, useInternalSku: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Usa SKU interno</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editMappingData.isPrimary}
                    onChange={(e) => setEditMappingData({ ...editMappingData, isPrimary: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Fornitore primario</span>
                </label>
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

      <Dialog open={createModal} onOpenChange={(open) => { if (!open) { setCreateModal(false); resetModalFilters(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Nuovo Mapping
            </DialogTitle>
            <DialogDescription>
              Crea una nuova associazione SKU interno ↔ SKU fornitore
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fornitore <span className="text-red-500">*</span></Label>
                <Select value={newMappingData.supplierId} onValueChange={(v) => setNewMappingData({ ...newMappingData, supplierId: v })}>
                  <SelectTrigger data-testid="select-new-supplier">
                    <SelectValue placeholder="Seleziona fornitore..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>SKU Fornitore</Label>
                <Input
                  value={newMappingData.supplierSku}
                  onChange={(e) => setNewMappingData({ ...newMappingData, supplierSku: e.target.value })}
                  placeholder="Codice articolo fornitore..."
                  data-testid="input-new-supplier-sku"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Filtra Prodotti</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Ricerca</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={modalProductSearch}
                      onChange={(e) => setModalProductSearch(e.target.value)}
                      placeholder="SKU, nome, EAN..."
                      className="pl-8"
                      data-testid="input-modal-search"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
                  <Select value={modalCategoryFilter} onValueChange={(v) => { setModalCategoryFilter(v); setModalTypologyFilter('all'); }}>
                    <SelectTrigger data-testid="select-modal-category">
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
                  <Select value={modalTypologyFilter} onValueChange={setModalTypologyFilter} disabled={modalCategoryFilter === 'all'}>
                    <SelectTrigger data-testid="select-modal-typology">
                      <SelectValue placeholder={modalCategoryFilter === 'all' ? 'Seleziona cat.' : 'Tutte'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le tipologie</SelectItem>
                      {modalFilteredTypologies.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto</Label>
                  <Select value={modalProductTypeFilter} onValueChange={setModalProductTypeFilter}>
                    <SelectTrigger data-testid="select-modal-product-type">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="serializable">Serializzabile</SelectItem>
                      <SelectItem value="non-serializable">Non Serializzabile</SelectItem>
                      <SelectItem value="dual-serial">Dual-Serial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Prodotto <span className="text-red-500">*</span></Label>
              <p className="text-xs text-gray-500 mb-2">Seleziona un prodotto dalla lista ({modalFilteredProducts.length} risultati)</p>
              <ScrollArea className="h-[200px] border rounded-md">
                {modalFilteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nessun prodotto trovato</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {modalFilteredProducts.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setNewMappingData({ ...newMappingData, productId: p.id })}
                        className={`p-3 rounded-md cursor-pointer border transition-colors ${
                          newMappingData.productId === p.id 
                            ? 'bg-orange-50 border-orange-300' 
                            : 'hover:bg-gray-50 border-transparent'
                        }`}
                        data-testid={`product-option-${p.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              SKU: {p.sku} {p.ean && `| EAN: ${p.ean}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {p.isSerializable && (
                              <Badge variant="secondary" className="text-xs">
                                {(p.serialCount || 1) > 1 ? 'Dual' : 'Serial'}
                              </Badge>
                            )}
                            {newMappingData.productId === p.id && (
                              <CheckCircle2 className="h-5 w-5 text-orange-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMappingData.useInternalSku}
                  onChange={(e) => setNewMappingData({ ...newMappingData, useInternalSku: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Usa SKU interno</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMappingData.isPrimary}
                  onChange={(e) => setNewMappingData({ ...newMappingData, isPrimary: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Fornitore primario</span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateModal(false); resetModalFilters(); }}>
              Annulla
            </Button>
            <Button 
              onClick={() => createMappingMutation.mutate(newMappingData)}
              disabled={!newMappingData.productId || !newMappingData.supplierId || createMappingMutation.isPending}
              data-testid="btn-save-create"
            >
              {createMappingMutation.isPending ? 'Creazione...' : 'Crea Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
