import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Building, User } from 'lucide-react';
import {
  italianVatNumberSchema,
  italianTaxCodeSchema,
  pecEmailSchema,
  italianPhoneSchema
} from '@/lib/validation/italian-business-validation';

// B2C Customer Validation Schema
const b2cCustomerSchema = z.object({
  customerType: z.literal('b2c'),
  firstName: z.string().min(1, 'Nome richiesto').max(100),
  lastName: z.string().min(1, 'Cognome richiesto').max(100),
  fiscalCode: italianTaxCodeSchema.optional().or(z.literal('')),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: italianPhoneSchema.optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'prospect']).default('prospect'),
  addresses: z.string().optional(), // JSON string
});

// B2B Customer Validation Schema
const b2bCustomerSchema = z.object({
  customerType: z.literal('b2b'),
  companyName: z.string().min(1, 'Ragione Sociale richiesta').max(255),
  legalForm: z.enum([
    'srl', 'spa', 'snc', 'sas', 'ss', 
    'ditta_individuale', 'srl_semplificata', 'srl_unipersonale',
    'cooperativa', 'consorzio', 'fondazione', 'associazione', 'altro'
  ]).optional(),
  vatNumber: italianVatNumberSchema.optional().or(z.literal('')),
  pec: pecEmailSchema.optional().or(z.literal('')),
  sdi: z.string().regex(/^[A-Z0-9]{7}$/, 'Codice SDI deve essere di 7 caratteri alfanumerici').optional().or(z.literal('')),
  ateco: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: italianPhoneSchema.optional().or(z.literal('')),
  primaryContactName: z.string().max(200).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'prospect']).default('prospect'),
  sedi: z.string().optional(), // JSON string
  secondaryContacts: z.string().optional(), // JSON string array
});

const customerFormSchema = z.discriminatedUnion('customerType', [
  b2cCustomerSchema,
  b2bCustomerSchema,
]);

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'b2b' | 'b2c';
  editMode?: boolean;
  customerId?: string;
  initialData?: Partial<CustomerFormData> & { secondaryContacts?: string };
}

