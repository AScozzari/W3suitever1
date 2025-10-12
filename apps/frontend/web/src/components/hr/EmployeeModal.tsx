import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScopeBadge } from '@/components/ui/scope-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar,
  Shield, Users, MapPin, Clock, DollarSign, FileText,
  Heart, Wallet, GraduationCap, Languages, Award,
  Home, CreditCard, UserCircle2, IdCard, Edit, Save, X
} from 'lucide-react';
import {
  italianPhoneSchema,
  ibanSchema,
  italianTaxCodeSchema
} from '@/lib/validation/italian-business-validation';

const employeeUpdateSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto").max(100),
  lastName: z.string().min(1, "Cognome richiesto").max(100),
  email: z.string().email("Email non valida").max(255),
  phone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  contractType: z.string().max(50).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  fiscalCode: italianTaxCodeSchema.optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  placeOfBirth: z.string().max(100).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().length(2, "Provincia deve essere 2 caratteri").optional().nullable().or(z.literal('')),
  postalCode: z.string().regex(/^\d{5}$/, "CAP deve essere 5 cifre").optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactRelationship: z.string().max(100).optional().nullable(),
  emergencyContactPhone: italianPhoneSchema.optional().nullable().or(z.literal('')),
  emergencyContactEmail: z.string().email("Email emergenza non valida").max(255).optional().nullable().or(z.literal('')),
  employeeNumber: z.string().max(50).optional().nullable(),
  annualCost: z.coerce.number().positive("Costo deve essere positivo").optional().nullable(),
  grossAnnualSalary: z.coerce.number().positive("RAL deve essere positiva").optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  ccnl: z.string().max(255).optional().nullable(),
  managerId: z.string().optional().nullable(),
  employmentEndDate: z.string().optional().nullable(),
  probationEndDate: z.string().optional().nullable(),
  bankIban: ibanSchema.optional().nullable().or(z.literal('')),
  bankName: z.string().max(255).optional().nullable(),
  education: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  languages: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type EmployeeUpdateForm = z.infer<typeof employeeUpdateSchema>;

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
  hireDate?: string;
  contractType?: string;
  dateOfBirth?: string;
  fiscalCode?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
  nationality?: string;
  placeOfBirth?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  employeeNumber?: string;
  annualCost?: number;
  grossAnnualSalary?: number;
  level?: string;
  ccnl?: string;
  managerId?: string;
  employmentEndDate?: string;
  probationEndDate?: string;
  bankIban?: string;
  bankName?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  languages?: string[];
  notes?: string;
}

