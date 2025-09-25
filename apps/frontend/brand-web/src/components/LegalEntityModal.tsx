import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '../lib/queryClient';
import { z } from 'zod';

// ✅ SCHEMA CORRETTO - Matches backend w3suite.legalEntities exactly
const insertLegalEntitySchema = z.object({
  tenantId: z.string().uuid("Tenant ID deve essere un UUID valido"),
  codice: z.string().max(20, "Codice massimo 20 caratteri").optional(),
  nome: z.string().min(1, "Nome è obbligatorio").max(255, "Nome massimo 255 caratteri"),
  formaGiuridica: z.string().max(100, "Forma giuridica massimo 100 caratteri").optional(),
  pIva: z.string().max(50, "P.IVA massimo 50 caratteri").optional(),
  billingProfileId: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  stato: z.string().max(50).default("Attiva").optional()
});

// Type inference from the schema
type LegalEntityFormData = z.infer<typeof insertLegalEntitySchema>;

// Type for existing entities (includes id for updates)
type LegalEntityWithId = LegalEntityFormData & { id: string };

interface LegalEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntity?: LegalEntityWithId | null;
  tenantId: string;
}

const LegalEntityModal: React.FC<LegalEntityModalProps> = ({
  isOpen,
  onClose,
  editingEntity,
  tenantId
}) => {
  const queryClient = useQueryClient();

  // Form setup with react-hook-form and zod validation
  const form = useForm<LegalEntityFormData>({
    resolver: zodResolver(insertLegalEntitySchema),
    defaultValues: {
      tenantId: tenantId,
      codice: '',
      nome: '',
      formaGiuridica: '',
      pIva: '',
      billingProfileId: undefined,
      stato: 'Attiva',
      ...editingEntity
    }
  });

  // Reset form when modal opens/closes or editing entity changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingEntity) {
        form.reset({
          ...editingEntity,
          tenantId: tenantId
        });
      } else {
        form.reset({
          tenantId: tenantId,
          codice: '',
          nome: '',
          pIva: '',
          billingProfileId: '',
          stato: 'Attiva'
        });
      }
    }
  }, [isOpen, editingEntity, tenantId, form]);

  // Mutation for creating/updating legal entity using apiRequest pattern
  const createLegalEntityMutation = useMutation({
    mutationFn: async (data: LegalEntityFormData) => {
      const finalData = {
        ...data,
        // Generate code if empty (8 + timestamp)
        codice: data.codice || `8${String(Date.now()).slice(-6)}`
      };

      if (editingEntity?.id) {
        // Update existing entity
        return apiRequest(`/brand-api/legal-entities/${editingEntity.id}`, {
          method: 'PUT',
          body: JSON.stringify(finalData)
        });
      } else {
        // Create new entity
        return apiRequest('/brand-api/legal-entities', {
          method: 'POST',
          body: JSON.stringify(finalData)
        });
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/brand-api/legal-entities'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/organizations'] });
      
      // Simple feedback (can be replaced with toast system later)
      
      // Close modal and reset form
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error('❌ Error saving legal entity:', error);
      // Simple error feedback (can be replaced with toast system later)
      console.error('❌ Errore nel salvare la ragione sociale. Riprova.');
    }
  });

  // Form submission handler
  const onSubmit = (data: LegalEntityFormData) => {
    createLegalEntityMutation.mutate(data);
  };

  // Handle modal close
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>
                {editingEntity ? 'Modifica Ragione Sociale' : 'Nuova Ragione Sociale'}
              </DialogTitle>
              <DialogDescription>
                {editingEntity 
                  ? 'Modifica i dati dell\'entità giuridica' 
                  : 'Inserisci i dati della nuova entità giuridica'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Ragione Sociale</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="8xxxxxxx (auto-generato)"
                        {...field}
                        data-testid="input-codice"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Ragione Sociale *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="es. WindTre SpA"
                        {...field}
                        data-testid="input-nome"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formaGiuridica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma Giuridica *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-forma-giuridica">
                          <SelectValue placeholder="Seleziona forma giuridica" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SRL">SRL - Società a Responsabilità Limitata</SelectItem>
                        <SelectItem value="SPA">SPA - Società per Azioni</SelectItem>
                        <SelectItem value="SNC">SNC - Società in Nome Collettivo</SelectItem>
                        <SelectItem value="SAS">SAS - Società in Accomandita Semplice</SelectItem>
                        <SelectItem value="SAPA">SAPA - Società in Accomandita per Azioni</SelectItem>
                        <SelectItem value="SRLS">SRLS - Società a Responsabilità Limitata Semplificata</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stato">
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Attiva">Attiva</SelectItem>
                        <SelectItem value="Sospesa">Sospesa</SelectItem>
                        <SelectItem value="Bozza">Bozza</SelectItem>
                        <SelectItem value="Cessata">Cessata</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="pIva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="IT12345678901"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono"
                        data-testid="input-piva"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Billing Profile */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="billingProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Profile ID (Opzionale)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UUID del profilo di fatturazione"
                        {...field}
                        data-testid="input-billing-profile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={createLegalEntityMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
              data-testid="button-save"
            >
              {createLegalEntityMutation.isPending ? (
                'Salvando...'
              ) : (
                editingEntity ? 'Aggiorna' : 'Crea'
              )} Ragione Sociale
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LegalEntityModal;