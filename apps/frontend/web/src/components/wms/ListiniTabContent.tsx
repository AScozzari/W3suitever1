import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, FileText, Search, X, CalendarIcon, RefreshCw, AlertCircle, Eye, Trash2,
  Package, Smartphone, Tv, ShoppingBag, CreditCard, Building2, ChevronRight, ChevronLeft,
  Check, Settings2, Layers, DollarSign, Calculator, ArrowRight, Wand2, Info, Euro,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

type PriceListType = 'no_promo' | 'canvas' | 'promo_device' | 'promo_canvas';
type SalesMode = 'ALL' | 'FIN' | 'VAR';

interface PriceListHeader {
  code: string;
  name: string;
  description: string;
  type: PriceListType;
  supplierId: string;
  validFrom: Date;
  validTo: Date | null;
}

interface SalesConfiguration {
  id: string;
  salesMode: SalesMode;
  financialEntityId?: string;
  financialEntityName?: string;
  installmentMethodId?: string;
  numberOfInstallments?: number;
  installmentAmount?: string;
  entryFee?: string;
  creditNoteAmount?: string;
  creditAssignmentAmount?: string;
  financingAmount?: string;
  validFrom: Date;
  validTo: Date | null;
}

interface ProductPair {
  id: string;
  physicalProductId: string;
  physicalProductName: string;
  physicalProductSku: string;
  canvasProductId: string;
  canvasProductName: string;
  canvasMonthlyFee: string;
  configurations: SalesConfiguration[];
}

interface NoPromoProduct {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productBrand: string;
  productCategory: string;
  productType: string;
  supplierSku: string;
  useInternalSku: boolean;
  purchaseCost: string;
  purchaseVatRateId: string;
  purchaseVatRegimeId: string;
  salesPriceVatIncl: string;
  salesVatRateId: string;
  salesVatRegimeId: string;
}

interface PromoDeviceProduct {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productBrand: string;
  productCategory: string;
  productType: string;
  supplierSku: string;
  useInternalSku: boolean;
  purchaseCost: string;
  purchaseVatRateId: string;
  purchaseVatRegimeId: string;
  salesPriceVatIncl: string;
  salesVatRateId: string;
  salesVatRegimeId: string;
  ndcAmount: string;
  discountType: 'percent' | 'euro';
  discountValue: string;
  publicPrice: string;
}

const PRICE_LIST_TYPES: { value: PriceListType; label: string; description: string; icon: any; color: string }[] = [
  { 
    value: 'no_promo', 
    label: 'Listino Base', 
    description: 'Prodotti fisici, virtuali e servizi a prezzo standard senza promozioni',
    icon: Package,
    color: '#3b82f6'
  },
  { 
    value: 'canvas', 
    label: 'Listino Canvas', 
    description: 'Solo prodotti Canvas (abbonamenti) con canone mensile',
    icon: Tv,
    color: '#8b5cf6'
  },
  { 
    value: 'promo_device', 
    label: 'Promo Device', 
    description: 'Dispositivi con prezzo promozionale che generano informazioni contabili',
    icon: Smartphone,
    color: '#f59e0b'
  },
  { 
    value: 'promo_canvas', 
    label: 'Promo Canvas Device', 
    description: 'Bundle: dispositivo fisico abbinato a offerta Canvas con rate',
    icon: Layers,
    color: '#10b981'
  }
];

