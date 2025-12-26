import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  Save
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
}

interface ReceivingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReceivingFormData) => void;
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
});

type FormValues = z.infer<typeof receivingSchema>;

// MOCK_SUPPLIERS removed - now using real API endpoint

const MOCK_ORDERS: Order[] = [
  { 
    id: 'ord-1', 
    orderNumber: 'ORD-2024-0045', 
    supplierId: '1',
    items: [
      { productId: 'p1', productName: 'iPhone 16 Pro 256GB', sku: 'IPH16P256', quantityOrdered: 10, quantityReceived: 0 },
      { productId: 'p2', productName: 'Cover Silicone iPhone 16', sku: 'CVR16SIL', quantityOrdered: 50, quantityReceived: 0 },
    ]
  },
];

const MOCK_PRODUCTS: Product[] = [
  // Dual-SIM phones: 2 IMEI per unit
  { id: 'p1', name: 'iPhone 16 Pro 256GB Nero', sku: 'IPH16P256-BLK', supplierSku: 'APL-IP16P-256-BK', ean: '1234567890123', description: 'Apple iPhone 16 Pro 256GB colore nero', isSerializable: true, serialType: 'imei', serialCount: 2 },
  { id: 'p2', name: 'iPhone 16 Pro 256GB Bianco', sku: 'IPH16P256-WHT', supplierSku: 'APL-IP16P-256-WH', ean: '1234567890124', description: 'Apple iPhone 16 Pro 256GB colore bianco', isSerializable: true, serialType: 'imei', serialCount: 2 },
  // Non-serializable products
  { id: 'p3', name: 'Cover Silicone iPhone 16', sku: 'CVR16SIL', supplierSku: 'ACC-CVR-16-SIL', ean: '2234567890123', description: 'Cover protettiva in silicone per iPhone 16', isSerializable: false },
  { id: 'p4', name: 'Cavo USB-C 1m', sku: 'CBL-USBC-1M', supplierSku: 'ACC-CBL-C1M', ean: '3234567890123', description: 'Cavo USB Type-C lunghezza 1 metro', isSerializable: false },
  // Single serial products
  { id: 'p5', name: 'Router WiFi 6 AX3000', sku: 'RTR-AX3000', supplierSku: 'NET-RTR-AX3K', ean: '4234567890123', description: 'Router wireless WiFi 6 velocità AX3000', isSerializable: true, serialType: 'mac_address', serialCount: 1 },
  { id: 'p6', name: 'SIM Card Prepagata', sku: 'SIM-PRE-001', supplierSku: 'TEL-SIM-PRE', ean: '5234567890123', description: 'SIM card prepagata attivabile', isSerializable: true, serialType: 'iccid', serialCount: 1 },
  // Dual-SIM Android phone
  { id: 'p7', name: 'Samsung Galaxy S24 Ultra 512GB', sku: 'SGS24U-512', supplierSku: 'SAM-S24U-512', ean: '6234567890123', description: 'Samsung Galaxy S24 Ultra 512GB', isSerializable: true, serialType: 'imei', serialCount: 2 },
];


