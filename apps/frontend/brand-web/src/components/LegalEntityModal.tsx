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

// Temporary local schema - TODO: Move to shared schema
const insertLegalEntitySchema = z.object({
  nome: z.string().min(1, "Nome è obbligatorio"),
  codice: z.string(),
  formaGiuridica: z.enum(['SRL', 'SPA', 'SNC', 'SAS', 'SAPA', 'SRLS']),
  pIva: z.string().min(1, "Partita IVA è obbligatoria"),
  codiceFiscale: z.string().optional(),
  indirizzo: z.string().min(1, "Indirizzo è obbligatorio"),
  citta: z.string().min(1, "Città è obbligatoria"),
  cap: z.string().optional(),
  provincia: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  pec: z.string().email("PEC deve essere una email valida").min(1, "PEC è obbligatoria"),
  stato: z.enum(['active', 'suspended', 'draft', 'closed']),
  tenantId: z.string().uuid()
});

// Type inference from the schema
type LegalEntityFormData = z.infer<typeof insertLegalEntitySchema>;

interface LegalEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntity?: LegalEntityFormData | null;
  tenantId: string;
}

const LegalEntityModal: React.FC<LegalEntityModalProps> = ({
  isOpen,
  onClose,
  editingEntity,
  tenantId
}) => {
  console.log('🎯 [MODAL-RENDER] LegalEntityModal rendering:', { isOpen, tenantId, editingEntity });
  const queryClient = useQueryClient();

  // Form setup with react-hook-form and zod validation
  const form = useForm<LegalEntityFormData>({
    resolver: zodResolver(insertLegalEntitySchema),
    defaultValues: {
      nome: '',
      codice: '',
      formaGiuridica: 'SRL',
      pIva: '',
      codiceFiscale: '',
      indirizzo: '',
      citta: '',
      cap: '',
      provincia: '',
      telefono: '',
      email: '',
      pec: '',
      stato: 'active',
      tenantId: tenantId,
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
          nome: '',
          codice: '',
          formaGiuridica: 'SRL',
          pIva: '',
          codiceFiscale: '',
          indirizzo: '',
          citta: '',
          cap: '',
          provincia: '',
          telefono: '',
          email: '',
          pec: '',
          stato: 'active',
          tenantId: tenantId
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
      console.log('✅ Legal entity saved successfully');
      
      // Close modal and reset form
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error('❌ Error saving legal entity:', error);
      // Simple error feedback (can be replaced with toast system later)
      alert('Errore nel salvare la ragione sociale. Riprova.');
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
                        <SelectItem value="active">Attiva</SelectItem>
                        <SelectItem value="suspended">Sospesa</SelectItem>
                        <SelectItem value="draft">Bozza</SelectItem>
                        <SelectItem value="closed">Cessata</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fiscal Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pIva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA *</FormLabel>
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

              <FormField
                control={form.control}
                name="codiceFiscale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="RSSMRA80A01H501U"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono"
                        data-testid="input-codice-fiscale"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <FormField
              control={form.control}
              name="indirizzo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Sede Legale *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Via Roma, 123"
                      {...field}
                      data-testid="input-indirizzo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="citta"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Città *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Milano"
                        {...field}
                        data-testid="input-citta"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provincia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MI"
                        maxLength={2}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-provincia"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="20121"
                        maxLength={5}
                        {...field}
                        data-testid="input-cap"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+39 02 12345678"
                        {...field}
                        data-testid="input-telefono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="info@company.it"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PEC - Full width important field */}
            <FormField
              control={form.control}
              name="pec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PEC *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="pec@pec.company.it"
                      {...field}
                      data-testid="input-pec"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                data-testid="button-save"
              >
                {createLegalEntityMutation.isPending ? (
                  'Salvando...'
                ) : (
                  editingEntity ? 'Aggiorna' : 'Crea'
                )} Ragione Sociale
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LegalEntityModal;