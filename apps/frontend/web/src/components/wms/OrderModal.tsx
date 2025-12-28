import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  FileText, 
  Calendar,
  Package,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Save,
  Pause,
  Eye,
  Edit,
  Filter,
  Link
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SupplierCombobox } from './SupplierCombobox';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SupplierFromAPI {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  supplierType: string;
  vatNumber?: string;
  status: string;
  origin: string;
}

interface StoreFromAPI {
  id: string;
  code: string;
  name: string;
  city?: string;
  province?: string;
  address?: string;
  status: string;
  category: string;
  hasWarehouse: boolean;
}

interface LegalEntityFromAPI {
  id: string;
  nome: string;
  codice: string;
  pIva?: string;
  codiceFiscale?: string;
  stato: string;
}

interface ProductFromAPI {
  id: string;
  name: string;
  sku: string;
  ean?: string;
  description?: string;
  isSerializable: boolean;
  serialType?: 'imei' | 'iccid' | 'mac_address' | 'other';
  serialCount?: number;
}

interface SkuMappingFromAPI {
  id: string;
  supplierId: string;
  supplierSku: string;
  productId: string;
  productName?: string;
  productSku?: string;
  productEan?: string;
  isSerializable?: boolean;
  serialType?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productEan?: string;
  quantity: number;
  unitCost: number;
}

interface OrderDraft {
  id: string;
  legalEntityId?: string;
  legalEntityName?: string;
  supplierId?: string;
  supplierName?: string;
  documentNumber?: string;
  documentDate?: string;
  expectedDeliveryDate?: string;
  storeId?: string;
  storeName?: string;
  notes?: string;
  items: OrderItem[];
  lastModified: string;
}

interface OrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orderId: string) => void;
  draftToResume?: OrderDraft;
}

