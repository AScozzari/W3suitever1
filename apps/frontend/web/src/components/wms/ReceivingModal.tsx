import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Supplier {
  id: string;
  name: string;
  code: string;
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
  ean?: string;
  description?: string;
  isSerializable: boolean;
  serialType?: 'imei' | 'iccid' | 'mac_address' | 'other';
}

interface ReceivingItem {
  id: string;
  product: Product;
  quantity: number;
  serials: string[];
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

const MOCK_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'TechDistribution Srl', code: 'TECH001' },
  { id: '2', name: 'MobileWorld SpA', code: 'MOB002' },
  { id: '3', name: 'AccessoriPlus', code: 'ACC003' },
];

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
  { id: 'p1', name: 'iPhone 16 Pro 256GB Nero', sku: 'IPH16P256-BLK', supplierSku: 'APL-IP16P-256-BK', ean: '1234567890123', description: 'Apple iPhone 16 Pro 256GB colore nero', isSerializable: true, serialType: 'imei' },
  { id: 'p2', name: 'iPhone 16 Pro 256GB Bianco', sku: 'IPH16P256-WHT', supplierSku: 'APL-IP16P-256-WH', ean: '1234567890124', description: 'Apple iPhone 16 Pro 256GB colore bianco', isSerializable: true, serialType: 'imei' },
  { id: 'p3', name: 'Cover Silicone iPhone 16', sku: 'CVR16SIL', supplierSku: 'ACC-CVR-16-SIL', ean: '2234567890123', description: 'Cover protettiva in silicone per iPhone 16', isSerializable: false },
  { id: 'p4', name: 'Cavo USB-C 1m', sku: 'CBL-USBC-1M', supplierSku: 'ACC-CBL-C1M', ean: '3234567890123', description: 'Cavo USB Type-C lunghezza 1 metro', isSerializable: false },
  { id: 'p5', name: 'Router WiFi 6 AX3000', sku: 'RTR-AX3000', supplierSku: 'NET-RTR-AX3K', ean: '4234567890123', description: 'Router wireless WiFi 6 velocità AX3000', isSerializable: true, serialType: 'mac_address' },
  { id: 'p6', name: 'SIM Card Prepagata', sku: 'SIM-PRE-001', supplierSku: 'TEL-SIM-PRE', ean: '5234567890123', description: 'SIM card prepagata attivabile', isSerializable: true, serialType: 'iccid' },
];

const MOCK_STORES = [
  { id: 'store-1', name: 'Store Milano Centro' },
  { id: 'store-2', name: 'Store Roma EUR' },
];

export function ReceivingModal({ open, onOpenChange, onSubmit }: ReceivingModalProps) {
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(receivingSchema),
    defaultValues: {
      supplierId: '',
      orderId: '',
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      notes: '',
      storeId: MOCK_STORES[0]?.id || '',
    },
  });

  const selectedSupplierId = form.watch('supplierId');
  const selectedOrderId = form.watch('orderId');

  const availableOrders = MOCK_ORDERS.filter(o => o.supplierId === selectedSupplierId);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const query = searchQuery.toLowerCase();
      const results = MOCK_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.supplierSku?.toLowerCase().includes(query) ||
        p.ean?.includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

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
      setTimeout(() => serialInputRef.current?.focus(), 100);
    }
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
      
      if (currentSerials.includes(serialInput.trim())) {
        return;
      }
      
      setCurrentSerials(prev => [...prev, serialInput.trim()]);
      setSerialInput('');
      
      if (currentSerials.length + 1 >= targetQuantity) {
        setSerialScanMode(false);
      }
    }
  };

  const removeSerial = (index: number) => {
    setCurrentSerials(prev => prev.filter((_, i) => i !== index));
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
    
    const newItem: ReceivingItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) 
        ? currentSerials.length 
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
      return currentSerials.length > 0;
    }
    
    return targetQuantity > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Nuovo Carico Merce
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Seleziona fornitore" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MOCK_SUPPLIERS.map(s => (
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
                            <SelectItem value="">Nessun ordine</SelectItem>
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
                        <FormLabel>Store Destinazione *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-store">
                              <SelectValue placeholder="Seleziona store" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MOCK_STORES.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
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
                      placeholder="Cerca prodotto (SKU, nome, EAN, descrizione) - min 3 caratteri"
                      className="pl-9"
                      data-testid="input-product-search"
                    />
                    
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                  </div>

                  {selectedProduct && (
                    <Card className="border-orange-200 bg-orange-50/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-medium text-gray-900">{selectedProduct.name}</p>
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

                        {selectedProduct.isSerializable && isGloballyUnique(selectedProduct.serialType) ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Label>Quantità da caricare</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={targetQuantity}
                                  onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
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
                            
                            <div>
                              <Label className="flex items-center gap-2">
                                <ScanLine className="h-4 w-4" />
                                Spara {getSerialLabel(selectedProduct.serialType)} ({currentSerials.length}/{targetQuantity})
                              </Label>
                              <Input
                                ref={serialInputRef}
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                                onKeyDown={handleSerialScan}
                                placeholder={`Scansiona o inserisci ${getSerialLabel(selectedProduct.serialType)}...`}
                                className="mt-1"
                                autoFocus
                                data-testid="input-serial-scan"
                              />
                            </div>

                            {currentSerials.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
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
                        ) : selectedProduct.isSerializable && selectedProduct.serialType === 'other' ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Quantità *</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={targetQuantity}
                                  onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
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
                                type="number"
                                min={1}
                                value={targetQuantity}
                                onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600"
                disabled={items.length === 0}
                data-testid="btn-submit-receiving"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Conferma Carico ({items.length} prodotti)
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