export default function ListiniTabContent() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [priceListHeader, setPriceListHeader] = useState<PriceListHeader>({
    code: '',
    name: '',
    description: '',
    type: 'no_promo',
    supplierId: '',
    validFrom: new Date(),
    validTo: addMonths(new Date(), 12)
  });

  const [currentPair, setCurrentPair] = useState<Partial<ProductPair>>({
    configurations: []
  });
  const [savedPairs, setSavedPairs] = useState<ProductPair[]>([]);
  const [editingConfigIndex, setEditingConfigIndex] = useState<number | null>(null);
  const [editingPairId, setEditingPairId] = useState<string | null>(null);

  const [physicalSearchTerm, setPhysicalSearchTerm] = useState('');
  const [canvasSearchTerm, setCanvasSearchTerm] = useState('');
  const [physicalCategoryFilter, setPhysicalCategoryFilter] = useState<string>('all');
  const [canvasCategoryFilter, setCanvasCategoryFilter] = useState<string>('all');

  // No Promo products state
  const [noPromoProducts, setNoPromoProducts] = useState<NoPromoProduct[]>([]);
  const [noPromoSearchTerm, setNoPromoSearchTerm] = useState('');
  const [noPromoCategoryFilter, setNoPromoCategoryFilter] = useState<string>('all');
  const [noPromoTypeFilter, setNoPromoTypeFilter] = useState<string>('PHYSICAL');
  const [expandedProductRows, setExpandedProductRows] = useState<Set<string>>(new Set());

  // Promo Device products state
  const [promoDeviceProducts, setPromoDeviceProducts] = useState<PromoDeviceProduct[]>([]);
  const [promoDeviceSearchTerm, setPromoDeviceSearchTerm] = useState('');
  const [promoDeviceCategoryFilter, setPromoDeviceCategoryFilter] = useState<string>('all');
  const [promoDeviceTypeFilter, setPromoDeviceTypeFilter] = useState<string>('PHYSICAL');

  // Physical product type filter for Canvas Device
  const [physicalTypeFilter, setPhysicalTypeFilter] = useState<string>('PHYSICAL');

  // Versioning dialog state
  const [versioningDialogOpen, setVersioningDialogOpen] = useState(false);
  const [editingPriceListId, setEditingPriceListId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);

  const { data: priceListsData = [], isLoading: priceListsLoading, refetch: refetchPriceLists } = useQuery<any[]>({
    queryKey: ['/api/wms/price-lists']
  });

  const { data: suppliersData = [] } = useQuery({
    queryKey: ['/api/suppliers']
  });

  const { data: financialEntitiesData = [] } = useQuery({
    queryKey: ['/api/wms/financial-entities']
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ['/api/wms/products']
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['/api/wms/categories']
  });

  const { data: vatRatesData = [] } = useQuery({
    queryKey: ['/api/reference/vat-rates']
  });

  const { data: vatRegimesData = [] } = useQuery({
    queryKey: ['/api/reference/vat-regimes']
  });

  const { data: supplierMappingsData = [] } = useQuery({
    queryKey: ['/api/wms/product-supplier-mappings', priceListHeader.supplierId],
    enabled: !!priceListHeader.supplierId
  });

  const safeSuppliers = Array.isArray(suppliersData) ? suppliersData : [];
  // VAT rates endpoint returns { success: true, data: [...] }
  const safeVatRates = Array.isArray(vatRatesData) 
    ? vatRatesData 
    : (vatRatesData as any)?.data && Array.isArray((vatRatesData as any).data) 
      ? (vatRatesData as any).data 
      : [];
  // VAT regimes endpoint returns { success: true, data: [...] }
  const safeVatRegimes = Array.isArray(vatRegimesData) 
    ? vatRegimesData 
    : (vatRegimesData as any)?.data && Array.isArray((vatRegimesData as any).data) 
      ? (vatRegimesData as any).data 
      : [];
  const safeSupplierMappings = Array.isArray(supplierMappingsData) ? supplierMappingsData : [];
  const safeFinancialEntities = Array.isArray(financialEntitiesData) ? financialEntitiesData : [];
  const safeProducts = Array.isArray(productsData) ? productsData : [];
  // Categories endpoint returns { success: true, data: [...] }
  const safeCategories = Array.isArray(categoriesData) 
    ? categoriesData 
    : (categoriesData as any)?.data && Array.isArray((categoriesData as any).data) 
      ? (categoriesData as any).data 
      : [];
  const safePriceLists = Array.isArray(priceListsData) ? priceListsData : [];

  // Genera codice listino progressivo
  const generatePriceListCode = () => {
    const year = new Date().getFullYear();
    const prefix = `LST-${year}-`;
    
    // Trova il numero più alto esistente per quest'anno
    const existingNumbers = safePriceLists
      .map((pl: any) => pl.code)
      .filter((code: string) => code?.startsWith(prefix))
      .map((code: string) => {
        const numPart = code.replace(prefix, '');
        return parseInt(numPart, 10);
      })
      .filter((n: number) => !isNaN(n));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    
    return `${prefix}${nextNumber}`;
  };

  // Products filtered by type for Canvas Device physical section
  const physicalProducts = useMemo(() => 
    safeProducts.filter((p: any) => p.type === physicalTypeFilter),
    [safeProducts, physicalTypeFilter]
  );

  // Canvas products for Canvas/Canvas Device canvas section
  const canvasProducts = useMemo(() => 
    safeProducts.filter((p: any) => p.type === 'CANVAS'),
    [safeProducts]
  );

  // Products filtered by type for No Promo (Standard) listino
  const noPromoFilteredByType = useMemo(() => 
    safeProducts.filter((p: any) => p.type === noPromoTypeFilter),
    [safeProducts, noPromoTypeFilter]
  );

  const filteredPhysicalProducts = useMemo(() => {
    // Mostra prodotti solo se c'è almeno 2 caratteri di ricerca o una categoria selezionata
    if (physicalSearchTerm.length < 2 && physicalCategoryFilter === 'all') {
      return [];
    }
    return physicalProducts.filter((p: any) => {
      if (physicalSearchTerm.length >= 2) {
        const search = physicalSearchTerm.toLowerCase();
        if (!p.name?.toLowerCase().includes(search) && !p.sku?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (physicalCategoryFilter !== 'all' && p.categoryId !== physicalCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [physicalProducts, physicalSearchTerm, physicalCategoryFilter]);

  const filteredCanvasProducts = useMemo(() => {
    // Mostra prodotti solo se c'è almeno 2 caratteri di ricerca o una categoria selezionata
    if (canvasSearchTerm.length < 2 && canvasCategoryFilter === 'all') {
      return [];
    }
    return canvasProducts.filter((p: any) => {
      if (canvasSearchTerm.length >= 2) {
        const search = canvasSearchTerm.toLowerCase();
        if (!p.name?.toLowerCase().includes(search) && !p.sku?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (canvasCategoryFilter !== 'all' && p.categoryId !== canvasCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [canvasProducts, canvasSearchTerm, canvasCategoryFilter]);

  const resetWizard = () => {
    setWizardStep(1);
    setPriceListHeader({
      code: '',
      name: '',
      description: '',
      type: 'no_promo',
      supplierId: '',
      validFrom: new Date(),
      validTo: addMonths(new Date(), 12)
    });
    setCurrentPair({ configurations: [] });
    setSavedPairs([]);
    setNoPromoProducts([]);
    setPhysicalSearchTerm('');
    setCanvasSearchTerm('');
    setNoPromoSearchTerm('');
    setPhysicalCategoryFilter('all');
    setCanvasCategoryFilter('all');
    setNoPromoCategoryFilter('all');
    setNoPromoTypeFilter('PHYSICAL');
    setPhysicalTypeFilter('PHYSICAL');
  };

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    resetWizard();
  };

  const selectPhysicalProduct = (product: any) => {
    setCurrentPair(prev => ({
      ...prev,
      physicalProductId: product.id,
      physicalProductName: product.name,
      physicalProductSku: product.sku
    }));
  };

  const selectCanvasProduct = (product: any) => {
    setCurrentPair(prev => ({
      ...prev,
      canvasProductId: product.id,
      canvasProductName: product.name,
      canvasMonthlyFee: product.monthlyFee || '0'
    }));
  };

  const isPairComplete = currentPair.physicalProductId && currentPair.canvasProductId;

  const addConfiguration = () => {
    const newConfig: SalesConfiguration = {
      id: `config-${Date.now()}`,
      salesMode: 'ALL',
      validFrom: priceListHeader.validFrom,
      validTo: priceListHeader.validTo,
      creditNoteAmount: '',
      creditAssignmentAmount: '',
      financingAmount: ''
    };
    setCurrentPair(prev => ({
      ...prev,
      configurations: [...(prev.configurations || []), newConfig]
    }));
    setEditingConfigIndex((currentPair.configurations || []).length);
  };

  const updateConfiguration = (index: number, updates: Partial<SalesConfiguration>) => {
    setCurrentPair(prev => {
      const configs = [...(prev.configurations || [])];
      configs[index] = { ...configs[index], ...updates };
      return { ...prev, configurations: configs };
    });
  };

  const removeConfiguration = (index: number) => {
    setCurrentPair(prev => ({
      ...prev,
      configurations: (prev.configurations || []).filter((_, i) => i !== index)
    }));
    if (editingConfigIndex === index) {
      setEditingConfigIndex(null);
    }
  };

  const savePair = () => {
    if (!isPairComplete || (currentPair.configurations || []).length === 0) return;

    if (editingPairId) {
      // Aggiorna coppia esistente
      setSavedPairs(prev => prev.map(pair => 
        pair.id === editingPairId 
          ? {
              ...pair,
              configurations: currentPair.configurations || []
            }
          : pair
      ));
      setEditingPairId(null);
    } else {
      // Crea nuova coppia
      const newPair: ProductPair = {
        id: `pair-${Date.now()}`,
        physicalProductId: currentPair.physicalProductId!,
        physicalProductName: currentPair.physicalProductName!,
        physicalProductSku: currentPair.physicalProductSku!,
        canvasProductId: currentPair.canvasProductId!,
        canvasProductName: currentPair.canvasProductName!,
        canvasMonthlyFee: currentPair.canvasMonthlyFee || '0',
        configurations: currentPair.configurations || []
      };
      setSavedPairs(prev => [...prev, newPair]);
    }
    
    setCurrentPair({ configurations: [] });
    setEditingConfigIndex(null);
  };

  // Funzione per caricare una coppia salvata per modifica
  const loadPairForEditing = (pair: ProductPair) => {
    setCurrentPair({
      physicalProductId: pair.physicalProductId,
      physicalProductName: pair.physicalProductName,
      physicalProductSku: pair.physicalProductSku,
      canvasProductId: pair.canvasProductId,
      canvasProductName: pair.canvasProductName,
      canvasMonthlyFee: pair.canvasMonthlyFee,
      configurations: [...pair.configurations]
    });
    setEditingPairId(pair.id);
    setEditingConfigIndex(null);
  };

  const handleSavePriceList = async () => {
    try {
      // Prepare no_promo items with pricing info
      const noPromoItems = priceListHeader.type === 'no_promo' 
        ? noPromoProducts.map(p => ({
            productId: p.productId,
            supplierSku: p.useInternalSku ? p.productSku : p.supplierSku,
            useInternalSku: p.useInternalSku,
            purchaseCost: p.purchaseCost,
            purchaseVatRateId: p.purchaseVatRateId,
            purchaseVatRegimeId: p.purchaseVatRegimeId,
            salesPriceVatIncl: p.salesPriceVatIncl,
            salesVatRateId: p.salesVatRateId,
            salesVatRegimeId: p.salesVatRegimeId
          }))
        : [];

      const payload = {
        header: {
          code: priceListHeader.code,
          name: priceListHeader.name,
          description: priceListHeader.description,
          type: priceListHeader.type,
          supplierId: priceListHeader.supplierId || null,
          validFrom: priceListHeader.validFrom.toISOString(),
          validTo: priceListHeader.validTo?.toISOString() || null
        },
        pairs: priceListHeader.type === 'promo_canvas' ? savedPairs : [],
        items: noPromoItems
      };

      await apiRequest('/api/wms/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Save new SKU mappings for no_promo products
      if (priceListHeader.type === 'no_promo' && priceListHeader.supplierId) {
        const mappingsToSave = noPromoProducts.filter(p => !p.useInternalSku && p.supplierSku);
        for (const product of mappingsToSave) {
          try {
            await apiRequest('/api/wms/product-supplier-mappings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.productId,
                supplierId: priceListHeader.supplierId,
                supplierSku: product.supplierSku,
                useInternalSku: false,
                isPrimary: true
              })
            });
          } catch (e) {
            // Ignore errors for existing mappings
            console.log('Mapping might already exist:', e);
          }
        }
        // Invalidate mappings cache
        queryClient.invalidateQueries({ queryKey: ['/api/wms/product-supplier-mappings'] });
      }

      await refetchPriceLists();
      closeWizard();
    } catch (error) {
      console.error('Error saving price list:', error);
      alert(error instanceof Error ? error.message : 'Errore nella creazione del listino');
    }
  };

  // Check if a price list is currently active
  const isPriceListActive = (priceList: any) => {
    const now = new Date();
    return priceList.isActive && 
      new Date(priceList.validFrom) <= now && 
      (!priceList.validTo || new Date(priceList.validTo) >= now);
  };

  // Handle edit button click - show versioning dialog if active
  const handleEditPriceList = (priceList: any) => {
    if (isPriceListActive(priceList)) {
      setEditingPriceListId(priceList.id);
      setPendingUpdate(priceList);
      setChangeReason('');
      setVersioningDialogOpen(true);
    } else {
      // Non-active lists can be edited directly (future feature)
      alert('La modifica diretta sarà disponibile nella prossima versione');
    }
  };

  // Handle versioning dialog confirmation
  const handleVersioningConfirm = async (createNewVersion: boolean) => {
    if (!editingPriceListId || !pendingUpdate) return;

    try {
      const payload = {
        header: {
          name: pendingUpdate.name,
          description: pendingUpdate.description,
          validFrom: pendingUpdate.validFrom,
          validTo: pendingUpdate.validTo
        },
        createNewVersion,
        changeReason: createNewVersion ? changeReason : undefined
      };

      const result = await apiRequest(`/api/wms/price-lists/${editingPriceListId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refetchPriceLists();
      setVersioningDialogOpen(false);
      setEditingPriceListId(null);
      setPendingUpdate(null);
      setChangeReason('');
      
      alert(result.isNewVersion 
        ? `Creata nuova versione del listino`
        : 'Listino aggiornato con successo');
    } catch (error) {
      console.error('Error updating price list:', error);
      alert(error instanceof Error ? error.message : 'Errore nella modifica del listino');
    }
  };

  // Handle delete
  const handleDeletePriceList = async (priceList: any) => {
    if (priceList.origin === 'brand') {
      alert('I listini brand non possono essere eliminati');
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare il listino "${priceList.name}"?`)) {
      return;
    }

    try {
      await apiRequest(`/api/wms/price-lists/${priceList.id}`, {
        method: 'DELETE'
      });

      await refetchPriceLists();
    } catch (error) {
      console.error('Error deleting price list:', error);
      alert(error instanceof Error ? error.message : 'Errore nella cancellazione');
    }
  };

  const getStepTitle = () => {
    switch (wizardStep) {
      case 1: return 'Seleziona Tipo Listino';
      case 2: return 'Informazioni Listino';
      case 3: return priceListHeader.type === 'promo_canvas' ? 'Configura Abbinamenti' : 'Aggiungi Prodotti';
      case 4: return 'Riepilogo';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return true;
      case 2: 
        const baseValid = priceListHeader.code && priceListHeader.name && priceListHeader.validFrom;
        if (priceListHeader.type === 'no_promo') {
          return baseValid && !!priceListHeader.supplierId;
        }
        return baseValid;
      case 3: 
        if (priceListHeader.type === 'promo_canvas') {
          return savedPairs.length > 0;
        }
        if (priceListHeader.type === 'no_promo') {
          return noPromoProducts.length > 0;
        }
        return true;
      default: return true;
    }
  };

  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-4">
      {PRICE_LIST_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = priceListHeader.type === type.value;
        return (
          <Card
            key={type.value}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-offset-2' : 'hover:bg-gray-50'
            }`}
            style={{
              borderColor: isSelected ? type.color : undefined,
              boxShadow: isSelected ? `0 0 0 2px ${type.color}` : undefined
            }}
            onClick={() => setPriceListHeader(prev => ({ ...prev, type: type.value }))}
            data-testid={`card-type-${type.value}`}
          >
            <div className="flex items-start gap-4">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${type.color}20` }}
              >
                <Icon className="h-8 w-8" style={{ color: type.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{type.label}</h3>
                  {isSelected && (
                    <Check className="h-5 w-5" style={{ color: type.color }} />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col h-full justify-between gap-6">
      {/* Sezione superiore: Codice e Nome */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Codice Listino *</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={priceListHeader.code}
              onChange={(e) => setPriceListHeader(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="es. LST-2025-001"
              className="flex-1"
              data-testid="input-pricelist-code"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPriceListHeader(prev => ({ ...prev, code: generatePriceListCode() }))}
              title="Genera codice automatico"
              data-testid="button-generate-code"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome Listino *</Label>
          <Input
            id="name"
            value={priceListHeader.name}
            onChange={(e) => setPriceListHeader(prev => ({ ...prev, name: e.target.value }))}
            placeholder="es. Promo Natale 2025"
            data-testid="input-pricelist-name"
          />
        </div>
      </div>

      {/* Sezione centrale: Descrizione (si espande) */}
      <div className="flex-1 flex flex-col space-y-1.5">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          value={priceListHeader.description}
          onChange={(e) => setPriceListHeader(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrizione opzionale del listino..."
          className="flex-1 min-h-[80px] resize-none"
          data-testid="input-pricelist-description"
        />
      </div>

      {/* Sezione inferiore: Date e Fornitore */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valido Dal *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-valid-from">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {priceListHeader.validFrom ? format(priceListHeader.validFrom, 'dd/MM/yyyy', { locale: it }) : 'Seleziona...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={4} style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                <Calendar
                  mode="single"
                  selected={priceListHeader.validFrom}
                  onSelect={(date) => date && setPriceListHeader(prev => ({ ...prev, validFrom: date }))}
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Valido Fino A</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-valid-to">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {priceListHeader.validTo ? format(priceListHeader.validTo, 'dd/MM/yyyy', { locale: it }) : 'Nessuna scadenza'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={4} style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                <Calendar
                  mode="single"
                  selected={priceListHeader.validTo || undefined}
                  onSelect={(date) => setPriceListHeader(prev => ({ ...prev, validTo: date || null }))}
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {(priceListHeader.type === 'no_promo' || priceListHeader.type === 'promo_device') && (
          <div className="space-y-1.5">
            <Label>
              Fornitore {priceListHeader.type === 'no_promo' && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={priceListHeader.supplierId} 
              onValueChange={(val) => setPriceListHeader(prev => ({ ...prev, supplierId: val }))}
            >
              <SelectTrigger 
                data-testid="select-supplier"
                className={priceListHeader.type === 'no_promo' && !priceListHeader.supplierId ? 'border-red-300' : ''}
              >
                <SelectValue placeholder={priceListHeader.type === 'no_promo' ? "Seleziona fornitore *" : "Seleziona fornitore (opzionale)"} />
              </SelectTrigger>
              <SelectContent>
                {priceListHeader.type !== 'no_promo' && (
                  <SelectItem value="">Nessun fornitore</SelectItem>
                )}
                {safeSuppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {priceListHeader.type === 'no_promo' && (
              <p className="text-xs text-gray-500">Il fornitore è obbligatorio per i listini base</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3PromoCanvas = () => (
    <div className="space-y-6">
      {/* Riepilogo selezioni correnti */}
      {(currentPair.physicalProductId || currentPair.canvasProductId) && !isPairComplete && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Prodotto Fisico</div>
              {currentPair.physicalProductId ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{currentPair.physicalProductName}</span>
                  <span className="text-sm text-gray-500">({currentPair.physicalProductSku})</span>
                </div>
              ) : (
                <span className="text-gray-400">Non selezionato</span>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Prodotto Canvas</div>
              {currentPair.canvasProductId ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{currentPair.canvasProductName}</span>
                </div>
              ) : (
                <span className="text-gray-400">Non selezionato</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isPairComplete ? (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold">Prodotto Fisico</h4>
              {currentPair.physicalProductId && (
                <Badge variant="secondary" className="ml-auto">
                  <Check className="h-3 w-3 mr-1" />
                  Selezionato
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome o SKU..."
                  value={physicalSearchTerm}
                  onChange={(e) => setPhysicalSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-physical"
                />
              </div>

              {/* Type filter for physical products */}
              <Select value={physicalTypeFilter} onValueChange={setPhysicalTypeFilter}>
                <SelectTrigger data-testid="select-physical-type">
                  <SelectValue placeholder="Tipo prodotto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL">Fisico</SelectItem>
                  <SelectItem value="VIRTUAL">Digitale</SelectItem>
                  <SelectItem value="SERVICE">Servizio</SelectItem>
                </SelectContent>
              </Select>

              <Select value={physicalCategoryFilter} onValueChange={setPhysicalCategoryFilter}>
                <SelectTrigger data-testid="select-physical-category">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {safeCategories.filter((c: any) => c.productType === physicalTypeFilter).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ScrollArea className="h-[280px] border rounded-lg">
                {filteredPhysicalProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>{physicalSearchTerm.length < 2 && physicalCategoryFilter === 'all' 
                      ? 'Digita almeno 2 caratteri o seleziona una categoria' 
                      : 'Nessun prodotto trovato'}</p>
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="p-2 space-y-2">
                      {filteredPhysicalProducts.map((product: any) => (
                        <Tooltip key={product.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                currentPair.physicalProductId === product.id 
                                  ? 'bg-orange-100 border-2 border-orange-500' 
                                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                              }`}
                              onClick={() => selectPhysicalProduct(product)}
                              data-testid={`product-physical-${product.id}`}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500 flex flex-wrap gap-x-2">
                                <span className="font-mono">{product.sku}</span>
                                {product.brand && <span>• {product.brand}</span>}
                                {product.color && <span className="text-blue-600">• {product.color}</span>}
                                {product.memory && <span className="text-purple-600">• {product.memory}</span>}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-gray-900 text-white p-3">
                            {renderProductTooltip(product)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                )}
              </ScrollArea>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="h-5 w-5 text-purple-500" />
              <h4 className="font-semibold">Prodotto Canvas</h4>
              {currentPair.canvasProductId && (
                <Badge variant="secondary" className="ml-auto">
                  <Check className="h-3 w-3 mr-1" />
                  Selezionato
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome o SKU..."
                  value={canvasSearchTerm}
                  onChange={(e) => setCanvasSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-canvas"
                />
              </div>

              <Select value={canvasCategoryFilter} onValueChange={setCanvasCategoryFilter}>
                <SelectTrigger data-testid="select-canvas-category">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {safeCategories.filter((c: any) => c.productType === 'CANVAS').map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ScrollArea className="h-[300px] border rounded-lg">
                {filteredCanvasProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Tv className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>{canvasSearchTerm.length < 2 && canvasCategoryFilter === 'all' 
                      ? 'Digita almeno 2 caratteri o seleziona una categoria' 
                      : 'Nessun prodotto Canvas trovato'}</p>
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="p-2 space-y-2">
                      {filteredCanvasProducts.map((product: any) => (
                        <Tooltip key={product.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                currentPair.canvasProductId === product.id 
                                  ? 'bg-purple-100 border-2 border-purple-500' 
                                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                              }`}
                              onClick={() => selectCanvasProduct(product)}
                              data-testid={`product-canvas-${product.id}`}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500 flex flex-wrap gap-x-2">
                                <span className="font-mono">{product.sku}</span>
                                {product.monthlyFee && <span className="text-green-600">€{product.monthlyFee}/mese</span>}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="bg-gray-900 text-white p-3">
                            {renderProductTooltip(product)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                )}
              </ScrollArea>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 bg-gradient-to-r from-orange-50 to-purple-50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Smartphone className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium">{currentPair.physicalProductName}</div>
                  <div className="text-sm text-gray-500">SKU: {currentPair.physicalProductSku}</div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex items-center gap-2 flex-1">
                <Tv className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="font-medium">{currentPair.canvasProductName}</div>
                  <div className="text-sm text-gray-500">€{currentPair.canvasMonthlyFee}/mese</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentPair({ configurations: [] })}
                data-testid="button-change-pair"
              >
                <X className="h-4 w-4 mr-1" />
                Cambia
              </Button>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurazioni Vendita ({(currentPair.configurations || []).length})
            </h4>
            <Button onClick={addConfiguration} size="sm" data-testid="button-add-config">
              <Plus className="h-4 w-4 mr-1" />
              Nuova Configurazione
            </Button>
          </div>

          {(currentPair.configurations || []).length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">Nessuna configurazione di vendita</p>
              <Button onClick={addConfiguration} data-testid="button-add-first-config">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Prima Configurazione
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {(currentPair.configurations || []).map((config, index) => (
                <Card key={config.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant={config.salesMode === 'ALL' ? 'default' : config.salesMode === 'FIN' ? 'secondary' : 'outline'}>
                      {config.salesMode === 'ALL' && 'Pagamento Unico'}
                      {config.salesMode === 'FIN' && 'Finanziamento'}
                      {config.salesMode === 'VAR' && 'Variabile'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeConfiguration(index)} data-testid={`button-remove-config-${index}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Modalità Vendita *</Label>
                      <Select 
                        value={config.salesMode} 
                        onValueChange={(val: SalesMode) => updateConfiguration(index, { salesMode: val })}
                      >
                        <SelectTrigger data-testid={`select-sales-mode-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">ALL - Pagamento Unico</SelectItem>
                          <SelectItem value="FIN">FIN - Finanziamento</SelectItem>
                          <SelectItem value="VAR">VAR - Variabile (RID/CDC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.salesMode === 'FIN' && (
                      <div>
                        <Label>Ente Finanziante *</Label>
                        <Select 
                          value={config.financialEntityId || ''} 
                          onValueChange={(val) => {
                            const entity = safeFinancialEntities.find((e: any) => e.id === val);
                            updateConfiguration(index, { 
                              financialEntityId: val,
                              financialEntityName: entity?.name || ''
                            });
                          }}
                        >
                          <SelectTrigger data-testid={`select-financial-entity-${index}`}>
                            <SelectValue placeholder="Seleziona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {safeFinancialEntities.map((e: any) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(config.salesMode === 'FIN' || config.salesMode === 'VAR') && (
                      <>
                        <div>
                          <Label>Numero Rate</Label>
                          <Select 
                            value={config.numberOfInstallments?.toString() || ''} 
                            onValueChange={(val) => updateConfiguration(index, { numberOfInstallments: parseInt(val) })}
                          >
                            <SelectTrigger data-testid={`select-installments-${index}`}>
                              <SelectValue placeholder="Rate..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12 rate</SelectItem>
                              <SelectItem value="24">24 rate</SelectItem>
                              <SelectItem value="36">36 rate</SelectItem>
                              <SelectItem value="48">48 rate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Importo Rata (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={config.installmentAmount || ''}
                            onChange={(e) => updateConfiguration(index, { installmentAmount: e.target.value })}
                            placeholder="0.00"
                            data-testid={`input-installment-amount-${index}`}
                          />
                        </div>
                        <div>
                          <Label>Anticipo (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={config.entryFee || ''}
                            onChange={(e) => updateConfiguration(index, { entryFee: e.target.value })}
                            placeholder="0.00"
                            data-testid={`input-entry-fee-${index}`}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Calculator className="h-4 w-4" />
                      Informazioni Contabili
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Nota di Credito (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.creditNoteAmount || ''}
                          onChange={(e) => updateConfiguration(index, { creditNoteAmount: e.target.value })}
                          placeholder="0.00"
                          data-testid={`input-credit-note-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Cessione Credito (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.creditAssignmentAmount || ''}
                          onChange={(e) => updateConfiguration(index, { creditAssignmentAmount: e.target.value })}
                          placeholder="0.00"
                          data-testid={`input-credit-assignment-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Finanziamento (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.financingAmount || ''}
                          onChange={(e) => updateConfiguration(index, { financingAmount: e.target.value })}
                          placeholder="0.00"
                          data-testid={`input-financing-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {(currentPair.configurations || []).length > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t mt-4">
              <Button 
                variant="outline"
                onClick={addConfiguration}
                className="flex-1"
                data-testid="button-add-another-config"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Configurazione
              </Button>
              <Button 
                onClick={savePair}
                className="flex-1"
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-complete-and-new-pair"
              >
                <Check className="h-4 w-4 mr-2" />
                {editingPairId ? 'Aggiorna Coppia' : 'Salva Coppia'}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setCurrentPair({ configurations: [] });
                  setEditingPairId(null);
                }} 
                className="text-gray-400 hover:text-red-500"
                data-testid="button-cancel-pair"
                title="Annulla"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {savedPairs.length > 0 && (
        <div className="mt-8">
          <Separator className="mb-4" />
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Coppie Salvate ({savedPairs.length})
          </h4>
          <div className="space-y-3">
            {savedPairs.map((pair) => (
              <Card 
                key={pair.id} 
                className={`p-4 cursor-pointer transition-all hover:border-orange-300 ${editingPairId === pair.id ? 'border-orange-500 bg-orange-50' : ''}`}
                onClick={() => loadPairForEditing(pair)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium">{pair.physicalProductName}</span>
                      <span className="text-gray-400 mx-2">+</span>
                      <span className="font-medium">{pair.canvasProductName}</span>
                    </div>
                    <Badge variant="outline">{pair.configurations.length} configurazioni</Badge>
                    {editingPairId === pair.id && (
                      <Badge className="bg-orange-500 text-white">In modifica</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        loadPairForEditing(pair);
                      }}
                      data-testid={`button-edit-pair-${pair.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi Config
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedPairs(prev => prev.filter(p => p.id !== pair.id));
                        if (editingPairId === pair.id) {
                          setEditingPairId(null);
                          setCurrentPair({ configurations: [] });
                        }
                      }}
                      data-testid={`button-remove-pair-${pair.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const getSupplierMapping = (productId: string) => {
    return safeSupplierMappings.find((m: any) => m.productId === productId);
  };

  const getDefaultVatRate = () => {
    return safeVatRates.find((r: any) => r.code === 'STD' || r.ratePercent === '22.00') || safeVatRates[0];
  };

  const getDefaultVatRegime = () => {
    return safeVatRegimes.find((r: any) => r.code === 'ORDINARIO' || r.name?.includes('Ordinario')) || safeVatRegimes[0];
  };

  const calculateMargin = (purchaseCost: string, salesPriceVatIncl: string, vatRate: string = '22') => {
    const cost = parseFloat(purchaseCost) || 0;
    const priceIncl = parseFloat(salesPriceVatIncl) || 0;
    const rate = parseFloat(vatRate) || 22;
    const priceExcl = priceIncl / (1 + rate / 100);
    if (cost === 0) return { margin: 0, percentage: 0 };
    const margin = priceExcl - cost;
    const percentage = (margin / cost) * 100;
    return { margin, percentage };
  };

  const getProductCompletionStatus = (product: NoPromoProduct): 'complete' | 'partial' | 'empty' => {
    const hasCost = !!product.purchaseCost && parseFloat(product.purchaseCost) > 0;
    const hasPrice = !!product.salesPriceVatIncl && parseFloat(product.salesPriceVatIncl) > 0;
    const hasSku = product.useInternalSku || (!!product.supplierSku && product.supplierSku.trim() !== '');
    const hasVatRates = !!product.purchaseVatRateId && !!product.salesVatRateId;
    
    const allComplete = hasCost && hasPrice && hasSku && hasVatRates;
    const anyFilled = hasCost || hasPrice || (!!product.supplierSku && !product.useInternalSku);
    
    if (allComplete) return 'complete';
    if (anyFilled) return 'partial';
    return 'empty';
  };

  const toggleProductRow = (productId: string) => {
    setExpandedProductRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const collapseIfComplete = (productId: string) => {
    const product = noPromoProducts.find(p => p.id === productId);
    if (product && getProductCompletionStatus(product) === 'complete') {
      setExpandedProductRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const addProductToNoPromo = (product: any) => {
    if (noPromoProducts.some(p => p.productId === product.id)) return;
    
    const mapping = getSupplierMapping(product.id);
    const defaultVatRate = getDefaultVatRate();
    const defaultVatRegime = getDefaultVatRegime();
    
    const newProductId = crypto.randomUUID();
    const newProduct: NoPromoProduct = {
      id: newProductId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productBrand: product.brand || '',
      productCategory: safeCategories.find((c: any) => c.id === product.categoryId)?.name || '',
      productType: product.type,
      supplierSku: mapping?.supplierSku || '',
      useInternalSku: mapping?.useInternalSku || !mapping?.supplierSku,
      purchaseCost: '',
      purchaseVatRateId: defaultVatRate?.id || '',
      purchaseVatRegimeId: defaultVatRegime?.id || '',
      salesPriceVatIncl: '',
      salesVatRateId: defaultVatRate?.id || '',
      salesVatRegimeId: defaultVatRegime?.id || ''
    };
    
    setNoPromoProducts(prev => [...prev, newProduct]);
  };

  const updateNoPromoProduct = (id: string, field: keyof NoPromoProduct, value: any) => {
    setNoPromoProducts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removeNoPromoProduct = (id: string) => {
    setNoPromoProducts(prev => prev.filter(p => p.id !== id));
  };

  // ===== PROMO DEVICE FUNCTIONS =====
  const getPromoDeviceCompletionStatus = (product: PromoDeviceProduct): 'complete' | 'partial' | 'empty' => {
    const hasPrice = !!product.salesPriceVatIncl && parseFloat(product.salesPriceVatIncl) > 0;
    const hasSku = product.useInternalSku || (!!product.supplierSku && product.supplierSku.trim() !== '');
    const hasDiscount = !!product.discountValue && parseFloat(product.discountValue) > 0;
    const hasPublicPrice = !!product.publicPrice && parseFloat(product.publicPrice) > 0;
    
    const allComplete = hasPrice && hasSku && hasDiscount && hasPublicPrice;
    const anyFilled = hasPrice || hasDiscount || (!!product.supplierSku && !product.useInternalSku);
    
    if (allComplete) return 'complete';
    if (anyFilled) return 'partial';
    return 'empty';
  };

  const calculatePublicPrice = (salesPrice: string, discountType: 'percent' | 'euro', discountValue: string): string => {
    const price = parseFloat(salesPrice) || 0;
    const discount = parseFloat(discountValue) || 0;
    if (price <= 0) return '';
    
    let finalPrice: number;
    if (discountType === 'percent') {
      finalPrice = price - (price * discount / 100);
    } else {
      finalPrice = price - discount;
    }
    
    return finalPrice > 0 ? finalPrice.toFixed(2) : '0.00';
  };

  const addProductToPromoDevice = (product: any) => {
    if (promoDeviceProducts.some(p => p.productId === product.id)) return;
    
    const mapping = getSupplierMapping(product.id);
    const defaultVatRate = getDefaultVatRate();
    const defaultVatRegime = getDefaultVatRegime();
    
    const newProductId = crypto.randomUUID();
    const newProduct: PromoDeviceProduct = {
      id: newProductId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productBrand: product.brand || '',
      productCategory: safeCategories.find((c: any) => c.id === product.categoryId)?.name || '',
      productType: product.type,
      supplierSku: mapping?.supplierSku || '',
      useInternalSku: mapping?.useInternalSku || !mapping?.supplierSku,
      purchaseCost: '',
      purchaseVatRateId: defaultVatRate?.id || '',
      purchaseVatRegimeId: defaultVatRegime?.id || '',
      salesPriceVatIncl: '',
      salesVatRateId: defaultVatRate?.id || '',
      salesVatRegimeId: defaultVatRegime?.id || '',
      ndcAmount: '',
      discountType: 'euro',
      discountValue: '',
      publicPrice: ''
    };
    
    setPromoDeviceProducts(prev => [...prev, newProduct]);
  };

  const updatePromoDeviceProduct = (id: string, field: keyof PromoDeviceProduct, value: any) => {
    setPromoDeviceProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const updated = { ...p, [field]: value };
      
      if (field === 'salesPriceVatIncl' || field === 'discountType' || field === 'discountValue') {
        updated.publicPrice = calculatePublicPrice(
          field === 'salesPriceVatIncl' ? value : updated.salesPriceVatIncl,
          field === 'discountType' ? value : updated.discountType,
          field === 'discountValue' ? value : updated.discountValue
        );
      }
      
      return updated;
    }));
  };

  const removePromoDeviceProduct = (id: string) => {
    setPromoDeviceProducts(prev => prev.filter(p => p.id !== id));
  };

  const promoDeviceFilteredByType = useMemo(() => {
    return safeProducts.filter((p: any) => {
      if (promoDeviceTypeFilter === 'all') return true;
      return p.type === promoDeviceTypeFilter;
    });
  }, [safeProducts, promoDeviceTypeFilter]);

  const filteredPromoDeviceProducts = useMemo(() => {
    if (promoDeviceSearchTerm.length < 2 && promoDeviceCategoryFilter === 'all') {
      return [];
    }
    
    return promoDeviceFilteredByType.filter((p: any) => {
      if (promoDeviceCategoryFilter !== 'all' && p.categoryId !== promoDeviceCategoryFilter) return false;
      if (promoDeviceSearchTerm && promoDeviceSearchTerm.length >= 2) {
        const search = promoDeviceSearchTerm.toLowerCase();
        return p.name?.toLowerCase().includes(search) || 
               p.sku?.toLowerCase().includes(search) ||
               p.brand?.toLowerCase().includes(search);
      }
      return promoDeviceCategoryFilter !== 'all';
    });
  }, [promoDeviceFilteredByType, promoDeviceCategoryFilter, promoDeviceSearchTerm]);

  const filteredNoPromoProducts = useMemo(() => {
    // Show products only after 2+ characters typed (optimized for barcode scanner)
    if (noPromoSearchTerm.length < 2 && noPromoCategoryFilter === 'all') {
      return [];
    }
    
    // Use type-filtered products instead of all products
    return noPromoFilteredByType.filter((p: any) => {
      if (noPromoCategoryFilter !== 'all' && p.categoryId !== noPromoCategoryFilter) return false;
      if (noPromoSearchTerm && noPromoSearchTerm.length >= 2) {
        const search = noPromoSearchTerm.toLowerCase();
        return p.name?.toLowerCase().includes(search) || 
               p.sku?.toLowerCase().includes(search) ||
               p.brand?.toLowerCase().includes(search);
      }
      return noPromoCategoryFilter !== 'all'; // Show only if category filter is active
    });
  }, [noPromoFilteredByType, noPromoCategoryFilter, noPromoSearchTerm]);

  const selectedSupplierName = useMemo(() => {
    return safeSuppliers.find((s: any) => s.id === priceListHeader.supplierId)?.name || '';
  }, [safeSuppliers, priceListHeader.supplierId]);

  // Helper to render product tooltip content
  const renderProductTooltip = (product: any) => (
    <div className="text-xs space-y-1 max-w-xs">
      <div className="font-semibold text-sm border-b pb-1 mb-1">{product.name}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-gray-400">SKU:</span><span className="font-mono">{product.sku || '-'}</span>
        <span className="text-gray-400">Brand:</span><span>{product.brand || '-'}</span>
        <span className="text-gray-400">Modello:</span><span>{product.model || '-'}</span>
        <span className="text-gray-400">Colore:</span><span>{product.color || '-'}</span>
        <span className="text-gray-400">Memoria:</span><span>{product.memory || '-'}</span>
        <span className="text-gray-400">EAN:</span><span className="font-mono">{product.ean || '-'}</span>
        <span className="text-gray-400">Tipo:</span><span>{product.type || '-'}</span>
        <span className="text-gray-400">Stato:</span><span>{product.status || '-'}</span>
      </div>
      {product.description && (
        <div className="pt-1 border-t mt-1">
          <span className="text-gray-400">Descrizione:</span>
          <p className="text-gray-300 line-clamp-2">{product.description}</p>
        </div>
      )}
    </div>
  );

  const renderStep3NoPromo = () => (
    <TooltipProvider>
      <div className="flex gap-4 h-full">
        {/* Left panel: Product search - full height with independent scroll */}
        <div className="w-1/3 flex flex-col border rounded-lg min-h-0">
          <div className="p-3 border-b bg-gray-50 shrink-0">
            <h4 className="font-semibold text-sm mb-2">Catalogo Prodotti</h4>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca prodotto o scansiona barcode..."
                value={noPromoSearchTerm}
                onChange={(e) => setNoPromoSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
                data-testid="input-search-nopromo"
              />
            </div>
            {/* Type filter */}
            <Select value={noPromoTypeFilter} onValueChange={setNoPromoTypeFilter}>
              <SelectTrigger className="h-8 text-sm mb-2" data-testid="select-type-nopromo">
                <SelectValue placeholder="Tipo prodotto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHYSICAL">Fisico</SelectItem>
                <SelectItem value="VIRTUAL">Digitale</SelectItem>
                <SelectItem value="SERVICE">Servizio</SelectItem>
              </SelectContent>
            </Select>
            {/* Category filter */}
            <Select value={noPromoCategoryFilter} onValueChange={setNoPromoCategoryFilter}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-category-nopromo">
                <SelectValue placeholder="Tutte le categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {safeCategories
                  .filter((cat: any) => cat.productType === noPromoTypeFilter)
                  .map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome || cat.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2 space-y-1">
              {filteredNoPromoProducts.slice(0, 50).map((product: any) => {
                const isAdded = noPromoProducts.some(p => p.productId === product.id);
                return (
                  <Tooltip key={product.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          isAdded 
                            ? 'bg-green-50 border-green-200 opacity-60' 
                            : 'hover:bg-blue-50 border-gray-200'
                        }`}
                        onClick={() => !isAdded && addProductToNoPromo(product)}
                        data-testid={`product-row-${product.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{product.name}</div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                              <span className="font-mono">{product.sku}</span>
                              {product.brand && <span>• {product.brand}</span>}
                              {product.color && <span className="text-blue-600">• {product.color}</span>}
                              {product.memory && <span className="text-purple-600">• {product.memory}</span>}
                            </div>
                          </div>
                          {isAdded ? (
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-900 text-white p-3">
                      {renderProductTooltip(product)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {filteredNoPromoProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {noPromoSearchTerm.length < 2 && noPromoCategoryFilter === 'all' ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Digita almeno 2 caratteri per cercare</p>
                      <p className="text-xs mt-1">Oppure seleziona una categoria</p>
                    </>
                  ) : (
                    'Nessun prodotto trovato'
                  )}
                </div>
              )}
              {filteredNoPromoProducts.length > 50 && (
                <div className="text-center py-2 text-gray-400 text-xs">
                  Mostrando 50 di {filteredNoPromoProducts.length} prodotti
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Added products with collapsible rows - full height with independent scroll */}
        <div className="flex-1 flex flex-col border rounded-lg min-h-0">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between shrink-0">
            <div>
              <h4 className="font-semibold text-sm">Prodotti nel Listino</h4>
              <p className="text-xs text-gray-500">Fornitore: {selectedSupplierName}</p>
            </div>
            <Badge variant="secondary">{noPromoProducts.length} prodotti</Badge>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-3 space-y-3">
              {noPromoProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessun prodotto aggiunto</p>
                  <p className="text-xs">Seleziona prodotti dal catalogo</p>
                </div>
              ) : (
                noPromoProducts.map((product) => {
                  const selectedSalesVatRate = safeVatRates.find((r: any) => r.id === product.salesVatRateId);
                  const { margin, percentage } = calculateMargin(
                    product.purchaseCost, 
                    product.salesPriceVatIncl,
                    selectedSalesVatRate?.ratePercent
                  );
                  const fullProductInfo = safeProducts.find((p: any) => p.id === product.productId);
                  const completionStatus = getProductCompletionStatus(product);
                  const isExpanded = expandedProductRows.has(product.id);
                  
                  return (
                    <Collapsible 
                      key={product.id} 
                      open={isExpanded}
                      onOpenChange={() => toggleProductRow(product.id)}
                      className="border rounded-lg bg-white overflow-hidden"
                      data-testid={`nopromo-product-${product.id}`}
                    >
                      {/* COLLAPSIBLE HEADER - Compact row with full anagrafica */}
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        {/* Completion Badge */}
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          completionStatus === 'complete' ? 'bg-emerald-500' :
                          completionStatus === 'partial' ? 'bg-amber-500' :
                          'bg-red-400'
                        }`} data-testid={`badge-status-${product.id}`} />
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 truncate">{product.productName}</span>
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                              {product.productType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                            <span className="font-mono">{product.productSku}</span>
                            {product.productBrand && <span>• {product.productBrand}</span>}
                            {fullProductInfo?.memory && <span className="text-purple-600">• {fullProductInfo.memory}</span>}
                            {fullProductInfo?.color && <span className="text-blue-600">• {fullProductInfo.color}</span>}
                            {fullProductInfo?.ean && <span className="text-gray-400">• EAN: {fullProductInfo.ean}</span>}
                          </div>
                        </div>

                        {/* Sales Price Preview (when collapsed) */}
                        {!isExpanded && product.salesPriceVatIncl && (
                          <div className="text-sm font-semibold px-2 py-0.5 rounded text-blue-700 bg-blue-50">
                            €{parseFloat(product.salesPriceVatIncl).toFixed(2)}
                          </div>
                        )}

                        {/* Toggle Button */}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-expand-${product.id}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 shrink-0"
                          onClick={(e) => { e.stopPropagation(); removeNoPromoProduct(product.id); }}
                          data-testid={`button-remove-nopromo-${product.id}`}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      {/* COLLAPSIBLE CONTENT - Pricing fields in compact grid */}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-gray-50/50">
                          {/* SKU Fornitore Row */}
                          <div className="flex items-center gap-3 pt-3">
                            <div className="flex-1 max-w-xs">
                              <Label className="text-xs text-gray-600 mb-1 block">SKU Fornitore</Label>
                              <Input
                                value={product.useInternalSku ? product.productSku : product.supplierSku}
                                onChange={(e) => updateNoPromoProduct(product.id, 'supplierSku', e.target.value)}
                                disabled={product.useInternalSku}
                                className="h-9 text-sm font-mono"
                                placeholder="SKU fornitore"
                                data-testid={`input-supplier-sku-${product.id}`}
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer h-9 px-2 rounded border border-gray-200 bg-white hover:bg-gray-50 text-xs">
                              <Checkbox
                                checked={product.useInternalSku}
                                onCheckedChange={(checked) => updateNoPromoProduct(product.id, 'useInternalSku', !!checked)}
                                data-testid={`checkbox-internal-sku-${product.id}`}
                              />
                              <span className="text-gray-700">Usa SKU interno</span>
                            </label>
                          </div>

                          {/* Pricing Grid - 2 columns, compact */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Costo Acquisto */}
                            <div className="space-y-2 p-2 rounded border bg-white">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Costo Acquisto</span>
                                <Tooltip>
                                  <TooltipTrigger asChild><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white text-xs">IVA esclusa</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={product.purchaseCost}
                                  onChange={(e) => updateNoPromoProduct(product.id, 'purchaseCost', e.target.value)}
                                  className="h-9 pl-6 text-sm font-semibold"
                                  placeholder="0.00"
                                  data-testid={`input-purchase-cost-${product.id}`}
                                />
                              </div>
                              <Select value={product.purchaseVatRateId} onValueChange={(val) => updateNoPromoProduct(product.id, 'purchaseVatRateId', val)}>
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-purchase-vat-${product.id}`}>
                                  <SelectValue placeholder="Aliquota IVA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeVatRates.map((rate: any) => (
                                    <SelectItem key={rate.id} value={rate.id}>{rate.ratePercent}%</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={product.purchaseVatRegimeId || ''} onValueChange={(val) => updateNoPromoProduct(product.id, 'purchaseVatRegimeId', val)}>
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-purchase-regime-${product.id}`}>
                                  <SelectValue placeholder="Regime" />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeVatRegimes.map((regime: any) => (
                                    <SelectItem key={regime.id} value={regime.id}>{regime.code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Prezzo Vendita */}
                            <div className="space-y-2 p-2 rounded border bg-white">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Prezzo Vendita</span>
                                <Tooltip>
                                  <TooltipTrigger asChild><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white text-xs">IVA inclusa</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={product.salesPriceVatIncl}
                                  onChange={(e) => updateNoPromoProduct(product.id, 'salesPriceVatIncl', e.target.value)}
                                  className="h-9 pl-6 text-sm font-semibold"
                                  placeholder="0.00"
                                  data-testid={`input-sales-price-${product.id}`}
                                />
                              </div>
                              <Select value={product.salesVatRateId} onValueChange={(val) => updateNoPromoProduct(product.id, 'salesVatRateId', val)}>
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-sales-vat-${product.id}`}>
                                  <SelectValue placeholder="Aliquota IVA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeVatRates.map((rate: any) => (
                                    <SelectItem key={rate.id} value={rate.id}>{rate.ratePercent}%</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={product.salesVatRegimeId || ''} onValueChange={(val) => updateNoPromoProduct(product.id, 'salesVatRegimeId', val)}>
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-sales-regime-${product.id}`}>
                                  <SelectValue placeholder="Regime" />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeVatRegimes.map((regime: any) => (
                                    <SelectItem key={regime.id} value={regime.id}>{regime.code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Margin Row */}
                          <div className={`flex items-center justify-between rounded px-3 py-2 ${
                            margin > 0 ? 'bg-emerald-50 border border-emerald-200' : 
                            margin < 0 ? 'bg-red-50 border border-red-200' : 
                            'bg-gray-100 border border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Calculator className={`h-4 w-4 ${margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-red-600' : 'text-gray-500'}`} />
                              <span className="text-sm text-gray-700">Margine</span>
                              <Tooltip>
                                <TooltipTrigger asChild><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white text-xs">Al netto dell'IVA</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${margin > 0 ? 'text-emerald-700' : margin < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                €{margin.toFixed(2)}
                              </span>
                              <Badge className={`text-xs ${
                                margin > 0 ? 'bg-emerald-100 text-emerald-700' : 
                                margin < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  const renderStep3PromoDevice = () => (
    <TooltipProvider>
      <div className="flex gap-4 h-full">
        {/* Left panel: Product search */}
        <div className="w-1/3 flex flex-col border rounded-lg min-h-0">
          <div className="p-3 border-b bg-gray-50 shrink-0">
            <h4 className="font-semibold text-sm mb-2">Catalogo Prodotti</h4>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca prodotto o scansiona barcode..."
                value={promoDeviceSearchTerm}
                onChange={(e) => setPromoDeviceSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
                data-testid="input-search-promodevice"
              />
            </div>
            <Select value={promoDeviceTypeFilter} onValueChange={setPromoDeviceTypeFilter}>
              <SelectTrigger className="h-8 text-sm mb-2" data-testid="select-type-promodevice">
                <SelectValue placeholder="Tipo prodotto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHYSICAL">Fisico</SelectItem>
                <SelectItem value="VIRTUAL">Digitale</SelectItem>
                <SelectItem value="SERVICE">Servizio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={promoDeviceCategoryFilter} onValueChange={setPromoDeviceCategoryFilter}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-category-promodevice">
                <SelectValue placeholder="Tutte le categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {safeCategories
                  .filter((cat: any) => cat.productType === promoDeviceTypeFilter && cat.id)
                  .map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome || cat.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2 space-y-1">
              {filteredPromoDeviceProducts.slice(0, 50).map((product: any) => {
                const isAdded = promoDeviceProducts.some(p => p.productId === product.id);
                return (
                  <Tooltip key={product.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          isAdded 
                            ? 'bg-green-50 border-green-200 opacity-60' 
                            : 'hover:bg-orange-50 border-gray-200'
                        }`}
                        onClick={() => !isAdded && addProductToPromoDevice(product)}
                        data-testid={`promodevice-product-row-${product.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{product.name}</div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                              <span className="font-mono">{product.sku}</span>
                              {product.brand && <span>• {product.brand}</span>}
                              {product.color && <span className="text-blue-600">• {product.color}</span>}
                              {product.memory && <span className="text-purple-600">• {product.memory}</span>}
                            </div>
                          </div>
                          {isAdded ? (
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Plus className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-900 text-white p-3">
                      {renderProductTooltip(product)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {filteredPromoDeviceProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {promoDeviceSearchTerm.length < 2 && promoDeviceCategoryFilter === 'all' ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Digita almeno 2 caratteri per cercare</p>
                      <p className="text-xs mt-1">Oppure seleziona una categoria</p>
                    </>
                  ) : (
                    'Nessun prodotto trovato'
                  )}
                </div>
              )}
              {filteredPromoDeviceProducts.length > 50 && (
                <div className="text-center py-2 text-gray-400 text-xs">
                  Mostrando 50 di {filteredPromoDeviceProducts.length} prodotti
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Added products with collapsible rows */}
        <div className="flex-1 flex flex-col border rounded-lg min-h-0">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between shrink-0">
            <div>
              <h4 className="font-semibold text-sm">Prodotti nel Listino</h4>
              <p className="text-xs text-gray-500">Fornitore: {selectedSupplierName}</p>
            </div>
            <Badge variant="secondary">{promoDeviceProducts.length} prodotti</Badge>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-3 space-y-3">
              {promoDeviceProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessun prodotto aggiunto</p>
                  <p className="text-xs">Seleziona prodotti dal catalogo</p>
                </div>
              ) : (
                promoDeviceProducts.map((product) => {
                  const fullProductInfo = safeProducts.find((p: any) => p.id === product.productId);
                  const completionStatus = getPromoDeviceCompletionStatus(product);
                  const isExpanded = expandedProductRows.has(product.id);
                  
                  return (
                    <Collapsible 
                      key={product.id} 
                      open={isExpanded}
                      onOpenChange={() => toggleProductRow(product.id)}
                      className="border rounded-lg bg-white overflow-hidden"
                      data-testid={`promodevice-product-${product.id}`}
                    >
                      {/* COLLAPSIBLE HEADER */}
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          completionStatus === 'complete' ? 'bg-emerald-500' :
                          completionStatus === 'partial' ? 'bg-amber-500' :
                          'bg-red-400'
                        }`} data-testid={`badge-status-promodevice-${product.id}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 truncate">{product.productName}</span>
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 bg-orange-50 text-orange-700 border-orange-200">
                              PROMO
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                            <span className="font-mono">{product.productSku}</span>
                            {product.productBrand && <span>• {product.productBrand}</span>}
                            {fullProductInfo?.memory && <span className="text-purple-600">• {fullProductInfo.memory}</span>}
                            {fullProductInfo?.color && <span className="text-blue-600">• {fullProductInfo.color}</span>}
                            {fullProductInfo?.ean && <span className="text-gray-400">• EAN: {fullProductInfo.ean}</span>}
                          </div>
                        </div>

                        {/* Public Price Preview (when collapsed) */}
                        {!isExpanded && product.publicPrice && (
                          <div className="text-sm font-semibold px-2 py-0.5 rounded text-orange-700 bg-orange-50">
                            €{parseFloat(product.publicPrice).toFixed(2)}
                          </div>
                        )}

                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-expand-promodevice-${product.id}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 shrink-0"
                          onClick={(e) => { e.stopPropagation(); removePromoDeviceProduct(product.id); }}
                          data-testid={`button-remove-promodevice-${product.id}`}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      {/* COLLAPSIBLE CONTENT */}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-gray-50/50">
                          {/* SKU Fornitore Row */}
                          <div className="flex items-center gap-3 pt-3">
                            <div className="flex-1 max-w-xs">
                              <Label className="text-xs text-gray-600 mb-1 block">SKU Fornitore</Label>
                              <Input
                                value={product.useInternalSku ? product.productSku : product.supplierSku}
                                onChange={(e) => updatePromoDeviceProduct(product.id, 'supplierSku', e.target.value)}
                                disabled={product.useInternalSku}
                                className="h-9 text-sm font-mono"
                                placeholder="SKU fornitore"
                                data-testid={`input-supplier-sku-promodevice-${product.id}`}
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer h-9 px-2 rounded border border-gray-200 bg-white hover:bg-gray-50 text-xs">
                              <Checkbox
                                checked={product.useInternalSku}
                                onCheckedChange={(checked) => updatePromoDeviceProduct(product.id, 'useInternalSku', !!checked)}
                                data-testid={`checkbox-internal-sku-promodevice-${product.id}`}
                              />
                              <span className="text-gray-700">Usa SKU interno</span>
                            </label>
                          </div>

                          {/* Pricing Grid - 2 columns */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Costo Acquisto - Facoltativo */}
                            <div className="space-y-2 p-2 rounded border bg-white">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Costo Acquisto</span>
                                <Badge variant="outline" className="text-[9px] h-4 px-1 text-gray-400 border-gray-300">Facoltativo</Badge>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={product.purchaseCost}
                                  onChange={(e) => updatePromoDeviceProduct(product.id, 'purchaseCost', e.target.value)}
                                  className="h-9 pl-6 text-sm font-semibold"
                                  placeholder="0.00"
                                  data-testid={`input-purchase-cost-promodevice-${product.id}`}
                                />
                              </div>
                              {product.purchaseVatRateId && (
                                <Select value={product.purchaseVatRateId} onValueChange={(val) => updatePromoDeviceProduct(product.id, 'purchaseVatRateId', val)}>
                                  <SelectTrigger className="h-8 text-xs" data-testid={`select-purchase-vat-promodevice-${product.id}`}>
                                    <SelectValue placeholder="Aliquota IVA" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {safeVatRates.filter((rate: any) => rate.id).map((rate: any) => (
                                      <SelectItem key={rate.id} value={rate.id}>{rate.ratePercent}%</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {/* Prezzo Vendita */}
                            <div className="space-y-2 p-2 rounded border bg-white">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Prezzo Vendita</span>
                                <span className="text-red-500">*</span>
                                <Tooltip>
                                  <TooltipTrigger asChild><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white text-xs">IVA inclusa</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={product.salesPriceVatIncl}
                                  onChange={(e) => updatePromoDeviceProduct(product.id, 'salesPriceVatIncl', e.target.value)}
                                  className="h-9 pl-6 text-sm font-semibold"
                                  placeholder="0.00"
                                  data-testid={`input-sales-price-promodevice-${product.id}`}
                                />
                              </div>
                              {product.salesVatRateId && (
                                <Select value={product.salesVatRateId} onValueChange={(val) => updatePromoDeviceProduct(product.id, 'salesVatRateId', val)}>
                                  <SelectTrigger className="h-8 text-xs" data-testid={`select-sales-vat-promodevice-${product.id}`}>
                                    <SelectValue placeholder="Aliquota IVA" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {safeVatRates.filter((rate: any) => rate.id).map((rate: any) => (
                                      <SelectItem key={rate.id} value={rate.id}>{rate.ratePercent}%</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Promo Row: NDC + Sconto + Prezzo Pubblico */}
                          <div className={`flex items-center justify-between rounded px-3 py-2 bg-orange-50 border border-orange-200`}>
                            <div className="flex items-center gap-4">
                              {/* NDC */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-700 font-medium">NDC:</span>
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={product.ndcAmount}
                                    onChange={(e) => updatePromoDeviceProduct(product.id, 'ndcAmount', e.target.value)}
                                    className="h-7 pl-5 text-xs bg-white"
                                    placeholder="0.00"
                                    data-testid={`input-ndc-promodevice-${product.id}`}
                                  />
                                </div>
                              </div>

                              {/* Sconto */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-700 font-medium">Sconto:</span>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant={product.discountType === 'euro' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-7 w-7 p-0 text-xs ${product.discountType === 'euro' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    onClick={() => updatePromoDeviceProduct(product.id, 'discountType', 'euro')}
                                    data-testid={`button-discount-euro-${product.id}`}
                                  >
                                    €
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={product.discountType === 'percent' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-7 w-7 p-0 text-xs ${product.discountType === 'percent' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    onClick={() => updatePromoDeviceProduct(product.id, 'discountType', 'percent')}
                                    data-testid={`button-discount-percent-${product.id}`}
                                  >
                                    %
                                  </Button>
                                  <div className="relative w-20">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={product.discountValue}
                                      onChange={(e) => updatePromoDeviceProduct(product.id, 'discountValue', e.target.value)}
                                      className="h-7 text-xs bg-white pr-6"
                                      placeholder="0"
                                      data-testid={`input-discount-value-promodevice-${product.id}`}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                      {product.discountType === 'percent' ? '%' : '€'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Prezzo Pubblico */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-orange-700 font-medium">Prezzo Pubblico:</span>
                              <span className="text-lg font-bold text-orange-700">
                                €{product.publicPrice ? parseFloat(product.publicPrice).toFixed(2) : '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  const renderStep3Simple = () => (
    <div className="p-8 text-center">
      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
      <h3 className="text-xl font-semibold mb-2">Aggiungi Prodotti al Listino</h3>
      <p className="text-gray-500 mb-6">
        {priceListHeader.type === 'canvas' && 'Aggiungi prodotti Canvas con canone mensile'}
      </p>
      <p className="text-sm text-amber-600">
        Funzionalità in sviluppo - Usa il tipo "Promo Canvas + Device" per la demo completa
      </p>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Riepilogo Listino</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Codice:</span>
            <span className="ml-2 font-medium">{priceListHeader.code}</span>
          </div>
          <div>
            <span className="text-gray-500">Nome:</span>
            <span className="ml-2 font-medium">{priceListHeader.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Tipo:</span>
            <span className="ml-2">
              <Badge>{PRICE_LIST_TYPES.find(t => t.value === priceListHeader.type)?.label}</Badge>
            </span>
          </div>
          <div>
            <span className="text-gray-500">Validità:</span>
            <span className="ml-2 font-medium">
              {format(priceListHeader.validFrom, 'dd/MM/yyyy', { locale: it })}
              {priceListHeader.validTo && ` - ${format(priceListHeader.validTo, 'dd/MM/yyyy', { locale: it })}`}
            </span>
          </div>
        </div>
      </Card>

      {priceListHeader.type === 'promo_canvas' && savedPairs.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Coppie Configurate ({savedPairs.length})</h4>
          <div className="space-y-4">
            {savedPairs.map((pair) => (
              <div key={pair.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="font-medium mb-2">
                  {pair.physicalProductName} + {pair.canvasProductName}
                </div>
                <div className="flex flex-wrap gap-2">
                  {pair.configurations.map((config, idx) => (
                    <Badge key={idx} variant="outline">
                      {config.salesMode}
                      {config.numberOfInstallments && ` ${config.numberOfInstallments}x`}
                      {config.installmentAmount && ` €${config.installmentAmount}`}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {priceListHeader.type === 'no_promo' && noPromoProducts.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Prodotti nel Listino ({noPromoProducts.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Prodotto</th>
                  <th className="text-left py-2 font-medium">SKU</th>
                  <th className="text-right py-2 font-medium">Costo (IVA escl.)</th>
                  <th className="text-right py-2 font-medium">Prezzo (IVA incl.)</th>
                  <th className="text-right py-2 font-medium">Margine</th>
                </tr>
              </thead>
              <tbody>
                {noPromoProducts.map((product) => {
                  const salesVatRate = safeVatRates.find((r: any) => r.id === product.salesVatRateId);
                  const { margin, percentage } = calculateMargin(
                    product.purchaseCost,
                    product.salesPriceVatIncl,
                    salesVatRate?.ratePercent
                  );
                  return (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{product.productName}</div>
                        <div className="text-xs text-gray-500">{product.productBrand}</div>
                      </td>
                      <td className="py-2 text-gray-600">
                        {product.useInternalSku ? product.productSku : product.supplierSku}
                      </td>
                      <td className="py-2 text-right">€{parseFloat(product.purchaseCost || '0').toFixed(2)}</td>
                      <td className="py-2 text-right">€{parseFloat(product.salesPriceVatIncl || '0').toFixed(2)}</td>
                      <td className={`py-2 text-right ${margin > 0 ? 'text-green-600' : margin < 0 ? 'text-red-600' : ''}`}>
                        €{margin.toFixed(2)} ({percentage.toFixed(1)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="listini-content">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }} data-testid="listini-title">
            Listini Prezzi
          </h2>
          <p className="text-gray-600" data-testid="listini-subtitle">
            Gestione listini prezzi e politiche commerciali
          </p>
        </div>
        <Button
          style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
          onClick={openWizard}
          data-testid="button-new-pricelist"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Listino
        </Button>
      </div>

      <Card className="p-4" style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(229, 231, 235, 0.8)'
      }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Ricerca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome, codice listino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-pricelist"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="select-type-filter">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                {PRICE_LIST_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Stato</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="expired">Scaduti</SelectItem>
                <SelectItem value="future">Futuri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); }}
              className="text-gray-500"
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Pulisci
            </Button>
          )}
        </div>
      </Card>

      {priceListsLoading ? (
        <Card className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Caricamento listini...</p>
        </Card>
      ) : priceListsData.length === 0 ? (
        <Card style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}>
          <div className="p-8 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2" data-testid="empty-state-title">Nessun listino presente</h3>
            <p className="text-gray-500 mb-6" data-testid="empty-state-subtitle">
              Crea il tuo primo listino per iniziare a gestire i prezzi
            </p>
            <Button onClick={openWizard} data-testid="button-create-first-pricelist">
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Listino
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {priceListsData.map((priceList: any) => {
            const typeInfo = PRICE_LIST_TYPES.find(t => t.value === priceList.type);
            const Icon = typeInfo?.icon || FileText;
            const isActive = isPriceListActive(priceList);
            const now = new Date();
            const isFuture = new Date(priceList.validFrom) > now;
            const isExpired = priceList.validTo && new Date(priceList.validTo) < now;

            return (
              <Card 
                key={priceList.id}
                className="p-4 hover:shadow-lg transition-shadow"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: isActive ? `2px solid ${typeInfo?.color || '#10b981'}` : '1px solid rgba(0,0,0,0.1)'
                }}
                data-testid={`card-pricelist-${priceList.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${typeInfo?.color || '#6b7280'}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: typeInfo?.color || '#6b7280' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{priceList.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {priceList.code}
                        </Badge>
                        {priceList.version && priceList.version > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            v{priceList.version}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{typeInfo?.label || priceList.type}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(priceList.validFrom), 'dd/MM/yyyy', { locale: it })}
                          {priceList.validTo && ` - ${format(new Date(priceList.validTo), 'dd/MM/yyyy', { locale: it })}`}
                        </span>
                        {priceList.origin === 'brand' && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              Brand
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      className={`${
                        isActive ? 'bg-green-100 text-green-700' :
                        isFuture ? 'bg-blue-100 text-blue-700' :
                        isExpired ? 'bg-gray-100 text-gray-500' :
                        'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isActive ? 'Attivo' : isFuture ? 'Futuro' : isExpired ? 'Scaduto' : 'Inattivo'}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditPriceList(priceList)}
                        data-testid={`button-edit-pricelist-${priceList.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {priceList.origin !== 'brand' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletePriceList(priceList)}
                          data-testid={`button-delete-pricelist-${priceList.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent 
          className={`${wizardStep <= 2 ? 'max-w-3xl' : 'max-w-7xl h-[90vh]'} overflow-hidden flex flex-col`}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        wizardStep === step 
                          ? 'bg-orange-500 text-white' 
                          : wizardStep > step 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {wizardStep > step ? <Check className="h-4 w-4" /> : step}
                    </div>
                    {step < 4 && <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />}
                  </div>
                ))}
              </div>
              <span className="text-lg">{getStepTitle()}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Wizard per la creazione di un nuovo listino prezzi
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="py-4 px-4 h-full min-h-[calc(85vh-180px)]">
              {wizardStep === 1 && renderStep1()}
              {wizardStep === 2 && renderStep2()}
              {wizardStep === 3 && (
                priceListHeader.type === 'promo_canvas' 
                  ? renderStep3PromoCanvas() 
                  : priceListHeader.type === 'no_promo'
                    ? renderStep3NoPromo()
                    : priceListHeader.type === 'promo_device'
                      ? renderStep3PromoDevice()
                      : renderStep3Simple()
              )}
              {wizardStep === 4 && renderStep4()}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : closeWizard()}
                data-testid="button-wizard-back"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {wizardStep > 1 ? 'Indietro' : 'Annulla'}
              </Button>

              {wizardStep < 4 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canProceed()}
                  data-testid="button-wizard-next"
                >
                  Avanti
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSavePriceList}
                  style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                  data-testid="button-wizard-save"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salva Listino
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versioning Dialog */}
      <Dialog open={versioningDialogOpen} onOpenChange={setVersioningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Listino Attivo - Gestione Versione
            </DialogTitle>
            <DialogDescription className="sr-only">
              Scegli come procedere con la modifica del listino attivo
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Attenzione:</strong> Stai modificando un listino attualmente in vigore.
                Le modifiche potrebbero influenzare le vendite in corso.
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Scegli come procedere:
            </p>

            <div className="space-y-3">
              <Card 
                className="p-4 cursor-pointer hover:bg-gray-50 border-2 hover:border-green-500 transition-all"
                onClick={() => handleVersioningConfirm(true)}
                data-testid="card-create-new-version"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-700">Crea Nuova Versione</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Mantiene lo storico: la versione corrente viene chiusa e ne viene creata una nuova.
                      Raccomandato per tracciabilità.
                    </p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:bg-gray-50 border-2 hover:border-amber-500 transition-all"
                onClick={() => handleVersioningConfirm(false)}
                data-testid="card-update-in-place"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <RefreshCw className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-700">Aggiorna In-Place</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Sovrascrive i dati esistenti senza creare versioni.
                      Usare solo per correzioni minori.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              <Label htmlFor="changeReason">Motivo della modifica (opzionale)</Label>
              <Textarea
                id="changeReason"
                placeholder="Es: Aggiornamento prezzi Q1 2025..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                data-testid="input-change-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setVersioningDialogOpen(false)}
              data-testid="button-versioning-cancel"
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
