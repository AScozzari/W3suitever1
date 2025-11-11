import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Schema con validazione condizionale completa
const productSchema = z.object({
  type: z.enum(['CANVAS', 'PHYSICAL', 'VIRTUAL', 'SERVICE']),
  brand: z.string().optional(),
  model: z.string().optional(),
  name: z.string().min(1, 'Nome prodotto obbligatorio'),
  sku: z.string().min(1, 'SKU obbligatorio'),
  ean: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('URL non valido').or(z.literal('')).optional(),
  notes: z.string().optional(),
  isSerializable: z.boolean(),
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  unitOfMeasure: z.string().min(1, 'Unità di misura obbligatoria'),
  reorderPoint: z.coerce.number().min(0, 'Punto di riordino deve essere >= 0').default(0),
}).refine((data) => {
  // Validation Rule: serialType is required if isSerializable is true
  if (data.isSerializable && !data.serialType) {
    return false;
  }
  return true;
}, {
  message: 'Tipo seriale è obbligatorio quando il prodotto è serializzabile',
  path: ['serialType'],
}).refine((data) => {
  // Validation Rule: monthlyFee and description are required if type is CANVAS
  if (data.type === 'CANVAS') {
    if (!data.monthlyFee || data.monthlyFee <= 0) {
      return false;
    }
    if (!data.description || data.description.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: 'Canone mensile e descrizione sono obbligatori per prodotti di tipo CANVAS',
  path: ['monthlyFee'],
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: any | null;
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: 'PHYSICAL',
      brand: '',
      model: '',
      name: '',
      sku: '',
      ean: '',
      description: '',
      imageUrl: '',
      notes: '',
      isSerializable: false,
      serialType: undefined,
      monthlyFee: undefined,
      unitOfMeasure: 'pz',
      reorderPoint: 0,
    },
  });

  const watchType = form.watch('type');
  const watchIsSerializable = form.watch('isSerializable');

  useEffect(() => {
    if (product) {
      form.reset({
        type: product.type || 'PHYSICAL',
        brand: product.brand || '',
        model: product.model || '',
        name: product.name || '',
        sku: product.sku || '',
        ean: product.ean || '',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        notes: product.notes || '',
        isSerializable: product.isSerializable || false,
        serialType: product.serialType || undefined,
        monthlyFee: product.monthlyFee || undefined,
        unitOfMeasure: product.unitOfMeasure || 'pz',
        reorderPoint: product.reorderPoint || 0,
      });
    } else {
      form.reset({
        type: 'PHYSICAL',
        brand: '',
        model: '',
        name: '',
        sku: '',
        ean: '',
        description: '',
        imageUrl: '',
        notes: '',
        isSerializable: false,
        serialType: undefined,
        monthlyFee: undefined,
        unitOfMeasure: 'pz',
        reorderPoint: 0,
      });
    }
  }, [product, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const tenantId = localStorage.getItem('currentTenantId');
      return apiRequest(`/api/wms/products/${tenantId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/products'] });
      toast({
        title: 'Prodotto creato',
        description: 'Il prodotto è stato creato con successo.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile creare il prodotto.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const tenantId = localStorage.getItem('currentTenantId');
      return apiRequest(`/api/wms/products/${tenantId}/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/products'] });
      toast({
        title: 'Prodotto aggiornato',
        description: 'Il prodotto è stato aggiornato con successo.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare il prodotto.',
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="heading-product-form">
            {isEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* CAMPO 1: TIPO PRODOTTO (PRIMO CAMPO!) */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Prodotto <span className="text-red-500">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                    data-testid="select-type"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo prodotto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CANVAS">Canvas (Abbonamento)</SelectItem>
                      <SelectItem value="PHYSICAL">Fisico</SelectItem>
                      <SelectItem value="VIRTUAL">Digitale</SelectItem>
                      <SelectItem value="SERVICE">Servizio</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Scegli CANVAS per servizi in abbonamento (es: SIM, Cloud Storage)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Marca */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Apple, Samsung" 
                        data-testid="input-brand"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Modello */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modello</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. iPhone 15 Pro Max" 
                        data-testid="input-model"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nome Prodotto (manteniamo per backward compatibility) */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Prodotto <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Smartphone Premium" 
                        data-testid="input-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. PROD-001" 
                        data-testid="input-sku"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EAN/Barcode */}
              <FormField
                control={form.control}
                name="ean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EAN/Barcode</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. 8032454078463" 
                        data-testid="input-ean"
                        maxLength={13}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unità di Misura */}
              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unità di Misura <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. pz, kg, m" 
                        data-testid="input-unit-of-measure"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrizione (obbligatoria per CANVAS) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrizione {watchType === 'CANVAS' && <span className="text-red-500">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrizione dettagliata del prodotto"
                      className="min-h-[100px]"
                      data-testid="textarea-description"
                      {...field} 
                    />
                  </FormControl>
                  {watchType === 'CANVAS' && (
                    <FormDescription className="text-orange-600">
                      La descrizione è obbligatoria per prodotti di tipo Canvas
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Immagine URL */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immagine URL</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://esempio.com/immagine.jpg" 
                      data-testid="input-image-url"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    URL dell'immagine del prodotto (futura integrazione Object Storage)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Note aggiuntive sul prodotto"
                      className="min-h-[80px]"
                      data-testid="textarea-notes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Punto di Riordino */}
              <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Punto di Riordino</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0" 
                        data-testid="input-reorder-point"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Quantità minima prima di riordinare
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CAMPO CONDIZIONALE: Canone Mensile (solo per CANVAS) */}
              {watchType === 'CANVAS' && (
                <FormField
                  control={form.control}
                  name="monthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canone Mensile (€/mese) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="es. 19.99" 
                          data-testid="input-monthly-fee"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Importo mensile pagato dal cliente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Serializzabile (checkbox) */}
            <FormField
              control={form.control}
              name="isSerializable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-serializable"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Prodotto Serializzabile
                    </FormLabel>
                    <FormDescription>
                      Abilita tracciabilità tramite numero seriale (IMEI, MAC, ICCID, etc.)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* CAMPO CONDIZIONALE: Tipo Seriale (solo se serializzabile) */}
            {watchIsSerializable && (
              <FormField
                control={form.control}
                name="serialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Seriale <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-serial-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo seriale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="imei">IMEI (Telefoni)</SelectItem>
                        <SelectItem value="iccid">ICCID (SIM Card)</SelectItem>
                        <SelectItem value="mac_address">MAC Address (Router, Switch)</SelectItem>
                        <SelectItem value="other">Altro Seriale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specifica il tipo di numero seriale utilizzato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit"
                style={{
                  background: isPending ? 'hsl(var(--muted))' : 'hsl(var(--brand-orange))',
                  color: 'white',
                }}
              >
                {isPending ? 'Salvataggio...' : (isEdit ? 'Aggiorna' : 'Crea Prodotto')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
