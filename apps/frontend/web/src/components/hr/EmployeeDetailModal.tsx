import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScopeBadge } from '@/components/ui/scope-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar,
  Shield, Users, MapPin, Clock, DollarSign, FileText,
  Heart, Wallet, GraduationCap, Languages, Award,
  Home, CreditCard, UserCircle2, IdCard, Edit
} from 'lucide-react';

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
  createdAt?: string;
  hireDate?: string;
  contractType?: string;
  
  // Personal/Demographic
  dateOfBirth?: string;
  fiscalCode?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
  nationality?: string;
  placeOfBirth?: string;
  
  // Address
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  
  // Administrative
  employeeNumber?: string;
  annualCost?: number;
  grossAnnualSalary?: number;
  level?: string;
  ccnl?: string;
  managerId?: string;
  employmentEndDate?: string;
  probationEndDate?: string;
  
  // Banking
  bankIban?: string;
  bankName?: string;
  
  // Professional
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
  expiresAt?: string;
  createdAt?: string;
}

interface Permission {
  resource: string;
  action: string;
  effect: string;
}

interface Team {
  id: string;
  name: string;
  department?: string;
  memberIds?: string[];
}

interface EmployeeDetailModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: string;
  onEdit?: (userId: string) => void;
}

export function EmployeeDetailModal({ 
  userId, 
  open, 
  onOpenChange,
  currentUserRole,
  onEdit
}: EmployeeDetailModalProps) {
  
  // Fetch user details
  const { data: userData, isLoading: userLoading } = useQuery<{ success: boolean; data: Employee }>({
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

  // Fetch user assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery<{ success: boolean; data: Assignment[] }>({
    queryKey: [`/api/users/${userId}/assignments`],
    enabled: !!userId && open
  });

  // Fetch user permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery<{ success: boolean; data: Permission[] }>({
    queryKey: [`/api/users/${userId}/permissions`],
    enabled: !!userId && open && currentUserRole === 'admin'
  });

  // Fetch teams
  const { data: teamsData } = useQuery<{ success: boolean; data: Team[] }>({
    queryKey: ['/api/teams'],
    enabled: !!userId && open
  });

  // Fetch manager details
  const { data: managerData } = useQuery<{ success: boolean; data: Employee }>({
    queryKey: ['/api/users', userData?.data?.managerId],
    enabled: !!userData?.data?.managerId && open
  });

  const user = userData?.data;
  const assignments = assignmentsData?.data || [];
  const permissions = permissionsData?.data || [];
  const teams = teamsData?.data || [];
  const manager = managerData?.data;

  // Get user's teams
  const userTeams = teams.filter(team => team.memberIds?.includes(userId || ''));

  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const isAdmin = currentUserRole === 'admin';

  if (!userId) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getGenderLabel = (gender?: string) => {
    const labels: Record<string, string> = {
      male: 'Maschio',
      female: 'Femmina',
      other: 'Altro',
      prefer_not_to_say: 'Preferisco non specificare'
    };
    return gender ? labels[gender] || gender : '-';
  };

  const getMaritalStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      single: 'Single',
      married: 'Coniugato/a',
      divorced: 'Divorziato/a',
      widowed: 'Vedovo/a',
      other: 'Altro'
    };
    return status ? labels[status] || status : '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-lg">
                  {userLoading ? (
                    <Skeleton className="h-6 w-48" />
                  ) : (
                    `${user?.firstName || 'Utente'} ${user?.lastName || ''}`
                  )}
                </div>
                {!userLoading && user?.position && (
                  <div className="text-sm text-muted-foreground font-normal">
                    {user.position} {user.department && `• ${user.department}`}
                  </div>
                )}
                {!userLoading && user?.employeeNumber && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Matricola: {user.employeeNumber}
                  </div>
                )}
              </div>
            </div>
            {onEdit && userId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(userId)}
                className="gap-2"
                data-testid="button-edit-employee"
              >
                <Edit className="h-4 w-4" />
                Modifica
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" data-testid="tab-general">
              <User className="h-4 w-4 mr-1" />
              Generali
            </TabsTrigger>
            <TabsTrigger value="demographic" data-testid="tab-demographic">
              <IdCard className="h-4 w-4 mr-1" />
              Anagrafiche
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" data-testid="tab-admin">
                <DollarSign className="h-4 w-4 mr-1" />
                Amministrative
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="scope" data-testid="tab-scope">
                <Shield className="h-4 w-4 mr-1" />
                Scope & RBAC
              </TabsTrigger>
            )}
            <TabsTrigger value="team" data-testid="tab-team">
              <Users className="h-4 w-4 mr-1" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: INFO GENERALI */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {userLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Contact Info */}
                  <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Informazioni di Contatto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium" data-testid="text-email">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Telefono</p>
                          <p className="font-medium" data-testid="text-phone">{user?.phone || '-'}</p>
                        </div>
                      </div>
                      {user?.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Indirizzo</p>
                            <p className="font-medium" data-testid="text-address">
                              {user.address}
                              {(user.city || user.postalCode) && (
                                <><br />{user.postalCode} {user.city} {user.province ? `(${user.province})` : ''}</>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Work Info */}
                  <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Informazioni Lavorative</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Posizione</p>
                          <p className="font-medium" data-testid="text-position">{user?.position || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Dipartimento</p>
                          <p className="font-medium" data-testid="text-department">{user?.department || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Data Assunzione</p>
                          <p className="font-medium" data-testid="text-hire-date">{formatDate(user?.hireDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Tipo Contratto</p>
                          <p className="font-medium" data-testid="text-contract-type">{user?.contractType || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Emergency Contact */}
                  {(user?.emergencyContactName || user?.emergencyContactPhone) && (
                    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-orange-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Heart className="h-5 w-5 text-orange-600" />
                          Contatto di Emergenza
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nome</p>
                          <p className="font-medium" data-testid="text-emergency-name">
                            {user.emergencyContactName || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Relazione</p>
                          <p className="font-medium" data-testid="text-emergency-relationship">
                            {user.emergencyContactRelationship || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Telefono</p>
                          <p className="font-medium" data-testid="text-emergency-phone">
                            {user.emergencyContactPhone || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium text-sm" data-testid="text-emergency-email">
                            {user.emergencyContactEmail || '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB 2: ANAGRAFICHE */}
          <TabsContent value="demographic" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {userLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-6">
                  <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Dati Personali</CardTitle>
                      <CardDescription>Informazioni anagrafiche e demografiche</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Codice Fiscale</p>
                        <p className="font-mono font-medium" data-testid="text-fiscal-code">
                          {user?.fiscalCode || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data di Nascita</p>
                        <p className="font-medium" data-testid="text-dob">
                          {formatDate(user?.dateOfBirth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Luogo di Nascita</p>
                        <p className="font-medium" data-testid="text-place-birth">
                          {user?.placeOfBirth || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nazionalità</p>
                        <p className="font-medium" data-testid="text-nationality">
                          {user?.nationality || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Genere</p>
                        <p className="font-medium" data-testid="text-gender">
                          {getGenderLabel(user?.gender)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Stato Civile</p>
                        <p className="font-medium" data-testid="text-marital-status">
                          {getMaritalStatusLabel(user?.maritalStatus)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Formazione e Competenze
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Titolo di Studio</p>
                        <p className="font-medium" data-testid="text-education">{user?.education || '-'}</p>
                      </div>
                      
                      {user?.certifications && user.certifications.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Certificazioni</p>
                          <div className="flex flex-wrap gap-2">
                            {user.certifications.map((cert, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {user?.skills && user.skills.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Competenze</p>
                          <div className="flex flex-wrap gap-2">
                            {user.skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {user?.languages && user.languages.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Lingue</p>
                          <div className="flex flex-wrap gap-2">
                            {user.languages.map((lang, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Languages className="h-3 w-3 mr-1" />
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB 3: AMMINISTRATIVE (Admin Only) */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {userLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-6">
                    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          Retribuzione e Costi
                        </CardTitle>
                        <CardDescription>Informazioni economiche riservate</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">RAL (Retribuzione Annua Lorda)</p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-salary">
                            {formatCurrency(user?.grossAnnualSalary)}
                          </p>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Costo Aziendale Annuo</p>
                          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400" data-testid="text-annual-cost">
                            {formatCurrency(user?.annualCost)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Inquadramento Contrattuale</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Livello</p>
                          <p className="font-medium" data-testid="text-level">{user?.level || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CCNL Applicato</p>
                          <p className="font-medium" data-testid="text-ccnl">{user?.ccnl || '-'}</p>
                        </div>
                        {manager && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground mb-2">Responsabile Diretto</p>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={manager.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {`${manager.firstName?.[0] || ''}${manager.lastName?.[0] || ''}`}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm" data-testid="text-manager-name">
                                  {manager.firstName} {manager.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{manager.position}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {user?.probationEndDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Fine Periodo di Prova</p>
                            <p className="font-medium" data-testid="text-probation-end">
                              {formatDate(user.probationEndDate)}
                            </p>
                          </div>
                        )}
                        {user?.employmentEndDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Scadenza Contratto</p>
                            <p className="font-medium text-orange-600" data-testid="text-employment-end">
                              {formatDate(user.employmentEndDate)}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {(user?.bankIban || user?.bankName) && (
                      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Informazioni Bancarie
                          </CardTitle>
                          <CardDescription>Coordinate per accredito stipendio</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">IBAN</p>
                            <p className="font-mono text-sm font-medium" data-testid="text-iban">
                              {user.bankIban || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Banca</p>
                            <p className="font-medium" data-testid="text-bank-name">{user.bankName || '-'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {user?.notes && (
                      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Note Interne</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">{user.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {/* TAB 4: SCOPE & PERMESSI (Admin Only) */}
          {isAdmin && (
            <TabsContent value="scope" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {assignmentsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Assegnazioni Ruolo e Scope</CardTitle>
                        <CardDescription>
                          Ruoli e ambiti di accesso assegnati all'utente
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {assignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nessuna assegnazione configurata</p>
                        ) : (
                          assignments.map((assignment, idx) => (
                            <div 
                              key={`${assignment.roleId}-${assignment.scopeId}-${idx}`}
                              className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                              data-testid={`assignment-${idx}`}
                            >
                              <Shield className="h-5 w-5 mt-0.5 text-orange-600" />
                              <div className="flex-1 space-y-2">
                                <div>
                                  <h4 className="font-semibold">{assignment.roleName}</h4>
                                  {assignment.roleDescription && (
                                    <p className="text-sm text-muted-foreground">{assignment.roleDescription}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <ScopeBadge 
                                    scopeType={assignment.scopeType} 
                                    scopeName={assignment.scopeDetails?.name}
                                  />
                                  {assignment.scopeDetails?.code && (
                                    <Badge variant="outline" className="text-xs">
                                      {assignment.scopeDetails.code}
                                    </Badge>
                                  )}
                                </div>
                                {assignment.expiresAt && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    Scade: {formatDate(assignment.expiresAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {permissions.length > 0 && (
                      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Permessi Effettivi</CardTitle>
                          <CardDescription>
                            Permessi calcolati dai ruoli assegnati
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {permissions.map((perm, idx) => (
                              <div 
                                key={`${perm.resource}-${perm.action}-${idx}`}
                                className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800/50"
                                data-testid={`permission-${idx}`}
                              >
                                <Badge variant={perm.effect === 'allow' ? 'default' : 'destructive'} className="text-xs">
                                  {perm.action}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{perm.resource}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {/* TAB 5: TEAM & GERARCHIE */}
          <TabsContent value="team" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Team di Appartenenza</CardTitle>
                  <CardDescription>
                    Team e gruppi di lavoro assegnati
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userTeams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun team assegnato</p>
                  ) : (
                    userTeams.map((team) => (
                      <div 
                        key={team.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        data-testid={`team-${team.id}`}
                      >
                        <Users className="h-5 w-5 mt-0.5 text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{team.name}</h4>
                          {team.department && (
                            <p className="text-sm text-muted-foreground">{team.department}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {team.memberIds?.length || 0} membri
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
