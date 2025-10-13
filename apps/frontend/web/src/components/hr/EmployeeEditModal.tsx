import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  MapPin, 
  Store, 
  Shield, 
  Users, 
  Briefcase,
  Loader2,
  Save
} from 'lucide-react';

interface EmployeeEditModalProps {
  open: boolean;
  onClose: () => void;
  employee: any; // User type from backend
}

// ==================== ITALIAN BUSINESS VALIDATION SCHEMA ====================
const employeeFormSchema = z.object({
  // Tab 1: Generale
  firstName: z.string().min(1, "Nome obbligatorio").max(100),
  lastName: z.string().min(1, "Cognome obbligatorio").max(100),
  email: z.string().email("Email non valida"),
  phone: z.string()
    .regex(/^(\+39)?[\s]?([0-9]{3})[\s]?([0-9]{6,7})$/, "Telefono non valido (formato italiano)")
    .optional()
    .or(z.literal('')),
  role: z.string().optional(),
  profileImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().optional(),
  
  // Tab 2: Anagrafica + Indirizzo
  fiscalCode: z.string()
    .regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, "Codice fiscale non valido (formato: RSSMRA80A01H501Z)")
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  
  // Indirizzo completo
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().length(2, "Provincia deve essere 2 caratteri (es: MI)").optional().or(z.literal('')),
  postalCode: z.string()
    .regex(/^\d{5}$/, "CAP non valido (5 cifre)")
    .optional()
    .or(z.literal('')),
  country: z.string().optional(),
  
  // Contatto emergenza
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string()
    .regex(/^(\+39)?[\s]?([0-9]{3})[\s]?([0-9]{6,7})$/, "Telefono non valido")
    .optional()
    .or(z.literal('')),
  emergencyContactRelationship: z.string().optional(),
  
  // Tab 3: Punti Vendita
  storeId: z.string().uuid().optional().nullable().or(z.literal('')),
  
  // Tab 4: Permessi (TODO: next task)
  // roles: z.array(z.string())
  
  // Tab 5: Teams (TODO: next task)
  // teams: z.array(z.string())
  
  // Tab 6: Amministrativi
  grossAnnualSalary: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive("RAL deve essere un valore positivo").optional()
  ),
  bankIban: z.string()
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, "IBAN non valido")
    .optional()
    .or(z.literal('')),
  hireDate: z.string().optional().nullable().or(z.literal('')),
  probationEndDate: z.string().optional().nullable().or(z.literal('')),
  offboardingDate: z.string().optional().nullable().or(z.literal('')),
  level: z.string().optional(),
  contractType: z.string().optional(),
  inpsPosition: z.string().optional(),
  inailPosition: z.string().optional(),
  education: z.string().optional(),
  idDocumentType: z.string().optional(),
  idDocumentNumber: z.string().optional(),
  idDocumentExpiryDate: z.string().optional().nullable().or(z.literal('')),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function EmployeeEditModal({ open, onClose, employee }: EmployeeEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load stores for Tab 3 (Punti Vendita)
  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000,
  });

  // Load roles for Tab 1 (Generale - role select)
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ['/api/roles'],
    staleTime: 5 * 60 * 1000,
  });

  // Initialize form with default values from employee
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      profileImageUrl: '',
      fiscalCode: '',
      dateOfBirth: '',
      gender: undefined,
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Italia',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      storeId: null,
      grossAnnualSalary: null,
      bankIban: '',
      hireDate: '',
      probationEndDate: '',
      offboardingDate: '',
      level: '',
      contractType: '',
      inpsPosition: '',
      inailPosition: '',
      education: '',
      idDocumentType: '',
      idDocumentNumber: '',
      idDocumentExpiryDate: '',
    }
  });

  // Load employee data when modal opens
  useEffect(() => {
    if (open && employee) {
      form.reset({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || '',
        profileImageUrl: employee.profileImageUrl || '',
        fiscalCode: employee.fiscalCode || '',
        dateOfBirth: employee.dateOfBirth || '',
        gender: employee.gender,
        address: employee.address || '',
        city: employee.city || '',
        province: employee.province || '',
        postalCode: employee.postalCode || '',
        country: employee.country || 'Italia',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        emergencyContactRelationship: employee.emergencyContactRelationship || '',
        storeId: employee.storeId,
        grossAnnualSalary: employee.grossAnnualSalary,
        bankIban: employee.bankIban || '',
        hireDate: employee.hireDate || '',
        probationEndDate: employee.probationEndDate || '',
        offboardingDate: employee.offboardingDate || '',
        level: employee.level || '',
        contractType: employee.contractType || '',
        inpsPosition: employee.inpsPosition || '',
        inailPosition: employee.inailPosition || '',
        education: employee.education || '',
        idDocumentType: employee.idDocumentType || '',
        idDocumentNumber: employee.idDocumentNumber || '',
        idDocumentExpiryDate: employee.idDocumentExpiryDate || '',
      });
    }
  }, [open, employee, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      return await apiRequest(`/api/users/${employee.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Dipendente aggiornato",
        description: "I dati del dipendente sono stati salvati con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${employee.id}`] });
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
    updateMutation.mutate(data);
  };

  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Modifica Dipendente: {employee?.firstName} {employee?.lastName}
          </DialogTitle>
          <DialogDescription>
            Aggiorna i dati del dipendente con campi amministrativi compliant CCNL italiano
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="generale" className="w-full">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="generale" data-testid="tab-generale">
                  <User className="h-4 w-4 mr-1" />
                  Generale
                </TabsTrigger>
                <TabsTrigger value="anagrafica" data-testid="tab-anagrafica">
                  <MapPin className="h-4 w-4 mr-1" />
                  Anagrafica
                </TabsTrigger>
                <TabsTrigger value="punti-vendita" data-testid="tab-punti-vendita">
                  <Store className="h-4 w-4 mr-1" />
                  Negozi
                </TabsTrigger>
                <TabsTrigger value="permessi" data-testid="tab-permessi">
                  <Shield className="h-4 w-4 mr-1" />
                  Permessi
                </TabsTrigger>
                <TabsTrigger value="teams" data-testid="tab-teams">
                  <Users className="h-4 w-4 mr-1" />
                  Teams
                </TabsTrigger>
                <TabsTrigger value="amministrativi" data-testid="tab-amministrativi">
                  <Briefcase className="h-4 w-4 mr-1" />
                  HR/Amm.
                </TabsTrigger>
              </TabsList>

              {/* ==================== TAB 1: GENERALE ==================== */}
              <TabsContent value="generale" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Mario" 
                            data-testid="input-firstName"
                          />
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
                          <Input 
                            {...field} 
                            placeholder="Rossi" 
                            data-testid="input-lastName"
                          />
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
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="mario.rossi@windtre.it" 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="+39 333 1234567" 
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Seleziona ruolo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.filter((role: any) => role.id && role.id !== '').map((role: any) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
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
                  name="profileImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Avatar</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="https://..." 
                          data-testid="input-profileImageUrl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Inserisci note o annotazioni sul dipendente..." 
                          rows={4}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ==================== TAB 2: ANAGRAFICA + INDIRIZZO ==================== */}
              <TabsContent value="anagrafica" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                            placeholder="RSSMRA80A01H501Z" 
                            maxLength={16}
                            data-testid="input-fiscalCode"
                            style={{ textTransform: 'uppercase' }}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data di Nascita</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="date" 
                            data-testid="input-dateOfBirth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sesso</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Seleziona sesso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Maschio</SelectItem>
                          <SelectItem value="female">Femmina</SelectItem>
                          <SelectItem value="other">Altro</SelectItem>
                          <SelectItem value="prefer_not_to_say">Preferisco non specificare</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">Indirizzo Residenza</h3>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Via e Civico</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="Via Roma, 123" 
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="Milano" 
                              data-testid="input-city"
                            />
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
                              data-testid="input-province"
                              style={{ textTransform: 'uppercase' }}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="20100" 
                              maxLength={5}
                              data-testid="input-postalCode"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">Contatto di Emergenza</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="Laura Rossi" 
                              data-testid="input-emergencyContactName"
                            />
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
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="Coniuge" 
                              data-testid="input-emergencyContactRelationship"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="+39 333 9876543" 
                            data-testid="input-emergencyContactPhone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ==================== TAB 3: PUNTI VENDITA ==================== */}
              <TabsContent value="punti-vendita" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Assegnazione Punto Vendita</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punto Vendita Principale</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-storeId">
                            <SelectValue placeholder="Nessun punto vendita assegnato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.filter((store: any) => store.id && store.id !== '').map((store: any) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} {store.address ? `- ${store.address}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Nota:</strong> La gestione multi-store e gli assignment avanzati saranno disponibili nella prossima versione.
                  </p>
                </div>
              </TabsContent>

              {/* ==================== TAB 4: PERMESSI (COMING SOON) ==================== */}
              <TabsContent value="permessi" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Gestione Permessi RBAC</h3>
                </div>
                
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Funzionalità in Sviluppo
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    La gestione avanzata dei permessi RBAC (ruoli, scope, extra permissions) 
                    sarà disponibile nella prossima release. Per ora, usa la sezione Impostazioni → Ruoli.
                  </p>
                </div>
              </TabsContent>

              {/* ==================== TAB 5: TEAMS (COMING SOON) ==================== */}
              <TabsContent value="teams" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Team Membership</h3>
                </div>
                
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Funzionalità in Sviluppo
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    La gestione dei team (assegnazione membri, supervisori, workflow routing) 
                    sarà disponibile nella prossima release.
                  </p>
                </div>
              </TabsContent>

              {/* ==================== TAB 6: AMMINISTRATIVI ==================== */}
              <TabsContent value="amministrativi" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grossAnnualSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RAL (€/anno)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="number" 
                            placeholder="30000" 
                            data-testid="input-grossAnnualSalary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            placeholder="IT60X0542811101000000123456" 
                            maxLength={34}
                            data-testid="input-bankIban"
                            style={{ textTransform: 'uppercase' }}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Assunzione</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="date" 
                            data-testid="input-hireDate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="probationEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fine Periodo Prova</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="date" 
                            data-testid="input-probationEndDate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offboardingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Offboarding</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="date" 
                            data-testid="input-offboardingDate"
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
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Livello CCNL</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-level">
                              <SelectValue placeholder="Seleziona livello" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quadro">Quadro</SelectItem>
                            <SelectItem value="livello_1">1° Livello</SelectItem>
                            <SelectItem value="livello_2">2° Livello</SelectItem>
                            <SelectItem value="livello_3">3° Livello</SelectItem>
                            <SelectItem value="livello_4">4° Livello</SelectItem>
                            <SelectItem value="livello_5">5° Livello</SelectItem>
                            <SelectItem value="livello_6">6° Livello</SelectItem>
                            <SelectItem value="livello_7">7° Livello</SelectItem>
                            <SelectItem value="operatore_vendita_a">Operatore Vendita A</SelectItem>
                            <SelectItem value="operatore_vendita_b">Operatore Vendita B</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-contractType">
                              <SelectValue placeholder="Seleziona contratto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tempo_indeterminato">Tempo Indeterminato</SelectItem>
                            <SelectItem value="tempo_determinato">Tempo Determinato</SelectItem>
                            <SelectItem value="apprendistato_professionalizzante">Apprendistato Professionalizzante</SelectItem>
                            <SelectItem value="apprendistato_qualifica">Apprendistato Qualifica</SelectItem>
                            <SelectItem value="parttime_verticale">Part-time Verticale</SelectItem>
                            <SelectItem value="parttime_orizzontale">Part-time Orizzontale</SelectItem>
                            <SelectItem value="parttime_misto">Part-time Misto</SelectItem>
                            <SelectItem value="stage_tirocinio">Stage/Tirocinio</SelectItem>
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
                    name="inpsPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matricola INPS</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="123456789" 
                            data-testid="input-inpsPosition"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inailPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posizione INAIL</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="987654321" 
                            data-testid="input-inailPosition"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo di Studio</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Laurea in Economia" 
                          data-testid="input-education"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">Documento di Identità</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="idDocumentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Documento</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-idDocumentType">
                                <SelectValue placeholder="Seleziona tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                              <SelectItem value="passaporto">Passaporto</SelectItem>
                              <SelectItem value="patente">Patente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="idDocumentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero Documento</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="CA12345XY" 
                              data-testid="input-idDocumentNumber"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="idDocumentExpiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scadenza</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              type="date" 
                              data-testid="input-idDocumentExpiryDate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
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
                style={{ backgroundColor: 'hsl(var(--brand-orange))' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salva Modifiche
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
