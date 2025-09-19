import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, AlertTriangle, Clock, Users, TrendingUp, Activity,
  ArrowLeft, Filter, BarChart3, Calendar, FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { 
  useManagerDashboardStats,
  useManagerApprovalQueue,
  ManagerDashboardStats
} from '@/hooks/useHRRequests';
import RequestApprovalTable from '@/components/Manager/RequestApprovalTable';
import BulkApprovalBar from '@/components/Manager/BulkApprovalBar';
import { Link } from 'wouter';

// Quick Stats Cards
function QuickStatsCards({ stats }: { stats: ManagerDashboardStats }) {
  const statCards = [
    {
      title: 'Richieste in Attesa',
      value: stats.totalPending,
      description: `${stats.urgentRequests} urgenti`,
      icon: Clock,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      textColor: 'text-white'
    },
    {
      title: 'Approvate Oggi',
      value: stats.approvedToday,
      description: 'Nelle ultime 24h',
      icon: CheckCircle,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      textColor: 'text-white'
    },
    {
      title: 'Team Attivo',
      value: stats.teamRequestsCount,
      description: 'Richieste totali team',
      icon: Users,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      textColor: 'text-white'
    },
    {
      title: 'Tempo Medio',
      value: `${Math.round(stats.avgResponseTime || 0)}h`,
      description: 'Risposta approvazioni',
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-white'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="glassmorphism-card overflow-hidden">
            <div className={`${stat.color} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm opacity-90 ${stat.textColor}`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                  <p className={`text-xs opacity-75 ${stat.textColor}`}>
                    {stat.description}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function ManagerApprovalQueue() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [currentModule, setCurrentModule] = useState('hr');

  // Data queries
  const { data: statsData, isLoading: statsLoading } = useManagerDashboardStats();
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useManagerApprovalQueue({
    status: 'pending',
    limit: 50
  });

  const stats: ManagerDashboardStats = statsData || {
    totalPending: 0,
    urgentRequests: 0,
    approvedToday: 0,
    rejectedToday: 0,
    avgResponseTime: 0,
    teamRequestsCount: 0
  };

  const handleSelectionChange = (requestIds: string[]) => {
    setSelectedRequests(requestIds);
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    // This will be handled by the BulkApprovalBar component
    console.log(`Bulk ${action} for:`, selectedRequests);
    refetchPending();
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: `/${currentTenant?.id}/dashboard` },
    { label: 'HR', href: `/${currentTenant?.id}/hr` },
    { label: 'Approvazioni Manager' }
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="manager-approval-queue-page">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href={`/${currentTenant?.id}/hr`}>
                <Button variant="outline" size="sm" data-testid="button-back-to-hr">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna a HR
                </Button>
              </Link>
              <div className="h-4 w-px bg-border" />
              <Badge variant="outline" className="bg-windtre-orange/10 text-windtre-orange border-windtre-orange/20">
                Manager Dashboard
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Coda Approvazioni
            </h1>
            <p className="text-lg text-muted-foreground">
              Benvenuto, <span className="font-medium">{user?.firstName}</span>. 
              Gestisci le approvazioni del tuo team in modo efficiente.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" data-testid="button-export-report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button variant="outline" size="sm" data-testid="button-calendar-view">
              <Calendar className="h-4 w-4 mr-2" />
              Calendario
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStatsCards stats={stats} />

        {/* Priority Alerts */}
        {stats.urgentRequests > 0 && (
          <Card className="glassmorphism-card border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100">
                    {stats.urgentRequests} Richieste Urgenti
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-200">
                    Necessitano attenzione immediata del manager
                  </p>
                </div>
                <Button size="sm" variant="destructive" data-testid="button-view-urgent-only">
                  Visualizza Urgenti
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        <div className="space-y-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-3 glassmorphism-card">
                <TabsTrigger 
                  value="pending" 
                  className="data-[state=active]:bg-windtre-orange data-[state=active]:text-white"
                  data-testid="tab-pending"
                >
                  In Attesa ({stats.totalPending})
                </TabsTrigger>
                <TabsTrigger 
                  value="approved"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                  data-testid="tab-approved"
                >
                  Approvate
                </TabsTrigger>
                <TabsTrigger 
                  value="rejected"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                  data-testid="tab-rejected"
                >
                  Rifiutate
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" data-testid="button-filters">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri Avanzati
                </Button>
                <Button variant="outline" size="sm" data-testid="button-bulk-actions">
                  <Activity className="h-4 w-4 mr-2" />
                  Azioni Multiple
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedRequests.length > 0 && (
              <BulkApprovalBar
                selectedCount={selectedRequests.length}
                selectedRequests={selectedRequests}
                onBulkAction={handleBulkAction}
                onClearSelection={() => setSelectedRequests([])}
                data-testid="bulk-approval-bar"
              />
            )}

            {/* Tab Content */}
            <TabsContent value="pending" className="space-y-6">
              <Card className="glassmorphism-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-windtre-orange" />
                        Richieste in Attesa di Approvazione
                      </CardTitle>
                      <CardDescription>
                        Rivedi e gestisci le richieste HR del tuo team
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20">
                      {stats.totalPending} richieste
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <RequestApprovalTable
                    status="pending"
                    onSelectionChange={handleSelectionChange}
                    selectedRequests={selectedRequests}
                    data-testid="approval-table-pending"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved" className="space-y-6">
              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Richieste Approvate
                  </CardTitle>
                  <CardDescription>
                    Storico delle richieste approvate dal tuo team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestApprovalTable
                    status="approved"
                    onSelectionChange={handleSelectionChange}
                    selectedRequests={[]}
                    data-testid="approval-table-approved"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rejected" className="space-y-6">
              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Richieste Rifiutate
                  </CardTitle>
                  <CardDescription>
                    Storico delle richieste rifiutate con motivazioni
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestApprovalTable
                    status="rejected"
                    onSelectionChange={handleSelectionChange}
                    selectedRequests={[]}
                    data-testid="approval-table-rejected"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </Layout>
  );
}