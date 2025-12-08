import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ProductType, Category } from './CategoriesTypologiesTabContent';

const categorySchema = z.object({
  productType: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  nome: z.string().min(1, 'Il nome è obbligatorio').max(255),
  descrizione: z.string().optional(),
  icona: z.string().max(10).optional(),
  ordine: z.number().int().min(0).optional(),
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
    },
  });

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
        });
      } else {
        form.reset({
          productType: initialProductType || 'PHYSICAL',
          nome: '',
          descrizione: '',
          icona: '',
          ordine: 0,
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
