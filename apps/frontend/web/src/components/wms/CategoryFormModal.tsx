import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ProductType, Category } from './CategoriesTypologiesTabContent';
import { Layers, Zap } from 'lucide-react';

interface Driver {
  id: string;
  code: string;
  name: string;
  allowedProductTypes: string[];
  operatorId?: string;
  isActive: boolean;
}

const categorySchema = z.object({
  productType: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  nome: z.string().min(1, 'Il nome è obbligatorio').max(255),
  descrizione: z.string().optional(),
  icona: z.string().max(10).optional(),
  ordine: z.number().int().min(0).optional(),
  driverIds: z.array(z.string()).optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  initialProductType?: ProductType;
}

export function CategoryFormModal({ open, onClose, category, initialProductType }: CategoryFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      productType: initialProductType || 'PHYSICAL',
      nome: '',
      descrizione: '',
      icona: '',
      ordine: 0,
      driverIds: [],
    },
  });

  // Watch productType to filter drivers
  const selectedProductType = form.watch('productType');

  // Query all active drivers
  const { data: driversData = [] } = useQuery({
    queryKey: ['/api/drivers'],
  });
  const allDrivers: Driver[] = Array.isArray(driversData) ? driversData : (driversData as any)?.data || [];

  // Filter drivers by selected productType
  const availableDrivers = useMemo(() => {
    return allDrivers.filter((driver: Driver) => 
      driver.isActive && 
      driver.allowedProductTypes?.includes(selectedProductType)
    );
  }, [allDrivers, selectedProductType]);

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          productType: category.productType,
          nome: category.nome,
          descrizione: category.descrizione || '',
          icona: category.icona || '',
          ordine: category.ordine,
          driverIds: (category as any).driverIds || [],
        });
      } else {
        form.reset({
          productType: initialProductType || 'PHYSICAL',
          nome: '',
          descrizione: '',
          icona: '',
          ordine: 0,
          driverIds: [],
        });
      }
    }
  }, [open, category, initialProductType, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest('/api/wms/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/categories'] });
      toast({
        title: 'Categoria creata',
        description: 'La categoria è stata creata con successo.',
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare la categoria.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest(`/api/wms/categories/${category?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/categories'] });
      toast({
        title: 'Categoria aggiornata',
        description: 'La categoria è stata aggiornata con successo.',
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare la categoria.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Categoria' : 'Nuova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Type */}
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Prodotto <span className="text-red-500">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit} // Cannot change productType in edit mode
                  >
                    <FormControl>
                      <SelectTrigger data-testid="input-productType">
                        <SelectValue placeholder="Seleziona tipo prodotto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PHYSICAL">Prodotti Fisici</SelectItem>
                      <SelectItem value="SERVICE">Servizi</SelectItem>
                      <SelectItem value="CANVAS">Canvas</SelectItem>
                      <SelectItem value="VIRTUAL">Prodotti Digitali</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Categoria <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="es. Smartphone, Accessori, SIM..."
                      data-testid="input-nome"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrizione */}
            <FormField
              control={form.control}
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrizione della categoria..."
                      rows={3}
                      data-testid="input-descrizione"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Driver Association */}
            <FormField
              control={form.control}
              name="driverIds"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <FormLabel className="text-base font-semibold">Driver Associati</FormLabel>
                    {field.value && field.value.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {field.value.length} selezionati
                      </Badge>
                    )}
                  </div>
                  <FormDescription className="text-xs text-gray-500 mb-3">
                    Seleziona i driver business a cui associare questa categoria. Tipologie e prodotti erediteranno automaticamente questa associazione.
                  </FormDescription>
                  
                  {availableDrivers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                      <Zap className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Nessun driver disponibile per il tipo prodotto "{selectedProductType}"
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Crea un driver con questo tipo prodotto nella sezione Driver
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {availableDrivers.map((driver) => {
                        const isChecked = field.value?.includes(driver.id) || false;
                        return (
                          <div
                            key={driver.id}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isChecked ? 'bg-purple-50 border border-purple-200' : 'bg-white border border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              const newValue = isChecked
                                ? (field.value || []).filter((id: string) => id !== driver.id)
                                : [...(field.value || []), driver.id];
                              field.onChange(newValue);
                            }}
                            data-testid={`driver-checkbox-${driver.id}`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), driver.id]
                                  : (field.value || []).filter((id: string) => id !== driver.id);
                                field.onChange(newValue);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{driver.name}</span>
                                <Badge variant="outline" className="text-xs">{driver.code}</Badge>
                              </div>
                              {driver.operatorId && (
                                <span className="text-xs text-blue-600">Associato a operatore</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Icona */}
              <FormField
                control={form.control}
                name="icona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icona (emoji)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="📱"
                        maxLength={10}
                        data-testid="input-icona"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ordine */}
              <FormField
                control={form.control}
                name="ordine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordine</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-ordine"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
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
                style={{
                  background: 'hsl(var(--brand-orange))',
                  color: 'white',
                }}
                data-testid="button-submit"
              >
                {isPending ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea Categoria'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
