import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScopeBadge } from '@/components/ui/scope-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar,
  Shield, Users, MapPin, Clock
} from 'lucide-react';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
  createdAt?: string;
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
}

export function EmployeeDetailModal({ 
  userId, 
  open, 
  onOpenChange,
  currentUserRole 
}: EmployeeDetailModalProps) {
  
  // Fetch user details
  const { data: userData, isLoading: userLoading } = useQuery<{ success: boolean; data: User }>({
    queryKey: ['/api/users', userId],
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

  const user = userData?.data;
  const assignments = assignmentsData?.data || [];
  const permissions = permissionsData?.data || [];
  const teams = teamsData?.data || [];

  // Get user's teams
  const userTeams = teams.filter(team => team.memberIds?.includes(userId || ''));

  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const isAdmin = currentUserRole === 'admin';

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">
                {userLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  `${user?.firstName || 'Utente'} ${user?.lastName || ''}`
                )}
              </div>
              {!userLoading && user?.position && (
                <div className="text-sm text-muted-foreground font-normal">
                  {user.position}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" data-testid="tab-info">
              <User className="h-4 w-4 mr-2" />
              Info Generali
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="scope" data-testid="tab-scope">
                <Shield className="h-4 w-4 mr-2" />
                Scope & Permessi
              </TabsTrigger>
            )}
            <TabsTrigger value="team" data-testid="tab-team">
              <Users className="h-4 w-4 mr-2" />
              Team & Gerarchie
            </TabsTrigger>
          </TabsList>

          {/* Tab: Info Generali */}
          <TabsContent value="info" className="space-y-4 mt-4">
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
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium" data-testid="text-info-email">{user?.email}</p>
                        </div>
                      </div>
                      {user?.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Telefono</p>
                            <p className="font-medium" data-testid="text-info-phone">{user.phone}</p>
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
                    <CardContent className="space-y-4">
                      {user?.position && (
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Posizione</p>
                            <p className="font-medium" data-testid="text-info-position">{user.position}</p>
                          </div>
                        </div>
                      )}
                      {user?.department && (
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Dipartimento</p>
                            <p className="font-medium" data-testid="text-info-department">{user.department}</p>
                          </div>
                        </div>
                      )}
                      {user?.createdAt && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Data Creazione</p>
                            <p className="font-medium" data-testid="text-info-created">
                              {new Date(user.createdAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Tab: Scope & Permessi (Admin Only) */}
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
                    {/* Role Assignments */}
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
                                    Scade: {new Date(assignment.expiresAt).toLocaleDateString('it-IT')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Permissions */}
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

          {/* Tab: Team & Gerarchie */}
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
