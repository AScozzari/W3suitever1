import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, UserCheck, Calendar, Clock, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, FileText, Receipt, Mail, Phone, MapPin,
  User, Building2, Award, Target, DollarSign, BookOpen, Coffee
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'leave' | 'inactive';
  email: string;
  phone: string;
  startDate: string;
  avatar?: string;
}

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  pendingRequests: number;
  attendanceRate: number;
  turnoverRate: number;
}

export default function HRDashboard() {
  // Mock data queries
  const { data: stats, isLoading: statsLoading } = useQuery<HRStats>({
    queryKey: ['/api/hr/stats'],
    initialData: {
      totalEmployees: 127,
      activeEmployees: 119,
      onLeave: 8,
      pendingRequests: 15,
      attendanceRate: 94.2,
      turnoverRate: 8.5
    }
  });

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees'],
    initialData: [
      {
        id: 'emp-001',
        name: 'Mario Rossi',
        role: 'HR Manager',
        department: 'Risorse Umane',
        status: 'active',
        email: 'mario.rossi@w3suite.com',
        phone: '+39 335 123 4567',
        startDate: '2023-01-15'
      },
      {
        id: 'emp-002', 
        name: 'Giulia Bianchi',
        role: 'Software Engineer',
        department: 'Sviluppo',
        status: 'active',
        email: 'giulia.bianchi@w3suite.com',
        phone: '+39 347 987 6543',
        startDate: '2023-03-20'
      },
      {
        id: 'emp-003',
        name: 'Luca Verdi',
        role: 'Sales Manager',
        department: 'Vendite',
        status: 'leave',
        email: 'luca.verdi@w3suite.com', 
        phone: '+39 329 456 7890',
        startDate: '2022-11-10'
      },
      {
        id: 'emp-004',
        name: 'Elena Neri',
        role: 'Marketing Specialist',
        department: 'Marketing',
        status: 'active',
        email: 'elena.neri@w3suite.com',
        phone: '+39 338 234 5678',
        startDate: '2024-01-08'
      }
    ]
  });

  if (statsLoading || employeesLoading) {
    return (
      <Layout currentModule="hr" setCurrentModule={() => {}}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="text-page-title">
            Dashboard HR
          </h1>
          <p className="text-muted-foreground text-lg">
            Gestione completa delle risorse umane per W3 Suite Enterprise
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-total-employees">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dipendenti Totali</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-employees">{stats?.totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-active-employees">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Presenti Oggi</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-active-employees">{stats?.activeEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-on-leave">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Ferie</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-on-leave">{stats?.onLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-pending-requests">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Richieste Pendenti</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-pending-requests">{stats?.pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-attendance-rate">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
                Tasso di Presenza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-foreground">{stats?.attendanceRate}%</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +2.3%
                  </Badge>
                </div>
                <Progress value={stats?.attendanceRate} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Rispetto al mese precedente. Obiettivo: 95%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-turnover-rate">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Target className="h-6 w-6 mr-3 text-blue-600" />
                Tasso di Turnover
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-foreground">{stats?.turnoverRate}%</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    -1.2%
                  </Badge>
                </div>
                <Progress value={100 - (stats?.turnoverRate || 0)} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  In diminuzione. Obiettivo annuale: &lt; 10%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Employees */}
        <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-recent-employees">
          <CardHeader>
            <CardTitle className="text-xl">Dipendenti Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees?.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
                  data-testid={`row-employee-${employee.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid={`text-employee-name-${employee.id}`}>
                        {employee.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.role} • {employee.department}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1" />
                          {employee.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={employee.status === 'active' ? 'default' : employee.status === 'leave' ? 'secondary' : 'destructive'}
                      data-testid={`badge-status-${employee.id}`}
                    >
                      {employee.status === 'active' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Attivo</>
                      ) : employee.status === 'leave' ? (
                        <><Calendar className="h-3 w-3 mr-1" />In Ferie</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />Inattivo</>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-xl">Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center space-y-2 bg-background/30 hover:bg-background/50"
                data-testid="button-add-employee"
              >
                <User className="h-8 w-8 text-blue-600" />
                <span>Aggiungi Dipendente</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center space-y-2 bg-background/30 hover:bg-background/50"
                data-testid="button-approve-leaves"
              >
                <Calendar className="h-8 w-8 text-green-600" />
                <span>Approva Ferie</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center space-y-2 bg-background/30 hover:bg-background/50"
                data-testid="button-review-expenses"
              >
                <Receipt className="h-8 w-8 text-orange-600" />
                <span>Review Spese</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center space-y-2 bg-background/30 hover:bg-background/50"
                data-testid="button-generate-report"
              >
                <FileText className="h-8 w-8 text-purple-600" />
                <span>Genera Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Department Overview */}
        <Card className="hr-card border-0 bg-background/50 backdrop-blur-sm" data-testid="card-departments">
          <CardHeader>
            <CardTitle className="text-xl">Panoramica Dipartimenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="flex items-center justify-between">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <Badge variant="secondary">42 dipendenti</Badge>
                </div>
                <h3 className="font-bold text-lg mt-2 text-blue-900 dark:text-blue-100">Sviluppo</h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">Frontend, Backend, DevOps</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <Badge variant="secondary">28 dipendenti</Badge>
                </div>
                <h3 className="font-bold text-lg mt-2 text-green-900 dark:text-green-100">Vendite</h3>
                <p className="text-sm text-green-700 dark:text-green-200">Account Manager, Sales Rep</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                  <Badge variant="secondary">19 dipendenti</Badge>
                </div>
                <h3 className="font-bold text-lg mt-2 text-purple-900 dark:text-purple-100">Marketing</h3>
                <p className="text-sm text-purple-700 dark:text-purple-200">Digital, Content, Design</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}