// HR Compliance Page - Enterprise HR Management System with frontend-kit
import { useState, useMemo } from 'react';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { Column } from '@/components/templates/DataTable';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  BookOpen,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  BarChart3,
  Settings,
  Clock,
  Building,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  UserCheck,
  Lock,
  Zap,
  Globe,
  Star,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useComplianceMetrics } from '@/hooks/useHRAnalytics';
import { queryClient } from '@/lib/queryClient';

// Define local types
interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  color?: string;
}

interface AuditRecord {
  id: string;
  type: 'gdpr' | 'safety' | 'training' | 'policy' | 'financial';
  title: string;
  department: string;
  auditor: string;
  status: 'completed' | 'in_progress' | 'scheduled' | 'overdue';
  complianceScore: number;
  lastAudit: string;
  nextAudit: string;
  issues: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PolicyDocument {
  id: string;
  title: string;
  category: 'gdpr' | 'safety' | 'hr' | 'it' | 'finance';
  version: string;
  status: 'active' | 'draft' | 'under_review' | 'expired';
  lastUpdated: string;
  nextReview: string;
  owner: string;
  acknowledgments: number;
  totalEmployees: number;
}

type ViewType = 'dashboard' | 'audits' | 'policies' | 'training' | 'incidents';

export default function HRCompliance() {
  const [currentModule, setCurrentModule] = useState('hr-compliance');
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Hooks for compliance data
  const { data: compliance, isLoading: complianceLoading } = useComplianceMetrics();
  
  // Check permissions
  const userRole = user?.role || '';
  const canManageCompliance = ['HR_MANAGER', 'ADMIN', 'COMPLIANCE_OFFICER'].includes(userRole);
  const canCreateAudits = ['HR_MANAGER', 'ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'].includes(userRole);
  
  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'overall-score',
      title: 'Compliance Score',
      value: `${compliance?.overallScore || 0}%`,
      description: 'Punteggio generale conformità',
      trend: compliance?.overallScore < 90 ? { value: compliance?.overallScore - 90, label: 'Sotto target' } : undefined,
      icon: <Shield className="h-4 w-4" />,
      color: compliance?.overallScore >= 90 ? 'text-green-600' : 'text-orange-600',
    },
    {
      id: 'gdpr',
      title: 'GDPR Compliance',
      value: `${compliance?.gdprCompliance || 0}%`,
      description: compliance?.gdprIssues > 0 ? `${compliance.gdprIssues} problemi` : 'Conforme',
      icon: <Lock className="h-4 w-4" />,
      color: 'text-blue-600',
    },
    {
      id: 'safety',
      title: 'Sicurezza',
      value: `${compliance?.safetyCompliance || 0}%`,
      description: 'Conformità sicurezza sul lavoro',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: compliance?.safetyCompliance >= 95 ? 'text-green-600' : 'text-orange-600',
    },
    {
      id: 'training',
      title: 'Formazione Obbligatoria',
      value: `${compliance?.trainingCompliance || 0}%`,
      description: `${compliance?.pendingTraining || 0} corsi in sospeso`,
      trend: compliance?.pendingTraining > 0 ? { value: -compliance.pendingTraining, label: 'Da completare' } : undefined,
      icon: <BookOpen className="h-4 w-4" />,
      color: 'text-purple-600',
    },
  ], [compliance]);
  
  // Mock audit data (replace with real API when available)
  const auditRecords: AuditRecord[] = [
    {
      id: '1',
      type: 'gdpr',
      title: 'Audit GDPR Q4 2024',
      department: 'IT',
      auditor: 'External Auditor',
      status: 'completed',
      complianceScore: 94,
      lastAudit: '2024-12-01',
      nextAudit: '2025-03-01',
      issues: 2,
      priority: 'medium',
    },
    {
      id: '2',
      type: 'safety',
      title: 'Ispezione Sicurezza Negozi',
      department: 'Retail',
      auditor: 'Internal Team',
      status: 'in_progress',
      complianceScore: 87,
      lastAudit: '2024-10-15',
      nextAudit: '2025-01-15',
      issues: 5,
      priority: 'high',
    },
    {
      id: '3',
      type: 'training',
      title: 'Verifica Formazione Obbligatoria',
      department: 'HR',
      auditor: 'HR Manager',
      status: 'scheduled',
      complianceScore: 0,
      lastAudit: '2024-09-01',
      nextAudit: '2025-01-10',
      issues: 0,
      priority: 'low',
    },
  ];
  
  // Mock policy data (replace with real API when available)
  const policies: PolicyDocument[] = [
    {
      id: '1',
      title: 'Privacy Policy GDPR',
      category: 'gdpr',
      version: '2.3',
      status: 'active',
      lastUpdated: '2024-11-01',
      nextReview: '2025-05-01',
      owner: 'Legal Department',
      acknowledgments: 142,
      totalEmployees: 156,
    },
    {
      id: '2',
      title: 'Codice Etico Aziendale',
      category: 'hr',
      version: '1.8',
      status: 'under_review',
      lastUpdated: '2024-10-15',
      nextReview: '2025-01-15',
      owner: 'HR Department',
      acknowledgments: 150,
      totalEmployees: 156,
    },
    {
      id: '3',
      title: 'Sicurezza IT Policy',
      category: 'it',
      version: '3.1',
      status: 'active',
      lastUpdated: '2024-12-01',
      nextReview: '2025-06-01',
      owner: 'IT Department',
      acknowledgments: 138,
      totalEmployees: 156,
    },
  ];
  
  // Prepare columns for audits
  const auditColumns: Column[] = [
    {
      key: 'title',
      label: 'Audit',
      render: (audit: AuditRecord) => (
        <div>
          <p className="font-medium">{audit.title}</p>
          <p className="text-xs text-gray-500">{audit.department}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (audit: AuditRecord) => (
        <Badge variant="outline">{audit.type.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (audit: AuditRecord) => {
        const statusConfig = {
          completed: { color: 'green', label: 'Completato', icon: <CheckCircle className="h-3 w-3" /> },
          in_progress: { color: 'orange', label: 'In corso', icon: <Clock className="h-3 w-3" /> },
          scheduled: { color: 'blue', label: 'Programmato', icon: <Calendar className="h-3 w-3" /> },
          overdue: { color: 'red', label: 'Scaduto', icon: <AlertTriangle className="h-3 w-3" /> },
        }[audit.status];
        
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        );
      },
    },
    {
      key: 'score',
      label: 'Score',
      render: (audit: AuditRecord) => audit.status === 'completed' ? (
        <div className="flex items-center gap-2">
          <span className="font-medium">{audit.complianceScore}%</span>
          <Progress value={audit.complianceScore} className="w-16 h-2" />
        </div>
      ) : '-',
    },
    {
      key: 'issues',
      label: 'Problemi',
      render: (audit: AuditRecord) => audit.issues > 0 ? (
        <Badge variant={audit.priority === 'critical' ? 'destructive' : 'outline'}>
          {audit.issues} {audit.priority}
        </Badge>
      ) : '-',
    },
    {
      key: 'nextAudit',
      label: 'Prossimo Audit',
      render: (audit: AuditRecord) => format(new Date(audit.nextAudit), 'dd/MM/yyyy'),
    },
  ];
  
  // Prepare columns for policies
  const policyColumns: Column[] = [
    {
      key: 'title',
      label: 'Policy',
      render: (policy: PolicyDocument) => (
        <div>
          <p className="font-medium">{policy.title}</p>
          <p className="text-xs text-gray-500">v{policy.version}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (policy: PolicyDocument) => (
        <Badge variant="outline">{policy.category.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (policy: PolicyDocument) => {
        const statusConfig = {
          active: { color: 'green', label: 'Attivo' },
          draft: { color: 'gray', label: 'Bozza' },
          under_review: { color: 'orange', label: 'In revisione' },
          expired: { color: 'red', label: 'Scaduto' },
        }[policy.status];
        
        return <Badge variant="outline">{statusConfig.label}</Badge>;
      },
    },
    {
      key: 'acknowledgments',
      label: 'Accettazioni',
      render: (policy: PolicyDocument) => (
        <div className="flex items-center gap-2">
          <span>{policy.acknowledgments}/{policy.totalEmployees}</span>
          <Progress 
            value={(policy.acknowledgments / policy.totalEmployees) * 100} 
            className="w-16 h-2" 
          />
        </div>
      ),
    },
    {
      key: 'nextReview',
      label: 'Prossima Revisione',
      render: (policy: PolicyDocument) => format(new Date(policy.nextReview), 'dd/MM/yyyy'),
    },
  ];
  
  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hr-analytics', 'compliance'] }),
    ]);
    setIsRefreshing(false);
    toast({
      title: 'Dashboard aggiornato',
      description: 'Tutti i dati sono stati aggiornati',
    });
  };
  
  const handleExport = () => {
    toast({
      title: 'Export avviato',
      description: 'Il report di compliance sarà scaricato a breve',
    });
  };
  
  const handleCreateAudit = () => {
    toast({
      title: 'Nuovo audit',
      description: 'Funzionalità di creazione audit in arrivo',
    });
  };
  
  const handleCreatePolicy = () => {
    toast({
      title: 'Nuova policy',
      description: 'Funzionalità di creazione policy in arrivo',
    });
  };
  
  // Quick actions for dashboard
  const quickActions = [
    {
      label: 'Nuovo Audit',
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateAudit,
      variant: 'default' as const,
      disabled: !canCreateAudits,
    },
    {
      label: 'Export Report',
      icon: <Download className="h-4 w-4" />,
      onClick: handleExport,
      variant: 'outline' as const,
    },
  ];
  
  // Render content based on view
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card className="glass-card col-span-2">
              <CardHeader>
                <CardTitle>Panoramica Compliance</CardTitle>
                <CardDescription>Stato generale conformità aziendale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Documenti</p>
                    <p className="text-2xl font-bold">{compliance?.documentCompliance || 0}%</p>
                    <Progress value={compliance?.documentCompliance || 0} className="h-2 mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contratti</p>
                    <p className="text-2xl font-bold">{compliance?.contractCompliance || 0}%</p>
                    <Progress value={compliance?.contractCompliance || 0} className="h-2 mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Formazione</p>
                    <p className="text-2xl font-bold">{compliance?.trainingCompliance || 0}%</p>
                    <Progress value={compliance?.trainingCompliance || 0} className="h-2 mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Orario Lavoro</p>
                    <p className="text-2xl font-bold">{compliance?.workingTimeCompliance || 0}%</p>
                    <Progress value={compliance?.workingTimeCompliance || 0} className="h-2 mt-2" />
                  </div>
                </div>
                {compliance?.criticalIssues > 0 && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Attenzione Richiesta</AlertTitle>
                    <AlertDescription>
                      {compliance.criticalIssues} problemi critici richiedono intervento immediato
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {/* Recent Audits */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Audit Recenti</CardTitle>
                <CardDescription>Ultimi controlli effettuati</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditRecords.slice(0, 3).map((audit) => (
                    <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium">{audit.title}</p>
                        <p className="text-sm text-gray-500">
                          Score: {audit.complianceScore}% • {format(new Date(audit.lastAudit), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      {audit.issues > 0 && (
                        <Badge variant="outline" className="text-orange-600">
                          {audit.issues} problemi
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setActiveView('audits')}
                    data-testid="button-view-all-audits"
                  >
                    Visualizza tutti →
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Policy Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Stato Policy</CardTitle>
                <CardDescription>Documenti normativi aziendali</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policies.slice(0, 3).map((policy) => (
                    <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium">{policy.title}</p>
                        <p className="text-sm text-gray-500">
                          v{policy.version} • {policy.acknowledgments}/{policy.totalEmployees} accettazioni
                        </p>
                      </div>
                      <Badge variant={policy.status === 'active' ? 'default' : 'outline'}>
                        {policy.status === 'active' ? 'Attivo' : 'Revisione'}
                      </Badge>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setActiveView('policies')}
                    data-testid="button-view-all-policies"
                  >
                    Visualizza tutte →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'audits':
        return (
          <ListPageTemplate
            title="Registro Audit"
            subtitle="Controlli e verifiche di conformità"
            data={auditRecords}
            columns={auditColumns}
            isLoading={false}
            searchPlaceholder="Cerca audit..."
            filters={[
              {
                id: 'type',
                label: 'Tipo',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'gdpr', label: 'GDPR' },
                  { value: 'safety', label: 'Sicurezza' },
                  { value: 'training', label: 'Formazione' },
                  { value: 'policy', label: 'Policy' },
                  { value: 'financial', label: 'Finanziario' },
                ],
                value: 'all',
                onChange: () => {},
              },
              {
                id: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'completed', label: 'Completati' },
                  { value: 'in_progress', label: 'In corso' },
                  { value: 'scheduled', label: 'Programmati' },
                  { value: 'overdue', label: 'Scaduti' },
                ],
                value: 'all',
                onChange: () => {},
              },
            ]}
            itemActions={(audit) => [
              {
                id: 'view',
                label: 'Dettagli',
                onClick: () => {
                  toast({
                    title: 'Dettagli audit',
                    description: `Visualizzazione dettagli per ${audit.title}`,
                  });
                },
              },
              ...(audit.status === 'scheduled' || audit.status === 'in_progress' ? [{
                id: 'start',
                label: 'Avvia/Continua',
                onClick: () => {
                  toast({
                    title: 'Audit avviato',
                    description: `Audit ${audit.title} in corso`,
                  });
                },
              }] : []),
              {
                id: 'report',
                label: 'Report',
                onClick: () => {
                  toast({
                    title: 'Generazione report',
                    description: `Report per ${audit.title} in preparazione`,
                  });
                },
              },
            ]}
            primaryAction={{
              label: 'Nuovo Audit',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreateAudit,
              disabled: !canCreateAudits,
            }}
            emptyStateProps={{
              title: 'Nessun audit',
              description: 'Non ci sono audit registrati',
              icon: <FileCheck className="h-8 w-8 text-gray-400" />,
              primaryAction: canCreateAudits ? {
                label: 'Pianifica primo audit',
                onClick: handleCreateAudit,
              } : undefined,
            }}
          />
        );
        
      case 'policies':
        return (
          <ListPageTemplate
            title="Policy Aziendali"
            subtitle="Documenti e normative interne"
            data={policies}
            columns={policyColumns}
            isLoading={false}
            searchPlaceholder="Cerca policy..."
            filters={[
              {
                id: 'category',
                label: 'Categoria',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutte' },
                  { value: 'gdpr', label: 'GDPR' },
                  { value: 'safety', label: 'Sicurezza' },
                  { value: 'hr', label: 'HR' },
                  { value: 'it', label: 'IT' },
                  { value: 'finance', label: 'Finance' },
                ],
                value: 'all',
                onChange: () => {},
              },
              {
                id: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'active', label: 'Attive' },
                  { value: 'draft', label: 'Bozze' },
                  { value: 'under_review', label: 'In revisione' },
                  { value: 'expired', label: 'Scadute' },
                ],
                value: 'all',
                onChange: () => {},
              },
            ]}
            itemActions={(policy) => [
              {
                id: 'view',
                label: 'Visualizza',
                onClick: () => {
                  toast({
                    title: 'Apertura policy',
                    description: `Visualizzazione ${policy.title}`,
                  });
                },
              },
              ...(canManageCompliance ? [{
                id: 'edit',
                label: 'Modifica',
                onClick: () => {
                  toast({
                    title: 'Modifica policy',
                    description: `Modifica di ${policy.title}`,
                  });
                },
              }] : []),
              {
                id: 'send-reminder',
                label: 'Invia promemoria',
                onClick: () => {
                  toast({
                    title: 'Promemoria inviato',
                    description: `Promemoria per ${policy.title} inviato ai dipendenti`,
                  });
                },
              },
            ]}
            primaryAction={{
              label: 'Nuova Policy',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreatePolicy,
              disabled: !canManageCompliance,
            }}
            emptyStateProps={{
              title: 'Nessuna policy',
              description: 'Non ci sono policy registrate',
              icon: <FileText className="h-8 w-8 text-gray-400" />,
              primaryAction: canManageCompliance ? {
                label: 'Crea prima policy',
                onClick: handleCreatePolicy,
              } : undefined,
            }}
          />
        );
        
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Seleziona una vista dal menu per visualizzare i dettagli</p>
          </div>
        );
    }
  };
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="hr-compliance-page">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              HR Compliance
            </h1>
            <p className="text-gray-600 mt-1">
              Gestione conformità e audit aziendali
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compliance?.criticalIssues > 0 && (
              <Badge variant="destructive">
                {compliance.criticalIssues} critici
              </Badge>
            )}
            <Badge variant={compliance?.overallScore >= 90 ? 'default' : 'outline'}>
              Score: {compliance?.overallScore || 0}%
            </Badge>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="audits">
              Audit
              {auditRecords.filter(a => a.status === 'overdue').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {auditRecords.filter(a => a.status === 'overdue').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="policies">
              Policy
              {policies.filter(p => p.status === 'expired').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {policies.filter(p => p.status === 'expired').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="incidents">Incidenti</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeView} className="mt-6">
            {activeView === 'dashboard' ? (
              <DashboardTemplate
                title="Compliance Dashboard"
                subtitle={`Monitoraggio conformità aziendale`}
                metrics={metrics}
                metricsLoading={complianceLoading}
                quickActions={quickActions}
                showFilters={false}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                onExport={handleExport}
                lastUpdated={new Date()}
              >
                {renderContent()}
              </DashboardTemplate>
            ) : (
              renderContent()
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}