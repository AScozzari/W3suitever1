import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Timer,
  Briefcase,
  Download,
  RefreshCw,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Static mock data for KPI cards
const mockKPIData = [
  {
    id: 'employees',
    label: 'Dipendenti Totali',
    value: '156',
    change: '+3.2%',
    trend: 'up',
    icon: Users,
    color: 'blue'
  },
  {
    id: 'attendance',
    label: 'Presenze Oggi',
    value: '142',
    change: '91.0%',
    trend: 'up',
    icon: UserCheck,
    color: 'green'
  },
  {
    id: 'leaves',
    label: 'In Ferie',
    value: '8',
    change: '-2',
    trend: 'down',
    icon: CalendarDays,
    color: 'purple'
  },
  {
    id: 'overtime',
    label: 'Ore Straordinario',
    value: '284',
    change: '+12.5%',
    trend: 'up',
    icon: Timer,
    color: 'orange'
  },
  {
    id: 'payroll',
    label: 'Costo Mensile',
    value: '€423K',
    change: '+2.8%',
    trend: 'up',
    icon: DollarSign,
    color: 'pink'
  },
  {
    id: 'compliance',
    label: 'Compliance Score',
    value: '96%',
    change: '+1.2%',
    trend: 'up',
    icon: Briefcase,
    color: 'cyan'
  }
];

// Static mock data for employees table
const mockEmployees = [
  {
    id: 1,
    name: 'Mario Rossi',
    role: 'Store Manager',
    department: 'Milano Centro',
    status: 'Attivo',
    attendance: 'Presente',
    shiftTime: '09:00 - 18:00'
  },
  {
    id: 2,
    name: 'Laura Bianchi',
    role: 'Sales Agent',
    department: 'Milano Centro',
    status: 'Attivo',
    attendance: 'Presente',
    shiftTime: '10:00 - 19:00'
  },
  {
    id: 3,
    name: 'Giuseppe Verde',
    role: 'Cassiere',
    department: 'Roma EUR',
    status: 'Attivo',
    attendance: 'In Ferie',
    shiftTime: '-'
  },
  {
    id: 4,
    name: 'Anna Neri',
    role: 'Area Manager',
    department: 'Lombardia',
    status: 'Attivo',
    attendance: 'Presente',
    shiftTime: '08:30 - 17:30'
  },
  {
    id: 5,
    name: 'Franco Gialli',
    role: 'Magazziniere',
    department: 'Napoli Centrale',
    status: 'Attivo',
    attendance: 'Presente',
    shiftTime: '07:00 - 15:00'
  }
];

// Static mock data for leave requests
const mockLeaveRequests = [
  {
    id: 1,
    employee: 'Marco Blu',
    type: 'Ferie',
    from: '20/01/2025',
    to: '24/01/2025',
    days: 5,
    status: 'pending',
    reason: 'Vacanza familiare'
  },
  {
    id: 2,
    employee: 'Sara Rosa',
    type: 'Permesso',
    from: '18/01/2025',
    to: '18/01/2025',
    days: 1,
    status: 'approved',
    reason: 'Visita medica'
  },
  {
    id: 3,
    employee: 'Luca Viola',
    type: 'Malattia',
    from: '15/01/2025',
    to: '16/01/2025',
    days: 2,
    status: 'approved',
    reason: 'Certificato medico'
  }
];

// HR Module configurations
const hrModules = [
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Eventi e scadenze HR',
    icon: Calendar,
    path: '/calendar',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    stat: '12 eventi'
  },
  {
    id: 'time-tracking',
    title: 'Timbrature',
    description: 'Clock in/out dipendenti',
    icon: Clock,
    path: '/time-tracking',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-600',
    stat: '142 attivi'
  },
  {
    id: 'leave-management',
    title: 'Gestione Ferie',
    description: 'Richieste e approvazioni',
    icon: CalendarDays,
    path: '/leave-management',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    stat: '3 pendenti'
  },
  {
    id: 'shift-planning',
    title: 'Pianificazione Turni',
    description: 'Scheduling ottimizzato',
    icon: Users,
    path: '/shift-planning',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-600',
    stat: '28 turni'
  },
  {
    id: 'documents',
    title: 'Documenti',
    description: 'Storage documenti HR',
    icon: FileText,
    path: '/documents',
    bgColor: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
    stat: '342 files'
  },
  {
    id: 'expenses',
    title: 'Note Spese',
    description: 'Gestione rimborsi',
    icon: DollarSign,
    path: '/expense-management',
    bgColor: 'bg-pink-500/10',
    iconColor: 'text-pink-600',
    stat: '€12.4K'
  }
];

