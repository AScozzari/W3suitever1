import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, ChevronRight, Check, Package, List, Grid3X3, 
  Search, X, Plus, Filter, AlertCircle, Loader2, Save, Wand2
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ValuePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  list_type: string;
  operator_id: string | null;
  valid_from: string;
  valid_to: string | null;
  status: string;
}

interface PriceList {
  id: string;
  code: string;
  name: string;
  type: string;
  operatorId: string | null;
  supplierIds: string[] | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

interface PackagePriceList {
  id: string;
  price_list_id: string;
  price_list_code: string;
  price_list_name: string;
  price_list_type: string;
  items_count: number;
  total_products: number;
}

// Calculate completion status for price list tab badge
function getCompletionStatus(itemsCount: number, totalProducts: number): { color: string; icon: string; label: string } {
  if (totalProducts === 0) {
    return { color: 'bg-gray-200 text-gray-500', icon: '○', label: 'Vuoto' };
  }
  if (itemsCount === 0) {
    return { color: 'bg-red-100 text-red-600', icon: '○', label: 'Da configurare' };
  }
  if (itemsCount >= totalProducts) {
    return { color: 'bg-green-100 text-green-600', icon: '●', label: 'Completo' };
  }
  return { color: 'bg-orange-100 text-orange-600', icon: '◐', label: 'Parziale' };
}

interface ProductItem {
  price_list_item_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  canone_listino: number | null;
  is_canvas: boolean;
  item_id: string | null;
  valenza: number | null;
  gettone_contrattuale: number | null;
  gettone_gara: number | null;
  canone_override: number | null;
  canone_inherited: boolean;
  notes: string | null;
}

interface ValuePackageWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage?: ValuePackage | null;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, title: 'Dati Base', icon: Package },
  { id: 2, title: 'Selezione Listini', icon: List },
  { id: 3, title: 'Valori Prodotti', icon: Grid3X3 },
];

const listTypeOptions = [
  { value: 'canvas', label: 'Canvas', description: 'Listini offerte mobile/fisso' },
  { value: 'products', label: 'Prodotti', description: 'Listini prodotti fisici/servizi' },
];

