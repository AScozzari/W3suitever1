import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU obbligatorio'),
  name: z.string().min(1, 'Nome prodotto obbligatorio'),
  brand: z.string().optional(),
  ean: z.string().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']),
  isSerializable: z.boolean(),
  unitOfMeasure: z.string().min(1, 'Unità di misura obbligatoria'),
  reorderPoint: z.coerce.number().min(0, 'Punto di riordino deve essere >= 0').default(0),
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
      sku: '',
      name: '',
      brand: '',
      ean: '',
      type: 'PHYSICAL',
      isSerializable: false,
      unitOfMeasure: 'pz',
      reorderPoint: 0,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        sku: product.sku || '',
        name: product.name || '',
        brand: product.brand || '',
        ean: product.ean || '',
        type: product.type || 'PHYSICAL',
        isSerializable: product.isSerializable || false,
        unitOfMeasure: product.unitOfMeasure || 'pz',
        reorderPoint: product.reorderPoint || 0,
      });
    } else {
      form.reset({
        sku: '',
        name: '',
        brand: '',
        ean: '',
        type: 'PHYSICAL',
        isSerializable: false,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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

              {/* Nome */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Prodotto <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Smartphone XYZ" 
                        data-testid="input-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Samsung" 
                        data-testid="input-brand"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EAN */}
              <FormField
                control={form.control}
                name="ean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EAN / Barcode</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. 8001234567890" 
                        data-testid="input-ean"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo */}
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
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PHYSICAL">Fisico</SelectItem>
                        <SelectItem value="DIGITAL">Digitale</SelectItem>
                        <SelectItem value="SERVICE">Servizio</SelectItem>
                      </SelectContent>
                    </Select>
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
                        placeholder="es. pz, kg, lt" 
                        data-testid="input-unit-of-measure"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Serializzabile Checkbox */}
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
                    <p className="text-sm text-muted-foreground">
                      Abilita la tracciabilità tramite numero seriale univoco per ogni unità
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
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
                  background: 'hsl(var(--brand-orange))',
                  color: 'white',
                }}
              >
                {isPending ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea Prodotto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