export function ReceivingModal({ open, onOpenChange, onSubmit }: ReceivingModalProps) {
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
  const [lastDeletedSerial, setLastDeletedSerial] = useState<{ serial: string; index: number } | null>(null);
  const [serialFilter, setSerialFilter] = useState('');
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showSkuMappingForm, setShowSkuMappingForm] = useState(false);
  const [unmappedSupplierSku, setUnmappedSupplierSku] = useState('');
  const [internalProductSearch, setInternalProductSearch] = useState('');
  const [internalProductResults, setInternalProductResults] = useState<Product[]>([]);
  const [showInternalResults, setShowInternalResults] = useState(false);
  const [showSupplierSkuPrompt, setShowSupplierSkuPrompt] = useState(false);
  const [pendingSupplierSkuInput, setPendingSupplierSkuInput] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(receivingSchema),
    defaultValues: {
      supplierId: '',
      orderId: '',
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      notes: '',
      storeId: '',
    },
  });

  const selectedSupplierId = form.watch('supplierId');
  const selectedOrderId = form.watch('orderId');
  
  // Reset step when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
    }
  }, [open]);

  const availableOrders = MOCK_ORDERS.filter(o => o.supplierId === selectedSupplierId);

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

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const query = searchQuery.toLowerCase();
      const codeType = detectCodeType(searchQuery);
      setDetectedCodeType(codeType);
      
      // Search by EAN, SKU, supplier SKU, or name/description
      const results = MOCK_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.supplierSku?.toLowerCase().includes(query) ||
        p.ean?.includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
      
      // If scanning what looks like an IMEI/ICCID/MAC but no product found,
      // it means the user is scanning a serial for an already selected product
      // In that case, don't show "not found" for products
      if (results.length === 0 && (codeType === 'imei' || codeType === 'iccid' || codeType === 'mac')) {
        // This is likely a serial scan, not a product search
        // If we have a selected product that matches this serial type, auto-add the serial
        if (selectedProduct && selectedProduct.isSerializable && 
            ((codeType === 'imei' && selectedProduct.serialType === 'imei') ||
             (codeType === 'iccid' && selectedProduct.serialType === 'iccid') ||
             (codeType === 'mac' && selectedProduct.serialType === 'mac_address'))) {
          // Auto-add serial to current product
          if (!currentSerials.includes(searchQuery.trim())) {
            setCurrentSerials([...currentSerials, searchQuery.trim()]);
          }
          setSearchQuery('');
          setShowSearchResults(false);
          return;
        }
      }
      
      setSearchResults(results);
      setShowSearchResults(true);
      
      // If no results and query looks like a supplier SKU, show mapping option
      if (results.length === 0 && query.length >= 5 && codeType === 'sku') {
        setUnmappedSupplierSku(searchQuery);
      } else {
        setShowSkuMappingForm(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setShowSkuMappingForm(false);
      setDetectedCodeType(null);
    }
  }, [searchQuery, selectedProduct, currentSerials]);

  // Search for internal products when mapping
  useEffect(() => {
    if (internalProductSearch.length >= 2) {
      const query = internalProductSearch.toLowerCase();
      const results = MOCK_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.ean?.includes(query)
      );
      setInternalProductResults(results);
      setShowInternalResults(true);
    } else {
      setInternalProductResults([]);
      setShowInternalResults(false);
    }
  }, [internalProductSearch]);

  const handleCreateMapping = (product: Product) => {
    // Create mapping: associate unmappedSupplierSku to this product
    const mappedProduct: Product = {
      ...product,
      supplierSku: unmappedSupplierSku
    };
    
    // TODO: Save mapping to backend via POST /api/wms/product-supplier-mappings
    console.log('Creating SKU mapping:', { 
      productId: product.id, 
      supplierSku: unmappedSupplierSku,
      supplierId: selectedSupplierId 
    });
    
    // Select the product and reset mapping form
    setShowSkuMappingForm(false);
    setUnmappedSupplierSku('');
    setInternalProductSearch('');
    setShowInternalResults(false);
    handleProductSelect(mappedProduct);
  };

  const handleProductSelect = (product: Product) => {
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
    
    // Check if product has supplier SKU mapping for current supplier
    // If not, show prompt to add supplier SKU
    if (!product.supplierSku && selectedSupplierId) {
      setShowSupplierSkuPrompt(true);
      setPendingSupplierSkuInput('');
    } else {
      setShowSupplierSkuPrompt(false);
    }
    
    // Always focus on quantity field first
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleSaveSupplierSku = () => {
    if (!selectedProduct || !pendingSupplierSkuInput.trim()) return;
    
    // Update product with new supplier SKU
    const updatedProduct: Product = {
      ...selectedProduct,
      supplierSku: pendingSupplierSkuInput.trim()
    };
    
    // TODO: Save mapping to backend via POST /api/wms/product-supplier-mappings
    console.log('Creating reverse SKU mapping:', { 
      productId: selectedProduct.id, 
      supplierSku: pendingSupplierSkuInput.trim(),
      supplierId: selectedSupplierId 
    });
    
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

  const handleSerialScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && serialInput.trim()) {
      e.preventDefault();
      
      // Check for duplicates
      if (currentSerials.includes(serialInput.trim())) {
        setSerialInput('');
        serialInputRef.current?.focus();
        return;
      }
      
      const newSerials = [...currentSerials, serialInput.trim()];
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

    const needsLot = !selectedProduct.isSerializable || 
      (selectedProduct.isSerializable && selectedProduct.serialType === 'other');
    
    const finalLot = needsLot ? (lotInput || generateLot()) : undefined;
    
    // For dual-serial products, quantity = number of complete units
    const serialsPerUnit = selectedProduct.serialCount || 1;
    const serializedQty = Math.floor(currentSerials.length / serialsPerUnit);
    
    const newItem: ReceivingItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) 
        ? serializedQty 
        : targetQuantity,
      serials: currentSerials,
      lot: finalLot,
      unitPrice: unitPriceInput ? parseFloat(unitPriceInput) : undefined,
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
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      items,
    });
    onOpenChange(false);
  };

  const canAddItem = (): boolean => {
    if (!selectedProduct) return false;
    
    if (selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType)) {
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
    return !!(values.supplierId && values.documentNumber && values.documentDate && values.storeId);
  };

  const handleProceedToStep2 = async () => {
    // Trigger validation for Step 1 fields
    const isValid = await form.trigger(['supplierId', 'documentNumber', 'documentDate', 'storeId']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] min-h-[70vh] overflow-y-auto flex flex-col">
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={suppliersLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder={suppliersLoading ? "Caricamento..." : "Seleziona fornitore"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliersData.length === 0 && !suppliersLoading && (
                              <SelectItem value="no-suppliers" disabled>Nessun fornitore disponibile</SelectItem>
                            )}
                            {suppliersData.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.code})
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
            {selectedOrderId && selectedOrderId !== '' && selectedOrderId !== 'none' && (
              <OrderMatchSection 
                order={MOCK_ORDERS.find(o => o.id === selectedOrderId)}
                receivedItems={items}
                onAddFromOrder={(orderItem) => {
                  const product = MOCK_PRODUCTS.find(p => p.sku.includes(orderItem.sku));
                  if (product) {
                    handleProductSelect(product);
                    setTargetQuantity(orderItem.quantityOrdered - orderItem.quantityReceived);
                  }
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Scansiona EAN/barcode, SKU, o nome prodotto..."
                      className="pl-9 pr-24"
                      data-testid="input-product-search"
                    />
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
                          {!showSkuMappingForm ? (
                            <Button 
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => setShowSkuMappingForm(true)}
                              data-testid="button-create-mapping"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Crea Abbinamento SKU
                            </Button>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <div className="relative">
                                <Label className="text-xs text-gray-500 mb-1 block">Cerca prodotto interno (SKU, nome, EAN)</Label>
                                <Search className="absolute left-3 top-8 h-4 w-4 text-gray-400" />
                                <Input
                                  value={internalProductSearch}
                                  onChange={(e) => setInternalProductSearch(e.target.value)}
                                  placeholder="Cerca prodotto da collegare..."
                                  className="pl-9"
                                  data-testid="input-internal-product-search"
                                />
                              </div>
                              
                              {showInternalResults && internalProductResults.length > 0 && (
                                <div className="border rounded-md bg-white max-h-48 overflow-y-auto">
                                  {internalProductResults.map(product => (
                                    <div
                                      key={product.id}
                                      className="p-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                                      onClick={() => handleCreateMapping(product)}
                                      data-testid={`mapping-result-${product.id}`}
                                    >
                                      <div>
                                        <p className="font-medium text-sm text-gray-900">{product.name}</p>
                                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                      </div>
                                      <Button type="button" size="sm" variant="ghost" className="text-green-600">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {showInternalResults && internalProductResults.length === 0 && (
                                <p className="text-sm text-gray-500">Nessun prodotto trovato. Verifica l'anagrafica.</p>
                              )}
                              
                              <Button 
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowSkuMappingForm(false);
                                  setInternalProductSearch('');
                                }}
                              >
                                Annulla
                              </Button>
                            </div>
                          )}
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
                                <Label>Prezzo Acquisto (opz.)</Label>
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
                                <div className="relative">
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
                                    className="pr-20 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                                    data-testid="input-serial-scan"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {(selectedProduct.serialCount || 1) > 1 
                                      ? `U${Math.floor(currentSerials.length / (selectedProduct.serialCount || 1)) + 1}-S${(currentSerials.length % (selectedProduct.serialCount || 1)) + 1}`
                                      : `#${currentSerials.length + 1}`
                                    }
                                  </span>
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
                                <Label>Prezzo (opz.)</Label>
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
                              <Input
                                ref={serialInputRef}
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                                onKeyDown={handleSerialScan}
                                placeholder="Scansiona o inserisci seriale..."
                                className="mt-1"
                                data-testid="input-serial-scan"
                              />
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
                              <Label>Prezzo (opz.)</Label>
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
                    <>
                      <Separator />
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Prodotto</th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Quantità</th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Lotto</th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Seriali</th>
                              <th className="px-3 py-2 text-right text-sm font-medium text-gray-600"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id} className="border-b" data-testid={`item-row-${item.id}`}>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-sm">{item.product.name}</p>
                                  <p className="text-xs text-gray-500">{item.product.sku}</p>
                                </td>
                                <td className="px-3 py-2 text-sm">{item.quantity}</td>
                                <td className="px-3 py-2 text-sm">{item.lot || '-'}</td>
                                <td className="px-3 py-2">
                                  {item.serials.length > 0 ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.serials.length} seriali
                                    </Badge>
                                  ) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    data-testid={`btn-remove-item-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
              </>
            )}

            {/* STEP 3: Review Summary */}
            {currentStep === 3 && (
              <Card>
                <CardContent className="pt-4">
                  {/* Document Summary */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Dati Documento
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Fornitore:</span>
                        <p className="font-medium">{suppliersData.find(s => s.id === form.getValues('supplierId'))?.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">DDT/Fattura:</span>
                        <p className="font-medium">{form.getValues('documentNumber')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Data:</span>
                        <p className="font-medium">{form.getValues('documentDate')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Magazzino:</span>
                        <p className="font-medium">{storesData.find(s => s.id === form.getValues('storeId'))?.name || '-'}</p>
                      </div>
                    </div>
                    {form.getValues('notes') && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-gray-500 text-sm">Note:</span>
                        <p className="text-sm">{form.getValues('notes')}</p>
                      </div>
                    )}
                  </div>

                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Riepilogo Prodotti ({items.length} righe)
                  </h3>

                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
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
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Prodotto</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">SKU</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">Qtà</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Lotto</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Seriali</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr 
                              key={item.id} 
                              className={`border-t hover:bg-gray-50 cursor-pointer transition-colors ${
                                selectedItemId === item.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                              }`}
                              onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                              data-testid={`review-row-${item.id}`}
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{item.product.name}</p>
                                {item.product.isSerializable && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {getSerialLabel(item.product.serialType)}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{item.product.sku}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                  {item.quantity}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{item.lot || '-'}</td>
                              <td className="px-4 py-3">
                                {item.serials.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <Barcode className="h-3 w-3 text-gray-400" />
                                    <Badge variant="secondary" className="text-xs">
                                      {item.serials.length} seriali
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      // Go back to Step 2 to edit
                                      setCurrentStep(2);
                                    }}
                                    data-testid={`btn-edit-item-${item.id}`}
                                  >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(item.id);
                                    }}
                                    data-testid={`btn-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 font-medium text-gray-700">
                              Totale
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-orange-600">
                              {items.reduce((sum, i) => sum + i.quantity, 0)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Confirmation message */}
                  {items.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">Pronto per il carico</p>
                          <p className="text-sm text-green-700">
                            Verifica i dati sopra e clicca "Conferma Carico" per registrare {items.length} prodotti 
                            ({items.reduce((sum, i) => sum + i.quantity, 0)} unità totali) in magazzino.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <DialogFooter>
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
                <>
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Indietro
                  </Button>
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
                </>
              )}
              {currentStep === 3 && (
                <>
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Modifica Prodotti
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={items.length === 0 || isSubmitting}
                    data-testid="btn-submit-receiving"
                  >
                    {isSubmitting ? (
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
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
