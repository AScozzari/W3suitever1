import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import {
  italianFiscalCodeSchema,
  italianPhoneSchema,
  italianIBANSchema,
  italianPostalCodeSchema
} from '@/lib/validation/italian-business-validation';
import { 
  User, 
  IdCard, 
  DollarSign, 
  Save,
  Briefcase,
  Home,
  Heart,
  GraduationCap
} from 'lucide-react';

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string | null;
  mode: 'create' | 'edit';
}

const genderOptions = [
  { value: 'male', label: 'Maschio' },
  { value: 'female', label: 'Femmina' },
  { value: 'other', label: 'Altro' },
  { value: 'prefer_not_to_say', label: 'Preferisco non specificare' }
];

const maritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Coniugato/a' },
  { value: 'divorced', label: 'Divorziato/a' },
  { value: 'widowed', label: 'Vedovo/a' },
  { value: 'other', label: 'Altro' }
];

const employeeFormSchema = z.object({
  // Basic Info
  firstName: z.string().min(1, "Nome obbligatorio").max(100),
  lastName: z.string().min(1, "Cognome obbligatorio").max(100),
  email: z.string().email("Email non valida").max(255),
  phone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  
  // Work Info
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  
  // Personal/Demographic
  dateOfBirth: z.string().optional().nullable(),
  fiscalCode: italianFiscalCodeSchema.optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  placeOfBirth: z.string().max(100).optional().nullable(),
  
  // Address
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().length(2, "Provincia deve essere 2 caratteri").optional().nullable().or(z.literal('')),
  postalCode: italianPostalCodeSchema.optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable(),
  
  // Emergency Contact
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactRelationship: z.string().max(100).optional().nullable(),
  emergencyContactPhone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  emergencyContactEmail: z.string().email("Email emergenza non valida").max(255).optional().nullable().or(z.literal('')),
  
  // Administrative
  employeeNumber: z.string().max(50).optional().nullable(),
  annualCost: z.number().positive("Costo deve essere positivo").optional().nullable(),
  grossAnnualSalary: z.number().positive("RAL deve essere positiva").optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  ccnl: z.string().max(255).optional().nullable(),
  managerId: z.string().optional().nullable(),
  employmentEndDate: z.string().optional().nullable(),
  probationEndDate: z.string().optional().nullable(),
  
  // Banking
  bankIban: italianIBANSchema.optional().nullable().or(z.literal('')),
  bankName: z.string().max(255).optional().nullable(),
  
  // Professional
  education: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(), // Comma-separated
  skills: z.string().optional().nullable(), // Comma-separated
  languages: z.string().optional().nullable(), // Comma-separated
  
  notes: z.string().optional().nullable(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function EmployeeFormDialog({ open, onClose, userId, mode }: EmployeeFormDialogProps) {
  const { toast } = useToast();

  // Fetch employee data (edit mode only)
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: open && mode === 'edit' && !!userId,
  });

  // Fetch dropdown data
  const { data: storesData = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const stores = Array.isArray(storesData) ? storesData : (storesData as any)?.data || [];
  const users = Array.isArray(usersData) ? usersData : (usersData as any)?.data || [];
  const employee = (employeeData as any)?.data || employeeData;

  // Initialize form
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      hireDate: '',
      contractType: '',
      storeId: null,
      dateOfBirth: '',
      fiscalCode: '',
      gender: null,
      maritalStatus: null,
      nationality: 'Italiana',
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
    },
  });

  // Update form when employee data loads (edit mode)
  useEffect(() => {
    if (employee && mode === 'edit') {
      form.reset({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        hireDate: employee.hireDate || '',
        contractType: employee.contractType || '',
        storeId: employee.storeId || null,
        dateOfBirth: employee.dateOfBirth || '',
        fiscalCode: employee.fiscalCode || '',
        gender: employee.gender || null,
        maritalStatus: employee.maritalStatus || null,
        nationality: employee.nationality || 'Italiana',
        placeOfBirth: employee.placeOfBirth || '',
        address: employee.address || '',
        city: employee.city || '',
        province: employee.province || '',
        postalCode: employee.postalCode || '',
        country: employee.country || 'Italia',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactRelationship: employee.emergencyContactRelationship || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        emergencyContactEmail: employee.emergencyContactEmail || '',
        employeeNumber: employee.employeeNumber || '',
        annualCost: employee.annualCost || null,
        grossAnnualSalary: employee.grossAnnualSalary || null,
        level: employee.level || '',
        ccnl: employee.ccnl || '',
        managerId: employee.managerId || null,
        employmentEndDate: employee.employmentEndDate || '',
        probationEndDate: employee.probationEndDate || '',
        bankIban: employee.bankIban || '',
        bankName: employee.bankName || '',
        education: employee.education || '',
        certifications: employee.certifications?.join(', ') || '',
        skills: employee.skills?.join(', ') || '',
        languages: employee.languages?.join(', ') || '',
        notes: employee.notes || '',
      });
    }
  }, [employee, mode, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const payload = {
        ...data,
        certifications: data.certifications ? data.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        languages: data.languages ? data.languages.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return apiRequest('/api/users', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      toast({
        title: "Dipendente creato",
        description: "Il nuovo dipendente è stato aggiunto con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile creare il dipendente",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const payload = {
        ...data,
        certifications: data.certifications ? data.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        languages: data.languages ? data.languages.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return apiRequest(`/api/users/${userId}`, {
        method: 'PATCH',
        body: payload,
      });
    },
    onSuccess: () => {
      toast({
        title: "Dipendente aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare il dipendente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormValues) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isLoading = employeeLoading || createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === 'create' ? 'Nuovo Dipendente' : 'Modifica Dipendente'}
          </DialogTitle>
        </DialogHeader>

        {employeeLoading && mode === 'edit' ? (
          <LoadingState message="Caricamento dati dipendente..." />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="general" data-testid="tab-general">
                    <User className="h-4 w-4 mr-1" />
                    Generale
                  </TabsTrigger>
                  <TabsTrigger value="work" data-testid="tab-work">
                    <Briefcase className="h-4 w-4 mr-1" />
                    Lavoro
                  </TabsTrigger>
                  <TabsTrigger value="demographic" data-testid="tab-demographic">
                    <IdCard className="h-4 w-4 mr-1" />
                    Anagrafiche
                  </TabsTrigger>
                  <TabsTrigger value="address" data-testid="tab-address">
                    <Home className="h-4 w-4 mr-1" />
                    Residenza
                  </TabsTrigger>
                  <TabsTrigger value="emergency" data-testid="tab-emergency">
                    <Heart className="h-4 w-4 mr-1" />
                    Emergenza
                  </TabsTrigger>
                  <TabsTrigger value="admin" data-testid="tab-admin">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Amministrative
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: GENERALE */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mario" data-testid="input-first-name" />
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
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Rossi" data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="mario.rossi@example.com" data-testid="input-email" />
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
                          <Input {...field} value={field.value || ''} placeholder="+39 333 1234567" data-testid="input-phone" />
                        </FormControl>
                        <FormDescription>Formato: +39 seguito da numero</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 2: LAVORO */}
                <TabsContent value="work" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posizione</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Es: Addetto Vendite" data-testid="input-position" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dipartimento</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Es: Vendite" data-testid="input-department" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negozio di Assegnazione</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-store">
                              <SelectValue placeholder="Seleziona negozio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {stores.map((store: any) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Assunzione</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} data-testid="input-hire-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Contratto</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Es: Tempo Indeterminato" data-testid="input-contract-type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB 3: ANAGRAFICHE */}
                <TabsContent value="demographic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="fiscalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Fiscale</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="RSSMRA80A01H501X" 
                            maxLength={16}
                            className="font-mono uppercase"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-fiscal-code" 
                          />
                        </FormControl>
                        <FormDescription>16 caratteri alfanumerici</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data di Nascita</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} data-testid="input-date-of-birth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="placeOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Luogo di Nascita</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Roma" data-testid="input-place-of-birth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genere</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Seleziona genere" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {genderOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
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
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stato Civile</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-marital-status">
                                <SelectValue placeholder="Seleziona stato civile" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {maritalStatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazionalità</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Italiana" data-testid="input-nationality" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 4: RESIDENZA */}
                <TabsContent value="address" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Via Roma 123" data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Milano" data-testid="input-city" />
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
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="MI" 
                              maxLength={2}
                              className="uppercase"
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              data-testid="input-province" 
                            />
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
                            <Input {...field} value={field.value || ''} placeholder="20100" maxLength={5} data-testid="input-postal-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paese</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Italia" data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 5: CONTATTO EMERGENZA */}
                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Contatto</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Maria Rossi" data-testid="input-emergency-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relazione</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Coniuge, Genitore, etc." data-testid="input-emergency-relationship" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono Emergenza</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="+39 333 1234567" data-testid="input-emergency-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Emergenza</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} type="email" placeholder="contatto@example.com" data-testid="input-emergency-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB 6: AMMINISTRATIVE */}
                <TabsContent value="admin" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matricola</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="EMP-001" data-testid="input-employee-number" />
                          </FormControl>
                          <FormDescription>Codice identificativo aziendale</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="managerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsabile Diretto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-manager">
                                <SelectValue placeholder="Seleziona manager" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nessuno</SelectItem>
                              {users.filter((u: any) => u.id !== userId).map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} - {user.position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="grossAnnualSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RAL (Retribuzione Annua Lorda)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              step="100"
                              min={0}
                              placeholder="30000.00"
                              data-testid="input-gross-salary" 
                            />
                          </FormControl>
                          <FormDescription>Retribuzione lorda annua in €</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annualCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Aziendale Annuo</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              step="100"
                              min={0}
                              placeholder="45000.00"
                              data-testid="input-annual-cost" 
                            />
                          </FormControl>
                          <FormDescription>Costo totale per azienda (RAL + contributi) in €</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Livello/Inquadramento</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Es: Quadro, Impiegato 3° Livello" data-testid="input-level" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ccnl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CCNL Applicato</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Es: Commercio, Telecomunicazioni" data-testid="input-ccnl" />
                          </FormControl>
                          <FormDescription>Contratto Collettivo Nazionale Lavoro</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="probationEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fine Periodo di Prova</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} data-testid="input-probation-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employmentEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scadenza Contratto</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} data-testid="input-employment-end" />
                          </FormControl>
                          <FormDescription>Solo per contratti a tempo determinato</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Coordinate Bancarie</h4>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bankIban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="IT60 X054 2811 1010 0000 0123 456" 
                                maxLength={34}
                                className="font-mono uppercase"
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                data-testid="input-bank-iban" 
                              />
                            </FormControl>
                            <FormDescription>Per accredito stipendio</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Banca</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="Es: Intesa Sanpaolo" data-testid="input-bank-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Formazione e Competenze</h4>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titolo di Studio</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="Es: Laurea in Economia" data-testid="input-education" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="certifications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificazioni</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="PMP, ITIL, AWS (separati da virgola)" data-testid="input-certifications" />
                            </FormControl>
                            <FormDescription>Inserire certificazioni separate da virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Competenze</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="Excel, CRM, Vendite (separati da virgola)" data-testid="input-skills" />
                            </FormControl>
                            <FormDescription>Inserire competenze separate da virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="languages"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lingue Parlate</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="Italiano, Inglese, Spagnolo (separati da virgola)" data-testid="input-languages" />
                            </FormControl>
                            <FormDescription>Inserire lingue separate da virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note Interne</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} rows={4} placeholder="Note riservate HR..." data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvataggio...' : mode === 'create' ? 'Crea Dipendente' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
