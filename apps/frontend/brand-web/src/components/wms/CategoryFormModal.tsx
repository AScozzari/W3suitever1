import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { brandWmsApi } from '@/services/brandWmsApi';
import { queryClient } from '@/lib/queryClient';

const categorySchema = z.object({
  productType: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  nome: z.string().min(1, 'Il nome è obbligatorio').max(255),
  descrizione: z.string().optional(),
  icona: z.string().max(10).optional(),
  ordine: z.number().int().min(0).optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

type ProductType = 'PHYSICAL' | 'VIRTUAL' | 'SERVICE' | 'CANVAS';

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any | null;
  initialProductType?: ProductType;
}

export function CategoryFormModal({ open, onOpenChange, category, initialProductType }: CategoryFormModalProps) {
  const { toast } = useToast();
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

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          productType: category.productType || 'PHYSICAL',
          nome: category.nome || category.name || '',
          descrizione: category.descrizione || category.description || '',
          icona: category.icona || '',
          ordine: category.ordine || 0,
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

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (isEdit) {
        return brandWmsApi.updateCategory(category.id, data);
      } else {
        return brandWmsApi.createCategory(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/categories'] });
      toast({
        title: isEdit ? 'Categoria aggiornata' : 'Categoria creata',
        description: isEdit 
          ? 'La categoria master è stata aggiornata con successo' 
          : 'La nuova categoria master è stata creata nel catalogo brand',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile salvare la categoria',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    mutation.mutate(data);
  };

  const isPending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Categoria Master' : 'Nuova Categoria Master'}
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
                    disabled={isEdit}
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
                  {isEdit && (
                    <FormMessage>Il tipo prodotto non può essere modificato dopo la creazione</FormMessage>
                  )}
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
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                {isPending ? 'Salvataggio...' : isEdit ? 'Aggiorna Categoria Master' : 'Crea Categoria Master'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
