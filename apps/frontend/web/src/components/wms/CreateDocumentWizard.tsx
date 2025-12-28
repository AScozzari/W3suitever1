import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText,
  ClipboardList,
  Truck,
  FileEdit,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Download,
  Package,
  Plus,
  Trash2,
  Search,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SupplierCombobox, type Supplier } from './SupplierCombobox';

type DocumentType = 'order' | 'ddt' | 'adjustment_report';
type DocumentDirection = 'active' | 'passive';
type DdtReason = 'sale' | 'purchase' | 'service_send' | 'service_return' | 'doa_return' | 
                 'internal_transfer' | 'supplier_return' | 'customer_return' | 'loan' | 'other';

interface DocumentItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice?: number;
  vatRateId?: string;
  vatRate?: number;
  vatRegimeId?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
}

const DOCUMENT_TYPES = [
  { 
    type: 'order' as const, 
    label: 'Ordine', 
    description: 'Ordine a fornitore',
    icon: ClipboardList,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  { 
    type: 'ddt' as const, 
    label: 'DDT', 
    description: 'Documento di Trasporto',
    icon: Truck,
    color: 'text-green-500',
    bgColor: 'bg-green-50 border-green-200'
  },
  { 
    type: 'adjustment_report' as const, 
    label: 'Rettifica', 
    description: 'Rettifica inventario',
    icon: FileEdit,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 border-purple-200'
  }
];

const DDT_REASONS: { value: DdtReason; label: string; direction: 'active' | 'passive' | 'both' }[] = [
  { value: 'sale', label: 'Vendita', direction: 'active' },
  { value: 'purchase', label: 'Acquisto', direction: 'passive' },
  { value: 'service_send', label: 'Invio Assistenza', direction: 'active' },
  { value: 'service_return', label: 'Ritorno Assistenza', direction: 'passive' },
  { value: 'doa_return', label: 'Reso DOA', direction: 'active' },
  { value: 'internal_transfer', label: 'Trasferimento Interno', direction: 'both' },
  { value: 'supplier_return', label: 'Reso a Fornitore', direction: 'active' },
  { value: 'customer_return', label: 'Reso da Cliente', direction: 'passive' },
  { value: 'loan', label: 'Comodato d\'Uso', direction: 'both' },
  { value: 'other', label: 'Altro', direction: 'both' }
];

const ADJUSTMENT_REASONS = [
  { value: 'inventory_count', label: 'Inventario Fisico' },
  { value: 'damage', label: 'Danneggiamento' },
  { value: 'theft', label: 'Furto' },
  { value: 'expiry', label: 'Scadenza' },
  { value: 'correction', label: 'Correzione Errore' },
  { value: 'other', label: 'Altro' }
];

interface CreateDocumentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (documentId: string) => void;
}

