import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brandWmsApi } from '@/services/brandWmsApi';
import { queryClient } from '@/lib/queryClient';
import { supplierValidationSchema } from '@/lib/validation/italian-business-validation';
import { useToast } from '@/hooks/use-toast';

type SupplierFormData = z.infer<typeof supplierValidationSchema>;

interface SupplierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any;
}

export function SupplierFormModal({ open, onOpenChange, supplier }: SupplierFormModalProps) {
  const isEdit = !!supplier;
  const { toast } = useToast();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierValidationSchema),
    defaultValues: {
      code: '',
      name: '',
      legalName: '',
      legalForm: '',
      vatNumber: '',
      taxCode: '',
      status: 'active',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Italia',
      email: '',
      phone: '',
      website: '',
      pecEmail: '',
      sdiCode: '',
      iban: '',
      bic: '',
      splitPayment: false,
      withholdingTax: false,
      preferredPaymentMethodId: '',
      paymentConditionId: '',
      notes: ''
    },
  });

  // Populate form on edit
  useEffect(() => {
    if (supplier) {
      form.reset({
        code: supplier.code || '',
        name: supplier.name || '',
        legalName: supplier.legalName || supplier.legal_name || '',
        legalForm: supplier.legalForm || supplier.legal_form || '',
        vatNumber: supplier.vatNumber || supplier.vat_number || '',
        taxCode: supplier.taxCode || supplier.tax_code || '',
        status: supplier.status || 'active',
        address: supplier.address || '',
        city: supplier.city || '',
        province: supplier.province || '',
        postalCode: supplier.postalCode || supplier.postal_code || '',
        country: supplier.country || 'Italia',
        email: supplier.email || '',
        phone: supplier.phone || '',
        website: supplier.website || '',
        pecEmail: supplier.pecEmail || supplier.pec_email || '',
        sdiCode: supplier.sdiCode || supplier.sdi_code || '',
        iban: supplier.iban || '',
        bic: supplier.bic || '',
        splitPayment: supplier.splitPayment || supplier.split_payment || false,
        withholdingTax: supplier.withholdingTax || supplier.withholding_tax || false,
        preferredPaymentMethodId: supplier.preferredPaymentMethodId || supplier.preferred_payment_method_id || '',
        paymentConditionId: supplier.paymentConditionId || supplier.payment_condition_id || '',
        notes: supplier.notes || ''
      });
    } else {
      form.reset();
    }
  }, [supplier, form]);

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (isEdit) {
        return brandWmsApi.updateSupplier(supplier.id, data);
      } else {
        return brandWmsApi.createSupplier(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/suppliers'] });
      toast({
        title: isEdit ? 'Fornitore aggiornato' : 'Fornitore creato',
        description: isEdit ? 'Le modifiche sono state salvate con successo' : 'Il nuovo fornitore è stato creato nel catalogo master',
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

  const onSubmit = (data: SupplierFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Fornitore' : 'Nuovo Fornitore Master'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Sezione Anagrafici */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📋 Dati Anagrafici</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice *</FormLabel>
                      <FormControl>
                        <Input placeholder="FOR001" {...field} data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Commerciale *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome fornitore" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ragione Sociale</FormLabel>
                      <FormControl>
                        <Input placeholder="Ragione sociale completa" {...field} data-testid="input-legal-name" />
                      </FormControl>
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
                        <Input placeholder="IT12345678901" {...field} data-testid="input-vat" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Fiscale</FormLabel>
                      <FormControl>
                        <Input placeholder="RSSMRA80A01H501U" {...field} data-testid="input-tax-code" />
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
                      <FormLabel>Stato *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Seleziona stato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Attivo</SelectItem>
                          <SelectItem value="inactive">Inattivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sezione Contatti */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📞 Contatti</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@fornitore.it" {...field} data-testid="input-email" />
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
                        <Input placeholder="+39 0123456789" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sito Web</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://www.fornitore.it" {...field} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pecEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PEC Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="pec@fornitore.pec.it" {...field} data-testid="input-pec" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sezione Geografici */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📍 Dati Geografici</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Input placeholder="Via Roma, 123" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città</FormLabel>
                      <FormControl>
                        <Input placeholder="Milano" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input placeholder="MI" maxLength={2} {...field} data-testid="input-province" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CAP</FormLabel>
                      <FormControl>
                        <Input placeholder="20100" maxLength={5} {...field} data-testid="input-postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paese</FormLabel>
                      <FormControl>
                        <Input placeholder="Italia" {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sezione Amministrativi */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">💳 Dati Amministrativi</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sdiCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice SDI</FormLabel>
                      <FormControl>
                        <Input placeholder="ABCDEFG" maxLength={7} {...field} data-testid="input-sdi" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input placeholder="IT60X0542811101000000123456" {...field} data-testid="input-iban" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC/SWIFT</FormLabel>
                      <FormControl>
                        <Input placeholder="ABCDITMM" maxLength={11} {...field} data-testid="input-bic" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sezione Note */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📝 Note</h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Note aggiuntive..." {...field} data-testid="input-notes" />
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
                {mutation.isPending ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Fornitore'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
