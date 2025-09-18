import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Clock, 
  Calendar, 
  Receipt, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Plus,
  Eye,
  Building,
  Target,
  Activity,
  FileText,
  Bell,
  Settings,
  ArrowUp,
  ArrowDown,
  Timer
} from 'lucide-react';
import Layout from '@/components/Layout';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function HRDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  // Enterprise HR Metrics - Realistic Data
  const hrMetrics = {
    totalEmployees: 156,
    activeEmployees: 152,
    attendanceRate: 94.8,
    pendingLeaves: 12,
    pendingExpenses: 8,
    newHires: 6,
    turnoverRate: 2.1,
    avgWorkingHours: 7.8,
    complianceScore: 98.5,
    satisfactionScore: 4.2
  };

  const currentSession = {
    elapsedHours: 6,
    elapsedMinutes: 25,
    isActive: true,
    todayPresent: 148,
    todayAbsent: 8
  };

  const recentActivities = [
    {
      id: 1,
      type: 'leave',
      user: 'Marco Bianchi',
      action: 'Richiesta ferie approvata',
      time: '10 minuti fa',
      status: 'approved',
      details: '5 giorni dal 15 Feb'
    },
    {
      id: 2,
      type: 'expense',
      user: 'Sarah Johnson',
      action: 'Nota spese inviata',
      time: '25 minuti fa',
      status: 'pending',
      details: '€487.50 - Trasferta Milano'
    },
    {
      id: 3,
      type: 'attendance',
      user: 'System',
      action: 'Report presenze generato',
      time: '1 ora fa',
      status: 'completed',
      details: 'Gennaio 2024'
    },
    {
      id: 4,
      type: 'hire',
      user: 'Elena Rossi',
      action: 'Nuovo dipendente inserito',
      time: '2 ore fa',
      status: 'active',
      details: 'Marketing Specialist'
    }
  ];

  const urgentTasks = [
    {
      id: 1,
      title: 'Approvazione Ferie',
      description: '12 richieste in attesa di approvazione',
      priority: 'high',
      dueDate: 'Oggi',
      icon: Calendar
    },
    {
      id: 2,
      title: 'Review Spese',
      description: '8 note spese da verificare',
      priority: 'medium',
      dueDate: 'Domani',
      icon: Receipt
    },
    {
      id: 3,
      title: 'Report Mensile',
      description: 'Completare report presenze gennaio',
      priority: 'low',
      dueDate: '30 Jan',
      icon: FileText
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';  
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'leave': return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'expense': return <Receipt className="h-4 w-4 text-orange-600" />;
      case 'attendance': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'hire': return <Users className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="space-y-8 p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Dashboard Risorse Umane
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestione completa delle risorse umane aziendali
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            <Button 
              size="sm"
              data-testid="button-new-report"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hr-card" data-testid="card-total-employees">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dipendenti Totali</CardTitle>
              <Users className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hrMetrics.totalEmployees}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                +6 questo mese
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card" data-testid="card-attendance-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasso Presenze</CardTitle>
              <Clock className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hrMetrics.attendanceRate}%</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                +2.1% vs settimana scorsa
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card" data-testid="card-pending-leaves">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ferie Pending</CardTitle>
              <Calendar className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hrMetrics.pendingLeaves}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Bell className="h-3 w-3 text-amber-600 mr-1" />
                Richiede attenzione
              </div>
            </CardContent>
          </Card>

          <Card className="hr-card" data-testid="card-pending-expenses">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spese Pending</CardTitle>
              <Receipt className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hrMetrics.pendingExpenses}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Timer className="h-3 w-3 text-blue-600 mr-1" />
                €3,245 totali
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Session Status */}
        <Card className="hr-card" data-testid="card-session-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
              Status Giornaliero
              <Badge variant="default" className="ml-auto">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-background/50">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-purple))' }}>
                  {currentSession.todayPresent}
                </div>
                <div className="text-sm text-muted-foreground">Presenti Oggi</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                  {currentSession.elapsedHours}h {currentSession.elapsedMinutes}m
                </div>
                <div className="text-sm text-muted-foreground">Tempo Medio Lavorato</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-red-600">
                  {currentSession.todayAbsent}
                </div>
                <div className="text-sm text-muted-foreground">Assenti Oggi</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activities */}
          <Card className="hr-card" data-testid="card-recent-activities">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
                  Attività Recenti
                </span>
                <Button variant="outline" size="sm" data-testid="button-view-all-activities">
                  <Eye className="h-4 w-4 mr-2" />
                  Vedi Tutte
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <div className="mt-0.5">
                      {getStatusIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <Badge 
                          variant={activity.status === 'approved' ? 'default' : 
                                 activity.status === 'pending' ? 'secondary' : 'outline'}
                        >
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{activity.user} • {activity.details}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Urgent Tasks */}
          <Card className="hr-card" data-testid="card-urgent-tasks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                Compiti Urgenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {urgentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <div className="p-2 rounded-lg bg-background/50">
                      <task.icon className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{task.title}</p>
                        <Badge variant="outline">{task.dueDate}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" data-testid={`button-task-${task.id}`}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Card className="hr-card" data-testid="card-analytics-tabs">
          <Tabs defaultValue="overview" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-4" data-testid="tabs-analytics">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="attendance" data-testid="tab-attendance">Presenze</TabsTrigger>
                <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-reports">Report</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dipendenti Attivi</span>
                      <span className="text-sm font-bold" style={{ color: 'hsl(var(--brand-purple))' }}>
                        {hrMetrics.activeEmployees}
                      </span>
                    </div>
                    <div className="w-full bg-background/50 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${(hrMetrics.activeEmployees/hrMetrics.totalEmployees)*100}%`,
                          background: 'linear-gradient(90deg, hsl(var(--brand-purple)), hsl(var(--brand-orange)))'
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Compliance Score</span>
                      <span className="text-sm font-bold text-green-600">
                        {hrMetrics.complianceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-background/50 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${hrMetrics.complianceScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Satisfaction Score</span>
                      <span className="text-sm font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                        {hrMetrics.satisfactionScore}/5.0
                      </span>
                    </div>
                    <div className="w-full bg-background/50 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${(hrMetrics.satisfactionScore/5)*100}%`,
                          backgroundColor: 'hsl(var(--brand-orange))'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-medium">Trend Settimanale</h3>
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven'].map((day, index) => {
                      const attendance = [95, 88, 92, 90, 85][index];
                      return (
                        <div key={day} className="flex items-center justify-between">
                          <span className="text-sm">{day}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-background/50 rounded-full">
                              <div 
                                className="h-2 rounded-full"
                                style={{ 
                                  width: `${attendance}%`,
                                  backgroundColor: index % 2 === 0 ? 'hsl(var(--brand-orange))' : 'hsl(var(--brand-purple))'
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12">{attendance}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium">Statistiche</h3>
                    <div className="grid gap-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Media Mensile:</span>
                        <span className="text-sm font-bold">{hrMetrics.attendanceRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Ore Medie:</span>
                        <span className="text-sm font-bold">{hrMetrics.avgWorkingHours}h/giorno</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Turnover Rate:</span>
                        <span className="text-sm font-bold">{hrMetrics.turnoverRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Performance Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualizza metriche dettagliate delle performance dei team
                  </p>
                  <Button data-testid="button-view-performance">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizza Performance
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <div className="space-y-3">
                  {[
                    { name: 'Report Presenze Gennaio', status: 'Completato', date: '15 Gen 2024' },
                    { name: 'Analisi Performance Q4', status: 'In elaborazione', date: '20 Gen 2024' },
                    { name: 'Report Ferie Annuale', status: 'Programmato', date: '25 Gen 2024' }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          report.status === 'Completato' ? 'default' :
                          report.status === 'In elaborazione' ? 'secondary' : 'outline'
                        }>
                          {report.status}
                        </Badge>
                        <Button variant="ghost" size="sm" data-testid={`button-report-${index}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Quick Actions Footer */}
        <Card className="hr-card" data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-lg">Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Button variant="outline" className="justify-start h-12" data-testid="button-add-employee">
                <Users className="h-5 w-5 mr-3" />
                Aggiungi Dipendente
              </Button>
              <Button variant="outline" className="justify-start h-12" data-testid="button-approve-leaves">
                <Calendar className="h-5 w-5 mr-3" />
                Approva Ferie
              </Button>
              <Button variant="outline" className="justify-start h-12" data-testid="button-review-expenses">
                <Receipt className="h-5 w-5 mr-3" />
                Review Spese
              </Button>
              <Button variant="outline" className="justify-start h-12" data-testid="button-generate-report">
                <FileText className="h-5 w-5 mr-3" />
                Genera Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}