import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
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
  Link
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { SupplierCombobox } from './SupplierCombobox';

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

interface Order {
  id: string;
  orderNumber: string;
  supplierId: string;
  items: OrderItem[];
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  supplierSku?: string;
  ean?: string;  // EAN-13 barcode - identifies the MODEL (same for all units of same product)
  description?: string;
  isSerializable: boolean;
  serialType?: 'imei' | 'iccid' | 'mac_address' | 'other'; // Type of unique serial per UNIT
  serialCount?: number; // Number of serials per unit (e.g., 2 for dual-SIM phones with IMEI1+IMEI2)
}

// Helper to determine if a code is likely an EAN (barcode) vs a unique serial
const isLikelyEAN = (code: string): boolean => {
  // EAN-13: exactly 13 digits, EAN-8: exactly 8 digits
  const cleaned = code.replace(/\s/g, '');
  return /^\d{8}$/.test(cleaned) || /^\d{13}$/.test(cleaned);
};

// Helper to determine if a code is likely an IMEI
const isLikelyIMEI = (code: string): boolean => {
  // IMEI: 15 digits (or 14 + check digit)
  const cleaned = code.replace(/\s/g, '');
  return /^\d{15}$/.test(cleaned) || /^\d{14}$/.test(cleaned);
};

// Helper to determine if a code is likely an ICCID
const isLikelyICCID = (code: string): boolean => {
  // ICCID: 19-20 digits, often starts with 89
  const cleaned = code.replace(/\s/g, '');
  return /^89\d{17,18}$/.test(cleaned) || /^\d{19,20}$/.test(cleaned);
};

// Helper to determine if a code is likely a MAC address
const isLikelyMAC = (code: string): boolean => {
  // MAC: 12 hex digits, possibly with colons or dashes
  const cleaned = code.replace(/[\s:-]/g, '').toUpperCase();
  return /^[0-9A-F]{12}$/.test(cleaned);
};

// SerialEntry supports multiple serials per unit (e.g., IMEI1 + IMEI2 for dual-SIM)
interface SerialEntry {
  serials: string[]; // Array of serials for this unit (length = serialCount)
  unitIndex: number; // Which unit this is (0, 1, 2...)
}

interface ReceivingItem {
  id: string;
  product: Product;
  quantity: number;
  serials: string[]; // Flat list for simple cases
  serialEntries?: SerialEntry[]; // Structured list for multi-serial products
  lot?: string;
  unitPrice?: number;
  hasDiscrepancy?: boolean;
  expectedQuantity?: number;
  bulkLoaded?: boolean; // True if loaded in bulk mode without individual serials
}

// Draft data structure for suspended receiving sessions
interface ReceivingDraft {
  id: string;
  supplierId?: string;
  supplierName?: string;
  documentNumber?: string;
  documentDate?: string;
  expectedDeliveryDate?: string;
  storeId?: string;
  storeName?: string;
  notes?: string;
  productsData: Array<{
    productId: string;
    productName: string;
    sku: string;
    ean?: string;
    quantity: number;
    serials?: string[];
    serialEntries?: SerialEntry[];
    lot?: string;
    unitPrice?: number;
    isSerializable: boolean;
    serialType?: string;
    serialCount?: number;
  }>;
  lastStep: number;
}

interface ReceivingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReceivingFormData) => void;
  resumeDraft?: ReceivingDraft | null; // Optional draft to resume
  onDraftSaved?: () => void; // Callback when draft is saved
}

interface ReceivingFormData {
  supplierId: string;
  orderId?: string;
  documentNumber: string;
  documentDate: string;
  notes?: string;
  storeId: string;
  items: ReceivingItem[];
}

const receivingSchema = z.object({
  supplierId: z.string().min(1, 'Seleziona un fornitore'),
  orderId: z.string().optional(),
  documentNumber: z.string().min(1, 'Inserisci il numero documento'),
  documentDate: z.string().min(1, 'Seleziona la data'),
  notes: z.string().optional(),
  storeId: z.string().min(1, 'Seleziona lo store'),
  legalEntityId: z.string().min(1, 'Seleziona l\'entità legale'),
});

type FormValues = z.infer<typeof receivingSchema>;

interface LegalEntityFromAPI {
  id: string;
  ragioneSociale: string;
  partitaIva?: string;
  codiceFiscale?: string;
  status: string;
}

interface StoreWithLegalEntity {
  id: string;
  name: string;
  city?: string;
  province?: string;
  legalEntityId?: string;
  legalEntityName?: string;
}

// MOCK_SUPPLIERS removed - now using real API endpoint
// MOCK_PRODUCTS removed - now using real API endpoint

// Interface for product from API
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

// Interface for SKU mapping from API
interface SkuMappingFromAPI {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku: string | null;
  supplierSkuNormalized: string | null;
  productName: string | null;
  productSku: string | null;
  productEan: string | null;
  isSerializable: boolean | null;
  serialType: string | null;
}


