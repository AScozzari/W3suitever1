import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { brandWmsApi } from '@/services/brandWmsApi';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const productTypeSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  description: z.string().optional(),
});

type ProductTypeFormData = z.infer<typeof productTypeSchema>;

interface ProductTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType?: any;
}

export function ProductTypeFormModal({ open, onOpenChange, productType }: ProductTypeFormModalProps) {
  const isEdit = !!productType;
  const { toast } = useToast();

  const form = useForm<ProductTypeFormData>({
    resolver: zodResolver(productTypeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (productType) {
      form.reset({
        name: productType.name || '',
        description: productType.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [productType, form]);

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Tipologia *</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Smartphone" {...field} data-testid="input-type-name" />
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
