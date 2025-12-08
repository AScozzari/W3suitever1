import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette } from 'lucide-react';

const leadStatusCategories = ['new', 'working', 'qualified', 'converted', 'disqualified', 'on_hold'] as const;

const leadStatusSchema = z.object({
  displayName: z.string().min(2, 'Nome richiesto (min 2 caratteri)').max(100),
  category: z.enum(leadStatusCategories),
  color: z.string().regex(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/, 'Formato colore HSL non valido'),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean().default(true),
});

type LeadStatusFormData = z.infer<typeof leadStatusSchema>;

interface CreateLeadStatusDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  editingStatus?: any | null;
}

const categoryLabels: Record<string, string> = {
  new: 'Nuovo Lead',
  working: 'In Lavorazione',
  qualified: 'Qualificato',
  converted: 'Convertito',
  disqualified: 'Non Qualificato',
  on_hold: 'In Attesa',
};

const predefinedColors = [
  { name: 'Blu', value: 'hsl(210, 100%, 60%)' },
  { name: 'Azzurro', value: 'hsl(200, 100%, 50%)' },
  { name: 'Viola', value: 'hsl(280, 65%, 60%)' },
  { name: 'Verde', value: 'hsl(140, 60%, 50%)' },
  { name: 'Rosso', value: 'hsl(0, 70%, 55%)' },
  { name: 'Arancione', value: 'hsl(24, 100%, 52%)' },
  { name: 'Giallo', value: 'hsl(40, 95%, 55%)' },
  { name: 'Rosa', value: 'hsl(330, 80%, 60%)' },
  { name: 'Grigio', value: 'hsl(210, 15%, 50%)' },
];

export function CreateLeadStatusDialog({ open, onClose, campaignId, editingStatus }: CreateLeadStatusDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!editingStatus;

  const form = useForm<LeadStatusFormData>({
    resolver: zodResolver(leadStatusSchema),
    defaultValues: {
      displayName: '',
      category: 'new',
      color: 'hsl(210, 100%, 60%)',
      sortOrder: 10,
      isActive: true,
    },
  });

  // Reset form when editingStatus changes
  useEffect(() => {
    if (editingStatus) {
      form.reset({
        displayName: editingStatus.displayName,
        category: editingStatus.category,
        color: editingStatus.color,
        sortOrder: editingStatus.sortOrder,
        isActive: editingStatus.isActive ?? true,
      });
    } else {
      form.reset({
        displayName: '',
        category: 'new',
        color: 'hsl(210, 100%, 60%)',
        sortOrder: 10,
        isActive: true,
      });
    }
  }, [editingStatus, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: LeadStatusFormData) => {
      return apiRequest('/api/crm/lead-statuses', {
        method: 'POST',
        body: {
          ...data,
          campaignId,
          isDefault: false,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Stato creato',
        description: 'Lo stato è stato creato con successo',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/lead-statuses', campaignId] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare lo stato',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: LeadStatusFormData) => {
      return apiRequest(`/api/crm/lead-statuses/${editingStatus.id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Stato aggiornato',
        description: 'Lo stato è stato aggiornato con successo',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/lead-statuses', campaignId] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare lo stato',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LeadStatusFormData) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifica Stato Lead' : 'Crea Nuovo Stato Lead'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Modifica le informazioni dello stato esistente' 
              : 'Crea un nuovo stato personalizzato per i tuoi lead'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Display Name */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Stato *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="es. Follow-up Richiesto, Demo Schedulata"
                      data-testid="input-display-name"
                    />
                  </FormControl>
                  <FormDescription>
                    Nome personalizzato che apparirà nell'interfaccia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leadStatusCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Categoria fissa a cui appartiene lo stato (non modificabile dopo creazione)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colore *</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-md border"
                          style={{ backgroundColor: field.value }}
                        />
                        <Input
                          {...field}
                          placeholder="hsl(210, 100%, 60%)"
                          data-testid="input-color"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className="w-8 h-8 rounded-md border hover:ring-2 hover:ring-offset-2 transition-all"
                            style={{ backgroundColor: color.value }}
                            onClick={() => field.onChange(color.value)}
                            title={color.name}
                            data-testid={`color-${color.name.toLowerCase()}`}
                          />
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Seleziona un colore predefinito o inserisci un valore HSL personalizzato
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sort Order */}
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordine di Visualizzazione *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      min={0}
                      max={999}
                      data-testid="input-sort-order"
                    />
                  </FormControl>
                  <FormDescription>
                    Numero che determina l'ordine di visualizzazione (più basso = prima posizione)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Salva Modifiche' : 'Crea Stato'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
