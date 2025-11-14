import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { brandWmsApi } from '@/services/brandWmsApi';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const productTypeSchema = z.object({
  categoryId: z.string().min(1, 'La categoria è obbligatoria'),
  name: z.string().min(1, 'Nome obbligatorio'),
  description: z.string().optional(),
  ordine: z.number().int().min(0).optional(),
});

type ProductTypeFormData = z.infer<typeof productTypeSchema>;

interface ProductTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType?: any;
  initialCategoryId?: string;
}

export function ProductTypeFormModal({ open, onOpenChange, productType, initialCategoryId }: ProductTypeFormModalProps) {
  const isEdit = !!productType;
  const { toast } = useToast();

  // Fetch categories for dropdown
  const { data: categoriesResponse } = useQuery({
    queryKey: ['/brand-api/wms/categories'],
    queryFn: brandWmsApi.getCategories,
    enabled: open,
  });

  const categories = categoriesResponse?.data || [];

  const form = useForm<ProductTypeFormData>({
    resolver: zodResolver(productTypeSchema),
    defaultValues: {
      categoryId: initialCategoryId || '',
      name: '',
      description: '',
      ordine: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (productType) {
        form.reset({
          categoryId: productType.categoryId || '',
          name: productType.name || productType.nome || '',
          description: productType.description || productType.descrizione || '',
          ordine: productType.ordine || 0,
        });
      } else {
        form.reset({
          categoryId: initialCategoryId || '',
          name: '',
          description: '',
          ordine: 0,
        });
      }
    }
  }, [open, productType, initialCategoryId, form]);

  const mutation = useMutation({
    mutationFn: async (data: ProductTypeFormData) => {
      if (isEdit) {
        return brandWmsApi.updateProductType(productType.id, data);
      } else {
        return brandWmsApi.createProductType(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/product-types'] });
      toast({
        title: isEdit ? 'Tipologia aggiornata' : 'Tipologia creata',
        description: isEdit ? 'Le modifiche sono state salvate con successo' : 'La nuova tipologia è stata creata nel catalogo master',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProductTypeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Tipologia Prodotto' : 'Nuova Tipologia Prodotto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Dropdown */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria <span className="text-red-500">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="input-categoryId">
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icona} {cat.nome || cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && (
                    <FormDescription>La categoria non può essere modificata dopo la creazione</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Tipologia <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="es. iPhone 15, Galaxy S24, Auricolari..." {...field} data-testid="input-type-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrizione della tipologia..." 
                      rows={3}
                      {...field} 
                      data-testid="input-type-description" 
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}
                data-testid="button-submit"
              >
                {mutation.isPending ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Tipologia'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