interface Assignment {
  userId: string;
  roleId: string;
  roleName: string;
  roleDescription?: string;
  scopeType: 'tenant' | 'legal_entity' | 'store';
  scopeId: string;
  scopeDetails?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface EmployeeModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeModal({ userId, open, onOpenChange }: EmployeeModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  // Fetch user details
  const { data: userData, isLoading: userLoading, refetch } = useQuery<{ success: boolean; data: Employee }>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user details');
      return response.json();
    },
    enabled: !!userId && open
  });

  const user = userData?.data;

  // Fetch assignments
  const { data: assignmentsData } = useQuery<{ success: boolean; data: Assignment[] }>({
    queryKey: [`/api/users/${userId}/assignments`],
    enabled: !!userId && open
  });

  const assignments = assignmentsData?.data || [];

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
  useEffect(() => {
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

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
    }
  }, [open]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeUpdateForm) => {
      const convertToArray = (value: string | null | undefined): string[] | undefined => {
        if (!value || value.trim() === '') return undefined;
        return value.split(',').map(s => s.trim()).filter(Boolean);
      };

      const payload = {
        ...data,
        certifications: convertToArray(data.certifications),
        skills: convertToArray(data.skills),
        languages: convertToArray(data.languages),
        annualCost: data.annualCost ?? undefined,
        grossAnnualSalary: data.grossAnnualSalary ?? undefined,
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
      refetch();
      toast({
        title: "Successo",
        description: "Dati dipendente aggiornati con successo",
      });
      setIsEditMode(false);
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

  const handleCancel = () => {
    if (user) {
      form.reset();
    }
    setIsEditMode(false);
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {userLoading ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <Avatar className="h-14 w-14">
                  <AvatarImage src={user?.avatarUrl} alt={`${user?.firstName || ''} ${user?.lastName || ''}`} />
                  <AvatarFallback className="bg-gray-100 text-gray-700 font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {userLoading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  <>
                    <h2 className="text-xl font-bold">
                      {user?.firstName || 'Utente'} {user?.lastName || ''}
                    </h2>
                    {user?.position && (
                      <p className="text-sm text-gray-600">{user.position} {user.department && `• ${user.department}`}</p>
                    )}
                    {user?.employeeNumber && (
                      <p className="text-xs text-gray-500 font-mono">Matricola: {user.employeeNumber}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {!isEditMode && !userLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-2"
                data-testid="button-edit-employee"
              >
                <Edit className="h-4 w-4" />
                Modifica
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {userLoading ? (
          <div className="flex items-center justify-center p-12">
            <Skeleton className="h-64 w-full" />
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
                    {isEditMode ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
                        <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefono" value={user?.phone} />
                        <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Posizione" value={user?.position} />
                        <InfoRow icon={<Building2 className="h-4 w-4" />} label="Dipartimento" value={user?.department} />
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Data Assunzione" value={user?.hireDate ? new Date(user.hireDate).toLocaleDateString('it-IT') : undefined} />
                        <InfoRow icon={<FileText className="h-4 w-4" />} label="Tipo Contratto" value={user?.contractType} />
                        {assignments.length > 0 && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-sm">Ruoli Assegnati ({assignments.length})</span>
                            </div>
                            <div className="space-y-2">
                              {assignments.map((assignment, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm font-medium">{assignment.roleName}</span>
                                  <ScopeBadge scopeType={assignment.scopeType} scopeName={assignment.scopeDetails?.name || assignment.scopeType} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Demographics */}
                  <TabsContent value="demographics" className="space-y-4 mt-4">
                    {isEditMode ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Data di Nascita" value={user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('it-IT') : undefined} />
                        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Luogo di Nascita" value={user?.placeOfBirth} />
                        <InfoRow icon={<IdCard className="h-4 w-4" />} label="Codice Fiscale" value={user?.fiscalCode} />
                        <InfoRow icon={<UserCircle2 className="h-4 w-4" />} label="Genere" value={user?.gender === 'male' ? 'Uomo' : user?.gender === 'female' ? 'Donna' : user?.gender === 'other' ? 'Altro' : user?.gender === 'prefer_not_to_say' ? 'Preferisco non dirlo' : undefined} />
                        <InfoRow icon={<Heart className="h-4 w-4" />} label="Stato Civile" value={user?.maritalStatus === 'single' ? 'Celibe/Nubile' : user?.maritalStatus === 'married' ? 'Coniugato/a' : user?.maritalStatus === 'divorced' ? 'Divorziato/a' : user?.maritalStatus === 'widowed' ? 'Vedovo/a' : user?.maritalStatus} />
                        <InfoRow icon={<Users className="h-4 w-4" />} label="Nazionalità" value={user?.nationality} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Address */}
                  <TabsContent value="address" className="space-y-4 mt-4">
                    {isEditMode ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<Home className="h-4 w-4" />} label="Indirizzo" value={user?.address} />
                        <InfoRow icon={<Building2 className="h-4 w-4" />} label="Città" value={user?.city} />
                        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Provincia" value={user?.province} />
                        <InfoRow icon={<Mail className="h-4 w-4" />} label="CAP" value={user?.postalCode} />
                        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Paese" value={user?.country} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Emergency */}
                  <TabsContent value="emergency" className="space-y-4 mt-4">
                    {isEditMode ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<User className="h-4 w-4" />} label="Nome Contatto" value={user?.emergencyContactName} />
                        <InfoRow icon={<Heart className="h-4 w-4" />} label="Relazione" value={user?.emergencyContactRelationship} />
                        <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefono" value={user?.emergencyContactPhone} />
                        <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.emergencyContactEmail} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Administrative */}
                  <TabsContent value="admin" className="space-y-4 mt-4">
                    {isEditMode ? (
                      <>
                        <FormField control={form.control} name="employeeNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Matricola</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} data-testid="input-employee-number" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="annualCost" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Costo Annuo (€)</FormLabel>
                              <FormControl><Input type="number" {...field} value={field.value || ''} data-testid="input-annual-cost" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="grossAnnualSalary" render={({ field }) => (
                            <FormItem>
                              <FormLabel>RAL (€)</FormLabel>
                              <FormControl><Input type="number" {...field} value={field.value || ''} data-testid="input-gross-salary" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="level" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Livello</FormLabel>
                              <FormControl><Input {...field} value={field.value || ''} data-testid="input-level" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="ccnl" render={({ field }) => (
                            <FormItem>
                              <FormLabel>CCNL</FormLabel>
                              <FormControl><Input {...field} value={field.value || ''} placeholder="Commercio, Metalmeccanico, ecc." data-testid="input-ccnl" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="employmentEndDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fine Rapporto</FormLabel>
                              <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-end-date" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="probationEndDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fine Periodo Prova</FormLabel>
                              <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-probation-end" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="bankIban" render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl><Input {...field} value={field.value || ''} placeholder="IT60X0542811101000000123456" data-testid="input-iban" /></FormControl>
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<IdCard className="h-4 w-4" />} label="Matricola" value={user?.employeeNumber} />
                        <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Costo Annuo" value={user?.annualCost ? `€ ${user.annualCost.toLocaleString()}` : undefined} />
                        <InfoRow icon={<DollarSign className="h-4 w-4" />} label="RAL" value={user?.grossAnnualSalary ? `€ ${user.grossAnnualSalary.toLocaleString()}` : undefined} />
                        <InfoRow icon={<Award className="h-4 w-4" />} label="Livello" value={user?.level} />
                        <InfoRow icon={<FileText className="h-4 w-4" />} label="CCNL" value={user?.ccnl} />
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Fine Rapporto" value={user?.employmentEndDate ? new Date(user.employmentEndDate).toLocaleDateString('it-IT') : undefined} />
                        <InfoRow icon={<Clock className="h-4 w-4" />} label="Fine Periodo Prova" value={user?.probationEndDate ? new Date(user.probationEndDate).toLocaleDateString('it-IT') : undefined} />
                        <InfoRow icon={<CreditCard className="h-4 w-4" />} label="IBAN" value={user?.bankIban} />
                        <InfoRow icon={<Wallet className="h-4 w-4" />} label="Banca" value={user?.bankName} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Professional */}
                  <TabsContent value="professional" className="space-y-4 mt-4">
                    {isEditMode ? (
                      <>
                        <FormField control={form.control} name="education" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Istruzione</FormLabel>
                            <FormControl><Textarea {...field} value={field.value || ''} rows={3} placeholder="Diploma, Laurea, Master..." data-testid="input-education" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="certifications" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificazioni</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} placeholder="PMP, ITIL, ecc. (separati da virgola)" data-testid="input-certifications" /></FormControl>
                            <FormDescription>Separare con virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="skills" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Competenze</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} placeholder="Excel, SAP, ecc. (separati da virgola)" data-testid="input-skills" /></FormControl>
                            <FormDescription>Separare con virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="languages" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lingue</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} placeholder="Italiano, Inglese, ecc. (separati da virgola)" data-testid="input-languages" /></FormControl>
                            <FormDescription>Separare con virgola</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl><Textarea {...field} value={field.value || ''} rows={4} data-testid="input-notes" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Istruzione" value={user?.education} />
                        {user?.certifications && user.certifications.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="text-gray-400 mt-0.5"><Award className="h-4 w-4" /></div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Certificazioni</p>
                              <div className="flex flex-wrap gap-1">
                                {user.certifications.map((cert, idx) => (
                                  <Badge key={idx} variant="secondary">{cert}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {user?.skills && user.skills.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="text-gray-400 mt-0.5"><Briefcase className="h-4 w-4" /></div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Competenze</p>
                              <div className="flex flex-wrap gap-1">
                                {user.skills.map((skill, idx) => (
                                  <Badge key={idx} variant="secondary">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {user?.languages && user.languages.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="text-gray-400 mt-0.5"><Languages className="h-4 w-4" /></div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lingue</p>
                              <div className="flex flex-wrap gap-1">
                                {user.languages.map((lang, idx) => (
                                  <Badge key={idx} variant="secondary">{lang}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <InfoRow icon={<FileText className="h-4 w-4" />} label="Note" value={user?.notes} />
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Footer Actions */}
              {isEditMode && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={updateMutation.isPending} data-testid="button-cancel">
                    <X className="h-4 w-4 mr-2" />
                    Annulla
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="button-save">
                    {updateMutation.isPending ? (
                      <>Salvataggio...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Salva Modifiche</>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper component for read-only info rows
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}
