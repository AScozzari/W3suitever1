import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X } from 'lucide-react';
import {
  italianPhoneSchema,
  ibanSchema,
  italianTaxCodeSchema
} from '@/lib/validation/italian-business-validation';

const employeeUpdateSchema = z.object({
  // Basic Info
  firstName: z.string().min(1, "Nome richiesto").max(100),
  lastName: z.string().min(1, "Cognome richiesto").max(100),
  email: z.string().email("Email non valida").max(255),
  phone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  contractType: z.string().max(50).optional().nullable(),
  
  // Demographics
  dateOfBirth: z.string().optional().nullable(),
  fiscalCode: italianTaxCodeSchema.optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  placeOfBirth: z.string().max(100).optional().nullable(),
  
  // Address
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().length(2, "Provincia deve essere 2 caratteri").optional().nullable().or(z.literal('')),
  postalCode: z.string().regex(/^\d{5}$/, "CAP deve essere 5 cifre").optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable(),
  
  // Emergency Contact
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactRelationship: z.string().max(100).optional().nullable(),
  emergencyContactPhone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  emergencyContactEmail: z.string().email("Email emergenza non valida").max(255).optional().nullable().or(z.literal('')),
  
  // Administrative
  employeeNumber: z.string().max(50).optional().nullable(),
  annualCost: z.coerce.number().positive("Costo deve essere positivo").optional().nullable(),
  grossAnnualSalary: z.coerce.number().positive("RAL deve essere positiva").optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  ccnl: z.string().max(255).optional().nullable(),
  managerId: z.string().optional().nullable(),
  employmentEndDate: z.string().optional().nullable(),
  probationEndDate: z.string().optional().nullable(),
  
  // Banking
  bankIban: ibanSchema.optional().nullable().or(z.literal('')),
  bankName: z.string().max(255).optional().nullable(),
  
  // Professional
  education: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(), // comma-separated
  skills: z.string().optional().nullable(), // comma-separated
  languages: z.string().optional().nullable(), // comma-separated
  
  // Notes
  notes: z.string().optional().nullable(),
});

type EmployeeUpdateForm = z.infer<typeof employeeUpdateSchema>;

interface EmployeeEditDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeEditDialog({ userId, open, onOpenChange }: EmployeeEditDialogProps) {
  const { toast } = useToast();

