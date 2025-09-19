import { useState, useMemo } from 'react';
import { DashboardTemplate, MetricCard, ActivityItem } from '@w3suite/frontend-kit/templates/DashboardTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, 
  FileText, Calendar, Activity, ArrowUpRight, ArrowDownRight,
  UserCheck, ClipboardList, Timer, Target
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  useManagerDashboardStats,
  useManagerApprovalQueue,
  useManagerApprovalHistory,
  useManagerTeamMembers,
  HR_REQUEST_TYPES,
  ManagerDashboardStats
} from '@/hooks/useHRRequests';
import { useAuth } from '@/hooks/useAuth';
import ManagerApprovalQueue from '@/components/HR/ManagerApprovalQueue';

// Chart component for approval trends
function ApprovalTrendsChart({ data }: { data: any[] }) {
  return (
    <Card className="glassmorphism-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trend Approvazioni
        </CardTitle>
        <CardDescription>
          Andamento delle approvazioni negli ultimi 30 giorni
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-purple-600" />
                <span className="text-sm">{item.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.approved}</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">
                  {item.rejected} rifiutate
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Team overview component
function TeamOverviewChart({ teamMembers }: { teamMembers: any[] }) {
  return (
    <Card className="glassmorphism-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Panoramica Team
        </CardTitle>
        <CardDescription>
          Richieste per membro del team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers?.slice(0, 6).map((member, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-purple-600 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.role || 'Dipendente'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {member.pendingRequests || 0} in attesa
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerHRDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>('7d');

  // Data queries
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useManagerDashboardStats();
  const { data: queueData, isLoading: queueLoading } = useManagerApprovalQueue({
    limit: 5 // Just for activity feed
  });
  const { data: historyData, isLoading: historyLoading } = useManagerApprovalHistory({
    limit: 10
  });
  const { data: teamData, isLoading: teamLoading } = useManagerTeamMembers();

  const stats: ManagerDashboardStats = statsData || {
    totalPending: 0,
    urgentRequests: 0,
    approvedToday: 0,
    rejectedToday: 0,
    avgResponseTime: 0,
    teamRequestsCount: 0
  };

  // Format metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'pending',
      title: 'Richieste in Attesa',
      value: stats.totalPending,
      description: 'Necessitano della tua approvazione',
      icon: <Clock className="h-4 w-4" />,
      trend: stats.totalPending > 0 ? {
        value: stats.totalPending,
        label: `${stats.urgentRequests} urgenti`
      } : undefined
    },
    {
      id: 'approved-today',
      title: 'Approvate Oggi',
      value: stats.approvedToday,
      description: 'Richieste approvate nelle ultime 24h',
      icon: <CheckCircle className="h-4 w-4" />,
      trend: stats.approvedToday > 0 ? {
        value: stats.approvedToday,
        label: 'completate oggi'
      } : undefined
    },
    {
      id: 'rejected-today',
      title: 'Rifiutate Oggi',
      value: stats.rejectedToday,
      description: 'Richieste rifiutate nelle ultime 24h',
      icon: <XCircle className="h-4 w-4" />,
      trend: stats.rejectedToday > 0 ? {
        value: stats.rejectedToday,
        label: 'rifiutate oggi'
      } : undefined
    },
    {
      id: 'avg-response',
      title: 'Tempo Medio Risposta',
      value: `${Math.round(stats.avgResponseTime || 0)}h`,
      description: 'Tempo medio per le approvazioni',
      icon: <Timer className="h-4 w-4" />,
      trend: stats.avgResponseTime ? {
        value: stats.avgResponseTime < 24 ? -1 : 1,
        label: stats.avgResponseTime < 24 ? 'Molto veloce' : 'Da migliorare'
      } : undefined
    },
    {
      id: 'team-requests',
      title: 'Richieste Team',
      value: stats.teamRequestsCount,
      description: 'Totale richieste del team',
      icon: <Users className="h-4 w-4" />,
      trend: {
        value: stats.teamRequestsCount,
        label: 'membri attivi'
      }
    },
    {
      id: 'efficiency',
      title: 'Efficienza',
      value: `${Math.round(((stats.approvedToday + stats.rejectedToday) / Math.max(stats.totalPending, 1)) * 100)}%`,
      description: 'Percentuale di processamento giornaliero',
      icon: <Target className="h-4 w-4" />,
      trend: {
        value: stats.approvedToday + stats.rejectedToday > stats.totalPending ? 1 : -1,
        label: 'processamento'
      }
    }
  ], [stats]);

  // Recent activity from approval history
  const activityItems: ActivityItem[] = useMemo(() => {
    if (!historyData?.history) return [];

    return historyData.history.slice(0, 8).map((item: any) => {
      const isApproval = item.action === 'approved';
      const timestamp = parseISO(item.createdAt);
      
      let timeLabel = format(timestamp, 'HH:mm', { locale: it });
      if (isToday(timestamp)) {
        timeLabel = `Oggi ${timeLabel}`;
      } else if (isYesterday(timestamp)) {
        timeLabel = `Ieri ${timeLabel}`;
      } else {
        timeLabel = format(timestamp, 'dd/MM HH:mm', { locale: it });
      }

      return {
        id: item.id,
        title: `${item.request?.title || 'Richiesta'} - ${item.requester?.firstName} ${item.requester?.lastName}`,
        description: `${isApproval ? 'Approvata' : 'Rifiutata'} la richiesta di ${HR_REQUEST_TYPES[item.request?.type as keyof typeof HR_REQUEST_TYPES] || item.request?.type}`,
        timestamp: timeLabel,
        icon: isApproval ? 
          <CheckCircle className="h-4 w-4 text-green-600" /> : 
          <XCircle className="h-4 w-4 text-red-600" />,
        badge: {
          label: item.request?.priority || 'normale',
          variant: item.request?.priority === 'urgent' ? 'destructive' as const : 
                   item.request?.priority === 'high' ? 'default' as const : 'outline' as const
        }
      };
    });
  }, [historyData]);

  // Charts data
  const charts = useMemo(() => [
    {
      id: 'approval-trends',
      title: 'Trend Approvazioni',
      description: 'Andamento delle tue approvazioni',
      component: <ApprovalTrendsChart data={historyData?.trends || []} />
    },
    {
      id: 'team-overview',
      title: 'Panoramica Team',
      description: 'Stato richieste per membro',
      component: <TeamOverviewChart teamMembers={teamData?.members || []} />
    }
  ], [historyData, teamData]);

  // Quick actions
  const quickActions = [
    {
      label: 'Approva Tutto Urgente',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => {
        // Handle bulk approve urgent
      },
      variant: 'default' as const
    },
    {
      label: 'Visualizza Calendario',
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => {
        // Navigate to calendar view
      },
      variant: 'outline' as const
    },
    {
      label: 'Report Team',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => {
        // Generate team report
      },
      variant: 'outline' as const
    }
  ];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'HR', href: '/hr' },
    { label: 'Approvazioni Manager' }
  ];

  const handleRefresh = () => {
    refetchStats();
  };

  return (
    <div className="space-y-8">
      <DashboardTemplate
        title={`Dashboard Approvazioni`}
        subtitle={`Benvenuto, ${user?.firstName}. Gestisci le approvazioni del tuo team.`}
        breadcrumbs={breadcrumbs}
        
        // Metrics
        metrics={metrics}
        metricsLoading={statsLoading}
        
        // Charts
        charts={charts}
        chartsLayout="grid"
        chartsLoading={statsLoading || teamLoading}
        
        // Activity
        activityTitle="Attività Recente"
        activityItems={activityItems}
        activityLoading={historyLoading}
        showActivityViewAll={true}
        onActivityViewAll={() => {
          // Navigate to full history
        }}
        
        // Quick Actions
        quickActions={quickActions}
        
        // Actions
        onRefresh={handleRefresh}
        isRefreshing={statsLoading}
        
        // Primary action
        primaryAction={{
          label: 'Visualizza Tutte le Richieste',
          onClick: () => {
            // Navigate to full queue
          },
          icon: <ArrowUpRight className="h-4 w-4" />
        }}
        
        className="space-y-8"
        data-testid="manager-hr-dashboard"
      >
        {/* Manager-specific content */}
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <Card className="glassmorphism-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Indicatori di Performance
              </CardTitle>
              <CardDescription>
                Il tuo rendimento come manager nelle ultime settimane
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <div>
                    <div className="text-sm text-green-700 dark:text-green-300">Tasso Approvazione</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {stats.approvedToday + stats.rejectedToday > 0 ? 
                        Math.round((stats.approvedToday / (stats.approvedToday + stats.rejectedToday)) * 100) : 0}%
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Velocità Media</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {Math.round(stats.avgResponseTime || 0)}h
                    </div>
                  </div>
                  <Timer className="h-8 w-8 text-blue-600" />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                  <div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Team Attivi</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {teamData?.activeMembers || 0}
                    </div>
                  </div>
                  <UserCheck className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Alerts */}
          {stats.urgentRequests > 0 && (
            <Card className="glassmorphism-card border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                  Richieste Urgenti
                </CardTitle>
                <CardDescription>
                  Hai {stats.urgentRequests} richieste che necessitano attenzione immediata
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Queste richieste sono state marcate come urgenti dal richiedente
                  </div>
                  <Button size="sm" variant="destructive" data-testid="button-view-urgent">
                    Visualizza Urgenti
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Manager Approval Queue */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Coda di Approvazione</h2>
              <p className="text-muted-foreground">
                Rivedi e gestisci tutte le richieste HR in attesa della tua approvazione
              </p>
            </div>
            <ManagerApprovalQueue data-testid="manager-approval-queue-full" />
          </div>
        </div>
      </DashboardTemplate>
    </div>
  );
}