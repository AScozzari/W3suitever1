import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Building2, 
  FileText, 
  Calendar, 
  Package,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Barcode,
  Hash,
  ScanLine,
  X,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Clock,
  Edit,
  Warehouse,
  Save,
  Pause,
  RefreshCw,
  Eye,
  ChevronDown,
  Filter,
  Link,
  Truck,
  Users,
  Store,
  Send
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { SupplierCombobox } from './SupplierCombobox';

// ==================== INTERFACES ====================

interface LegalEntityFromAPI {
  id: string;
  nome: string;
  codice: string;
  pIva?: string;
  codiceFiscale?: string;
  stato: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
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
  legalEntityId?: string;
  legalEntityName?: string;
}

interface SupplierFromAPI {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  supplierType: string;
  vatNumber?: string;
  status: string;
  origin: string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
  pec?: string;
}

interface CustomerFromAPI {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  vatNumber?: string;
  fiscalCode?: string;
  status: string;
  customerType: string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
  pec?: string;
  sdiCode?: string;
}

interface OrderFromAPI {
  id: string;
  orderNumber: string;
  supplierId?: string;
  customerId?: string;
  status: string;
  items: OrderItemFromAPI[];
  totalQuantity: number;
  receivedQuantity: number;
}

interface OrderItemFromAPI {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  supplierSku?: string;
  ean?: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityResidual: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  supplierSku?: string;
  ean?: string;
  description?: string;
  brand?: string;
  model?: string;
  color?: string;
  memory?: string;
  isSerializable: boolean;
  serialType?: 'imei' | 'iccid' | 'mac_address' | 'other';
  serialCount?: number;
}

interface DDTItem {
  id: string;
  product: Product;
  quantity: number;
  serials: string[];
  lot?: string;
  unitPrice?: number;
  vatRateId?: string;
  vatRate?: number;
  vatAmount?: number;
  unitPriceGross?: number;
  vatRegimeId?: string;
  bulkLoaded?: boolean;
  orderItemId?: string;
  matchStatus?: 'match' | 'partial' | 'extra' | 'pending';
  orderedQuantity?: number;
}

// DDT Causale types
type DDTCausale = 
  | 'sale'              // Vendita → Cliente
  | 'purchase'          // Acquisto → Fornitore (passivo)
  | 'service_send'      // Invio assistenza → Fornitore/Service
  | 'service_return'    // Ritorno assistenza → Fornitore/Service (passivo)
  | 'doa_return'        // Reso DOA → Fornitore
  | 'internal_transfer' // Trasferimento interno → Magazzino
  | 'supplier_return'   // Reso fornitore → Fornitore
  | 'customer_return'   // Reso cliente → Cliente (passivo)
  | 'loan'              // Comodato → Cliente/Fornitore
  | 'other';            // Altro → Libero

type DDTDirection = 'active' | 'passive';
type RecipientType = 'customer' | 'supplier' | 'store';

interface CausaleConfig {
  label: string;
  direction: DDTDirection;
  recipientType: RecipientType | RecipientType[];
  logisticStatus: string;
}

const CAUSALE_CONFIG: Record<DDTCausale, CausaleConfig> = {
  sale: { label: 'Vendita', direction: 'active', recipientType: 'customer', logisticStatus: 'shipping' },
  purchase: { label: 'Acquisto', direction: 'passive', recipientType: 'supplier', logisticStatus: 'in_stock' },
  service_send: { label: 'Invio in Assistenza', direction: 'active', recipientType: 'supplier', logisticStatus: 'in_service' },
  service_return: { label: 'Ritorno da Assistenza', direction: 'passive', recipientType: 'supplier', logisticStatus: 'in_stock' },
  doa_return: { label: 'Reso DOA', direction: 'active', recipientType: 'supplier', logisticStatus: 'doa_return' },
  internal_transfer: { label: 'Trasferimento Interno', direction: 'active', recipientType: 'store', logisticStatus: 'in_transfer' },
  supplier_return: { label: 'Reso Fornitore', direction: 'active', recipientType: 'supplier', logisticStatus: 'supplier_return' },
  customer_return: { label: 'Reso Cliente', direction: 'passive', recipientType: 'customer', logisticStatus: 'customer_return' },
  loan: { label: 'Comodato d\'Uso', direction: 'active', recipientType: ['customer', 'supplier'], logisticStatus: 'shipping' },
  other: { label: 'Altro', direction: 'active', recipientType: ['customer', 'supplier', 'store'], logisticStatus: 'shipping' },
};

// ==================== FORM SCHEMA ====================