const orderFormSchema = z.object({
  legalEntityId: z.string().min(1, 'Seleziona un\'entità legale'),
  supplierId: z.string().min(1, 'Seleziona un fornitore'),
  documentNumber: z.string().optional(),
  documentDate: z.string().min(1, 'Data documento obbligatoria'),
  expectedDeliveryDate: z.string().optional(),
  storeId: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export function OrderModal({ open, onOpenChange, onSuccess, draftToResume }: OrderModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'internal' | 'supplier_sku'>('internal');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [unmappedSupplierSku, setUnmappedSupplierSku] = useState('');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  
  // Product type options (only relevant for orders - physical products mainly)
  const productTypeOptions = [
    { value: 'PHYSICAL', label: 'Fisico' },
    { value: 'SERVICE', label: 'Servizio' },
    { value: 'VIRTUAL', label: 'Digitale' },
  ];

  // Inline editing for new item
  const [pendingItem, setPendingItem] = useState<{
    productId: string;
    productName: string;
    productSku: string;
    productEan?: string;
  } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<string>('1');
  const [pendingUnitCost, setPendingUnitCost] = useState<string>('');
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete dialog
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Edit mode
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnitCost, setEditUnitCost] = useState<string>('');

  // Dialog container for portal (fixes popover closing issue inside Dialog)
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      legalEntityId: '',
      supplierId: '',
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      storeId: '',
      notes: '',
    },
  });

  const selectedSupplierId = form.watch('supplierId');

  // Fetch organization entities (Ragioni Sociali dell'organizzazione - entità legali emittenti)
  const { data: legalEntitiesData = [], isLoading: legalEntitiesLoading } = useQuery<LegalEntityFromAPI[]>({
    queryKey: ['/api/organization-entities'],
    enabled: open,
  });

  // Fetch suppliers from API
  const { data: suppliersData = [], isLoading: suppliersLoading } = useQuery<SupplierFromAPI[]>({
    queryKey: ['/api/wms/suppliers'],
    enabled: open,
  });

  // Fetch stores/warehouses from API (optional for orders)
  const { data: storesData = [], isLoading: storesLoading } = useQuery<StoreFromAPI[]>({
    queryKey: ['/api/wms/stores'],
    enabled: open,
  });

  // Fetch next document number preview
  const { data: nextNumberData } = useQuery<{ nextNumber: string; hasConfig: boolean }>({
    queryKey: ['/api/wms/documents/next-number/order'],
    enabled: open && currentStep === 1,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setDebouncedSearchQuery(searchQuery);
      } else {
        setDebouncedSearchQuery('');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories for filter
  const { data: categoriesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/categories'],
    enabled: open && currentStep === 2,
  });

  // Fetch product types for filter
  const { data: typesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/product-types'],
    enabled: open && currentStep === 2,
  });

  // Fetch products for internal search
  const { data: productsApiData, isLoading: productsLoading } = useQuery<ProductFromAPI[]>({
    queryKey: ['/api/wms/products', { 
      search: debouncedSearchQuery,
      type: selectedProductType || undefined,
      category_id: selectedCategoryId || undefined,
      type_id: selectedTypeId || undefined,
    }],
    enabled: open && currentStep === 2 && searchMode === 'internal' && (debouncedSearchQuery.length >= 2 || !!selectedProductType || !!selectedCategoryId || !!selectedTypeId),
  });

  // Fetch SKU mappings for supplier SKU search
  const { data: skuMappingsData, isLoading: mappingsLoading } = useQuery<SkuMappingFromAPI[]>({
    queryKey: ['/api/wms/product-supplier-mappings', { supplierId: selectedSupplierId, supplierSku: debouncedSearchQuery }],
    enabled: open && currentStep === 2 && searchMode === 'supplier_sku' && !!selectedSupplierId && debouncedSearchQuery.length >= 2,
  });

  // Search results
  const searchResults = searchMode === 'internal' 
    ? (productsApiData || [])
    : (skuMappingsData || []).map(m => ({
        id: m.productId,
        name: m.productName || '',
        sku: m.productSku || '',
        ean: m.productEan,
        supplierSku: m.supplierSku,
      }));

  // Show results when we have data
  useEffect(() => {
    if (searchMode === 'internal' && productsApiData && productsApiData.length > 0) {
      setShowSearchResults(true);
    } else if (searchMode === 'supplier_sku' && skuMappingsData) {
      if (skuMappingsData.length > 0) {
        setShowSearchResults(true);
        setUnmappedSupplierSku('');
      } else if (debouncedSearchQuery.length >= 2) {
        setShowSearchResults(true);
        setUnmappedSupplierSku(debouncedSearchQuery);
      }
    }
  }, [productsApiData, skuMappingsData, searchMode, debouncedSearchQuery]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setItems([]);
      setCurrentDraftId(null);
      setPendingItem(null);
      setSearchQuery('');
      setShowSearchResults(false);
      form.reset();
    }
  }, [open]);

  // Handle product selection
  const handleProductSelect = (product: any) => {
    // Check if product already in list
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      toast({
        title: 'Prodotto già presente',
        description: 'Modifica la quantità nella lista esistente',
        variant: 'destructive',
      });
      return;
    }

    // If we have unmappedSupplierSku, create mapping first
    if (unmappedSupplierSku && selectedSupplierId) {
      createMappingMutation.mutate({
        supplierId: selectedSupplierId,
        supplierSku: unmappedSupplierSku,
        productId: product.id,
      });
    }

    // Set pending item for inline quantity/cost entry
    setPendingItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productEan: product.ean,
    });
    setPendingQuantity('1');
    setPendingUnitCost('');
    setSearchQuery('');
    setShowSearchResults(false);
    setUnmappedSupplierSku('');

    // Focus quantity input
    setTimeout(() => {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }, 100);
  };

  // Create SKU mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: { supplierId: string; supplierSku: string; productId: string }) => {
      return apiRequest('/api/wms/product-supplier-mappings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
      toast({
        title: 'Abbinamento creato',
        description: 'SKU fornitore abbinato al prodotto',
      });
    },
  });

  // Add pending item to list
  const addPendingItem = () => {
    if (!pendingItem) return;
    
    const qty = parseInt(pendingQuantity) || 1;
    const cost = parseFloat(pendingUnitCost) || 0;

    if (qty <= 0) {
      toast({ title: 'Quantità non valida', variant: 'destructive' });
      return;
    }

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      productId: pendingItem.productId,
      productName: pendingItem.productName,
      productSku: pendingItem.productSku,
      productEan: pendingItem.productEan,
      quantity: qty,
      unitCost: cost,
    };

    setItems(prev => [...prev, newItem]);
    setPendingItem(null);
    setPendingQuantity('1');
    setPendingUnitCost('');

    // Focus back on search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    toast({ title: 'Prodotto aggiunto' });
  };

  // Handle Enter key in quantity/cost inputs
  const handlePendingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPendingItem();
    } else if (e.key === 'Escape') {
      setPendingItem(null);
    }
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    setItemToDelete(null);
    toast({ title: 'Prodotto rimosso' });
  };

  // Start editing item
  const startEditing = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditUnitCost(item.unitCost.toString());
  };

  // Save edit
  const saveEdit = () => {
    if (!editingItemId) return;
    
    const qty = parseInt(editQuantity) || 1;
    const cost = parseFloat(editUnitCost) || 0;

    setItems(prev => prev.map(item => 
      item.id === editingItemId 
        ? { ...item, quantity: qty, unitCost: cost }
        : item
    ));
    setEditingItemId(null);
    toast({ title: 'Modifiche salvate' });
  };

  // Calculate totals
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

  // Save order mutation
  const saveOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/wms/documents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents'] });
      toast({ title: 'Ordine salvato con successo' });
      onOpenChange(false);
      if (onSuccess) onSuccess(result.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare l\'ordine',
        variant: 'destructive',
      });
    },
  });

  // Handle form submit (Step 1 → Step 2)
  const handleStep1Submit = (data: OrderFormData) => {
    setCurrentStep(2);
  };

  // Handle final save
  const handleSaveOrder = () => {
    const formData = form.getValues();
    const legalEntity = legalEntitiesData.find(e => e.id === formData.legalEntityId);
    
    const orderData = {
      documentType: 'order',
      documentDirection: 'passive',
      supplierId: formData.supplierId,
      documentNumber: formData.documentNumber || undefined,
      documentDate: formData.documentDate,
      expectedDeliveryDate: formData.expectedDeliveryDate || null,
      storeId: formData.storeId || null,
      notes: formData.notes || null,
      counterpartyType: 'supplier',
      totalItems: items.length,
      totalQuantity: totalItems,
      totalValue: totalValue.toFixed(2),
      metadata: {
        legalEntityId: formData.legalEntityId,
        legalEntityName: legalEntity?.nome,
      },
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitCost,
      })),
      status: 'draft',
    };

    saveOrderMutation.mutate(orderData);
  };

  // Suspend order (save as draft)
  const handleSuspendOrder = () => {
    const formData = form.getValues();
    const legalEntity = legalEntitiesData.find(e => e.id === formData.legalEntityId);
    const supplier = suppliersData.find(s => s.id === formData.supplierId);
    const store = storesData.find(s => s.id === formData.storeId);

    const draft: OrderDraft = {
      id: currentDraftId || crypto.randomUUID(),
      legalEntityId: formData.legalEntityId,
      legalEntityName: legalEntity?.nome,
      supplierId: formData.supplierId,
      supplierName: supplier?.name,
      documentNumber: formData.documentNumber,
      documentDate: formData.documentDate,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      storeId: formData.storeId,
      storeName: store?.name,
      notes: formData.notes,
      items: items,
      lastModified: new Date().toISOString(),
    };

    // Save to localStorage
    const existingDrafts = JSON.parse(localStorage.getItem('wms_order_drafts') || '[]');
    const updatedDrafts = currentDraftId 
      ? existingDrafts.map((d: OrderDraft) => d.id === currentDraftId ? draft : d)
      : [...existingDrafts, draft];
    localStorage.setItem('wms_order_drafts', JSON.stringify(updatedDrafts));

    toast({ title: 'Ordine sospeso', description: 'Potrai riprenderlo in seguito' });
    onOpenChange(false);
  };

  // Resume draft
  useEffect(() => {
    if (draftToResume && open) {
      setCurrentDraftId(draftToResume.id);
      form.setValue('legalEntityId', draftToResume.legalEntityId || '');
      form.setValue('supplierId', draftToResume.supplierId || '');
      form.setValue('documentNumber', draftToResume.documentNumber || '');
      form.setValue('documentDate', draftToResume.documentDate || new Date().toISOString().split('T')[0]);
      form.setValue('expectedDeliveryDate', draftToResume.expectedDeliveryDate || '');
      form.setValue('storeId', draftToResume.storeId || '');
      form.setValue('notes', draftToResume.notes || '');
      setItems(draftToResume.items || []);
      setCurrentStep(2);
    }
  }, [draftToResume, open]);

  // Auto-populate document number when available (only if empty and not resuming draft)
  useEffect(() => {
    if (open && nextNumberData?.nextNumber && !draftToResume) {
      const currentValue = form.getValues('documentNumber');
      if (!currentValue) {
        form.setValue('documentNumber', nextNumberData.nextNumber);
      }
    }
  }, [open, nextNumberData, draftToResume]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          ref={setDialogContainer}
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Nuovo Ordine a Fornitore
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 && 'Inserisci i dati del documento'}
              {currentStep === 2 && 'Aggiungi i prodotti da ordinare'}
              {currentStep === 3 && 'Verifica e conferma l\'ordine'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-blue-500 text-white' 
                    : currentStep > step 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-1 ${
                    currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <Form {...form}>
            {/* Step 1: Document Data */}
            {currentStep === 1 && (
              <form onSubmit={form.handleSubmit(handleStep1Submit)} className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Legal Entity */}
                      <FormField
                        control={form.control}
                        name="legalEntityId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entità Legale Emittente *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-legal-entity">
                                  <SelectValue placeholder="Seleziona entità legale..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {legalEntitiesData.map(entity => (
                                  <SelectItem key={entity.id} value={entity.id}>
                                    {entity.nome}
                                    {entity.pIva && ` (P.IVA: ${entity.pIva})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Document Number */}
                      <FormField
                        control={form.control}
                        name="documentNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numero Ordine</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                data-testid="input-order-number"
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500">
                              Numero auto-generato (modificabile se necessario)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Document Date */}
                      <FormField
                        control={form.control}
                        name="documentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Documento *</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                data-testid="input-document-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Expected Delivery Date */}
                      <FormField
                        control={form.control}
                        name="expectedDeliveryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Consegna Prevista</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                data-testid="input-delivery-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Supplier */}
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fornitore *</FormLabel>
                          <FormControl>
                            <SupplierCombobox
                              value={field.value}
                              onValueChange={field.onChange}
                              suppliers={suppliersData}
                              placeholder="Seleziona fornitore..."
                              portalContainer={dialogContainer}
                              data-testid="select-supplier"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Warehouse (optional) */}
                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Magazzino Destinazione (opzionale)</FormLabel>
                          <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? '' : v)}>
                            <FormControl>
                              <SelectTrigger data-testid="select-store">
                                <SelectValue placeholder="Seleziona magazzino..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Nessun magazzino specificato</SelectItem>
                              {storesData.filter(s => s.hasWarehouse).map(store => (
                                <SelectItem key={store.id} value={store.id}>
                                  {store.name} {store.city && `- ${store.city}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Note aggiuntive (opzionale)..."
                              rows={3}
                              data-testid="input-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" data-testid="btn-next-step">
                    Avanti
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {/* Step 2: Products */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    {/* Search mode toggle */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={searchMode === 'internal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSearchMode('internal');
                          setSearchQuery('');
                          setShowSearchResults(false);
                          setUnmappedSupplierSku('');
                        }}
                        data-testid="btn-search-internal"
                      >
                        Catalogo Interno
                      </Button>
                      <Button
                        type="button"
                        variant={searchMode === 'supplier_sku' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSearchMode('supplier_sku');
                          setSearchQuery('');
                          setShowSearchResults(false);
                        }}
                        disabled={!selectedSupplierId}
                        data-testid="btn-search-supplier"
                      >
                        SKU Fornitore
                      </Button>
                      {searchMode === 'internal' && (
                        <Button
                          type="button"
                          variant={showFilters ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setShowFilters(!showFilters)}
                          data-testid="btn-toggle-filters"
                        >
                          <Filter className="h-4 w-4 mr-1" />
                          Filtri
                        </Button>
                      )}
                    </div>

                    {/* Mapping mode indicator */}
                    {unmappedSupplierSku && searchMode === 'internal' && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <Link className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-700">
                          Seleziona un prodotto da abbinare a: <span className="font-mono font-semibold">{unmappedSupplierSku}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 text-xs text-blue-600"
                          onClick={() => setUnmappedSupplierSku('')}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Annulla
                        </Button>
                      </div>
                    )}

                    {/* Filters panel */}
                    {showFilters && searchMode === 'internal' && (
                      <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto</Label>
                          <Select 
                            value={selectedProductType || "__all__"} 
                            onValueChange={(v) => {
                              setSelectedProductType(v === "__all__" ? '' : v);
                              setSelectedCategoryId('');
                              setSelectedTypeId('');
                            }}
                          >
                            <SelectTrigger className="h-8" data-testid="select-product-type-filter">
                              <SelectValue placeholder="Tutti i tipi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Tutti i tipi</SelectItem>
                              {productTypeOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
                          <Select value={selectedCategoryId || "__all__"} onValueChange={(v) => setSelectedCategoryId(v === "__all__" ? '' : v)}>
                            <SelectTrigger className="h-8" data-testid="select-category-filter">
                              <SelectValue placeholder="Tutte le categorie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Tutte le categorie</SelectItem>
                              {categoriesData.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500 mb-1 block">Tipologia</Label>
                          <Select value={selectedTypeId || "__all__"} onValueChange={(v) => setSelectedTypeId(v === "__all__" ? '' : v)}>
                            <SelectTrigger className="h-8" data-testid="select-type-filter">
                              <SelectValue placeholder="Tutte le tipologie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Tutte le tipologie</SelectItem>
                              {typesData.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(selectedProductType || selectedCategoryId || selectedTypeId) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProductType('');
                              setSelectedCategoryId('');
                              setSelectedTypeId('');
                            }}
                            className="self-end h-8 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchMode === 'internal' 
                          ? "Cerca prodotto (SKU, nome, EAN)..." 
                          : "Inserisci SKU fornitore..."}
                        className="pl-9"
                        data-testid="input-product-search"
                      />
                      {(productsLoading || mappingsLoading) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}

                      {/* Search results dropdown */}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((product: any) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleProductSelect(product)}
                              data-testid={`search-result-${product.id}`}
                            >
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                SKU: {product.sku} {product.ean && `| EAN: ${product.ean}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No results - show mapping option (Flow 2) */}
                      {showSearchResults && searchResults.length === 0 && unmappedSupplierSku && searchMode === 'supplier_sku' && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                          <div className="p-4 bg-amber-50">
                            <div className="flex items-center gap-2 text-amber-700 mb-2">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Codice non trovato</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Il codice "<span className="font-mono font-medium">{unmappedSupplierSku}</span>" non è mappato a nessun prodotto.
                            </p>
                            <Button 
                              type="button"
                              variant="default"
                              size="sm"
                              className="mt-3"
                              onClick={() => {
                                setSearchMode('internal');
                                setShowFilters(true);
                                setSearchQuery('');
                                setShowSearchResults(false);
                                toast({
                                  title: "Cerca prodotto interno",
                                  description: `SKU fornitore "${unmappedSupplierSku}" sarà abbinato al prodotto selezionato`,
                                });
                              }}
                              data-testid="btn-create-mapping"
                            >
                              <Link className="h-4 w-4 mr-1" />
                              Crea Abbinamento
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pending item inline entry */}
                    {pendingItem && (
                      <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-[1fr_100px_120px_auto_auto] gap-3 items-center">
                            <div>
                              <p className="font-medium">{pendingItem.productName}</p>
                              <p className="text-sm text-gray-500">SKU: {pendingItem.productSku}</p>
                            </div>
                            <Input
                              ref={quantityInputRef}
                              type="number"
                              min="1"
                              value={pendingQuantity}
                              onChange={(e) => setPendingQuantity(e.target.value)}
                              onKeyDown={handlePendingKeyDown}
                              className="h-9"
                              placeholder="Qtà"
                              data-testid="input-pending-qty"
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pendingUnitCost}
                              onChange={(e) => setPendingUnitCost(e.target.value)}
                              onKeyDown={handlePendingKeyDown}
                              className="h-9"
                              placeholder="Costo €"
                              data-testid="input-pending-cost"
                            />
                            <Button
                              type="button"
                              size="icon"
                              onClick={addPendingItem}
                              className="h-9 w-9 bg-green-600 hover:bg-green-700"
                              data-testid="btn-add-item"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingItem(null)}
                              className="h-9 w-9 text-gray-500 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-[1fr_100px_120px_auto_auto] gap-3 mt-1 text-xs text-gray-500">
                            <span></span>
                            <span className="text-center">Quantità</span>
                            <span className="text-center">Costo Unit.</span>
                            <span></span>
                            <span></span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Items list */}
                    {items.length > 0 ? (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Prodotto</TableHead>
                              <TableHead className="w-24 text-right">Quantità</TableHead>
                              <TableHead className="w-28 text-right">Costo Unit.</TableHead>
                              <TableHead className="w-28 text-right">Totale</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-xs text-gray-500">SKU: {item.productSku}</p>
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="number"
                                      min="1"
                                      value={editQuantity}
                                      onChange={(e) => setEditQuantity(e.target.value)}
                                      className="w-20 h-7 text-right"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editUnitCost}
                                      onChange={(e) => setEditUnitCost(e.target.value)}
                                      className="w-24 h-7 text-right"
                                    />
                                  ) : (
                                    `€ ${item.unitCost.toFixed(2)}`
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  € {(item.quantity * item.unitCost).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    {editingItemId === item.id ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={saveEdit}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Save className="h-4 w-4 text-green-600" />
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditing(item)}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setItemToDelete(item.id)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Nessun prodotto aggiunto</p>
                        <p className="text-sm">Usa la ricerca per aggiungere prodotti all'ordine</p>
                      </div>
                    )}

                    {/* Totals */}
                    {items.length > 0 && (
                      <div className="flex justify-end">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between gap-8 text-sm">
                            <span>Articoli:</span>
                            <span className="font-medium">{totalItems}</span>
                          </div>
                          <div className="flex justify-between gap-8 text-lg font-bold mt-2">
                            <span>Totale Ordine:</span>
                            <span>€ {totalValue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DialogFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Indietro
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleSuspendOrder}>
                      <Pause className="h-4 w-4 mr-2" />
                      Sospendi
                    </Button>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => setCurrentStep(3)}
                    disabled={items.length === 0}
                    data-testid="btn-to-summary"
                  >
                    Vai al Riepilogo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Summary */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-4">Riepilogo Ordine</h3>
                    
                    {/* Order details */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <p className="text-gray-500">Entità Legale</p>
                        <p className="font-medium">
                          {legalEntitiesData.find(e => e.id === form.getValues('legalEntityId'))?.nome || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fornitore</p>
                        <p className="font-medium">
                          {suppliersData.find(s => s.id === form.getValues('supplierId'))?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Data Documento</p>
                        <p className="font-medium">{form.getValues('documentDate')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Consegna Prevista</p>
                        <p className="font-medium">{form.getValues('expectedDeliveryDate') || '-'}</p>
                      </div>
                    </div>

                    {/* Products table */}
                    <div className="border rounded-md mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Prodotto</TableHead>
                            <TableHead className="text-right">Quantità</TableHead>
                            <TableHead className="text-right">Costo Unit.</TableHead>
                            <TableHead className="text-right">Totale</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-xs text-gray-500">SKU: {item.productSku}</p>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">€ {item.unitCost.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                € {(item.quantity * item.unitCost).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentStep(2);
                                      startEditing(item);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setItemToDelete(item.id)}
                                    className="h-7 w-7 p-0 text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between gap-8 text-sm">
                          <span>Totale Articoli:</span>
                          <span className="font-medium">{totalItems}</span>
                        </div>
                        <div className="flex justify-between gap-8 text-xl font-bold mt-2 text-blue-700">
                          <span>Totale Ordine:</span>
                          <span>€ {totalValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <DialogFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Modifica Prodotti
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveOrder}
                    disabled={saveOrderMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="btn-save-order"
                  >
                    {saveOrderMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salva Ordine
                  </Button>
                </DialogFooter>
              </div>
            )}
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere questo prodotto dall'ordine?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && removeItem(itemToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