  // Fetch user data
  const { data: userData, isLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      return response.json();
    },
    enabled: !!userId && open
  });

  const user = userData?.data;

  // Initialize form
  const form = useForm<EmployeeUpdateForm>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      hireDate: '',
      contractType: '',
      dateOfBirth: '',
      fiscalCode: '',
      gender: undefined,
      maritalStatus: undefined,
      nationality: '',
      placeOfBirth: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Italia',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
      emergencyContactEmail: '',
      employeeNumber: '',
      annualCost: null,
      grossAnnualSalary: null,
      level: '',
      ccnl: '',
      managerId: null,
      employmentEndDate: '',
      probationEndDate: '',
      bankIban: '',
      bankName: '',
      education: '',
      certifications: '',
      skills: '',
      languages: '',
      notes: '',
    }
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        hireDate: user.hireDate || '',
        contractType: user.contractType || '',
        dateOfBirth: user.dateOfBirth || '',
        fiscalCode: user.fiscalCode || '',
        gender: user.gender || undefined,
        maritalStatus: user.maritalStatus || undefined,
        nationality: user.nationality || '',
        placeOfBirth: user.placeOfBirth || '',
        address: user.address || '',
        city: user.city || '',
        province: user.province || '',
        postalCode: user.postalCode || '',
        country: user.country || 'Italia',
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactRelationship: user.emergencyContactRelationship || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
        emergencyContactEmail: user.emergencyContactEmail || '',
        employeeNumber: user.employeeNumber || '',
        annualCost: user.annualCost || null,
        grossAnnualSalary: user.grossAnnualSalary || null,
        level: user.level || '',
        ccnl: user.ccnl || '',
        managerId: user.managerId || null,
        employmentEndDate: user.employmentEndDate || '',
        probationEndDate: user.probationEndDate || '',
        bankIban: user.bankIban || '',
        bankName: user.bankName || '',
        education: user.education || '',
        certifications: user.certifications?.join(', ') || '',
        skills: user.skills?.join(', ') || '',
        languages: user.languages?.join(', ') || '',
        notes: user.notes || '',
      });
    }
  }, [user, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeUpdateForm) => {
      // Convert comma-separated strings to arrays, handle empty values
      const convertToArray = (value: string | null | undefined): string[] | undefined => {
        if (!value || value.trim() === '') return undefined;
        return value.split(',').map(s => s.trim()).filter(Boolean);
      };

      const payload = {
        ...data,
        certifications: convertToArray(data.certifications),
        skills: convertToArray(data.skills),
        languages: convertToArray(data.languages),
        // Ensure numeric fields are sent as numbers or undefined, not null
        annualCost: data.annualCost ?? undefined,
        grossAnnualSalary: data.grossAnnualSalary ?? undefined,
        // Handle empty string fields - convert to undefined for optional fields
        phone: data.phone?.trim() || undefined,
        fiscalCode: data.fiscalCode?.trim() || undefined,
        province: data.province?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || undefined,
        emergencyContactEmail: data.emergencyContactEmail?.trim() || undefined,
        bankIban: data.bankIban?.trim() || undefined,
      };

      return await apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({
        title: "Successo",
        description: "Dati dipendente aggiornati con successo",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeUpdateForm) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Modifica Dipendente</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col gap-4">
              <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="general">Generale</TabsTrigger>
                  <TabsTrigger value="demographics">Anagrafiche</TabsTrigger>
                  <TabsTrigger value="address">Indirizzo</TabsTrigger>
                  <TabsTrigger value="emergency">Emergenze</TabsTrigger>
                  <TabsTrigger value="admin">Amministrative</TabsTrigger>
                  <TabsTrigger value="professional">Formazione</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                  {/* Tab: General */}
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="+39 3XX XXXXXXX" data-testid="input-phone" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="position" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posizione</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} data-testid="input-position" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dipartimento</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} data-testid="input-department" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="hireDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Assunzione</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-hire-date" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="contractType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Contratto</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-contract-type">
                                <SelectValue placeholder="Seleziona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="indeterminato">Tempo Indeterminato</SelectItem>
                                <SelectItem value="determinato">Tempo Determinato</SelectItem>
                                <SelectItem value="apprendistato">Apprendistato</SelectItem>
                                <SelectItem value="stage">Stage</SelectItem>
                                <SelectItem value="parttime">Part-Time</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </TabsContent>

                  {/* Tab: Demographics */}
                  <TabsContent value="demographics" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data di Nascita</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-dob" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="placeOfBirth" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Luogo di Nascita</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} data-testid="input-pob" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="fiscalCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Fiscale</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} maxLength={16} placeholder="RSSMRA80A01H501U" data-testid="input-fiscal-code" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genere</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Seleziona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Uomo</SelectItem>
                                <SelectItem value="female">Donna</SelectItem>
                                <SelectItem value="other">Altro</SelectItem>
                                <SelectItem value="prefer_not_to_say">Preferisco non dirlo</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stato Civile</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-marital-status">
                                <SelectValue placeholder="Seleziona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Celibe/Nubile</SelectItem>
                                <SelectItem value="married">Coniugato/a</SelectItem>
                                <SelectItem value="divorced">Divorziato/a</SelectItem>
                                <SelectItem value="widowed">Vedovo/a</SelectItem>
                                <SelectItem value="other">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="nationality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazionalità</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="Italiana" data-testid="input-nationality" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>

                  {/* Tab: Address */}
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="Via Roma 123" data-testid="input-address" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} data-testid="input-city" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="province" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} maxLength={2} placeholder="RM" data-testid="input-province" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="postalCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CAP</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} maxLength={5} placeholder="00100" data-testid="input-postal-code" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paese</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} data-testid="input-country" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>

                  {/* Tab: Emergency Contact */}
                  <TabsContent value="emergency" className="space-y-4 mt-4">
                    <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Contatto Emergenza</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} data-testid="input-emergency-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContactRelationship" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relazione</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="Coniuge, Genitore, ecc." data-testid="input-emergency-relationship" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="+39 3XX XXXXXXX" data-testid="input-emergency-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactEmail" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" {...field} value={field.value || ''} data-testid="input-emergency-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </TabsContent>

                  {/* Tab: Administrative */}
                  <TabsContent value="admin" className="space-y-4 mt-4">
                    <FormField control={form.control} name="employeeNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matricola</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="EMP001" data-testid="input-employee-number" /></FormControl>
                        <FormDescription>Codice identificativo dipendente</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="grossAnnualSalary" render={({ field }) => (
                        <FormItem>
                          <FormLabel>RAL (€)</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value ?? ''} step="100" min={0} placeholder="30000" data-testid="input-gross-salary" /></FormControl>
                          <FormDescription>Retribuzione Annua Lorda</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="annualCost" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Aziendale (€)</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value ?? ''} step="100" min={0} placeholder="45000" data-testid="input-annual-cost" /></FormControl>
                          <FormDescription>Costo totale annuo</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Livello</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="Quadro" data-testid="input-level" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ccnl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CCNL</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="Commercio" data-testid="input-ccnl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="employmentEndDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fine Rapporto</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-employment-end" /></FormControl>
                          <FormDescription>Per contratti a tempo determinato</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="probationEndDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fine Prova</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-probation-end" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="bankIban" render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} maxLength={34} placeholder="IT60X0542811101000000123456" data-testid="input-iban" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bankName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banca</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} data-testid="input-bank-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </TabsContent>

                  {/* Tab: Professional */}
                  <TabsContent value="professional" className="space-y-4 mt-4">
                    <FormField control={form.control} name="education" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titolo di Studio</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="Laurea Magistrale in Economia" data-testid="input-education" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="certifications" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificazioni</FormLabel>
                        <FormControl><Textarea {...field} value={field.value || ''} placeholder="PMP, SCRUM Master (separati da virgola)" data-testid="input-certifications" /></FormControl>
                        <FormDescription>Separare con virgola</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="skills" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competenze</FormLabel>
                        <FormControl><Textarea {...field} value={field.value || ''} placeholder="JavaScript, Python, SQL (separati da virgola)" data-testid="input-skills" /></FormControl>
                        <FormDescription>Separare con virgola</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="languages" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lingue</FormLabel>
                        <FormControl><Textarea {...field} value={field.value || ''} placeholder="Italiano, Inglese, Francese (separati da virgola)" data-testid="input-languages" /></FormControl>
                        <FormDescription>Separare con virgola</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending} data-testid="button-cancel">
                  <X className="h-4 w-4 mr-2" />
                  Annulla
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-to-r from-orange-500 to-purple-600" data-testid="button-save">
                  {updateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Salva Modifiche</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