interface SecondaryContact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export function CustomerFormModal({ 
  open, 
  onOpenChange, 
  defaultType = 'b2c',
  editMode = false,
  customerId,
  initialData
}: CustomerFormModalProps) {
  const [customerType, setCustomerType] = useState<'b2b' | 'b2c'>(defaultType);
  const [secondaryContacts, setSecondaryContacts] = useState<SecondaryContact[]>([]);
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerType: defaultType,
      status: 'prospect',
    } as CustomerFormData,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return apiRequest('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      toast({
        title: 'Cliente creato',
        description: 'Il cliente è stato creato con successo.',
      });
      // Clear state on success
      setSecondaryContacts([]);
      setCustomerType(defaultType);
      form.reset({
        customerType: defaultType,
        status: 'prospect',
      } as CustomerFormData);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile creare il cliente.',
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!customerId) throw new Error('Customer ID required for update');
      return apiRequest(`/api/crm/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      toast({
        title: 'Cliente aggiornato',
        description: 'Le modifiche sono state salvate con successo.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare il cliente.',
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    // Validate secondary contacts before submit
    if (data.customerType === 'b2b' && secondaryContacts.length > 0) {
      // Basic email validation for secondary contacts
      const invalidEmails = secondaryContacts.filter(c => c.email && !z.string().email().safeParse(c.email).success);
      if (invalidEmails.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Validazione fallita',
          description: 'Alcuni contatti secondari hanno email non valide',
        });
        return;
      }

      // Basic phone validation for secondary contacts
      const invalidPhones = secondaryContacts.filter(c => c.phone && !italianPhoneSchema.safeParse(c.phone).success);
      if (invalidPhones.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Validazione fallita',
          description: 'Alcuni contatti secondari hanno telefoni non validi',
        });
        return;
      }

      data.secondaryContacts = JSON.stringify(secondaryContacts);
    }
    
    if (editMode) {
      updateCustomerMutation.mutate(data);
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const addSecondaryContact = () => {
    setSecondaryContacts([...secondaryContacts, { name: '', email: '', phone: '', role: '' }]);
  };

  const removeSecondaryContact = (index: number) => {
    setSecondaryContacts(secondaryContacts.filter((_, i) => i !== index));
  };

  const updateSecondaryContact = (index: number, field: keyof SecondaryContact, value: string) => {
    const updated = [...secondaryContacts];
    updated[index][field] = value;
    setSecondaryContacts(updated);
  };

  const handleTypeChange = (type: 'b2b' | 'b2c') => {
    setCustomerType(type);
    form.setValue('customerType', type);
    form.reset({
      customerType: type,
      status: 'prospect',
    } as CustomerFormData);
    setSecondaryContacts([]); // Reset secondary contacts on type change
  };

  const legalFormOptions = [
    { value: 'srl', label: 'S.r.l. - Società a Responsabilità Limitata' },
    { value: 'spa', label: 'S.p.A. - Società per Azioni' },
    { value: 'snc', label: 'S.n.c. - Società in Nome Collettivo' },
    { value: 'sas', label: 'S.a.s. - Società in Accomandita Semplice' },
    { value: 'ss', label: 'S.S. - Società Semplice' },
    { value: 'ditta_individuale', label: 'Ditta Individuale' },
    { value: 'srl_semplificata', label: 'S.r.l. Semplificata' },
    { value: 'srl_unipersonale', label: 'S.r.l. Unipersonale' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'consorzio', label: 'Consorzio' },
    { value: 'fondazione', label: 'Fondazione' },
    { value: 'associazione', label: 'Associazione' },
    { value: 'altro', label: 'Altro' },
  ];

  // Reset state when modal opens/closes via useEffect
  useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        // Edit mode: populate form with existing data
        const typeToUse = initialData.customerType || defaultType;
        setCustomerType(typeToUse);
        
        // Parse secondary contacts if present
        if (initialData.secondaryContacts) {
          try {
            const parsed = JSON.parse(initialData.secondaryContacts);
            setSecondaryContacts(Array.isArray(parsed) ? parsed : []);
          } catch {
            setSecondaryContacts([]);
          }
        } else {
          setSecondaryContacts([]);
        }
        
        // Populate form with initial data
        form.reset(initialData as CustomerFormData);
      } else {
        // Create mode: reset to defaults
        setCustomerType(defaultType);
        form.setValue('customerType', defaultType);
        setSecondaryContacts([]);
      }
    } else {
      // Clear state on modal close
      if (!editMode) {
        setSecondaryContacts([]);
        setCustomerType(defaultType);
        form.reset({
          customerType: defaultType,
          status: 'prospect',
        } as CustomerFormData);
      }
    }
  }, [open, defaultType, form, editMode, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}
      >
        <DialogHeader>
          <DialogTitle>{editMode ? 'Modifica Cliente' : 'Nuovo Cliente'}</DialogTitle>
          <DialogDescription>
            {editMode 
              ? 'Modifica i dati del cliente esistente'
              : 'Crea un nuovo cliente Business (azienda) o Privato (consumatore)'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={customerType} onValueChange={(v) => handleTypeChange(v as 'b2b' | 'b2c')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="b2c" data-testid="tab-b2c">
              <User className="h-4 w-4 mr-2" />
              Cliente Privato
            </TabsTrigger>
            <TabsTrigger value="b2b" data-testid="tab-b2b">
              <Building className="h-4 w-4 mr-2" />
              Cliente Business
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* B2C Form */}
              <TabsContent value="b2c" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Mario" {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Rossi" {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="fiscalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Fiscale</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="RSSMRA80A01H501U" 
                          {...field} 
                          className="font-mono uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-fiscalCode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="mario.rossi@example.com" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+39 333 1234567" 
                            {...field} 
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Seleziona stato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="active">Attivo</SelectItem>
                          <SelectItem value="inactive">Inattivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* B2B Form */}
              <TabsContent value="b2b" className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ragione Sociale <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme S.r.l." 
                          {...field} 
                          data-testid="input-companyName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="legalForm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma Giuridica</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-legalForm">
                              <SelectValue placeholder="Seleziona forma giuridica" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {legalFormOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partita IVA</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="01234567890" 
                            {...field} 
                            className="font-mono"
                            data-testid="input-vatNumber"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="info@acme.it" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pec"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PEC</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="acme@pec.it" 
                            {...field} 
                            data-testid="input-pec"
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+39 02 12345678" 
                            {...field} 
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sdi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice SDI</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABCDE12" 
                            {...field} 
                            className="font-mono uppercase"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-sdi"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ateco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice ATECO</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="62.01.00" 
                            {...field} 
                            data-testid="input-ateco"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="primaryContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referente Principale</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Mario Rossi" 
                          {...field} 
                          data-testid="input-primaryContactName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Seleziona stato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="active">Attivo</SelectItem>
                          <SelectItem value="inactive">Inattivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Secondary Contacts Dynamic Array */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Contatti Secondari</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSecondaryContact}
                      data-testid="button-add-secondary-contact"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Contatto
                    </Button>
                  </div>

                  {secondaryContacts.map((contact, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-lg border space-y-3"
                      style={{ borderColor: 'var(--glass-card-border)', background: 'var(--glass-bg)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Contatto #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSecondaryContact(index)}
                          data-testid={`button-remove-secondary-contact-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm">Nome</label>
                          <Input
                            placeholder="Mario Rossi"
                            value={contact.name}
                            onChange={(e) => updateSecondaryContact(index, 'name', e.target.value)}
                            data-testid={`input-secondary-contact-name-${index}`}
                          />
                        </div>
                        <div>
                          <label className="text-sm">Ruolo</label>
                          <Input
                            placeholder="Responsabile Tecnico"
                            value={contact.role}
                            onChange={(e) => updateSecondaryContact(index, 'role', e.target.value)}
                            data-testid={`input-secondary-contact-role-${index}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm">Email</label>
                          <Input
                            type="email"
                            placeholder="mario@acme.it"
                            value={contact.email}
                            onChange={(e) => updateSecondaryContact(index, 'email', e.target.value)}
                            data-testid={`input-secondary-contact-email-${index}`}
                          />
                        </div>
                        <div>
                          <label className="text-sm">Telefono</label>
                          <Input
                            placeholder="+39 333 1234567"
                            value={contact.phone}
                            onChange={(e) => updateSecondaryContact(index, 'phone', e.target.value)}
                            data-testid={`input-secondary-contact-phone-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {secondaryContacts.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                      Nessun contatto secondario aggiunto
                    </p>
                  )}
                </div>
              </TabsContent>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--glass-card-border)' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  style={{ background: 'hsl(var(--brand-orange))' }}
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  data-testid="button-submit"
                >
                  {editMode 
                    ? (updateCustomerMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche')
                    : (createCustomerMutation.isPending ? 'Creazione...' : 'Crea Cliente')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
