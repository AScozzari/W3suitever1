import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Category } from './CategoriesTypologiesTabContent';

const typologySchema = z.object({
  categoryId: z.string().min(1, 'La categoria è obbligatoria'),
  nome: z.string().min(1, 'Il nome è obbligatorio').max(255),
  descrizione: z.string().optional(),
  ordine: z.number().int().min(0).optional(),
});

type TypologyFormData = z.infer<typeof typologySchema>;

interface ProductTypology {
  id: string;
  categoryId: string;
  nome: string;
  descrizione?: string | null;
  ordine: number;
}

interface TypologyFormModalProps {
  open: boolean;
  onClose: () => void;
  typology?: ProductTypology | null;
  initialCategoryId?: string;
}

export function TypologyFormModal({ open, onClose, typology, initialCategoryId }: TypologyFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!typology;

  // Fetch categories for dropdown
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  const categoriesArray = categories || [];

  const form = useForm<TypologyFormData>({
    resolver: zodResolver(typologySchema),
    defaultValues: {
      categoryId: initialCategoryId || '',
      nome: '',
      descrizione: '',
      ordine: 0,
    },
  });

  // Reset form when modal opens/closes or typology changes
  useEffect(() => {
    if (open) {
      if (typology) {
        form.reset({
          categoryId: typology.categoryId,
          nome: typology.nome,
          descrizione: typology.descrizione || '',
          ordine: typology.ordine,
        });
      } else {
        form.reset({
          categoryId: initialCategoryId || '',
          nome: '',
          descrizione: '',
          ordine: 0,
        });
      }
    }
  }, [open, typology, initialCategoryId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: TypologyFormData) => {
      return await apiRequest('/api/wms/product-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-types'] });
      toast({
        title: 'Tipologia creata',
        description: 'La tipologia è stata creata con successo.',
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare la tipologia.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TypologyFormData) => {
      return await apiRequest(`/api/wms/product-types/${typology?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-types'] });
      toast({
        title: 'Tipologia aggiornata',
        description: 'La tipologia è stata aggiornata con successo.',
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare la tipologia.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TypologyFormData) => {
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
            {isEdit ? 'Modifica Tipologia' : 'Nuova Tipologia'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria <span className="text-red-500">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit} // Cannot change category in edit mode
                  >
                    <FormControl>
                      <SelectTrigger data-testid="input-categoryId">
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriesArray.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icona} {cat.nome}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Nome Tipologia <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="es. iPhone 15, Galaxy S24, Auricolari..."
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
                      placeholder="Descrizione della tipologia..."
                      rows={3}
                      data-testid="input-descrizione"
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
                {isPending ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea Tipologia'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