export function ReceivingModal({ open, onOpenChange, onSubmit, resumeDraft, onDraftSaved }: ReceivingModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<ReceivingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [serialInput, setSerialInput] = useState('');
  const [currentSerials, setCurrentSerials] = useState<string[]>([]);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [lotInput, setLotInput] = useState('');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [serialScanMode, setSerialScanMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastDeletedSerial, setLastDeletedSerial] = useState<{ serial: string; index: number } | null>(null);
  const [serialFilter, setSerialFilter] = useState('');
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showSkuMappingForm, setShowSkuMappingForm] = useState(false);
  const [isCheckingSerials, setIsCheckingSerials] = useState(false);
  const [serialConflicts, setSerialConflicts] = useState<{ serial: string; existingProductName?: string }[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [unmappedSupplierSku, setUnmappedSupplierSku] = useState('');
  const [internalProductSearch, setInternalProductSearch] = useState('');
  const [internalProductResults, setInternalProductResults] = useState<Product[]>([]);
  const [showInternalResults, setShowInternalResults] = useState(false);
  const [showSupplierSkuPrompt, setShowSupplierSkuPrompt] = useState(false);
  const [pendingSupplierSkuInput, setPendingSupplierSkuInput] = useState('');
  const [bulkLoadMode, setBulkLoadMode] = useState(false);
  const [viewingItemSerials, setViewingItemSerials] = useState<string | null>(null);
  const [step3ViewMode, setStep3ViewMode] = useState<'aggregated' | 'serialized'>('aggregated');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ReceivingItem | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);

  // State for legal entity mismatch warning
  const [showLegalEntityMismatch, setShowLegalEntityMismatch] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] = useState<FormValues | null>(null);

  // Form declaration - MUST be before queries that use selectedSupplierId
  const form = useForm<FormValues>({
    resolver: zodResolver(receivingSchema),
    defaultValues: {
      supplierId: '',
      orderId: '',
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      notes: '',
      storeId: '',
      legalEntityId: '',
    },
  });

  const selectedSupplierId = form.watch('supplierId');
  const selectedOrderId = form.watch('orderId');

  // Fetch suppliers from API (brand + tenant)
  const { data: suppliersData = [], isLoading: suppliersLoading } = useQuery<SupplierFromAPI[]>({
    queryKey: ['/api/wms/suppliers'],
    enabled: open,
  });

  // Fetch stores/warehouses from API
  const { data: storesData = [], isLoading: storesLoading } = useQuery<StoreFromAPI[]>({
    queryKey: ['/api/wms/stores'],
    enabled: open,
  });

  // Fetch legal entities
  const { data: legalEntitiesData = [], isLoading: legalEntitiesLoading } = useQuery<LegalEntityFromAPI[]>({
    queryKey: ['/api/legal-entities'],
    enabled: open,
  });

  // Watch selected store and legal entity for mismatch validation
  const selectedStoreId = form.watch('storeId');
  const selectedLegalEntityId = form.watch('legalEntityId');

  // State for search mode: 'internal' (catalog) or 'supplier_sku'
  const [searchMode, setSearchMode] = useState<'internal' | 'supplier_sku'>('internal');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Filter states for product type/category/typology hierarchy
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>(''); // PHYSICAL, VIRTUAL, SERVICE, CANVAS
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  
  // Product type options with Italian labels (only types relevant for warehouse receiving)
  const productTypeOptions = [
    { value: 'PHYSICAL', label: 'Fisico' },
    { value: 'SERVICE', label: 'Servizio' },
    { value: 'VIRTUAL', label: 'Digitale' },
  ];
  
  // Debounce search query (600ms for better UX when typing SKUs)
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

  // Fetch categories for filter dropdown
  const { data: categoriesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/categories'],
    enabled: open && currentStep === 2,
  });

  // Fetch product types for filter dropdown
  const { data: typesData = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['/api/wms/product-types'],
    enabled: open && currentStep === 2,
  });

  // Fetch products from API for internal search (Flow 1)
  // Note: queryClient auto-extracts .data field from { success, data } responses
  const { data: productsApiData, isLoading: productsLoading } = useQuery<ProductFromAPI[]>({
    queryKey: ['/api/wms/products', { 
      search: debouncedSearchQuery,
      type: selectedProductType || undefined, // PHYSICAL, VIRTUAL, SERVICE, CANVAS
      category_id: selectedCategoryId || undefined,
      type_id: selectedTypeId || undefined,
    }],
    enabled: open && currentStep === 2 && searchMode === 'internal' && (debouncedSearchQuery.length >= 2 || !!selectedProductType || !!selectedCategoryId || !!selectedTypeId),
  });

  // Fetch SKU mappings for supplier SKU search (Flow 2)
  // Note: queryClient auto-extracts .data field from { success, data } responses
  const { data: skuMappingsData, isLoading: mappingsLoading } = useQuery<SkuMappingFromAPI[]>({
    queryKey: ['/api/wms/product-supplier-mappings', { supplierId: selectedSupplierId, supplierSku: debouncedSearchQuery }],
    enabled: open && currentStep === 2 && searchMode === 'supplier_sku' && !!selectedSupplierId && debouncedSearchQuery.length >= 2,
  });

  // Convert API products to local Product interface
  const convertApiProduct = useCallback((p: ProductFromAPI | SkuMappingFromAPI, supplierSku?: string): Product => {
    if ('productId' in p) {
      // It's a SkuMappingFromAPI
      return {
        id: p.productId,
        name: p.productName || '',
        sku: p.productSku || '',
        supplierSku: p.supplierSku || supplierSku,
        ean: p.productEan || undefined,
        isSerializable: p.isSerializable || false,
        serialType: p.serialType as any,
        serialCount: 1,
      };
    } else {
      // It's a ProductFromAPI
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        supplierSku: supplierSku,
        ean: p.ean,
        description: p.description,
        isSerializable: p.isSerializable,
        serialType: p.serialType,
        serialCount: p.serialCount || 1,
      };
    }
  }, []);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setItems([]);
      setCurrentDraftId(null);
      form.reset();
    }
  }, [open]);

  // Reset search results when supplier changes (for supplier SKU search mode)
  useEffect(() => {
    if (searchMode === 'supplier_sku') {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setShowSkuMappingForm(false);
      setUnmappedSupplierSku('');
    }
  }, [selectedSupplierId]);

  // Resume draft: populate form and items when resumeDraft is provided
  useEffect(() => {
    if (open && resumeDraft) {
      setCurrentDraftId(resumeDraft.id);
      
      // Populate form fields
      form.setValue('supplierId', resumeDraft.supplierId || '');
      form.setValue('documentNumber', resumeDraft.documentNumber || '');
      form.setValue('documentDate', resumeDraft.documentDate || new Date().toISOString().split('T')[0]);
      form.setValue('notes', resumeDraft.notes || '');
      form.setValue('storeId', resumeDraft.storeId || '');
      
      // Reconstruct items from productsData
      if (resumeDraft.productsData && resumeDraft.productsData.length > 0) {
        const reconstructedItems: ReceivingItem[] = resumeDraft.productsData.map((p, idx) => ({
          id: `resumed-${idx}-${Date.now()}`,
          product: {
            id: p.productId,
            name: p.productName,
            sku: p.sku,
            ean: p.ean,
            isSerializable: p.isSerializable,
            serialType: p.serialType as any,
            serialCount: p.serialCount,
          },
          quantity: p.quantity,
          serials: p.serials || [],
          serialEntries: p.serialEntries,
          lot: p.lot,
          unitPrice: p.unitPrice,
        }));
        setItems(reconstructedItems);
      }
      
      // Go to the last saved step
      setCurrentStep((resumeDraft.lastStep || 1) as 1 | 2 | 3);
      
      // Mark draft as resumed
      apiRequest(`/api/wms/receiving/drafts/${resumeDraft.id}/resume`, { method: 'POST' }).catch(() => {});
    }
  }, [open, resumeDraft]);

  // Handle suspend (save draft)
  const handleSuspend = async () => {
    const formValues = form.getValues();
    const selectedSupplier = suppliersData.find(s => s.id === formValues.supplierId);
    const selectedStore = storesData.find(s => s.id === formValues.storeId);
    
    setIsSuspending(true);
    try {
      // Prepare products data for storage
      const productsData = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        ean: item.product.ean,
        quantity: item.quantity,
        serials: item.serials,
        serialEntries: item.serialEntries,
        lot: item.lot,
        unitPrice: item.unitPrice,
        isSerializable: item.product.isSerializable,
        serialType: item.product.serialType,
        serialCount: item.product.serialCount,
      }));

      if (currentDraftId) {
        // Update existing draft
        await apiRequest(`/api/wms/receiving/drafts/${currentDraftId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            supplierId: formValues.supplierId || null,
            supplierName: selectedSupplier?.name || null,
            documentNumber: formValues.documentNumber || null,
            documentDate: formValues.documentDate || null,
            storeId: formValues.storeId || null,
            storeName: selectedStore?.name || null,
            notes: formValues.notes || null,
            productsData,
            lastStep: currentStep,
            status: 'suspended',
          }),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Create new draft
        await apiRequest('/api/wms/receiving/drafts', {
          method: 'POST',
          body: JSON.stringify({
            supplierId: formValues.supplierId || null,
            supplierName: selectedSupplier?.name || null,
            documentNumber: formValues.documentNumber || null,
            documentDate: formValues.documentDate || null,
            storeId: formValues.storeId || null,
            storeName: selectedStore?.name || null,
            notes: formValues.notes || null,
            productsData,
            lastStep: currentStep,
          }),
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Invalidate drafts query
      queryClient.invalidateQueries({ queryKey: ['/api/wms/receiving/drafts'] });
      
      toast({
        title: 'Carico sospeso',
        description: 'Il carico è stato salvato come bozza. Potrai riprenderlo in seguito.',
      });
      
      onDraftSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la bozza. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSuspending(false);
    }
  };

  // Orders - TODO: implement orders API when ready
  const availableOrders: Order[] = [];

  // Detect the type of code being scanned
  const detectCodeType = (code: string): 'ean' | 'imei' | 'iccid' | 'mac' | 'sku' | 'unknown' => {
    if (isLikelyEAN(code)) return 'ean';
    if (isLikelyIMEI(code)) return 'imei';
    if (isLikelyICCID(code)) return 'iccid';
    if (isLikelyMAC(code)) return 'mac';
    // Assume SKU/supplier code for alphanumeric strings
    if (/^[A-Za-z0-9-_]+$/.test(code)) return 'sku';
    return 'unknown';
  };

  const [detectedCodeType, setDetectedCodeType] = useState<'ean' | 'imei' | 'iccid' | 'mac' | 'sku' | 'unknown' | null>(null);

  const [totalSearchResults, setTotalSearchResults] = useState(0);
  const MAX_VISIBLE_RESULTS = 10;

  // Process search results from API (Flow 1: Internal catalog search)
  useEffect(() => {
    if (searchMode === 'internal' && productsApiData && Array.isArray(productsApiData)) {
      const query = debouncedSearchQuery.toLowerCase();
      const codeType = detectCodeType(debouncedSearchQuery);
      setDetectedCodeType(codeType);
      
      // Handle serial auto-add for selected product
      if (productsApiData.length === 0 && (codeType === 'imei' || codeType === 'iccid' || codeType === 'mac')) {
        if (selectedProduct && selectedProduct.isSerializable && 
            ((codeType === 'imei' && selectedProduct.serialType === 'imei') ||
             (codeType === 'iccid' && selectedProduct.serialType === 'iccid') ||
             (codeType === 'mac' && selectedProduct.serialType === 'mac_address'))) {
          if (!currentSerials.includes(searchQuery.trim())) {
            setCurrentSerials([...currentSerials, searchQuery.trim()]);
          }
          setSearchQuery('');
          setShowSearchResults(false);
          return;
        }
      }
      
      // Convert API products to local format
      const allResults = productsApiData.map(p => convertApiProduct(p));
      
      // Rank results by relevance
      const rankedResults = allResults.sort((a, b) => {
        const aExactSku = a.sku.toLowerCase() === query || a.ean === debouncedSearchQuery;
        const bExactSku = b.sku.toLowerCase() === query || b.ean === debouncedSearchQuery;
        if (aExactSku && !bExactSku) return -1;
        if (!aExactSku && bExactSku) return 1;
        
        const aStartsSku = a.sku.toLowerCase().startsWith(query) || a.ean?.startsWith(debouncedSearchQuery);
        const bStartsSku = b.sku.toLowerCase().startsWith(query) || b.ean?.startsWith(debouncedSearchQuery);
        if (aStartsSku && !bStartsSku) return -1;
        if (!aStartsSku && bStartsSku) return 1;
        
        const aStartsName = a.name.toLowerCase().startsWith(query);
        const bStartsName = b.name.toLowerCase().startsWith(query);
        if (aStartsName && !bStartsName) return -1;
        if (!aStartsName && bStartsName) return 1;
        
        return 0;
      });
      
      setTotalSearchResults(rankedResults.length);
      const results = rankedResults.slice(0, MAX_VISIBLE_RESULTS);
      
      setSearchResults(results);
      setShowSearchResults(true);
      
      // If no results and query looks like a supplier SKU, show mapping option
      if (results.length === 0 && query.length >= 2 && (codeType === 'sku' || codeType === 'unknown')) {
        setUnmappedSupplierSku(searchQuery);
      } else if (results.length > 0) {
        setShowSkuMappingForm(false);
        setUnmappedSupplierSku('');
      }
    } else if (searchMode === 'internal' && debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setShowSkuMappingForm(false);
      setDetectedCodeType(null);
    }
  }, [searchMode, productsApiData, debouncedSearchQuery, selectedProduct, currentSerials, convertApiProduct]);

  // Process search results from SKU mappings API (Flow 2: Supplier SKU search)
  useEffect(() => {
    if (searchMode === 'supplier_sku' && skuMappingsData && Array.isArray(skuMappingsData)) {
      const codeType = detectCodeType(debouncedSearchQuery);
      setDetectedCodeType(codeType);
      
      if (skuMappingsData.length > 0) {
        // Found mappings - convert to products
        const results = skuMappingsData.map(m => convertApiProduct(m));
        
        setTotalSearchResults(results.length);
        setSearchResults(results.slice(0, MAX_VISIBLE_RESULTS));
        setShowSearchResults(true);
        setShowSkuMappingForm(false);
        setUnmappedSupplierSku('');
      } else {
        // No mapping found - show message and option to create mapping
        // Do NOT auto-switch - let user click "Crea Abbinamento" button
        setSearchResults([]);
        setShowSearchResults(true); // Show the "not found" panel
        setUnmappedSupplierSku(debouncedSearchQuery);
      }
    } else if (searchMode === 'supplier_sku' && debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setShowSkuMappingForm(false);
      setDetectedCodeType(null);
    }
  }, [searchMode, skuMappingsData, debouncedSearchQuery, convertApiProduct]);

  // Search for internal products when mapping unmapped supplier SKU (uses same API)
  // Note: queryClient auto-extracts .data field from { success, data } responses
  const { data: internalSearchData, isLoading: internalSearchLoading } = useQuery<ProductFromAPI[]>({
    queryKey: ['/api/wms/products', { search: internalProductSearch }],
    enabled: showSkuMappingForm && internalProductSearch.length >= 2,
  });

  // Process internal product search results for mapping
  useEffect(() => {
    if (internalSearchData && Array.isArray(internalSearchData)) {
      const results = internalSearchData.map(p => convertApiProduct(p));
      setInternalProductResults(results);
      setShowInternalResults(true);
    } else if (internalProductSearch.length < 2) {
      setInternalProductResults([]);
      setShowInternalResults(false);
    }
  }, [internalSearchData, internalProductSearch, convertApiProduct]);

  const handleCreateMapping = async (product: Product) => {
    // Create mapping: associate unmappedSupplierSku to this product
    const mappedProduct: Product = {
      ...product,
      supplierSku: unmappedSupplierSku
    };
    
    // Save mapping to backend
    if (selectedSupplierId && unmappedSupplierSku) {
      try {
        await apiRequest('/api/wms/product-supplier-mappings', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            supplierId: selectedSupplierId,
            supplierSku: unmappedSupplierSku,
            useInternalSku: false,
            isPrimary: false
          })
        });
        toast({
          title: "Mapping SKU salvato",
          description: `${product.sku} → ${unmappedSupplierSku}`,
        });
      } catch (error) {
        console.error('Error saving SKU mapping:', error);
        // Continue anyway - local mapping is sufficient for this session
      }
    }
    
    // Select the product and reset mapping form
    setShowSkuMappingForm(false);
    setUnmappedSupplierSku('');
    setInternalProductSearch('');
    setShowInternalResults(false);
    handleProductSelect(mappedProduct);
  };

  const [isCheckingMapping, setIsCheckingMapping] = useState(false);

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setShowSearchResults(false);
    setCurrentSerials([]);
    setTargetQuantity(1);
    setLotInput('');
    setUnitPriceInput('');
    
    if (product.isSerializable && isGloballyUnique(product.serialType)) {
      setSerialScanMode(true);
    }
    
    // If product already has supplierSku (from SKU mapping search), skip check
    if (product.supplierSku) {
      setShowSupplierSkuPrompt(false);
      setTimeout(() => quantityInputRef.current?.focus(), 100);
      return;
    }
    
    // For internal catalog search (Flow 1): verify if mapping exists for this supplier
    if (selectedSupplierId && searchMode === 'internal') {
      // Check if we came from auto-switch (unmappedSupplierSku is set)
      if (unmappedSupplierSku) {
        // Auto-create mapping with the supplier SKU that wasn't found
        setIsCheckingMapping(true);
        try {
          await apiRequest('/api/wms/product-supplier-mappings', {
            method: 'POST',
            body: JSON.stringify({
              productId: product.id,
              supplierId: selectedSupplierId,
              supplierSku: unmappedSupplierSku,
              useInternalSku: false,
              isPrimary: false
            })
          });
          toast({
            title: "Mapping SKU creato",
            description: `${product.sku} → ${unmappedSupplierSku}`,
          });
          // Update product with the new supplier SKU
          setSelectedProduct({
            ...product,
            supplierSku: unmappedSupplierSku
          });
          setShowSupplierSkuPrompt(false);
          setUnmappedSupplierSku('');
        } catch (error) {
          console.error('Error creating SKU mapping:', error);
          // On error, still update locally for this session
          setSelectedProduct({
            ...product,
            supplierSku: unmappedSupplierSku
          });
          setShowSupplierSkuPrompt(false);
          setUnmappedSupplierSku('');
        } finally {
          setIsCheckingMapping(false);
        }
      } else {
        // Normal Flow 1: check if mapping exists
        setIsCheckingMapping(true);
        try {
          const data = await apiRequest(`/api/wms/product-supplier-mappings?productId=${product.id}&supplierId=${selectedSupplierId}`);
          
          if (data && Array.isArray(data) && data.length > 0) {
            // Mapping exists - update product with supplierSku
            const mapping = data[0];
            setSelectedProduct({
              ...product,
              supplierSku: mapping.supplierSku || undefined
            });
            setShowSupplierSkuPrompt(false);
          } else {
            // No mapping - prompt to add supplier SKU
            setShowSupplierSkuPrompt(true);
            setPendingSupplierSkuInput('');
          }
        } catch (error) {
          console.error('Error checking mapping:', error);
          // On error, prompt anyway
          setShowSupplierSkuPrompt(true);
          setPendingSupplierSkuInput('');
        } finally {
          setIsCheckingMapping(false);
        }
      }
    } else if (searchMode === 'supplier_sku') {
      // Flow 2: Supplier SKU search - product already has mapping verified
      // No prompt needed - mapping was found in SKU search
      setShowSupplierSkuPrompt(false);
    } else if (!selectedSupplierId) {
      // No supplier selected - cannot create mapping
      setShowSupplierSkuPrompt(false);
    } else {
      setShowSupplierSkuPrompt(false);
    }
    
    // Always focus on quantity field first
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleSaveSupplierSku = async () => {
    if (!selectedProduct || !pendingSupplierSkuInput.trim()) return;
    
    const supplierSkuValue = pendingSupplierSkuInput.trim();
    
    // Update product with new supplier SKU
    const updatedProduct: Product = {
      ...selectedProduct,
      supplierSku: supplierSkuValue
    };
    
    // Save mapping to backend
    if (selectedSupplierId) {
      try {
        await apiRequest('/api/wms/product-supplier-mappings', {
          method: 'POST',
          body: JSON.stringify({
            productId: selectedProduct.id,
            supplierId: selectedSupplierId,
            supplierSku: supplierSkuValue,
            useInternalSku: false,
            isPrimary: false
          })
        });
        toast({
          title: "Mapping SKU salvato",
          description: `${selectedProduct.sku} → ${supplierSkuValue}`,
        });
      } catch (error) {
        console.error('Error saving SKU mapping:', error);
        // Continue anyway - local mapping is sufficient for this session
      }
    }
    
    setSelectedProduct(updatedProduct);
    setShowSupplierSkuPrompt(false);
    setPendingSupplierSkuInput('');
  };

  const handleSkipSupplierSku = () => {
    setShowSupplierSkuPrompt(false);
    setPendingSupplierSkuInput('');
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

  // Get expected length for serial type validation
  const getSerialExpectedLength = (serialType?: string): number => {
    switch (serialType) {
      case 'imei': return 15;
      case 'iccid': return 19; // Can be 19-20
      case 'mac_address': return 12; // Without separators
      default: return 1; // Any non-empty
    }
  };

  // Check if current serial input is valid for adding
  const isSerialInputValid = (): boolean => {
    if (!serialInput.trim()) return false;
    if (!selectedProduct) return false;
    
    const cleanedSerial = serialInput.replace(/[^0-9A-Fa-f]/g, '');
    const expectedLength = getSerialExpectedLength(selectedProduct.serialType);
    
    // For IMEI, require exactly 15 digits
    if (selectedProduct.serialType === 'imei') {
      return cleanedSerial.length === 15;
    }
    // For ICCID, 19-20 digits
    if (selectedProduct.serialType === 'iccid') {
      return cleanedSerial.length >= 19 && cleanedSerial.length <= 20;
    }
    // For MAC, 12 hex chars
    if (selectedProduct.serialType === 'mac_address') {
      return cleanedSerial.length === 12;
    }
    // For others, just non-empty
    return serialInput.trim().length >= expectedLength;
  };

  // Normalize serial by removing separators for consistent storage
  const normalizeSerial = (serial: string, serialType?: string): string => {
    const trimmed = serial.trim();
    if (serialType === 'mac_address') {
      // Remove colons, dashes, dots from MAC addresses
      return trimmed.replace(/[:\-.]/g, '').toUpperCase();
    }
    if (serialType === 'imei' || serialType === 'iccid') {
      // Keep only digits
      return trimmed.replace(/\D/g, '');
    }
    return trimmed;
  };

  // Add serial manually (called by button click)
  const addSerialManually = () => {
    if (!isSerialInputValid()) return;
    
    // Normalize the serial before storing
    const normalizedSerial = normalizeSerial(serialInput, selectedProduct?.serialType);
    
    // Check for duplicates using normalized value
    if (currentSerials.includes(normalizedSerial)) {
      toast({
        title: 'Seriale duplicato',
        description: 'Questo seriale è già stato inserito.',
        variant: 'destructive',
      });
      setSerialInput('');
      serialInputRef.current?.focus();
      return;
    }
    
    const newSerials = [...currentSerials, normalizedSerial];
    setCurrentSerials(newSerials);
    setSerialInput('');
    
    // Keep focus on serial input for rapid entry
    setTimeout(() => {
      serialInputRef.current?.focus();
    }, 50);
  };

  const handleSerialScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && serialInput.trim()) {
      e.preventDefault();
      
      // Normalize the serial before storing
      const normalizedSerial = normalizeSerial(serialInput, selectedProduct?.serialType);
      
      // Check for duplicates using normalized value
      if (currentSerials.includes(normalizedSerial)) {
        setSerialInput('');
        serialInputRef.current?.focus();
        return;
      }
      
      const newSerials = [...currentSerials, normalizedSerial];
      setCurrentSerials(newSerials);
      setSerialInput('');
      
      // Keep focus on serial input for rapid scanning
      setTimeout(() => {
        serialInputRef.current?.focus();
      }, 50);
      
      // Only exit scan mode when ALL serials are captured
      if (newSerials.length >= targetQuantity) {
        setSerialScanMode(false);
      }
    }
  };

  // Handle quantity input - allow empty values during typing
  const handleQuantityChange = (value: string) => {
    if (value === '') {
      setTargetQuantity(0);
    } else {
      const parsed = parseInt(value);
      if (!isNaN(parsed) && parsed >= 0) {
        setTargetQuantity(parsed);
      }
    }
  };

  // Validate quantity on blur - ensure minimum of 1
  const handleQuantityBlur = () => {
    if (targetQuantity < 1) {
      setTargetQuantity(1);
    }
  };

  const removeSerial = (index: number) => {
    const serialToRemove = currentSerials[index];
    setLastDeletedSerial({ serial: serialToRemove, index });
    setCurrentSerials(prev => prev.filter((_, i) => i !== index));
    setShowUndoToast(true);
    
    // Hide toast after 5 seconds
    setTimeout(() => {
      setShowUndoToast(false);
      setLastDeletedSerial(null);
    }, 5000);
    
    // Refocus input
    setTimeout(() => serialInputRef.current?.focus(), 50);
  };

  const removeLastSerial = () => {
    if (currentSerials.length === 0) return;
    removeSerial(currentSerials.length - 1);
  };

  const undoLastDelete = () => {
    if (!lastDeletedSerial) return;
    
    // Reinsert at original position
    setCurrentSerials(prev => {
      const newSerials = [...prev];
      newSerials.splice(lastDeletedSerial.index, 0, lastDeletedSerial.serial);
      return newSerials;
    });
    
    setLastDeletedSerial(null);
    setShowUndoToast(false);
    setTimeout(() => serialInputRef.current?.focus(), 50);
  };

  const generateLot = (): string => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `LOT-${year}-${random}`;
  };

  const addItemToList = () => {
    if (!selectedProduct) return;

    // Bulk load mode: serializable products loaded without individual serials
    const isBulkLoad = bulkLoadMode && selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType);
    
    // Determine if lot is needed
    const needsLot = !selectedProduct.isSerializable || 
      (selectedProduct.isSerializable && selectedProduct.serialType === 'other') ||
      isBulkLoad; // Bulk load always requires lot
    
    const finalLot = needsLot ? (lotInput || generateLot()) : undefined;
    
    // For dual-serial products, quantity = number of complete units
    const serialsPerUnit = selectedProduct.serialCount || 1;
    const serializedQty = Math.floor(currentSerials.length / serialsPerUnit);
    
    const newItem: ReceivingItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: isBulkLoad 
        ? targetQuantity  // Bulk: use target quantity directly
        : (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) 
            ? serializedQty 
            : targetQuantity),
      serials: isBulkLoad ? [] : currentSerials, // Bulk: no individual serials
      lot: finalLot,
      unitPrice: unitPriceInput ? parseFloat(unitPriceInput) : undefined,
      bulkLoaded: isBulkLoad, // Flag to track bulk-loaded items
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
    setSerialScanMode(false);
    setBulkLoadMode(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Check for duplicate serials before final submission
  const checkSerialDuplicates = async (): Promise<{ serial: string; existingProductName?: string }[]> => {
    // Collect all serials from all items
    const allSerials: string[] = [];
    items.forEach(item => {
      if (item.product.isSerializable && item.serials.length > 0) {
        allSerials.push(...item.serials);
      }
    });
    
    if (allSerials.length === 0) return [];
    
    try {
      const response = await apiRequest('/api/wms/receiving/check-serials', { 
        method: 'POST', 
        body: JSON.stringify({ serials: allSerials }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = response as { success: boolean; data: { hasDuplicates: boolean; duplicates: { serial: string; existingProductName?: string }[] } };
      
      if (data.success && data.data.hasDuplicates) {
        return data.data.duplicates;
      }
    } catch (error) {
      console.error('Error checking serial duplicates:', error);
      // Don't block submission on API error, just warn
      toast({
        title: 'Attenzione',
        description: 'Impossibile verificare i duplicati IMEI. Procedi con cautela.',
        variant: 'destructive',
      });
    }
    
    return [];
  };

  const handleFormSubmit = async (values: FormValues) => {
    setIsCheckingSerials(true);
    
    try {
      // Check legal entity mismatch with warehouse
      const selectedStore = storesData.find(s => s.id === values.storeId) as any;
      if (selectedStore?.legalEntityId && values.legalEntityId && selectedStore.legalEntityId !== values.legalEntityId) {
        // Legal entity mismatch - show warning dialog
        setPendingSubmitValues(values);
        setShowLegalEntityMismatch(true);
        setIsCheckingSerials(false);
        return;
      }

      // Check for duplicate serials before submitting
      const duplicates = await checkSerialDuplicates();
      
      if (duplicates.length > 0) {
        setSerialConflicts(duplicates);
        setShowConflictDialog(true);
        setIsCheckingSerials(false);
        return; // Don't submit yet, show conflict dialog
      }
      
      // No conflicts, proceed with submission
      await submitReceiving(values);
    } catch (error) {
      console.error('Error during submission:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la verifica. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingSerials(false);
    }
  };

  // Handle user confirming to proceed despite legal entity mismatch
  const handleProceedDespiteMismatch = async () => {
    setShowLegalEntityMismatch(false);
    if (pendingSubmitValues) {
      // Check serials and then submit
      const duplicates = await checkSerialDuplicates();
      if (duplicates.length > 0) {
        setSerialConflicts(duplicates);
        setShowConflictDialog(true);
        return;
      }
      await submitReceiving(pendingSubmitValues);
    }
    setPendingSubmitValues(null);
  };

  const submitReceiving = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      onSubmit({
        ...values,
        items,
      });
      
      // If resuming a draft, mark it as completed
      if (currentDraftId) {
        try {
          await apiRequest(`/api/wms/receiving/drafts/${currentDraftId}/complete`, { method: 'POST' });
          queryClient.invalidateQueries({ queryKey: ['/api/wms/receiving/drafts'] });
        } catch (error) {
          console.error('Error marking draft as completed:', error);
        }
      }
      
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceSubmit = async () => {
    // User chose to ignore conflicts and proceed anyway
    setShowConflictDialog(false);
    const values = form.getValues();
    await submitReceiving(values);
  };

  const canAddItem = (): boolean => {
    if (!selectedProduct) return false;
    
    // Price is MANDATORY for all products
    const hasValidPrice = unitPriceInput.trim().length > 0 && parseFloat(unitPriceInput) >= 0;
    if (!hasValidPrice) return false;
    
    if (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType)) {
      // Bulk load mode: require quantity > 0 and lot number
      if (bulkLoadMode) {
        return targetQuantity > 0 && lotInput.trim().length > 0;
      }
      
      const serialsPerUnit = selectedProduct.serialCount || 1;
      // For dual-serial products, need complete sets (e.g., 2 IMEI per unit)
      // At least one complete unit is required
      return currentSerials.length >= serialsPerUnit;
    }
    
    return targetQuantity > 0;
  };

  // Calculate actual quantity from serials for serialized products
  const getSerializedQuantity = (): number => {
    if (!selectedProduct) return 0;
    const serialsPerUnit = selectedProduct.serialCount || 1;
    return Math.floor(currentSerials.length / serialsPerUnit);
  };

  // Validate Step 1 fields before proceeding
  const canProceedToStep2 = (): boolean => {
    const values = form.getValues();
    return !!(values.supplierId && values.documentNumber && values.documentDate && values.storeId && values.legalEntityId);
  };

  const handleProceedToStep2 = async () => {
    // Trigger validation for Step 1 fields
    const isValid = await form.trigger(['supplierId', 'documentNumber', 'documentDate', 'storeId', 'legalEntityId']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={setDialogContainer}
        className={`${currentStep === 3 ? 'max-w-6xl w-[95vw]' : 'max-w-4xl'} max-h-[90vh] min-h-[70vh] overflow-hidden flex flex-col`}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Nuovo Carico Merce - {currentStep === 1 ? 'Dati Documento' : currentStep === 2 ? 'Carico Prodotti' : 'Riepilogo'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? 'Inserisci i dati del documento di carico' 
              : currentStep === 2 
                ? 'Aggiungi i prodotti da caricare in magazzino'
                : 'Verifica i dati e conferma il carico'}
          </DialogDescription>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 1 ? 'bg-orange-100 text-orange-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>1</span>
              Documento
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 2 ? 'bg-orange-100 text-orange-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>2</span>
              Prodotti
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              currentStep === 3 ? 'bg-orange-100 text-orange-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                currentStep >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>3</span>
              Riepilogo
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            
            {/* STEP 1: Document Data */}
            {currentStep === 1 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Origine Merce
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornitore *</FormLabel>
                        <FormControl>
                          <SupplierCombobox
                            suppliers={suppliersData.map(s => ({ id: s.id, name: s.name, code: s.code }))}
                            value={field.value}
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

                  <FormField
                    control={form.control}
                    name="orderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordine collegato</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedSupplierId || availableOrders.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-order">
                              <SelectValue placeholder={
                                !selectedSupplierId 
                                  ? "Seleziona prima un fornitore" 
                                  : availableOrders.length === 0 
                                    ? "Nessun ordine aperto"
                                    : "Seleziona ordine (opzionale)"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nessun ordine</SelectItem>
                            {availableOrders.map(o => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.orderNumber}
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
                    name="documentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DDT / Fattura Fornitore *</FormLabel>
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
                        <FormLabel>Data Documento *</FormLabel>
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
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Magazzino di Destinazione *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-warehouse">
                              <SelectValue placeholder="Seleziona magazzino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {storesData.length === 0 && !storesLoading && (
                              <SelectItem value="no-stores" disabled>Nessun magazzino disponibile</SelectItem>
                            )}
                            {storesData.map(s => (
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

                  <FormField
                    control={form.control}
                    name="legalEntityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entità Legale DDT *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-legal-entity">
                              <SelectValue placeholder="Seleziona entità legale" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {legalEntitiesData.length === 0 && !legalEntitiesLoading && (
                              <SelectItem value="no-entities" disabled>Nessuna entità disponibile</SelectItem>
                            )}
                            {legalEntitiesData.map(e => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.ragioneSociale}
                                {e.partitaIva && ` (P.IVA: ${e.partitaIva})`}
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Note aggiuntive sul carico..."
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
            )}

            {/* STEP 2: Products */}
            {currentStep === 2 && (
              <>
            {selectedOrderId && selectedOrderId !== '' && selectedOrderId !== 'none' && availableOrders.length > 0 && (
              <OrderMatchSection 
                order={availableOrders.find(o => o.id === selectedOrderId)}
                receivedItems={items}
                onAddFromOrder={(orderItem) => {
                  toast({
                    title: 'Funzionalità in sviluppo',
                    description: 'Aggiungi i prodotti manualmente dalla ricerca.',
                  });
                }}
              />
            )}

            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Prodotti da Caricare
                </h3>

                <div className="space-y-4">
                  {/* Search mode toggle + filters */}
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
                    
                    {/* Filter button - only visible in internal mode */}
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
                        {(selectedCategoryId || selectedTypeId) && (
                          <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {(selectedCategoryId ? 1 : 0) + (selectedTypeId ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {/* Mapping mode indicator */}
                  {unmappedSupplierSku && searchMode === 'internal' && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-2">
                      <Link className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Seleziona un prodotto da abbinare a: <span className="font-mono font-semibold">{unmappedSupplierSku}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setUnmappedSupplierSku('');
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Annulla
                      </Button>
                    </div>
                  )}

                  {/* Filters panel */}
                  {showFilters && searchMode === 'internal' && (
                    <div className="flex gap-3 mb-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1 block">Tipo Prodotto</Label>
                        <Select 
                          value={selectedProductType || "__all__"} 
                          onValueChange={(v) => {
                            setSelectedProductType(v === "__all__" ? '' : v);
                            // Reset child filters when parent changes
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
                          data-testid="btn-clear-filters"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchMode === 'internal' 
                        ? "Scansiona EAN/barcode, SKU interno, o nome prodotto..." 
                        : "Inserisci SKU fornitore dal documento di trasporto..."}
                      className="pl-9 pr-24"
                      data-testid="input-product-search"
                    />
                    {/* Loading indicator */}
                    {(productsLoading || mappingsLoading) && (
                      <div className="absolute right-20 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {/* Code type indicator badge */}
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
                    
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto">
                        {totalSearchResults > MAX_VISIBLE_RESULTS && (
                          <div className="px-3 py-2 bg-gray-50 border-b text-sm text-gray-600 flex items-center justify-between">
                            <span>Mostrati {searchResults.length} di {totalSearchResults} risultati</span>
                            <Badge variant="secondary" className="text-xs">
                              Altri {totalSearchResults - searchResults.length}
                            </Badge>
                          </div>
                        )}
                        {searchResults.map(product => (
                          <div
                            key={product.id}
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
                        ))}
                      </div>
                    )}
                    
                    {/* No results - show mapping option */}
                    {showSearchResults && searchResults.length === 0 && unmappedSupplierSku && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                        <div className="p-4 border-b bg-amber-50">
                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Codice non trovato</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Il codice "<span className="font-mono font-medium">{unmappedSupplierSku}</span>" non è mappato a nessun prodotto interno.
                          </p>
                          <Button 
                              type="button"
                              variant="default"
                              size="sm"
                              className="mt-3"
                              onClick={() => {
                                // Switch to Flow 1 with filters open, keeping the supplier SKU for mapping
                                setSearchMode('internal');
                                setShowFilters(true);
                                setSearchQuery('');
                                setSearchResults([]);
                                setShowSearchResults(false);
                                // unmappedSupplierSku is already set, will be used when selecting a product
                                toast({
                                  title: "Cerca prodotto interno",
                                  description: `SKU fornitore "${unmappedSupplierSku}" sarà abbinato al prodotto selezionato`,
                                  duration: 3000,
                                });
                              }}
                              data-testid="button-create-mapping"
                            >
                              <Link className="h-4 w-4 mr-1" />
                              Crea Abbinamento
                            </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedProduct && (
                    <Card className="border-orange-200 bg-orange-50/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                            <p className="text-sm text-gray-500">
                              SKU: {selectedProduct.sku}
                              {selectedProduct.supplierSku && (
                                <span className="ml-2 text-green-600">| SKU Fornitore: {selectedProduct.supplierSku}</span>
                              )}
                            </p>
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

                        {/* Prompt to add supplier SKU if missing */}
                        {showSupplierSkuPrompt && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center gap-2 text-blue-700 mb-2">
                              <Hash className="h-4 w-4" />
                              <span className="font-medium">Abbina SKU Fornitore</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Questo prodotto non ha uno SKU fornitore associato per questo fornitore. Vuoi aggiungerlo ora?
                            </p>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label className="text-xs text-gray-500">SKU Fornitore</Label>
                                <Input
                                  value={pendingSupplierSkuInput}
                                  onChange={(e) => setPendingSupplierSkuInput(e.target.value)}
                                  placeholder="Inserisci codice fornitore..."
                                  className="mt-1"
                                  data-testid="input-pending-supplier-sku"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && pendingSupplierSkuInput.trim()) {
                                      e.preventDefault();
                                      handleSaveSupplierSku();
                                    }
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveSupplierSku}
                                disabled={!pendingSupplierSkuInput.trim()}
                                data-testid="button-save-supplier-sku"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Salva
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleSkipSupplierSku}
                                data-testid="button-skip-supplier-sku"
                              >
                                Salta
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Label>Quantità da caricare</Label>
                                <Input
                                  ref={quantityInputRef}
                                  type="number"
                                  min={1}
                                  value={targetQuantity || ''}
                                  onChange={(e) => handleQuantityChange(e.target.value)}
                                  onBlur={handleQuantityBlur}
                                  className="mt-1"
                                  data-testid="input-quantity"
                                />
                              </div>
                              <div className="flex-1">
                                <Label>Prezzo Acquisto <span className="text-red-500">*</span></Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={unitPriceInput}
                                  onChange={(e) => setUnitPriceInput(e.target.value)}
                                  placeholder="€"
                                  className="mt-1"
                                  data-testid="input-unit-price"
                                />
                              </div>
                            </div>
                            
                            {/* Bulk Load Mode Toggle */}
                            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-amber-600" />
                                <div>
                                  <span className="font-medium text-amber-800">Carico Massivo</span>
                                  <p className="text-xs text-amber-600">
                                    Carica senza inserire ogni singolo {getSerialLabel(selectedProduct.serialType)}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={bulkLoadMode}
                                onCheckedChange={(checked) => {
                                  setBulkLoadMode(checked);
                                  if (checked) {
                                    setCurrentSerials([]);
                                  }
                                }}
                                data-testid="switch-bulk-load"
                              />
                            </div>
                            
                            {bulkLoadMode ? (
                              /* Bulk Load Mode: Show lot input instead of serial scanning */
                              <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Package className="h-4 w-4" />
                                  <span className="font-medium">Numero Lotto (obbligatorio)</span>
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={lotInput}
                                    onChange={(e) => setLotInput(e.target.value.toUpperCase())}
                                    placeholder="Es. LOT-2025-00123"
                                    className="flex-1"
                                    data-testid="input-bulk-lot"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLotInput(generateLot())}
                                    data-testid="button-generate-lot"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Auto
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Verranno caricate {targetQuantity} unità senza tracciamento {getSerialLabel(selectedProduct.serialType)} individuale
                                </p>
                              </div>
                            ) : (
                            <div className="space-y-3">
                              {/* Dual-serial info banner */}
                              {(selectedProduct.serialCount || 1) > 1 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                                  <Hash className="h-4 w-4 text-blue-600" />
                                  <span className="text-blue-700">
                                    Prodotto con <strong>{selectedProduct.serialCount} {getSerialLabel(selectedProduct.serialType)}</strong> per unità 
                                    (es. Dual-SIM). Servono {targetQuantity * (selectedProduct.serialCount || 1)} seriali totali.
                                  </span>
                                </div>
                              )}
                              
                              {/* Progress bar and counter */}
                              <div className="flex items-center justify-between mb-1">
                                <Label className="flex items-center gap-2">
                                  <ScanLine className="h-4 w-4" />
                                  Spara {getSerialLabel(selectedProduct.serialType)}
                                </Label>
                                <span className={`text-sm font-medium ${
                                  currentSerials.length >= targetQuantity * (selectedProduct.serialCount || 1) ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {(selectedProduct.serialCount || 1) > 1 ? (
                                    <>
                                      Unità {Math.floor(currentSerials.length / (selectedProduct.serialCount || 1)) + (currentSerials.length % (selectedProduct.serialCount || 1) > 0 ? 1 : 0)} / {targetQuantity} 
                                      <span className="text-gray-400 ml-1">
                                        ({currentSerials.length} / {targetQuantity * (selectedProduct.serialCount || 1)} seriali)
                                      </span>
                                    </>
                                  ) : (
                                    <>{currentSerials.length} / {targetQuantity} acquisiti</>
                                  )}
                                </span>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    currentSerials.length >= targetQuantity * (selectedProduct.serialCount || 1) ? 'bg-green-500' : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${Math.min((currentSerials.length / (targetQuantity * (selectedProduct.serialCount || 1))) * 100, 100)}%` }}
                                />
                              </div>

                              {/* Single input field - always active until complete */}
                              {currentSerials.length < targetQuantity * (selectedProduct.serialCount || 1) && (
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      ref={serialInputRef}
                                      value={serialInput}
                                      onChange={(e) => setSerialInput(e.target.value)}
                                      onKeyDown={handleSerialScan}
                                      placeholder={
                                        (selectedProduct.serialCount || 1) > 1
                                          ? `${getSerialLabel(selectedProduct.serialType)} ${(currentSerials.length % (selectedProduct.serialCount || 1)) + 1} per Unità ${Math.floor(currentSerials.length / (selectedProduct.serialCount || 1)) + 1}...`
                                          : `Scansiona o digita ${getSerialLabel(selectedProduct.serialType)} #${currentSerials.length + 1}...`
                                      }
                                      className={`pr-12 transition-colors ${
                                        isSerialInputValid() 
                                          ? 'border-green-500 focus:border-green-600 focus:ring-green-500' 
                                          : 'border-orange-300 focus:border-orange-500 focus:ring-orange-500'
                                      }`}
                                      data-testid="input-serial-scan"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                      {serialInput.replace(/[^0-9A-Fa-f]/g, '').length}/{getSerialExpectedLength(selectedProduct.serialType)}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={addSerialManually}
                                    disabled={!isSerialInputValid()}
                                    className={`transition-colors ${
                                      isSerialInputValid() 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-gray-300'
                                    }`}
                                    data-testid="btn-add-serial"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}

                              {/* Completion message */}
                              {currentSerials.length >= targetQuantity * (selectedProduct.serialCount || 1) && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700">
                                    {(selectedProduct.serialCount || 1) > 1 
                                      ? `Tutte le ${targetQuantity} unità complete (${currentSerials.length} ${getSerialLabel(selectedProduct.serialType)} totali)!`
                                      : `Tutti i ${targetQuantity} ${getSerialLabel(selectedProduct.serialType)} acquisiti!`
                                    }
                                  </span>
                                </div>
                              )}

                              {/* Quick actions and list of captured serials */}
                              {currentSerials.length > 0 && (
                                <div className="space-y-2">
                                  {/* Quick actions row */}
                                  <div className="flex items-center justify-between gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={removeLastSerial}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      data-testid="btn-undo-last"
                                    >
                                      <ArrowLeft className="h-3 w-3 mr-1" />
                                      Annulla ultimo
                                    </Button>
                                    
                                    {/* Filter input for large lists */}
                                    {currentSerials.length > 10 && (
                                      <div className="relative flex-1 max-w-48">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                        <Input
                                          value={serialFilter}
                                          onChange={(e) => setSerialFilter(e.target.value)}
                                          placeholder="Cerca seriale..."
                                          className="h-7 text-xs pl-7"
                                          data-testid="input-serial-filter"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Scrollable list */}
                                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto bg-gray-50">
                                    <div className="flex flex-wrap gap-1.5">
                                      {currentSerials
                                        .map((serial, idx) => ({ serial, idx }))
                                        .filter(({ serial }) => 
                                          !serialFilter || serial.toLowerCase().includes(serialFilter.toLowerCase())
                                        )
                                        .map(({ serial, idx }) => (
                                          <Badge 
                                            key={idx} 
                                            variant="secondary"
                                            className={`flex items-center gap-1 text-xs py-1 px-2 font-mono ${
                                              serialFilter && serial.toLowerCase().includes(serialFilter.toLowerCase()) 
                                                ? 'bg-yellow-100 border-yellow-300' 
                                                : ''
                                            }`}
                                          >
                                            <span className="text-gray-400 mr-1">{idx + 1}.</span>
                                            {serial}
                                            <X 
                                              className="h-3 w-3 cursor-pointer hover:text-red-500 ml-1" 
                                              onClick={() => removeSerial(idx)}
                                            />
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                  
                                  {/* Undo toast */}
                                  {showUndoToast && lastDeletedSerial && (
                                    <div className="flex items-center justify-between p-2 bg-gray-800 text-white rounded-md text-sm">
                                      <span>Eliminato: {lastDeletedSerial.serial}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={undoLastDelete}
                                        className="text-orange-400 hover:text-orange-300 hover:bg-gray-700 h-6 px-2"
                                      >
                                        Ripristina
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        ) : selectedProduct.isSerializable && selectedProduct.serialType === 'other' ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Quantità *</Label>
                                <Input
                                  ref={quantityInputRef}
                                  type="number"
                                  min={1}
                                  value={targetQuantity || ''}
                                  onChange={(e) => handleQuantityChange(e.target.value)}
                                  onBlur={handleQuantityBlur}
                                  className="mt-1"
                                  data-testid="input-quantity"
                                />
                              </div>
                              <div>
                                <Label>Lotto *</Label>
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    value={lotInput}
                                    onChange={(e) => setLotInput(e.target.value)}
                                    placeholder="Es. LOT-2024-00001"
                                    data-testid="input-lot"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLotInput(generateLot())}
                                  >
                                    Auto
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label>Prezzo <span className="text-red-500">*</span></Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={unitPriceInput}
                                  onChange={(e) => setUnitPriceInput(e.target.value)}
                                  placeholder="€"
                                  className="mt-1"
                                  data-testid="input-unit-price"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="flex items-center gap-2">
                                <ScanLine className="h-4 w-4" />
                                Spara Seriali ({currentSerials.length}/{targetQuantity})
                              </Label>
                              <div className="flex gap-2 mt-1">
                                <div className="relative flex-1">
                                  <Input
                                    ref={serialInputRef}
                                    value={serialInput}
                                    onChange={(e) => setSerialInput(e.target.value)}
                                    onKeyDown={handleSerialScan}
                                    placeholder="Scansiona o inserisci seriale..."
                                    className={`pr-12 transition-colors ${
                                      isSerialInputValid() 
                                        ? 'border-green-500 focus:border-green-600 focus:ring-green-500' 
                                        : ''
                                    }`}
                                    data-testid="input-serial-scan"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {serialInput.replace(/[^0-9A-Fa-f]/g, '').length}/{getSerialExpectedLength(selectedProduct?.serialType)}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={addSerialManually}
                                  disabled={!isSerialInputValid()}
                                  className={`transition-colors ${
                                    isSerialInputValid() 
                                      ? 'bg-green-600 hover:bg-green-700' 
                                      : 'bg-gray-300'
                                  }`}
                                  data-testid="btn-add-serial"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {currentSerials.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {currentSerials.map((serial, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    {serial}
                                    <X 
                                      className="h-3 w-3 cursor-pointer hover:text-red-500" 
                                      onClick={() => removeSerial(idx)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Quantità *</Label>
                              <Input
                                ref={quantityInputRef}
                                type="number"
                                min={1}
                                value={targetQuantity || ''}
                                onChange={(e) => handleQuantityChange(e.target.value)}
                                onBlur={handleQuantityBlur}
                                className="mt-1"
                                data-testid="input-quantity"
                              />
                            </div>
                            <div>
                              <Label>Lotto</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  value={lotInput}
                                  onChange={(e) => setLotInput(e.target.value)}
                                  placeholder="Opzionale"
                                  data-testid="input-lot"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLotInput(generateLot())}
                                >
                                  Auto
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label>Prezzo <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={unitPriceInput}
                                onChange={(e) => setUnitPriceInput(e.target.value)}
                                placeholder="€"
                                className="mt-1"
                                data-testid="input-unit-price"
                              />
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            onClick={addItemToList}
                            disabled={!canAddItem()}
                            className="bg-orange-500 hover:bg-orange-600"
                            data-testid="btn-add-item"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Aggiungi alla lista
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {items.length > 0 && (
                    <Card className="mt-4 border-orange-200 bg-orange-50/30">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-orange-500" />
                          Prodotti Inseriti ({items.length})
                          <Badge className="ml-auto bg-orange-500">{items.reduce((sum, i) => sum + i.quantity, 0)} unità</Badge>
                        </h4>
                        <div className="rounded-md border bg-white max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Prodotto</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Qtà</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Lotto</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Info</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id} className="border-b hover:bg-gray-50" data-testid={`item-row-${item.id}`}>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-sm truncate max-w-[180px]" title={item.product.name}>{item.product.name}</p>
                                  <p className="text-xs text-gray-500">{item.product.sku}</p>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                    {item.quantity}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600">{item.lot || '-'}</td>
                                <td className="px-3 py-2">
                                  {item.serials.length > 0 ? (
                                    <div className="relative">
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs cursor-pointer hover:bg-gray-200"
                                        onClick={() => setViewingItemSerials(viewingItemSerials === item.id ? null : item.id)}
                                      >
                                        <Barcode className="h-3 w-3 mr-1" />
                                        {item.serials.length} seriali
                                      </Badge>
                                      {viewingItemSerials === item.id && (
                                        <div className="absolute z-50 top-full left-0 mt-1 p-2 bg-white border rounded-md shadow-lg max-w-xs max-h-32 overflow-y-auto">
                                          <div className="space-y-1">
                                            {item.serials.map((serial, idx) => (
                                              <p key={idx} className="text-xs font-mono text-gray-700">{idx + 1}. {serial}</p>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : item.bulkLoaded ? (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                      <Package className="h-3 w-3 mr-1" />
                                      Massivo
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {item.serials.length > 0 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-10 w-10 p-0"
                                        onClick={() => setViewingItemSerials(viewingItemSerials === item.id ? null : item.id)}
                                        title="Vedi seriali"
                                        data-testid={`btn-view-item-${item.id}`}
                                      >
                                        <Eye className="h-6 w-6 text-blue-500" />
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-10 w-10 p-0"
                                      onClick={() => {
                                        setSelectedProduct(item.product);
                                        setCurrentSerials(item.serials);
                                        setTargetQuantity(item.quantity);
                                        setLotInput(item.lot || '');
                                        setUnitPriceInput(item.unitPrice?.toString() || '');
                                        setBulkLoadMode(item.bulkLoaded || false);
                                        removeItem(item.id);
                                      }}
                                      title="Modifica"
                                      data-testid={`btn-edit-item-${item.id}`}
                                    >
                                      <Edit className="h-6 w-6 text-orange-500" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-10 w-10 p-0"
                                      onClick={() => removeItem(item.id)}
                                      title="Elimina"
                                      data-testid={`btn-remove-item-${item.id}`}
                                    >
                                      <Trash2 className="h-6 w-6 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
              </>
            )}

            {/* STEP 3: Review Summary - Enlarged Modal */}
            {currentStep === 3 && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Upper Section: Document Summary - Sticky */}
                <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      Riepilogo Documento
                    </h4>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-orange-100 text-orange-700">
                        {items.length} prodotti
                      </Badge>
                      <Badge className="bg-green-100 text-green-700">
                        {items.reduce((sum, i) => sum + i.quantity, 0)} unità
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 text-xs">Fornitore</span>
                      <p className="font-medium truncate">{suppliersData.find(s => s.id === form.getValues('supplierId'))?.name || '-'}</p>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 text-xs">DDT/Fattura</span>
                      <p className="font-medium">{form.getValues('documentNumber')}</p>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 text-xs">Data Documento</span>
                      <p className="font-medium">{form.getValues('documentDate')}</p>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 text-xs">Magazzino</span>
                      <p className="font-medium truncate">{storesData.find(s => s.id === form.getValues('storeId'))?.name || '-'}</p>
                    </div>
                    {form.getValues('notes') && (
                      <div className="bg-white p-2 rounded border col-span-2 md:col-span-1">
                        <span className="text-gray-500 text-xs">Note</span>
                        <p className="font-medium text-xs truncate" title={form.getValues('notes')}>{form.getValues('notes')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lower Section: Products DataTable */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {/* Table Header with Switch */}
                  <div className="flex-shrink-0 px-4 py-3 border-b bg-white flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Dettaglio Prodotti
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={step3ViewMode === 'aggregated' ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                          Aggregata
                        </span>
                        <Switch
                          checked={step3ViewMode === 'serialized'}
                          onCheckedChange={(checked) => setStep3ViewMode(checked ? 'serialized' : 'aggregated')}
                          data-testid="switch-view-mode"
                        />
                        <span className={step3ViewMode === 'serialized' ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                          Serializzata
                        </span>
                      </div>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>Nessun prodotto aggiunto</p>
                        <Button 
                          type="button" 
                          variant="link" 
                          onClick={() => setCurrentStep(2)}
                          className="mt-2"
                        >
                          Torna al carico prodotti
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700 w-8"></th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Prodotto</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">SKU</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">EAN</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">Qtà</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Lotto</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                              {step3ViewMode === 'serialized' ? 'Seriali' : 'Info'}
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <Fragment key={item.id}>
                              <tr 
                                className={`border-t hover:bg-gray-50 transition-colors ${
                                  expandedItemId === item.id ? 'bg-orange-50' : ''
                                }`}
                                data-testid={`review-row-${item.id}`}
                              >
                                <td className="px-4 py-3">
                                  {item.serials.length > 0 && step3ViewMode === 'serialized' && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                      data-testid={`btn-expand-${item.id}`}
                                    >
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`} />
                                    </Button>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-900 truncate max-w-[200px]" title={item.product.name}>
                                    {item.product.name}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.product.sku}</td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.product.ean || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-bold">
                                    {item.quantity}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{item.lot || '-'}</td>
                                <td className="px-4 py-3">
                                  {item.product.isSerializable ? (
                                    <Badge variant="outline" className="text-xs">
                                      {getSerialLabel(item.product.serialType)}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Standard</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {step3ViewMode === 'aggregated' ? (
                                    item.serials.length > 0 ? (
                                      <Badge variant="secondary" className="text-xs">
                                        <Barcode className="h-3 w-3 mr-1" />
                                        {item.serials.length} seriali
                                      </Badge>
                                    ) : item.bulkLoaded ? (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                        <Package className="h-3 w-3 mr-1" />
                                        Massivo
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )
                                  ) : (
                                    item.serials.length > 0 ? (
                                      <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}>
                                        {expandedItemId === item.id ? 'Chiudi lista' : `Espandi ${item.serials.length} seriali`}
                                      </span>
                                    ) : item.bulkLoaded ? (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                        Massivo (no seriali)
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">Non serializzabile</span>
                                    )
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {item.serials.length > 0 && step3ViewMode === 'aggregated' && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-10 w-10 p-0"
                                        onClick={() => {
                                          setStep3ViewMode('serialized');
                                          setExpandedItemId(item.id);
                                        }}
                                        title="Vedi seriali"
                                        data-testid={`btn-view-serials-${item.id}`}
                                      >
                                        <Eye className="h-6 w-6 text-gray-500" />
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-10 w-10 p-0"
                                      onClick={() => {
                                        // Load product into form and go to Step 2
                                        setSelectedProduct(item.product);
                                        setCurrentSerials(item.serials);
                                        setTargetQuantity(item.quantity);
                                        setLotInput(item.lot || '');
                                        setUnitPriceInput(item.unitPrice?.toString() || '');
                                        setBulkLoadMode(item.bulkLoaded || false);
                                        removeItem(item.id);
                                        setCurrentStep(2);
                                      }}
                                      title="Modifica"
                                      data-testid={`btn-edit-item-${item.id}`}
                                    >
                                      <Edit className="h-6 w-6 text-orange-500" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-10 w-10 p-0"
                                      onClick={() => setItemToDelete(item)}
                                      title="Elimina"
                                      data-testid={`btn-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="h-6 w-6 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded Serials Row */}
                              {step3ViewMode === 'serialized' && expandedItemId === item.id && item.serials.length > 0 && (
                                <tr key={`${item.id}-serials`} className="bg-gray-50">
                                  <td colSpan={9} className="px-4 py-3">
                                    <div className="ml-8 p-3 bg-white rounded border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Barcode className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium text-sm">Lista Seriali ({item.serials.length})</span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {item.serials.map((serial, idx) => (
                                          <div 
                                            key={idx}
                                            className="px-2 py-1 bg-gray-100 rounded text-xs font-mono flex items-center gap-1"
                                          >
                                            <span className="text-gray-400">{idx + 1}.</span>
                                            <span className="truncate" title={serial}>{serial}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-gray-100 border-t-2">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 font-medium text-gray-700">
                              Totale Carico
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className="bg-orange-500 text-white font-bold text-sm">
                                {items.reduce((sum, i) => sum + i.quantity, 0)}
                              </Badge>
                            </td>
                            <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-600">
                              {items.filter(i => i.serials.length > 0).length > 0 && (
                                <span>{items.reduce((sum, i) => sum + i.serials.length, 0)} seriali registrati</span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Confirmation Footer */}
                {items.length > 0 && (
                  <div className="flex-shrink-0 p-3 bg-green-50 border-t border-green-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Pronto per il carico</p>
                        <p className="text-xs text-green-700">
                          Clicca "Conferma Carico" per registrare {items.length} prodotti ({items.reduce((sum, i) => sum + i.quantity, 0)} unità) in magazzino.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              {currentStep === 1 && (
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Annulla
                  </Button>
                  <Button 
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={handleProceedToStep2}
                    disabled={!canProceedToStep2()}
                    data-testid="btn-next-step"
                  >
                    Avanti
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              {currentStep === 2 && (
                <div className="flex w-full justify-between">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleSuspend}
                      disabled={isSuspending}
                      data-testid="btn-suspend-receiving"
                    >
                      {isSuspending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Sospendi Carico
                    </Button>
                  </div>
                  <Button 
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => setCurrentStep(3)}
                    disabled={items.length === 0}
                    data-testid="btn-to-review"
                  >
                    Vai al Riepilogo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
              {currentStep === 3 && (
                <div className="flex w-full justify-between">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Modifica Prodotti
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleSuspend}
                      disabled={isSuspending}
                      data-testid="btn-suspend-receiving-step3"
                    >
                      {isSuspending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Sospendi Carico
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={items.length === 0 || isSubmitting || isCheckingSerials}
                    data-testid="btn-submit-receiving"
                  >
                    {isCheckingSerials ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifica seriali...
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Conferma Carico ({items.reduce((sum, i) => sum + i.quantity, 0)} unità)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Serial Conflict Dialog */}
    <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            IMEI/Seriali Duplicati Rilevati
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              I seguenti seriali sono già presenti nel sistema e non possono essere caricati di nuovo:
            </p>
            <div className="max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
              <ul className="space-y-1 text-sm">
                {serialConflicts.map((conflict, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="font-mono bg-red-100 px-2 py-0.5 rounded text-red-700">
                      {conflict.serial}
                    </span>
                    {conflict.existingProductName && (
                      <span className="text-gray-500 text-xs">
                        ({conflict.existingProductName})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Correggi i seriali duplicati nello Step 2 prima di procedere, 
              oppure procedi comunque (i seriali duplicati saranno ignorati).
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowConflictDialog(false);
            setCurrentStep(2); // Go back to edit products
          }}>
            Modifica Seriali
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleForceSubmit}
          >
            Procedi Comunque
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Legal Entity Mismatch Warning Dialog */}
    <AlertDialog open={showLegalEntityMismatch} onOpenChange={setShowLegalEntityMismatch}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Attenzione: Entità Legale Diversa
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              L'entità legale selezionata nel DDT è diversa da quella associata al magazzino di destinazione.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entità DDT:</span>
                <span className="font-medium">
                  {legalEntitiesData.find(e => e.id === pendingSubmitValues?.legalEntityId)?.ragioneSociale || '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entità Magazzino:</span>
                <span className="font-medium">
                  {(storesData.find(s => s.id === pendingSubmitValues?.storeId) as any)?.legalEntityName || 'Non specificata'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Questa operazione potrebbe generare discrepanze contabili. 
              Vuoi procedere comunque?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowLegalEntityMismatch(false);
            setPendingSubmitValues(null);
          }}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleProceedDespiteMismatch}
          >
            Procedi Comunque
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Item Confirmation Dialog */}
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Conferma Eliminazione
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {itemToDelete && (
                <div className="space-y-2">
                  <span>Sei sicuro di voler rimuovere questo prodotto dal carico?</span>
                  <div className="p-3 bg-gray-50 rounded-lg border mt-2">
                    <div className="font-medium">{itemToDelete.product.name}</div>
                    <div className="text-sm text-gray-500">SKU: {itemToDelete.product.sku}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-orange-100 text-orange-700">{itemToDelete.quantity} unità</Badge>
                      {itemToDelete.serials.length > 0 && (
                        <Badge variant="secondary">{itemToDelete.serials.length} seriali</Badge>
                      )}
                      {itemToDelete.bulkLoaded && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">Massivo</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setItemToDelete(null)}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600"
            onClick={() => {
              if (itemToDelete) {
                removeItem(itemToDelete.id);
                setItemToDelete(null);
              }
            }}
          >
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

interface OrderMatchSectionProps {
  order?: Order;
  receivedItems: ReceivingItem[];
  onAddFromOrder: (item: OrderItem) => void;
}

function OrderMatchSection({ order, receivedItems, onAddFromOrder }: OrderMatchSectionProps) {
  if (!order) return null;

  const getReceivedQuantity = (productId: string, sku: string): number => {
    return receivedItems
      .filter(item => item.product.id === productId || item.product.sku.includes(sku))
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const getItemStatus = (orderItem: OrderItem): 'pending' | 'partial' | 'complete' | 'over' => {
    const received = getReceivedQuantity(orderItem.productId, orderItem.sku);
    if (received === 0) return 'pending';
    if (received < orderItem.quantityOrdered) return 'partial';
    if (received === orderItem.quantityOrdered) return 'complete';
    return 'over';
  };

  const statusConfig = {
    pending: { label: 'In attesa', color: 'bg-gray-100 text-gray-700', icon: Clock },
    partial: { label: 'Parziale', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    complete: { label: 'Completo', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    over: { label: 'Eccedenza', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  };

  const totalOrdered = order.items.reduce((sum, i) => sum + i.quantityOrdered, 0);
  const totalReceived = order.items.reduce((sum, i) => sum + getReceivedQuantity(i.productId, i.sku), 0);
  const hasDiscrepancies = order.items.some(i => {
    const status = getItemStatus(i);
    return status === 'partial' || status === 'over';
  });

  return (
    <Card className={hasDiscrepancies ? 'border-yellow-300 bg-yellow-50/30' : 'border-blue-200 bg-blue-50/30'}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Confronto con Ordine: {order.orderNumber}
          </h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="text-gray-600">Ordinato:</span>
              <span className="font-semibold">{totalOrdered}</span>
            </Badge>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${
                totalReceived === totalOrdered 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-yellow-300 bg-yellow-50'
              }`}
            >
              <span className="text-gray-600">Ricevuto:</span>
              <span className="font-semibold">{totalReceived}</span>
            </Badge>
          </div>
        </div>

        <div className="rounded-md border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Prodotto</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600">Ordinato</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600">Ricevuto</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600">Delta</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600">Stato</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((orderItem) => {
                const received = getReceivedQuantity(orderItem.productId, orderItem.sku);
                const delta = received - orderItem.quantityOrdered;
                const status = getItemStatus(orderItem);
                const StatusIcon = statusConfig[status].icon;
                const remaining = orderItem.quantityOrdered - received;

                return (
                  <tr key={orderItem.productId} className="border-b" data-testid={`order-item-${orderItem.productId}`}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-sm">{orderItem.productName}</p>
                      <p className="text-xs text-gray-500">SKU: {orderItem.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-medium">
                      {orderItem.quantityOrdered}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-medium">
                      {received}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-sm font-medium ${
                        delta === 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`${statusConfig[status].color} text-xs`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[status].label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {remaining > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddFromOrder(orderItem)}
                          data-testid={`btn-add-from-order-${orderItem.productId}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Carica ({remaining})
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasDiscrepancies && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-yellow-100 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Attenzione: rilevate discrepanze rispetto all'ordine. Gli articoli mancanti genereranno un back-order automatico.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