const ddtSchema = z.object({
  legalEntityId: z.string().min(1, 'Seleziona la ragione sociale emittente'),
  issuingStoreId: z.string().optional(),
  causale: z.string().min(1, 'Seleziona la causale'),
  recipientType: z.string().min(1, 'Tipo destinatario richiesto'),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  destinationStoreId: z.string().optional(),
  orderId: z.string().optional(),
  documentNumber: z.string().min(1, 'Inserisci il numero DDT'),
  documentDate: z.string().min(1, 'Seleziona la data'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof ddtSchema>;

// ==================== PROPS ====================

interface DDTModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DDTFormData) => void;
}

interface DDTFormData {
  legalEntityId: string;
  issuingStoreId?: string;
  causale: DDTCausale;
  direction: DDTDirection;
  recipientType: RecipientType;
  customerId?: string;
  supplierId?: string;
  destinationStoreId?: string;
  orderId?: string;
  documentNumber: string;
  documentDate: string;
  notes?: string;
  items: DDTItem[];
}

// ==================== HELPERS ====================

const isLikelyEAN = (code: string): boolean => {
  const cleaned = code.replace(/\s/g, '');
  return /^\d{8}$/.test(cleaned) || /^\d{13}$/.test(cleaned);
};

const isLikelyIMEI = (code: string): boolean => {
  const cleaned = code.replace(/\s/g, '');
  return /^\d{15}$/.test(cleaned) || /^\d{14}$/.test(cleaned);
};

const isLikelyICCID = (code: string): boolean => {
  const cleaned = code.replace(/\s/g, '');
  return /^89\d{17,18}$/.test(cleaned) || /^\d{19,20}$/.test(cleaned);
};

const isLikelyMAC = (code: string): boolean => {
  const cleaned = code.replace(/[\s:-]/g, '').toUpperCase();
  return /^[0-9A-F]{12}$/.test(cleaned);
};

const isGloballyUnique = (serialType?: string): boolean => {
  return serialType === 'imei' || serialType === 'iccid' || serialType === 'mac_address';
};

const getSerialLabel = (serialType?: string): string => {
  switch (serialType) {
    case 'imei': return 'IMEI';
    case 'iccid': return 'ICCID';
    case 'mac_address': return 'MAC Address';
    case 'other': return 'Seriale';
    default: return 'Codice';
  }
};

const normalizeSerial = (serial: string, serialType?: string): string => {
  const trimmed = serial.trim();
  if (serialType === 'mac_address') {
    return trimmed.replace(/[:\-.]/g, '').toUpperCase();
  }
  if (serialType === 'imei' || serialType === 'iccid') {
    return trimmed.replace(/\D/g, '');
  }
  return trimmed;
};

const MAX_VISIBLE_RESULTS = 10;

// ==================== COMPONENT ====================

export function DDTModal({ open, onOpenChange, onSubmit }: DDTModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<DDTItem[]>([]);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
  
  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'internal' | 'supplier_sku'>('internal');
  
  // Serial acquisition state
  const [serialInput, setSerialInput] = useState('');
  const [currentSerials, setCurrentSerials] = useState<string[]>([]);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [serialScanMode, setSerialScanMode] = useState(false);
  const [bulkLoadMode, setBulkLoadMode] = useState(false);
  
  // Pricing state (optional for DDT)
  const [lotInput, setLotInput] = useState('');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [vatRateIdInput, setVatRateIdInput] = useState<string>('');
  const [vatRegimeIdInput, setVatRegimeIdInput] = useState<string>('');
  
  // UI state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  
  // Mapping state
  const [unmappedSupplierSku, setUnmappedSupplierSku] = useState('');
  const [showSupplierSkuPrompt, setShowSupplierSkuPrompt] = useState(false);
  const [pendingSupplierSkuInput, setPendingSupplierSkuInput] = useState('');
  const [isCheckingMapping, setIsCheckingMapping] = useState(false);
  
  // Order reconciliation state
  const [orderItems, setOrderItems] = useState<OrderItemFromAPI[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(ddtSchema),
    defaultValues: {
      legalEntityId: '',
      issuingStoreId: '',
      causale: '',
      recipientType: '',
      customerId: '',
      supplierId: '',
      destinationStoreId: '',
      orderId: '',
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedCausale = form.watch('causale') as DDTCausale;
  const selectedRecipientType = form.watch('recipientType') as RecipientType;
  const selectedLegalEntityId = form.watch('legalEntityId');
  const selectedSupplierId = form.watch('supplierId');
  const selectedCustomerId = form.watch('customerId');
  const selectedOrderId = form.watch('orderId');

  // Get causale config
  const causaleConfig = selectedCausale ? CAUSALE_CONFIG[selectedCausale] : null;
  const direction = causaleConfig?.direction || 'active';

  // ==================== QUERIES ====================

  const { data: legalEntitiesData = [], isLoading: legalEntitiesLoading } = useQuery<LegalEntityFromAPI[]>({
    queryKey: ['/api/organization-entities'],
    enabled: open,
  });

  const { data: storesData = [], isLoading: storesLoading } = useQuery<StoreFromAPI[]>({
    queryKey: ['/api/wms/stores'],
    enabled: open,
  });

  const { data: suppliersData = [], isLoading: suppliersLoading } = useQuery<SupplierFromAPI[]>({
    queryKey: ['/api/wms/suppliers'],
    enabled: open,
  });

  const { data: customersData = [], isLoading: customersLoading } = useQuery<CustomerFromAPI[]>({
    queryKey: ['/api/crm/customers'],
    enabled: open && (selectedRecipientType === 'customer' || !selectedRecipientType),
  });

  const { data: vatRatesData = [] } = useQuery<{ id: string; code: string; name: string; rate: number }[]>({
    queryKey: ['/api/wms/vat-rates'],
    enabled: open,
  });

  const { data: vatRegimesData = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['/api/wms/vat-regimes'],
    enabled: open,
  });

  const { data: categoriesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/categories'],
    enabled: open && currentStep === 2,
  });

  const { data: typesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/product-types'],
    enabled: open && currentStep === 2,
  });

  // Fetch orders for reconciliation
  const { data: ordersData = [] } = useQuery<OrderFromAPI[]>({
    queryKey: ['/api/wms/orders', { 
      supplierId: selectedSupplierId, 
      customerId: selectedCustomerId,
      status: 'open'
    }],
    enabled: open && currentStep === 1 && (!!selectedSupplierId || !!selectedCustomerId),
  });

  // Product search
  const { data: productsApiData, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products', { 
      search: debouncedSearchQuery,
      type: selectedProductType || undefined,
      category_id: selectedCategoryId || undefined,
      type_id: selectedTypeId || undefined,
    }],
    enabled: open && currentStep === 2 && searchMode === 'internal' && debouncedSearchQuery.length >= 2,
  });

  // Watch issuing store for destination filtering
  const issuingStoreId = form.watch('issuingStoreId');

  // Filter stores by selected legal entity
  const filteredStores = useMemo(() => {
    if (!selectedLegalEntityId) return storesData;
    return storesData.filter(s => s.legalEntityId === selectedLegalEntityId);
  }, [storesData, selectedLegalEntityId]);

  // Destination stores for internal transfer (exclude issuing store)
  const destinationStores = useMemo(() => {
    return storesData.filter(s => s.id !== issuingStoreId && s.hasWarehouse);
  }, [storesData, issuingStoreId]);

  // ==================== EFFECTS ====================

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setItems([]);
      setOrderItems([]);
      form.reset();
    }
  }, [open]);

  // Update recipient type when causale changes
  useEffect(() => {
    if (selectedCausale && causaleConfig) {
      const recipientTypes = Array.isArray(causaleConfig.recipientType) 
        ? causaleConfig.recipientType 
        : [causaleConfig.recipientType];
      
      // Auto-select if only one option
      if (recipientTypes.length === 1) {
        form.setValue('recipientType', recipientTypes[0]);
      } else {
        form.setValue('recipientType', '');
      }
      
      // Reset recipient selections
      form.setValue('customerId', '');
      form.setValue('supplierId', '');
      form.setValue('destinationStoreId', '');
      form.setValue('orderId', '');
    }
  }, [selectedCausale]);

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

  // Update search results from API
  useEffect(() => {
    if (productsApiData && searchMode === 'internal') {
      setSearchResults(productsApiData.slice(0, MAX_VISIBLE_RESULTS));
      setShowSearchResults(productsApiData.length > 0);
    }
  }, [productsApiData, searchMode]);

  // Load order items when order is selected
  useEffect(() => {
    if (selectedOrderId && selectedOrderId !== 'none') {
      const order = ordersData.find(o => o.id === selectedOrderId);
      if (order) {
        setOrderItems(order.items);
      }
    } else {
      setOrderItems([]);
    }
  }, [selectedOrderId, ordersData]);

  // ==================== HANDLERS ====================

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Check if this product matches an order item
    if (orderItems.length > 0) {
      const matchingOrderItem = orderItems.find(
        oi => oi.sku === product.sku || oi.supplierSku === product.sku || oi.productId === product.id
      );
      if (matchingOrderItem) {
        // Pre-fill quantity from residual
        setTargetQuantity(Math.max(1, matchingOrderItem.quantityResidual));
      }
    }
    
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleSerialScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && serialInput.trim()) {
      e.preventDefault();
      
      const normalizedSerial = normalizeSerial(serialInput, selectedProduct?.serialType);
      
      if (currentSerials.includes(normalizedSerial)) {
        setSerialInput('');
        serialInputRef.current?.focus();
        return;
      }
      
      const newSerials = [...currentSerials, normalizedSerial];
      setCurrentSerials(newSerials);
      setSerialInput('');
      
      setTimeout(() => {
        serialInputRef.current?.focus();
      }, 50);
      
      if (newSerials.length >= targetQuantity) {
        setSerialScanMode(false);
      }
    }
  };

  const removeSerial = (index: number) => {
    setCurrentSerials(prev => prev.filter((_, i) => i !== index));
    setTimeout(() => serialInputRef.current?.focus(), 50);
  };

  const canAddItem = (): boolean => {
    if (!selectedProduct) return false;
    
    if (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) && !bulkLoadMode) {
      const serialsPerUnit = selectedProduct.serialCount || 1;
      return currentSerials.length >= serialsPerUnit;
    }
    
    return targetQuantity > 0;
  };

  const addItemToList = () => {
    if (!selectedProduct || !canAddItem()) return;

    const isBulkLoad = bulkLoadMode && selectedProduct.isSerializable;
    const serializedQty = Math.floor(currentSerials.length / (selectedProduct.serialCount || 1));

    // Calculate pricing if provided
    const unitPrice = unitPriceInput ? parseFloat(unitPriceInput) : undefined;
    const vatRate = vatRateIdInput ? vatRatesData.find(v => v.id === vatRateIdInput)?.rate : undefined;
    const vatPercent = vatRate || 0;
    const vatAmount = unitPrice ? unitPrice * (vatPercent / 100) : undefined;
    const unitPriceGross = unitPrice ? unitPrice + (vatAmount || 0) : undefined;

    // Check order matching
    let matchStatus: DDTItem['matchStatus'] = undefined;
    let orderedQuantity: number | undefined = undefined;
    let orderItemId: string | undefined = undefined;

    if (orderItems.length > 0) {
      const matchingOrderItem = orderItems.find(
        oi => oi.sku === selectedProduct.sku || oi.supplierSku === selectedProduct.sku || oi.productId === selectedProduct.id
      );
      if (matchingOrderItem) {
        orderItemId = matchingOrderItem.id;
        orderedQuantity = matchingOrderItem.quantityResidual;
        const qty = isBulkLoad ? targetQuantity : (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) ? serializedQty : targetQuantity);
        
        if (qty === orderedQuantity) {
          matchStatus = 'match';
        } else if (qty < orderedQuantity) {
          matchStatus = 'partial';
        } else {
          matchStatus = 'extra';
        }
      } else {
        matchStatus = 'extra';
      }
    }

    const newItem: DDTItem = {
      id: `ddt-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      product: selectedProduct,
      quantity: isBulkLoad 
        ? targetQuantity 
        : (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) 
            ? serializedQty 
            : targetQuantity),
      serials: isBulkLoad ? [] : currentSerials,
      lot: lotInput || undefined,
      unitPrice,
      vatRateId: vatRateIdInput || undefined,
      vatRate: vatPercent,
      vatAmount,
      unitPriceGross,
      vatRegimeId: vatRegimeIdInput || undefined,
      bulkLoaded: isBulkLoad,
      orderItemId,
      matchStatus,
      orderedQuantity,
    };

    setItems(prev => [...prev, newItem]);
    resetProductInput();
  };

  const resetProductInput = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setCurrentSerials([]);
    setTargetQuantity(1);
    setLotInput('');
    setUnitPriceInput('');
    setVatRateIdInput('');
    setVatRegimeIdInput('');
    setSerialScanMode(false);
    setBulkLoadMode(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const canProceedToStep2 = (): boolean => {
    const values = form.getValues();
    if (!values.legalEntityId || !values.causale || !values.documentNumber || !values.documentDate) {
      return false;
    }
    
    // Check recipient based on type
    if (selectedRecipientType === 'customer' && !values.customerId) return false;
    if (selectedRecipientType === 'supplier' && !values.supplierId) return false;
    if (selectedRecipientType === 'store' && !values.destinationStoreId) return false;
    
    return true;
  };

  const handleProceedToStep2 = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ['legalEntityId', 'causale', 'documentNumber', 'documentDate'];
    if (selectedRecipientType === 'customer') fieldsToValidate.push('customerId');
    if (selectedRecipientType === 'supplier') fieldsToValidate.push('supplierId');
    if (selectedRecipientType === 'store') fieldsToValidate.push('destinationStoreId');
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleFormSubmit = async (values: FormValues) => {
    if (items.length === 0) {
      toast({
        title: 'Nessun prodotto',
        description: 'Aggiungi almeno un prodotto al DDT.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData: DDTFormData = {
        legalEntityId: values.legalEntityId,
        issuingStoreId: values.issuingStoreId || undefined,
        causale: values.causale as DDTCausale,
        direction: causaleConfig?.direction || 'active',
        recipientType: values.recipientType as RecipientType,
        customerId: values.customerId || undefined,
        supplierId: values.supplierId || undefined,
        destinationStoreId: values.destinationStoreId || undefined,
        orderId: values.orderId !== 'none' ? values.orderId : undefined,
        documentNumber: values.documentNumber,
        documentDate: values.documentDate,
        notes: values.notes || undefined,
        items,
      };

      await onSubmit(formData);
      onOpenChange(false);
      
      toast({
        title: 'DDT creato',
        description: `DDT ${values.documentNumber} creato con successo.`,
      });
    } catch (error) {
      console.error('Error creating DDT:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile creare il DDT. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detect code type for visual indicator
  const detectedCodeType = useMemo(() => {
    if (searchQuery.length < 3) return null;
    if (isLikelyEAN(searchQuery)) return 'ean';
    if (isLikelyIMEI(searchQuery)) return 'imei';
    if (isLikelyICCID(searchQuery)) return 'iccid';
    if (isLikelyMAC(searchQuery)) return 'mac';
    if (/^[A-Z0-9-]+$/i.test(searchQuery)) return 'sku';
    return 'unknown';
  }, [searchQuery]);

  // Get recipient options based on causale
  const getRecipientOptions = (): { value: RecipientType; label: string }[] => {
    if (!causaleConfig) return [];
    const types = Array.isArray(causaleConfig.recipientType) 
      ? causaleConfig.recipientType 
      : [causaleConfig.recipientType];
    
    return types.map(t => {
      switch (t) {
        case 'customer': return { value: 'customer', label: 'Cliente' };
        case 'supplier': return { value: 'supplier', label: 'Fornitore' };
        case 'store': return { value: 'store', label: 'Magazzino' };
      }
    });
  };

  // ==================== RENDER ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={setDialogContainer}
        className={`${currentStep === 3 ? 'max-w-6xl w-[95vw]' : 'max-w-4xl'} max-h-[90vh] min-h-[70vh] overflow-hidden flex flex-col`}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            Nuovo DDT - {currentStep === 1 ? 'Dati Documento' : currentStep === 2 ? 'Prodotti' : 'Riepilogo'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? 'Inserisci i dati del documento di trasporto' 
              : currentStep === 2 
                ? 'Aggiungi i prodotti da spedire'
                : 'Verifica i dati e conferma il DDT'}
          </DialogDescription>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 1 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>1</span>
              Documento
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 2 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>2</span>
              Prodotti
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 3 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>3</span>
              Riepilogo
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">

                {/* ==================== STEP 1: Document Data ==================== */}
                {currentStep === 1 && (
                  <>
                    {/* Emittente Section */}
                    <Card>
                      <CardContent className="pt-4">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Emittente
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="legalEntityId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ragione Sociale *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-legal-entity">
                                      <SelectValue placeholder="Seleziona ragione sociale..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {legalEntitiesData.map(e => (
                                      <SelectItem key={e.id} value={e.id}>
                                        {e.nome}
                                        {e.pIva && ` (P.IVA: ${e.pIva})`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="issuingStoreId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sede Operativa di Emissione</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value}
                                  disabled={!selectedLegalEntityId}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-issuing-store">
                                      <SelectValue placeholder={selectedLegalEntityId ? "Sede operativa (opzionale)" : "Seleziona prima ragione sociale"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Nessuna sede specifica</SelectItem>
                                    {filteredStores.map(s => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name} {s.city ? `- ${s.city}` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Causale & Destinatario Section */}
                    <Card>
                      <CardContent className="pt-4">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Causale e Destinatario
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="causale"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Causale DDT *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-causale">
                                      <SelectValue placeholder="Seleziona causale..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(CAUSALE_CONFIG).map(([key, config]) => (
                                      <SelectItem key={key} value={key}>
                                        {config.label}
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({config.direction === 'active' ? 'Attivo' : 'Passivo'})
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Recipient Type (if multiple options) */}
                          {causaleConfig && Array.isArray(causaleConfig.recipientType) && causaleConfig.recipientType.length > 1 && (
                            <FormField
                              control={form.control}
                              name="recipientType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo Destinatario *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-recipient-type">
                                        <SelectValue placeholder="Seleziona tipo..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {getRecipientOptions().map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Customer selector */}
                          {selectedRecipientType === 'customer' && (
                            <FormField
                              control={form.control}
                              name="customerId"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Cliente *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-customer">
                                        <SelectValue placeholder={customersLoading ? "Caricamento..." : "Seleziona cliente..."} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {customersData.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                          <div className="flex flex-col">
                                            <span>{c.name}</span>
                                            <span className="text-xs text-gray-500">
                                              {c.vatNumber && `P.IVA: ${c.vatNumber}`}
                                              {c.fiscalCode && ` | CF: ${c.fiscalCode}`}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Supplier selector */}
                          {selectedRecipientType === 'supplier' && (
                            <FormField
                              control={form.control}
                              name="supplierId"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Fornitore *</FormLabel>
                                  <FormControl>
                                    <SupplierCombobox
                                      suppliers={suppliersData.map(s => ({ id: s.id, name: s.name, code: s.code }))}
                                      value={field.value || ''}
                                      onValueChange={field.onChange}
                                      placeholder={suppliersLoading ? "Caricamento..." : "Seleziona fornitore..."}
                                      searchPlaceholder="Cerca fornitore..."
                                      disabled={suppliersLoading}
                                      portalContainer={dialogContainer}
                                      data-testid="select-supplier"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Store selector (for internal transfer) */}
                          {selectedRecipientType === 'store' && (
                            <FormField
                              control={form.control}
                              name="destinationStoreId"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Magazzino Destinazione *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-destination-store">
                                        <SelectValue placeholder="Seleziona magazzino..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {destinationStores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.name} ({s.code}){s.city ? ` - ${s.city}` : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* Recipient details card */}
                        {(selectedCustomerId || selectedSupplierId || form.watch('destinationStoreId')) && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Dettagli Destinatario</h4>
                            {selectedRecipientType === 'customer' && selectedCustomerId && (
                              <>
                                {(() => {
                                  const customer = customersData.find(c => c.id === selectedCustomerId);
                                  if (!customer) return null;
                                  return (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><span className="text-gray-500">Nome:</span> {customer.name}</div>
                                      {customer.vatNumber && <div><span className="text-gray-500">P.IVA:</span> {customer.vatNumber}</div>}
                                      {customer.fiscalCode && <div><span className="text-gray-500">CF:</span> {customer.fiscalCode}</div>}
                                      {customer.address && <div><span className="text-gray-500">Indirizzo:</span> {customer.address}</div>}
                                      {customer.city && <div><span className="text-gray-500">Città:</span> {customer.city} ({customer.province})</div>}
                                      {customer.pec && <div><span className="text-gray-500">PEC:</span> {customer.pec}</div>}
                                      {customer.sdiCode && <div><span className="text-gray-500">SDI:</span> {customer.sdiCode}</div>}
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                            {selectedRecipientType === 'supplier' && selectedSupplierId && (
                              <>
                                {(() => {
                                  const supplier = suppliersData.find(s => s.id === selectedSupplierId);
                                  if (!supplier) return null;
                                  return (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><span className="text-gray-500">Nome:</span> {supplier.name}</div>
                                      {supplier.vatNumber && <div><span className="text-gray-500">P.IVA:</span> {supplier.vatNumber}</div>}
                                      {supplier.address && <div><span className="text-gray-500">Indirizzo:</span> {supplier.address}</div>}
                                      {supplier.city && <div><span className="text-gray-500">Città:</span> {supplier.city} ({supplier.province})</div>}
                                      {supplier.pec && <div><span className="text-gray-500">PEC:</span> {supplier.pec}</div>}
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                            {selectedRecipientType === 'store' && form.watch('destinationStoreId') && (
                              <>
                                {(() => {
                                  const store = storesData.find(s => s.id === form.watch('destinationStoreId'));
                                  if (!store) return null;
                                  return (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><span className="text-gray-500">Nome:</span> {store.name}</div>
                                      <div><span className="text-gray-500">Codice:</span> {store.code}</div>
                                      {store.address && <div><span className="text-gray-500">Indirizzo:</span> {store.address}</div>}
                                      {store.city && <div><span className="text-gray-500">Città:</span> {store.city} ({store.province})</div>}
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Document Details Section */}
                    <Card>
                      <CardContent className="pt-4">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Dati Documento
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="orderId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ordine di Riferimento</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value}
                                  disabled={ordersData.length === 0}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-order">
                                      <SelectValue placeholder={ordersData.length === 0 ? "Nessun ordine aperto" : "Seleziona ordine (opzionale)"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Nessun ordine</SelectItem>
                                    {ordersData.map(o => (
                                      <SelectItem key={o.id} value={o.id}>
                                        {o.orderNumber}
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({o.receivedQuantity}/{o.totalQuantity} ricevuti)
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div /> {/* Spacer */}

                          <FormField
                            control={form.control}
                            name="documentNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Numero DDT *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                      {...field} 
                                      placeholder="Es. DDT-2024-001234"
                                      className="pl-9"
                                      data-testid="input-document-number"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="documentDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data DDT *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                      {...field} 
                                      type="date"
                                      className="pl-9"
                                      data-testid="input-document-date"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Note</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Note aggiuntive sul DDT..."
                                    rows={2}
                                    data-testid="input-notes"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* ==================== STEP 2: Products ==================== */}
                {currentStep === 2 && (
                  <>
                    {/* Order reconciliation panel */}
                    {orderItems.length > 0 && (
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Riconciliazione Ordine
                          </h3>
                          <div className="space-y-2">
                            {orderItems.map(oi => {
                              const addedItem = items.find(i => i.orderItemId === oi.id);
                              const addedQty = addedItem?.quantity || 0;
                              const status = addedQty === 0 ? 'pending' : addedQty >= oi.quantityResidual ? 'match' : 'partial';
                              
                              return (
                                <div 
                                  key={oi.id}
                                  className={`flex items-center justify-between p-2 rounded border ${
                                    status === 'match' ? 'bg-green-50 border-green-200' :
                                    status === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{oi.productName}</p>
                                    <p className="text-xs text-gray-500">SKU: {oi.sku}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm">
                                      <span className="font-medium">{addedQty}</span>
                                      <span className="text-gray-500"> / {oi.quantityResidual}</span>
                                    </p>
                                    <Badge variant={status === 'match' ? 'default' : status === 'partial' ? 'secondary' : 'outline'} className="text-xs">
                                      {status === 'match' ? '✓ Completo' : status === 'partial' ? 'Parziale' : 'Da aggiungere'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Product search card */}
                    <Card className="border-blue-200">
                      <CardContent className="pt-4 bg-blue-50/50">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Aggiungi Prodotti
                        </h3>

                        <div className="space-y-4">
                          {/* Search mode toggle */}
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              type="button"
                              variant={searchMode === 'internal' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSearchMode('internal');
                                setSearchQuery('');
                                setSearchResults([]);
                                setShowSearchResults(false);
                              }}
                              className="flex items-center gap-2"
                              data-testid="btn-search-mode-internal"
                            >
                              <Package className="h-4 w-4" />
                              Catalogo Interno
                            </Button>
                            <Button
                              type="button"
                              variant={searchMode === 'supplier_sku' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSearchMode('supplier_sku');
                                setSearchQuery('');
                                setSearchResults([]);
                                setShowSearchResults(false);
                                setShowFilters(false);
                              }}
                              className="flex items-center gap-2"
                              data-testid="btn-search-mode-supplier"
                            >
                              <Barcode className="h-4 w-4" />
                              SKU Fornitore
                            </Button>
                            
                            {searchMode === 'internal' && (
                              <Button
                                type="button"
                                variant={showFilters ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="ml-auto flex items-center gap-1"
                                data-testid="btn-toggle-filters"
                              >
                                <Filter className="h-4 w-4" />
                                Filtri
                              </Button>
                            )}
                          </div>

                          {/* Filters panel */}
                          {showFilters && searchMode === 'internal' && (
                            <div className="flex gap-3 mb-3 p-3 bg-white rounded-lg border">
                              <div className="flex-1">
                                <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
                                <Select value={selectedCategoryId || "__all__"} onValueChange={(v) => setSelectedCategoryId(v === "__all__" ? '' : v)}>
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Tutte" />
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
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Tutte" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Tutte le tipologie</SelectItem>
                                    {typesData.map(type => (
                                      <SelectItem key={type.id} value={type.id}>{type.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {(selectedCategoryId || selectedTypeId) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
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
                                ? "Scansiona EAN/barcode, SKU interno, o nome prodotto..." 
                                : "Inserisci SKU fornitore..."}
                              className="pl-9 pr-24"
                              data-testid="input-product-search"
                            />
                            {productsLoading && (
                              <div className="absolute right-20 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {detectedCodeType && searchQuery.length >= 3 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Badge 
                                  variant={detectedCodeType === 'ean' ? 'default' : 
                                           detectedCodeType === 'imei' ? 'destructive' :
                                           detectedCodeType === 'iccid' ? 'secondary' :
                                           detectedCodeType === 'mac' ? 'outline' : 'secondary'}
                                  className="text-xs"
                                >
                                  {detectedCodeType === 'ean' && '📦 EAN'}
                                  {detectedCodeType === 'imei' && '📱 IMEI'}
                                  {detectedCodeType === 'iccid' && '💳 ICCID'}
                                  {detectedCodeType === 'mac' && '🌐 MAC'}
                                  {detectedCodeType === 'sku' && '🏷️ SKU'}
                                  {detectedCodeType === 'unknown' && '❓ Testo'}
                                </Badge>
                              </div>
                            )}

                            {/* Search results dropdown with tooltips */}
                            {showSearchResults && searchResults.length > 0 && (
                              <TooltipProvider delayDuration={300}>
                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto">
                                  {searchResults.map(product => (
                                    <Tooltip key={product.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                          onClick={() => handleProductSelect(product)}
                                          data-testid={`search-result-${product.id}`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-medium text-gray-900">{product.name}</p>
                                              <p className="text-sm text-gray-500">
                                                SKU: {product.sku} | EAN: {product.ean || '-'}
                                              </p>
                                            </div>
                                            {product.isSerializable && (
                                              <Badge variant="outline" className="ml-2">
                                                {getSerialLabel(product.serialType)}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipPortal container={dialogContainer}>
                                        <TooltipContent 
                                          side="bottom" 
                                          align="start"
                                          sideOffset={5} 
                                          collisionPadding={10}
                                          className="bg-gray-900 text-white p-3 max-w-xs z-[9999]"
                                        >
                                          <div className="text-xs space-y-1">
                                            <div className="font-semibold text-sm border-b border-gray-700 pb-1 mb-1">{product.name}</div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                              <span className="text-gray-400">SKU:</span><span className="font-mono">{product.sku || '-'}</span>
                                              <span className="text-gray-400">EAN:</span><span className="font-mono">{product.ean || '-'}</span>
                                              {product.brand && <><span className="text-gray-400">Brand:</span><span>{product.brand}</span></>}
                                              {product.model && <><span className="text-gray-400">Modello:</span><span>{product.model}</span></>}
                                              {product.color && <><span className="text-gray-400">Colore:</span><span>{product.color}</span></>}
                                              {product.memory && <><span className="text-gray-400">Memoria:</span><span>{product.memory}</span></>}
                                            </div>
                                            {product.description && (
                                              <div className="pt-1 border-t border-gray-700 mt-1">
                                                <span className="text-gray-400">Descrizione:</span>
                                                <p className="text-gray-300 mt-0.5">{product.description}</p>
                                              </div>
                                            )}
                                            {product.isSerializable && (
                                              <div className="pt-1 mt-1 text-orange-400 font-medium">
                                                📱 Prodotto serializzato ({getSerialLabel(product.serialType)})
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </TooltipPortal>
                                    </Tooltip>
                                  ))}
                                </div>
                              </TooltipProvider>
                            )}
                          </div>

                          {/* Selected product form */}
                          {selectedProduct && (
                            <div className="p-4 border rounded-lg bg-white space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{selectedProduct.name}</p>
                                  <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={resetProductInput}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Quantità</Label>
                                  <Input
                                    ref={quantityInputRef}
                                    type="number"
                                    min="1"
                                    value={targetQuantity}
                                    onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
                                    className="h-9"
                                    data-testid="input-quantity"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Prezzo Netto (opz.)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unitPriceInput}
                                    onChange={(e) => setUnitPriceInput(e.target.value)}
                                    placeholder="0.00"
                                    className="h-9"
                                    data-testid="input-price"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Lotto (opz.)</Label>
                                  <Input
                                    value={lotInput}
                                    onChange={(e) => setLotInput(e.target.value)}
                                    placeholder="Lotto"
                                    className="h-9"
                                    data-testid="input-lot"
                                  />
                                </div>
                              </div>

                              {/* VAT fields */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Aliquota IVA (opz.)</Label>
                                  <Select value={vatRateIdInput || "__none__"} onValueChange={(v) => setVatRateIdInput(v === "__none__" ? '' : v)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Seleziona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Non specificata</SelectItem>
                                      {vatRatesData.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                          {v.name} ({v.rate}%)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Regime Fiscale (opz.)</Label>
                                  <Select value={vatRegimeIdInput || "__none__"} onValueChange={(v) => setVatRegimeIdInput(v === "__none__" ? '' : v)}>
                                    <SelectTrigger className="h-9 w-full">
                                      <SelectValue placeholder="Seleziona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Non specificato</SelectItem>
                                      {vatRegimesData.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                          {r.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Serial acquisition for serializable products */}
                              {selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">
                                      {getSerialLabel(selectedProduct.serialType)} ({currentSerials.length}/{targetQuantity * (selectedProduct.serialCount || 1)})
                                    </Label>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-gray-500">Bulk Mode</Label>
                                      <Switch
                                        checked={bulkLoadMode}
                                        onCheckedChange={setBulkLoadMode}
                                        data-testid="switch-bulk-mode"
                                      />
                                    </div>
                                  </div>

                                  {!bulkLoadMode && (
                                    <>
                                      <div className="relative">
                                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                          ref={serialInputRef}
                                          value={serialInput}
                                          onChange={(e) => setSerialInput(e.target.value)}
                                          onKeyDown={handleSerialScan}
                                          placeholder={`Scansiona ${getSerialLabel(selectedProduct.serialType)}...`}
                                          className="pl-9"
                                          data-testid="input-serial"
                                        />
                                      </div>

                                      {currentSerials.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                                          {currentSerials.map((serial, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                                              <span className="font-mono">{serial}</span>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => removeSerial(idx)}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              <Button
                                type="button"
                                onClick={addItemToList}
                                disabled={!canAddItem()}
                                className="w-full"
                                data-testid="btn-add-item"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Aggiungi alla Lista
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Items list */}
                    <Card className="border-gray-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Prodotti nel DDT
                          </h3>
                          <Badge variant="secondary">
                            {items.length} prodotti, {items.reduce((sum, i) => sum + i.quantity, 0)} unità
                          </Badge>
                        </div>

                        {items.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>Nessun prodotto aggiunto</p>
                            <p className="text-sm">Cerca e aggiungi prodotti sopra</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {items.map(item => (
                              <div 
                                key={item.id}
                                className={`flex items-center justify-between p-3 border rounded-lg ${
                                  item.matchStatus === 'match' ? 'bg-green-50 border-green-200' :
                                  item.matchStatus === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                                  item.matchStatus === 'extra' ? 'bg-red-50 border-red-200' :
                                  'bg-white'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{item.product.name}</p>
                                    {item.matchStatus && (
                                      <Badge 
                                        variant={item.matchStatus === 'match' ? 'default' : item.matchStatus === 'partial' ? 'secondary' : 'destructive'}
                                        className="text-xs"
                                      >
                                        {item.matchStatus === 'match' ? '✓ Match' : 
                                         item.matchStatus === 'partial' ? 'Parziale' : 
                                         'Extra'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    SKU: {item.product.sku} | Qtà: {item.quantity}
                                    {item.serials.length > 0 && ` | ${item.serials.length} seriali`}
                                    {item.unitPrice !== undefined && ` | €${item.unitPrice.toFixed(2)}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    data-testid={`btn-remove-item-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* ==================== STEP 3: Summary ==================== */}
                {currentStep === 3 && (
                  <>
                    {/* Document summary header */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-900 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Riepilogo DDT
                        </h4>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-700">
                            {items.length} prodotti
                          </Badge>
                          <Badge className="bg-green-100 text-green-700">
                            {items.reduce((sum, i) => sum + i.quantity, 0)} unità
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-white p-3 rounded border">
                          <span className="text-gray-500 text-xs block mb-1">Emittente</span>
                          <p className="font-medium text-sm leading-tight">
                            {legalEntitiesData.find(e => e.id === form.getValues('legalEntityId'))?.nome || '-'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <span className="text-gray-500 text-xs block mb-1">Numero DDT</span>
                          <p className="font-medium text-sm">{form.getValues('documentNumber')}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <span className="text-gray-500 text-xs block mb-1">Data DDT</span>
                          <p className="font-medium text-sm">{form.getValues('documentDate')}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <span className="text-gray-500 text-xs block mb-1">Causale</span>
                          <p className="font-medium text-sm">{causaleConfig?.label || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border col-span-2 md:col-span-4">
                          <span className="text-gray-500 text-xs block mb-1">Destinatario</span>
                          <p className="font-medium text-sm">
                            {selectedRecipientType === 'customer' && customersData.find(c => c.id === form.getValues('customerId'))?.name}
                            {selectedRecipientType === 'supplier' && suppliersData.find(s => s.id === form.getValues('supplierId'))?.name}
                            {selectedRecipientType === 'store' && storesData.find(s => s.id === form.getValues('destinationStoreId'))?.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order reconciliation summary */}
                    {orderItems.length > 0 && (
                      <Card className="border-blue-200">
                        <CardContent className="pt-4">
                          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Riepilogo Riconciliazione
                          </h3>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-2xl font-bold text-green-700">
                                {items.filter(i => i.matchStatus === 'match').length}
                              </p>
                              <p className="text-xs text-green-600">Match Completi</p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <p className="text-2xl font-bold text-yellow-700">
                                {items.filter(i => i.matchStatus === 'partial').length}
                              </p>
                              <p className="text-xs text-yellow-600">Parziali (Backorder)</p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-2xl font-bold text-red-700">
                                {items.filter(i => i.matchStatus === 'extra').length}
                              </p>
                              <p className="text-xs text-red-600">Extra (Overage)</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Products table */}
                    <Card>
                      <CardContent className="pt-4">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Prodotti
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-3 font-medium">Prodotto</th>
                                <th className="text-center p-3 font-medium">Qtà</th>
                                <th className="text-center p-3 font-medium">Seriali</th>
                                <th className="text-right p-3 font-medium">Prezzo</th>
                                <th className="text-center p-3 font-medium">Stato</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(item => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-3">
                                    <p className="font-medium">{item.product.name}</p>
                                    <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                                  </td>
                                  <td className="text-center p-3">{item.quantity}</td>
                                  <td className="text-center p-3">
                                    {item.serials.length > 0 ? (
                                      <Badge variant="outline">{item.serials.length}</Badge>
                                    ) : item.bulkLoaded ? (
                                      <Badge variant="secondary">Bulk</Badge>
                                    ) : '-'}
                                  </td>
                                  <td className="text-right p-3">
                                    {item.unitPrice !== undefined ? `€${item.unitPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td className="text-center p-3">
                                    {item.matchStatus && (
                                      <Badge 
                                        variant={item.matchStatus === 'match' ? 'default' : item.matchStatus === 'partial' ? 'secondary' : 'destructive'}
                                      >
                                        {item.matchStatus === 'match' ? '✓' : item.matchStatus === 'partial' ? '~' : '+'}
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

              </div>
            </ScrollArea>

            {/* Footer with navigation */}
            <DialogFooter className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep((currentStep - 1) as 1 | 2)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Indietro
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Annulla
                  </Button>
                  
                  {currentStep === 1 && (
                    <Button
                      type="button"
                      onClick={handleProceedToStep2}
                      disabled={!canProceedToStep2()}
                    >
                      Continua
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={items.length === 0}
                    >
                      Riepilogo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 3 && (
                    <Button
                      type="submit"
                      disabled={isSubmitting || items.length === 0}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Conferma DDT
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