export function CreateDocumentWizard({ open, onOpenChange, onSuccess }: CreateDocumentWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [direction, setDirection] = useState<DocumentDirection>('active');
  const [ddtReason, setDdtReason] = useState<DdtReason | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('inventory_count');
  
  const [documentDate, setDocumentDate] = useState<Date>(new Date());
  const [supplierId, setSupplierId] = useState<string>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { data: suppliersData } = useQuery<Supplier[]>({
    queryKey: ['/api/wms/suppliers'],
    enabled: open && (documentType === 'order' || (documentType === 'ddt' && direction === 'passive')),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['/api/wms/products', { search: productSearch, limit: 20 }],
    enabled: showProductSearch && productSearch.length >= 2,
  });

  const { data: vatRatesData } = useQuery<{ id: string; code: string; rate: number }[]>({
    queryKey: ['/api/wms/vat-rates'],
    enabled: open,
  });

  const { data: vatRegimesData } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['/api/wms/vat-regimes'],
    enabled: open,
  });

  const vatRates = vatRatesData || [];
  const vatRegimes = vatRegimesData || [];
  const defaultVatRate = vatRates.find(r => r.rate === 22);
  const defaultVatRegime = vatRegimes.find(r => r.code === 'ORD');

  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/wms/documents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/trend'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/timeline'] });
      toast({ title: 'Documento creato con successo' });
      onOpenChange(false);
      resetWizard();
      if (onSuccess) onSuccess(data.id);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile creare il documento', 
        variant: 'destructive' 
      });
    }
  });

  const resetWizard = () => {
    setStep(1);
    setDocumentType(null);
    setDirection('active');
    setDdtReason(null);
    setAdjustmentReason('inventory_count');
    setDocumentDate(new Date());
    setSupplierId('');
    setExpectedDeliveryDate(undefined);
    setNotes('');
    setItems([]);
    setProductSearch('');
  };

  const suppliers = suppliersData || [];

  const filteredDdtReasons = useMemo(() => {
    return DDT_REASONS.filter(r => r.direction === 'both' || r.direction === direction);
  }, [direction]);

  const canProceedStep1 = documentType !== null;
  
  const canProceedStep2 = useMemo(() => {
    if (documentType === 'order') return true;
    if (documentType === 'ddt') return ddtReason !== null;
    if (documentType === 'adjustment_report') return adjustmentReason !== '';
    return false;
  }, [documentType, ddtReason, adjustmentReason]);

  const canSubmit = useMemo(() => {
    if (documentType === 'order' && !supplierId) return false;
    if (documentType === 'ddt' && direction === 'passive' && !supplierId) return false;
    return true;
  }, [documentType, direction, supplierId]);

  const handleNext = () => {
    if (step === 1 && canProceedStep1) {
      if (documentType === 'order') {
        setDirection('passive');
      }
      setStep(2);
    } else if (step === 2 && canProceedStep2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const payload: any = {
      documentType,
      documentDirection: direction,
      documentDate: format(documentDate, 'yyyy-MM-dd'),
      notes: notes || undefined,
      items: items.map(item => {
        const unitPriceNet = item.unitPrice || 0;
        const vatRateValue = item.vatRate || 22;
        const vatAmount = unitPriceNet * (vatRateValue / 100);
        const unitPriceGross = unitPriceNet + vatAmount;
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRateId: item.vatRateId,
          vatRegimeId: item.vatRegimeId,
          unitPriceNet,
          unitPriceGross,
          vatAmount,
          totalPriceNet: unitPriceNet * item.quantity,
          totalPriceGross: unitPriceGross * item.quantity,
          totalVatAmount: vatAmount * item.quantity,
        };
      }),
    };

    if (documentType === 'ddt') {
      payload.ddtReason = ddtReason;
    }

    if (documentType === 'adjustment_report') {
      payload.adjustmentReason = adjustmentReason;
    }

    if (supplierId) {
      payload.supplierId = supplierId;
      payload.counterpartyType = 'supplier';
    }

    if (documentType === 'order' && expectedDeliveryDate) {
      payload.expectedDeliveryDate = format(expectedDeliveryDate, 'yyyy-MM-dd');
    }

    createDocumentMutation.mutate(payload);
  };

  const addProduct = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => 
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        vatRateId: defaultVatRate?.id,
        vatRate: defaultVatRate?.rate || 22,
        vatRegimeId: defaultVatRegime?.id,
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateItemPrice = (productId: string, unitPrice: number) => {
    setItems(items.map(i => 
      i.productId === productId ? { ...i, unitPrice } : i
    ));
  };

  const updateItemVat = (productId: string, vatRateId: string) => {
    const vatRate = vatRates.find(r => r.id === vatRateId);
    setItems(items.map(i => 
      i.productId === productId ? { ...i, vatRateId, vatRate: vatRate?.rate || 22 } : i
    ));
  };

  const updateItemRegime = (productId: string, vatRegimeId: string) => {
    setItems(items.map(i => 
      i.productId === productId ? { ...i, vatRegimeId } : i
    ));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      setItems(items.filter(i => i.productId !== productId));
    } else {
      setItems(items.map(i => 
        i.productId === productId ? { ...i, quantity } : i
      ));
    }
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Seleziona Tipo Documento';
      case 2: return documentType === 'ddt' ? 'Direzione e Causale' : 
              documentType === 'adjustment_report' ? 'Motivo Rettifica' : 'Conferma Tipo';
      case 3: return 'Dati Documento';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetWizard(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-orange-500" />
            Nuovo Documento
          </DialogTitle>
          <DialogDescription className="sr-only">
            Wizard per la creazione di un nuovo documento WMS
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s ? "bg-orange-500 text-white" :
                step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-12 h-1 mx-2 rounded",
                  step > s ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <p className="text-sm font-medium text-gray-700">{getStepTitle()}</p>
        </div>

        <ScrollArea className="flex-1 px-1">
          {step === 1 && (
            <div className="grid grid-cols-3 gap-4 p-4">
              {DOCUMENT_TYPES.map((dt) => {
                const Icon = dt.icon;
                const isSelected = documentType === dt.type;
                return (
                  <button
                    key={dt.type}
                    type="button"
                    onClick={() => setDocumentType(dt.type)}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all text-left",
                      isSelected ? `${dt.bgColor} border-current ring-2 ring-offset-2 ring-orange-500` : 
                      "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                    )}
                    data-testid={`doc-type-${dt.type}`}
                  >
                    <Icon className={cn("h-10 w-10 mb-3", dt.color)} />
                    <h3 className="font-semibold text-gray-900">{dt.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">{dt.description}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && documentType === 'ddt' && (
            <div className="space-y-6 p-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Direzione Documento</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { setDirection('active'); setDdtReason(null); }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                      direction === 'active' ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500" :
                      "bg-white border-gray-200 hover:border-gray-300"
                    )}
                    data-testid="direction-active"
                  >
                    <Upload className={cn("h-6 w-6", direction === 'active' ? "text-purple-500" : "text-gray-400")} />
                    <div className="text-left">
                      <p className="font-medium">Attivo</p>
                      <p className="text-xs text-gray-500">Documento emesso</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDirection('passive'); setDdtReason(null); }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                      direction === 'passive' ? "bg-green-50 border-green-300 ring-2 ring-green-500" :
                      "bg-white border-gray-200 hover:border-gray-300"
                    )}
                    data-testid="direction-passive"
                  >
                    <Download className={cn("h-6 w-6", direction === 'passive' ? "text-green-500" : "text-gray-400")} />
                    <div className="text-left">
                      <p className="font-medium">Passivo</p>
                      <p className="text-xs text-gray-500">Documento ricevuto</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Causale DDT</Label>
                <div className="grid grid-cols-2 gap-2">
                  {filteredDdtReasons.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setDdtReason(reason.value)}
                      className={cn(
                        "p-3 rounded-lg border transition-all text-left text-sm",
                        ddtReason === reason.value ? "bg-orange-50 border-orange-300 font-medium" :
                        "bg-white border-gray-200 hover:border-gray-300"
                      )}
                      data-testid={`ddt-reason-${reason.value}`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && documentType === 'adjustment_report' && (
            <div className="space-y-4 p-4">
              <Label className="text-sm font-medium mb-3 block">Motivo Rettifica</Label>
              <div className="grid grid-cols-2 gap-3">
                {ADJUSTMENT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => setAdjustmentReason(reason.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      adjustmentReason === reason.value ? "bg-purple-50 border-purple-300" :
                      "bg-white border-gray-200 hover:border-gray-300"
                    )}
                    data-testid={`adjustment-reason-${reason.value}`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && documentType === 'order' && (
            <div className="p-4 text-center">
              <ClipboardList className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="font-semibold text-lg">Ordine a Fornitore</h3>
              <p className="text-sm text-gray-500 mt-2">
                Documento passivo - riceverai merce dal fornitore
              </p>
              <Badge className="mt-4 bg-blue-100 text-blue-700">
                Direzione: Passivo
              </Badge>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Data Documento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {format(documentDate, 'dd/MM/yyyy', { locale: it })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={documentDate}
                        onSelect={(d) => d && setDocumentDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {documentType === 'order' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Data Consegna Prevista</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {expectedDeliveryDate 
                            ? format(expectedDeliveryDate, 'dd/MM/yyyy', { locale: it })
                            : 'Seleziona data...'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expectedDeliveryDate}
                          onSelect={setExpectedDeliveryDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {(documentType === 'order' || (documentType === 'ddt' && direction === 'passive')) && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Fornitore {documentType === 'order' && '*'}
                  </Label>
                  <SupplierCombobox
                    suppliers={suppliers}
                    value={supplierId}
                    onValueChange={setSupplierId}
                    placeholder="Seleziona fornitore..."
                    data-testid="select-supplier"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Prodotti</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowProductSearch(true)}
                    data-testid="btn-add-product"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi
                  </Button>
                </div>

                {showProductSearch && (
                  <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Cerca prodotto per nome o SKU..."
                        className="pl-9"
                        autoFocus
                        data-testid="input-product-search"
                      />
                    </div>
                    {productsLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {productsData?.data && productsData.data.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto">
                        {productsData.data.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full text-left p-2 hover:bg-white rounded flex items-center justify-between"
                            data-testid={`product-option-${product.id}`}
                          >
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.sku}</p>
                            </div>
                            <Plus className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                    {productSearch.length >= 2 && !productsLoading && productsData?.data?.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-3">Nessun prodotto trovato</p>
                    )}
                    <div className="flex justify-end mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setShowProductSearch(false); setProductSearch(''); }}
                      >
                        Chiudi
                      </Button>
                    </div>
                  </div>
                )}

                {items.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {items.map((item) => (
                      <div key={item.productId} className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.productName}</p>
                            <p className="text-xs text-gray-500">{item.productSku}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 pl-8">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Prezzo"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-24 h-7 text-sm"
                            data-testid={`input-price-${item.productId}`}
                          />
                          <Select 
                            value={item.vatRateId || ''} 
                            onValueChange={(v) => updateItemVat(item.productId, v)}
                          >
                            <SelectTrigger className="w-20 h-7 text-sm" data-testid={`select-vat-${item.productId}`}>
                              <SelectValue placeholder="IVA" />
                            </SelectTrigger>
                            <SelectContent>
                              {vatRates.map((rate) => (
                                <SelectItem key={rate.id} value={rate.id}>
                                  {rate.rate}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={item.vatRegimeId || ''} 
                            onValueChange={(v) => updateItemRegime(item.productId, v)}
                          >
                            <SelectTrigger className="w-24 h-7 text-sm" data-testid={`select-regime-${item.productId}`}>
                              <SelectValue placeholder="Regime" />
                            </SelectTrigger>
                            <SelectContent>
                              {vatRegimes.map((regime) => (
                                <SelectItem key={regime.id} value={regime.id}>
                                  {regime.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center text-gray-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun prodotto aggiunto</p>
                    <p className="text-xs">Usa il pulsante "Aggiungi" per cercare prodotti</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Note</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note aggiuntive (opzionale)..."
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            >
              {step === 1 ? 'Annulla' : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Indietro
                </>
              )}
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Avanti
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createDocumentMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="btn-submit-document"
              >
                {createDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Crea Documento
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