export default function ValuePackageWizard({ open, onOpenChange, editingPackage, onSuccess }: ValuePackageWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [packageId, setPackageId] = useState<string | null>(null);
  
  // Step 1 - Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    listType: 'canvas',
    operatorId: '',
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: '',
    status: 'draft',
  });

  // Step 2 - Filters
  const [categoryFilter, setCategoryFilter] = useState<'canvas' | 'products'>('canvas');
  const [operatorFilter, setOperatorFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPriceLists, setSelectedPriceLists] = useState<string[]>([]);

  // Step 3 - Active tab and product edits
  const [activeListTab, setActiveListTab] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, Partial<ProductItem>>>>({});
  
  // Track worked price lists (after "Salva Valori" was clicked)
  const [workedPriceLists, setWorkedPriceLists] = useState<Set<string>>(new Set());
  // Track price list completion status: 'complete' | 'partial' | 'error' | 'pending'
  const [priceListStatus, setPriceListStatus] = useState<Record<string, 'complete' | 'partial' | 'error' | 'pending'>>({});

  // Store editingPackage id to avoid object reference issues
  const editingPackageId = editingPackage?.id ?? null;

  // Reset state when wizard opens or editingPackage changes
  useEffect(() => {
    if (!open) return;
    
    setCurrentStep(1);
    setPendingChanges({});
    setActiveListTab('');
    setCategoryFilter('canvas');
    setOperatorFilter('');
    setSupplierFilter('');
    setTypeFilter('all');
    setSearchFilter('');
    setSelectedPriceLists([]);
    setWorkedPriceLists(new Set());
    setPriceListStatus({});
    
    if (editingPackage) {
      setPackageId(editingPackage.id);
      setFormData({
        code: editingPackage.code || '',
        name: editingPackage.name || '',
        description: editingPackage.description || '',
        listType: editingPackage.list_type || 'canvas',
        operatorId: editingPackage.operator_id || '',
        validFrom: editingPackage.valid_from?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
        validTo: editingPackage.valid_to?.split('T')[0] || '',
        status: editingPackage.status || 'draft',
      });
    } else {
      setPackageId(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        listType: 'canvas',
        operatorId: '',
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validTo: '',
        status: 'draft',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingPackageId]);

  // Queries
  const { data: operators = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/operators'],
  });

  const { data: suppliers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/wms/suppliers'],
  });

  const { data: allPriceLists = [] } = useQuery<PriceList[]>({
    queryKey: ['/api/wms/price-lists', { status: 'active' }],
  });

  const { data: packagePriceLists = [], refetch: refetchPackageLists } = useQuery<PackagePriceList[]>({
    queryKey: ['/api/commissioning/value-packages', packageId, 'price-lists'],
    queryFn: () => apiRequest(`/api/commissioning/value-packages/${packageId}/price-lists`),
    enabled: !!packageId,
  });

  // Filter price lists based on category and filters
  const filteredPriceLists = useMemo(() => {
    const now = new Date();
    return allPriceLists.filter(pl => {
      // Validity check
      const validFrom = new Date(pl.validFrom);
      const validTo = pl.validTo ? new Date(pl.validTo) : null;
      const isValid = validFrom <= now && (!validTo || validTo >= now);
      if (!isValid) return false;

      // Category filter
      if (categoryFilter === 'canvas') {
        // Solo listini canvas (escludi promo_canvas_device)
        if (pl.type !== 'canvas') return false;
        if (operatorFilter && pl.operatorId !== operatorFilter) return false;
      } else {
        // Solo listini prodotti: standard e promo
        if (!['standard', 'promo'].includes(pl.type)) return false;
        if (supplierFilter && (!pl.supplierIds || !pl.supplierIds.includes(supplierFilter))) return false;
        if (typeFilter !== 'all' && pl.type !== typeFilter) return false;
      }

      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        if (!pl.name.toLowerCase().includes(search) && !pl.code.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [allPriceLists, categoryFilter, operatorFilter, supplierFilter, typeFilter, searchFilter]);

  // Mutations
  const createPackageMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commissioning/value-packages', { 
      method: 'POST', 
      body: JSON.stringify(data), 
      headers: { 'Content-Type': 'application/json' } 
    }),
    onSuccess: (response: any) => {
      setPackageId(response.id);
      toast({ title: 'Pacchetto creato' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile creare il pacchetto', variant: 'destructive' }),
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/commissioning/value-packages/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data), 
      headers: { 'Content-Type': 'application/json' } 
    }),
    onSuccess: () => toast({ title: 'Pacchetto aggiornato' }),
  });

  const addPriceListMutation = useMutation({
    mutationFn: ({ packageId, priceListId }: { packageId: string; priceListId: string }) => 
      apiRequest(`/api/commissioning/value-packages/${packageId}/price-lists`, { 
        method: 'POST', 
        body: JSON.stringify({ priceListId }), 
        headers: { 'Content-Type': 'application/json' } 
      }),
    onSuccess: () => refetchPackageLists(),
  });

  const removePriceListMutation = useMutation({
    mutationFn: ({ packageId, priceListId }: { packageId: string; priceListId: string }) => 
      apiRequest(`/api/commissioning/value-packages/${packageId}/price-lists/${priceListId}`, { method: 'DELETE' }),
    onSuccess: () => refetchPackageLists(),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ packageId, priceListId, products }: { packageId: string; priceListId: string; products: any[] }) => 
      apiRequest(`/api/commissioning/value-packages/${packageId}/price-lists/${priceListId}/products/bulk`, { 
        method: 'POST', 
        body: JSON.stringify({ products }), 
        headers: { 'Content-Type': 'application/json' } 
      }),
    onSuccess: (_, variables) => {
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[variables.priceListId];
        return next;
      });
      toast({ title: 'Valori salvati' });
    },
  });

  // Handlers
  const handleStep1Next = async () => {
    if (!formData.code || !formData.name || !formData.validFrom) {
      toast({ title: 'Errore', description: 'Codice, nome e data inizio sono obbligatori', variant: 'destructive' });
      return;
    }

    if (packageId) {
      await updatePackageMutation.mutateAsync({ id: packageId, data: formData });
    } else {
      const result = await createPackageMutation.mutateAsync(formData);
      if (result?.id) setPackageId(result.id);
    }
    setCurrentStep(2);
  };

  const handleTogglePriceList = useCallback((priceListId: string) => {
    if (!priceListId) return;
    if (!packageId) {
      toast({ title: 'Attenzione', description: 'Prima salva i dati base (Step 1)', variant: 'destructive' });
      return;
    }

    const isSelected = packagePriceLists.some(pl => pl.price_list_id === priceListId);
    if (isSelected) {
      removePriceListMutation.mutate({ packageId, priceListId });
    } else {
      addPriceListMutation.mutate({ packageId, priceListId });
    }
  }, [packageId, packagePriceLists, addPriceListMutation, removePriceListMutation, toast]);

  const handleStep2Next = () => {
    if (packagePriceLists.length === 0) {
      toast({ title: 'Attenzione', description: 'Seleziona almeno un listino', variant: 'destructive' });
      return;
    }
    if (packagePriceLists.length > 0) {
      setActiveListTab(packagePriceLists[0].price_list_id);
    }
    setCurrentStep(3);
  };

  const handleSaveAll = async () => {
    if (!packageId) return;

    const savedListIds: string[] = [];
    const errorListIds: string[] = [];
    
    for (const [priceListId, changes] of Object.entries(pendingChanges)) {
      const products = Object.entries(changes).map(([productId, data]) => ({
        productId,
        ...data,
      }));
      if (products.length > 0) {
        try {
          await bulkUpdateMutation.mutateAsync({ packageId, priceListId, products });
          savedListIds.push(priceListId);
        } catch (err) {
          errorListIds.push(priceListId);
        }
      }
    }

    // Invalida le query per aggiornare i dati
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages', packageId, 'price-lists'] });
    
    // Track worked price lists
    setWorkedPriceLists(prev => {
      const next = new Set(prev);
      savedListIds.forEach(id => next.add(id));
      return next;
    });
    
    // Update status for each worked list (will be recalculated from API data after refetch)
    setPriceListStatus(prev => {
      const next = { ...prev };
      savedListIds.forEach(id => { next[id] = 'complete'; }); // Provisional, will update from API
      errorListIds.forEach(id => { next[id] = 'error'; });
      return next;
    });
    
    // Resetta pendingChanges e torna a Step 2
    setPendingChanges({});
    toast({ title: 'Valori salvati', description: 'I valori dei prodotti sono stati salvati correttamente' });
    setCurrentStep(2);
  };
  
  // Handler per salvare il pacchetto finale
  const handleFinalSave = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
    toast({ title: 'Pacchetto salvato', description: 'Il pacchetto commissioning è stato completato con successo.' });
    handleClose();
    onSuccess?.();
  };

  const handleClose = () => {
    setCurrentStep(1);
    setPackageId(null);
    setSelectedPriceLists([]);
    setPendingChanges({});
    onOpenChange(false);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {editingPackage ? 'Modifica Pacchetto Commissioning' : 'Nuovo Pacchetto Commissioning'}
          </DialogTitle>
          <DialogDescription>
            Configura i valori commissioning per i prodotti dei listini selezionati
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  currentStep === step.id 
                    ? 'bg-orange-100 text-orange-700 font-medium' 
                    : currentStep > step.id 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="text-sm">{step.title}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 px-1">
          {/* Step 1: Base Data */}
          {currentStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Codice *</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.code} 
                      onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))} 
                      placeholder="PKG_GARA_001" 
                      data-testid="input-package-code" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                        setFormData(f => ({ ...f, code: `PKG_${year}${month}${day}_${random}` }));
                      }}
                      title="Genera codice automatico"
                      data-testid="button-generate-code"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Stato</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="archived">Archiviato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} 
                  placeholder="Gara Q1 2026 - WindTre Consumer" 
                  data-testid="input-package-name" 
                />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} 
                  rows={2} 
                  placeholder="Descrizione del pacchetto commissioning..."
                  data-testid="input-package-desc" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo Listino *</Label>
                  <Select value={formData.listType} onValueChange={(v) => setFormData(f => ({ ...f, listType: v }))}>
                    <SelectTrigger data-testid="select-list-type">
                      <SelectValue placeholder="Seleziona tipo listino" />
                    </SelectTrigger>
                    <SelectContent>
                      {listTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operatore</Label>
                  <Select value={formData.operatorId || '_none'} onValueChange={(v) => setFormData(f => ({ ...f, operatorId: v === '_none' ? '' : v }))}>
                    <SelectTrigger data-testid="select-operator">
                      <SelectValue placeholder="Seleziona operatore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nessuno</SelectItem>
                      {operators.map(op => (
                        <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valido Dal *</Label>
                  <Input 
                    type="date" 
                    value={formData.validFrom} 
                    onChange={(e) => setFormData(f => ({ ...f, validFrom: e.target.value }))} 
                    data-testid="input-valid-from" 
                  />
                </div>
                <div>
                  <Label>Valido Al</Label>
                  <Input 
                    type="date" 
                    value={formData.validTo} 
                    onChange={(e) => setFormData(f => ({ ...f, validTo: e.target.value }))} 
                    data-testid="input-valid-to" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Price List Selection */}
          {currentStep === 2 && (
            <div className="py-4 space-y-4">
              {/* Category Toggle */}
              <div className="flex gap-2">
                {listTypeOptions.map(opt => (
                  <Button
                    key={opt.value}
                    variant={categoryFilter === opt.value ? 'default' : 'outline'}
                    onClick={() => {
                      setCategoryFilter(opt.value as 'canvas' | 'products');
                      setOperatorFilter('');
                      setSupplierFilter('');
                    }}
                    className={categoryFilter === opt.value ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    data-testid={`toggle-category-${opt.value}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {/* Filters */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filtri
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex gap-4 flex-wrap">
                    {categoryFilter === 'canvas' ? (
                      <div className="w-64">
                        <Label className="text-xs">Operatore</Label>
                        <Select value={operatorFilter || '_all'} onValueChange={(v) => setOperatorFilter(v === '_all' ? '' : v)}>
                          <SelectTrigger data-testid="filter-operator">
                            <SelectValue placeholder="Tutti gli operatori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_all">Tutti</SelectItem>
                            {operators.map(op => (
                              <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
                        <div className="w-64">
                          <Label className="text-xs">Fornitore</Label>
                          <Select value={supplierFilter || '_all'} onValueChange={(v) => setSupplierFilter(v === '_all' ? '' : v)}>
                            <SelectTrigger data-testid="filter-supplier">
                              <SelectValue placeholder="Tutti i fornitori" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_all">Tutti</SelectItem>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-48">
                          <Label className="text-xs">Tipo Listino</Label>
                          <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger data-testid="filter-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tutti</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="promo">Promo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div className="flex-1 min-w-48">
                      <Label className="text-xs">Cerca</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Cerca listino..."
                          className="pl-10"
                          data-testid="filter-search"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selected chips */}
              {packagePriceLists.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-sm text-orange-700 font-medium">Selezionati ({packagePriceLists.length}):</span>
                  {packagePriceLists.map((pl, idx) => (
                    <Badge 
                      key={pl.price_list_id || `pl-${idx}`} 
                      variant="secondary" 
                      className="bg-white border flex items-center gap-1"
                    >
                      <span>{pl.price_list_name}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => handleTogglePriceList(pl.price_list_id)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Worked Price Lists Section (with traffic light) */}
              {workedPriceLists.size > 0 && (
                <Card className="border-2 border-green-200 bg-green-50/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                      <Check className="h-4 w-4" /> Listini Lavorati ({workedPriceLists.size})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {packagePriceLists.filter(pl => workedPriceLists.has(pl.price_list_id)).map((pl, idx) => {
                        const itemsCount = Number(pl.items_count) || 0;
                        const totalProducts = Number(pl.total_products) || 0;
                        const status = priceListStatus[pl.price_list_id] || 
                          (itemsCount >= totalProducts ? 'complete' : itemsCount > 0 ? 'partial' : 'pending');
                        
                        const statusConfig = {
                          complete: { bg: 'bg-green-100 border-green-300', icon: '🟢', text: 'text-green-700' },
                          partial: { bg: 'bg-orange-100 border-orange-300', icon: '🟠', text: 'text-orange-700' },
                          error: { bg: 'bg-red-100 border-red-300', icon: '🔴', text: 'text-red-700' },
                          pending: { bg: 'bg-gray-100 border-gray-300', icon: '⚪', text: 'text-gray-700' },
                        }[status];
                        
                        return (
                          <Badge 
                            key={pl.price_list_id || `worked-${idx}`}
                            variant="outline"
                            className={`${statusConfig.bg} ${statusConfig.text} border flex items-center gap-2 px-3 py-1.5`}
                          >
                            <span>{statusConfig.icon}</span>
                            <span className="font-medium">{pl.price_list_name}</span>
                            <span className="text-xs opacity-75">({itemsCount}/{totalProducts})</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price list table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 p-3"></th>
                      <th className="text-left p-3">Codice</th>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Validità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPriceLists.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Nessun listino trovato con i filtri selezionati
                        </td>
                      </tr>
                    ) : (
                      filteredPriceLists.map(pl => {
                        const isSelected = packagePriceLists.some(p => p.price_list_id === pl.id);
                        const isWorked = workedPriceLists.has(pl.id);
                        return (
                          <tr 
                            key={pl.id} 
                            className={`border-t hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-orange-50' : ''} ${isWorked ? 'opacity-50' : ''}`}
                            onClick={() => handleTogglePriceList(pl.id)}
                            data-testid={`row-pricelist-${pl.id}`}
                          >
                            <td className="p-3 text-center">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => handleTogglePriceList(pl.id)}
                              />
                            </td>
                            <td className="p-3 font-mono text-xs">{pl.code}</td>
                            <td className="p-3 font-medium">{pl.name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {pl.type}
                              </Badge>
                            </td>
                            <td className="p-3 text-gray-500 text-xs">
                              {pl.validFrom?.split('T')[0]}
                              {pl.validTo && ` → ${pl.validTo.split('T')[0]}`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Product Values Grid */}
          {currentStep === 3 && (
            <div className="py-4">
              {packagePriceLists.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  Nessun listino selezionato
                </div>
              ) : (
                <Tabs value={activeListTab} onValueChange={setActiveListTab}>
                  <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-gray-100 rounded-lg">
                    {packagePriceLists.map((pl, idx) => {
                      const itemsCount = Number(pl.items_count) || 0;
                      const totalProducts = Number(pl.total_products) || 0;
                      const status = getCompletionStatus(itemsCount, totalProducts);
                      return (
                        <TabsTrigger 
                          key={pl.price_list_id || `tab-${idx}`} 
                          value={pl.price_list_id}
                          className="bg-white border border-gray-200 data-[state=active]:bg-orange-100 data-[state=active]:border-orange-300 data-[state=active]:text-orange-800 text-gray-700 flex items-center gap-2 px-3 py-1.5 rounded-md"
                          title={`${status.label}: ${itemsCount}/${totalProducts} prodotti configurati`}
                        >
                          <span className="font-medium">{pl.price_list_name || `Listino ${idx + 1}`}</span>
                          <Badge variant="secondary" className={`text-xs ${status.color}`}>
                            {status.icon} {itemsCount}/{totalProducts}
                          </Badge>
                          {pendingChanges[pl.price_list_id] && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {packagePriceLists.map((pl, idx) => (
                    <TabsContent key={pl.price_list_id || `content-${idx}`} value={pl.price_list_id} className="mt-4">
                      <ProductGrid 
                        packageId={packageId!}
                        priceListId={pl.price_list_id}
                        priceListType={pl.price_list_type}
                        pendingChanges={pendingChanges[pl.price_list_id] || {}}
                        onChangesUpdate={(changes) => setPendingChanges(prev => ({
                          ...prev,
                          [pl.price_list_id]: changes
                        }))}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Indietro
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          
          {currentStep === 1 && (
            <Button 
              onClick={handleStep1Next}
              disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-next-step1"
            >
              {(createPackageMutation.isPending || updatePackageMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Avanti <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {currentStep === 2 && (
            <>
              {/* Show "Salva Pacchetto" only when at least one price list has been worked */}
              {workedPriceLists.size > 0 && (
                <Button 
                  onClick={handleFinalSave}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-package"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva Pacchetto
                </Button>
              )}
              <Button 
                onClick={handleStep2Next}
                disabled={packagePriceLists.length === 0}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-next-step2"
              >
                Avanti <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          
          {currentStep === 3 && (
            <Button 
              onClick={handleSaveAll}
              disabled={bulkUpdateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-save-all"
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva Valori
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Product Grid Component
interface ProductGridProps {
  packageId: string;
  priceListId: string;
  priceListType: string;
  pendingChanges: Record<string, Partial<ProductItem>>;
  onChangesUpdate: (changes: Record<string, Partial<ProductItem>>) => void;
}

function ProductGrid({ packageId, priceListId, priceListType, pendingChanges, onChangesUpdate }: ProductGridProps) {
  const isCanvas = priceListType === 'canvas';

  const { data: productsData, isLoading } = useQuery<{ priceListType: string; isCanvas: boolean; products: ProductItem[] }>({
    queryKey: ['/api/commissioning/value-packages', packageId, 'price-lists', priceListId, 'products'],
    queryFn: () => apiRequest(`/api/commissioning/value-packages/${packageId}/price-lists/${priceListId}/products`),
    enabled: !!packageId && !!priceListId,
  });

  const products = productsData?.products || [];

  const handleValueChange = useCallback((productId: string, field: string, value: any) => {
    onChangesUpdate({
      ...pendingChanges,
      [productId]: {
        ...pendingChanges[productId],
        [field]: value,
      }
    });
  }, [pendingChanges, onChangesUpdate]);

  const getDisplayValue = useCallback((product: ProductItem, field: keyof ProductItem): string | number | null | undefined => {
    if (pendingChanges[product.product_id]?.[field] !== undefined) {
      const val = pendingChanges[product.product_id][field];
      if (typeof val === 'boolean') return undefined;
      return val as string | number | null | undefined;
    }
    const val = product[field];
    if (typeof val === 'boolean') return undefined;
    return val as string | number | null | undefined;
  }, [pendingChanges]);
  
  const getDisplayBoolean = useCallback((product: ProductItem, field: keyof ProductItem): boolean => {
    if (pendingChanges[product.product_id]?.[field] !== undefined) {
      return !!pendingChanges[product.product_id][field];
    }
    return !!product[field];
  }, [pendingChanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto max-h-[400px]">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-3 min-w-[200px]">Prodotto</th>
            <th className="text-left p-3 w-24">SKU</th>
            <th className="text-center p-3 w-28">Valenza</th>
            <th className="text-center p-3 w-32">Gett. Contratt.</th>
            <th className="text-center p-3 w-28">Gett. Gara</th>
            {isCanvas && <th className="text-center p-3 w-32">Canone</th>}
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={isCanvas ? 6 : 5} className="p-8 text-center text-gray-400">
                Nessun prodotto nel listino
              </td>
            </tr>
          ) : (
            products.map((product, idx) => {
              const hasChanges = !!pendingChanges[product.product_id];
              return (
                <tr 
                  key={product.product_id} 
                  className={`border-t ${hasChanges ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="p-2 font-medium">{product.product_name}</td>
                  <td className="p-2 font-mono text-xs text-gray-500">{product.product_sku}</td>
                  <td className="p-1">
                    <Input
                      type="number"
                      step="1"
                      className="h-8 text-center text-sm"
                      value={getDisplayValue(product, 'valenza') ?? ''}
                      onChange={(e) => handleValueChange(product.product_id, 'valenza', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0"
                      data-testid={`input-valenza-${product.product_id}`}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-center text-sm"
                      value={getDisplayValue(product, 'gettone_contrattuale') ?? ''}
                      onChange={(e) => handleValueChange(product.product_id, 'gettone_contrattuale', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="€ 0.00"
                      data-testid={`input-gettone-contr-${product.product_id}`}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-center text-sm"
                      value={getDisplayValue(product, 'gettone_gara') ?? ''}
                      onChange={(e) => handleValueChange(product.product_id, 'gettone_gara', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="€ 0.00"
                      data-testid={`input-gettone-gara-${product.product_id}`}
                    />
                  </td>
                  {isCanvas && (
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-center text-sm flex-1"
                          value={getDisplayValue(product, 'canone_override') ?? product.canone_listino ?? ''}
                          onChange={(e) => {
                            handleValueChange(product.product_id, 'canone_override', e.target.value ? parseFloat(e.target.value) : null);
                            handleValueChange(product.product_id, 'canone_inherited', false);
                          }}
                          placeholder={product.canone_listino?.toString() || '€ 0.00'}
                          data-testid={`input-canone-${product.product_id}`}
                        />
                        {product.canone_listino && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs cursor-pointer ${getDisplayBoolean(product, 'canone_inherited') ? 'bg-green-50 text-green-700' : 'bg-gray-50'}`}
                            onClick={() => {
                              handleValueChange(product.product_id, 'canone_inherited', true);
                              handleValueChange(product.product_id, 'canone_override', null);
                            }}
                            title="Eredita dal listino"
                          >
                            {getDisplayBoolean(product, 'canone_inherited') ? '✓' : '↩'}
                          </Badge>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