// KPI Card Component
function KPICard({ kpi }: { kpi: any }) {
  const Icon = kpi.icon;
  const isPositive = kpi.trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  console.log('Rendering KPI Card:', kpi.label);

  return (
    <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </p>
            <p className="text-2xl font-bold mt-1">
              {kpi.value}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className={cn("h-4 w-4", isPositive ? "text-green-600" : "text-red-600")} />
              <span className={cn("text-sm font-medium", isPositive ? "text-green-600" : "text-red-600")}>
                {kpi.change}
              </span>
            </div>
          </div>
          <div className={cn("p-3 rounded-lg bg-gradient-to-br", colorMap[kpi.color] || colorMap.blue)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Module Card Component
function ModuleCard({ module, onClick }: { module: any; onClick: () => void }) {
  const Icon = module.icon;
  
  console.log('Rendering Module Card:', module.title);

  return (
    <Card 
      className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-xl", module.bgColor)}>
            <Icon className={cn("h-6 w-6", module.iconColor)} />
          </div>
          <Badge variant="secondary" className="text-xs">
            {module.stat}
          </Badge>
        </div>
        <CardTitle className="mt-4 text-lg">{module.title}</CardTitle>
        <CardDescription className="text-sm">{module.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentModule, setCurrentModule] = useState<string>('hr-dashboard');
  
  console.log('HRDashboardPage rendering - Active Tab:', activeTab);
  console.log('Component mounted successfully');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                HR Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestione completa delle risorse umane con RBAC e analytics real-time
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="shadow-md">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md">
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {mockKPIData.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-lg">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="employees">Dipendenti</TabsTrigger>
            <TabsTrigger value="leaves">Ferie</TabsTrigger>
            <TabsTrigger value="modules">Moduli HR</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Activity */}
              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Attività Recente</CardTitle>
                  <CardDescription>Ultimi eventi nel sistema HR</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Mario Rossi - Check In</p>
                        <p className="text-xs text-muted-foreground">5 minuti fa</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Nuova richiesta ferie</p>
                        <p className="text-xs text-muted-foreground">30 minuti fa</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Turno scoperto domani</p>
                        <p className="text-xs text-muted-foreground">1 ora fa</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Statistiche Rapide</CardTitle>
                  <CardDescription>Performance settimana corrente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Tasso Presenza</span>
                      <Badge className="bg-green-100 text-green-800">91.2%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Ore Straordinario</span>
                      <Badge className="bg-orange-100 text-orange-800">+284h</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Richieste Pendenti</span>
                      <Badge className="bg-blue-100 text-blue-800">3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Compliance Score</span>
                      <Badge className="bg-purple-100 text-purple-800">96%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle>Lista Dipendenti</CardTitle>
                <CardDescription>Gestione completa del personale</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Reparto</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Presenza</TableHead>
                      <TableHead>Turno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockEmployees.map(employee => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.role}</Badge>
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.attendance === 'Presente' ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              {employee.attendance}
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              {employee.attendance}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{employee.shiftTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaves Tab */}
          <TabsContent value="leaves">
            <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle>Richieste Ferie e Permessi</CardTitle>
                <CardDescription>Gestione richieste con workflow di approvazione</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dipendente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dal</TableHead>
                      <TableHead>Al</TableHead>
                      <TableHead>Giorni</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLeaveRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employee}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.type}</Badge>
                        </TableCell>
                        <TableCell>{request.from}</TableCell>
                        <TableCell>{request.to}</TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>
                          {request.status === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              In Attesa
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              Approvato
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hrModules.map(module => (
                <ModuleCard 
                  key={module.id} 
                  module={module} 
                  onClick={() => {
                    console.log('Module clicked:', module.title);
                    // Navigation logic here
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}