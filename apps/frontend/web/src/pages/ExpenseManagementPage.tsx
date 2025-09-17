// Expense Management Page - Enterprise HR Management System with frontend-kit
import { useState, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Column } from '@/components/templates/DataTable';
import {
  Plus,
  Download,
  Filter,
  Search,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Send,
  Euro,
  CreditCard,
  PiggyBank,
  Banknote,
  RefreshCw,
  Upload,
  Camera,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  useExpenseReports,
  useExpenseItems,
  useExpenseStats,
  useExpenseApprovals,
  useExpensePolicies,
  useExpenseCategories,
  useExpenseAnalytics,
} from '@/hooks/useExpenseManagement';
import { expenseService } from '@/services/expenseService';
import ExpenseReportForm from '@/components/Expenses/ExpenseReportForm';
import ExpenseApprovalQueue from '@/components/Expenses/ExpenseApprovalQueue';
import ExpenseAnalytics from '@/components/Expenses/ExpenseAnalytics';
import ExpensePolicies from '@/components/Expenses/ExpensePolicies';
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
}

type TabView = 'dashboard' | 'reports' | 'items' | 'approvals' | 'analytics' | 'policies';

const ExpenseManagementPage = () => {
  const [currentModule, setCurrentModule] = useState('expense-management');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'last3Months'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedReportForItems, setSelectedReportForItems] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Permission checks
  const canApprove = user?.role === 'HR_MANAGER' || user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';
  const canSetPolicies = user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';
  
  // Date filtering helper
  const getPeriodDates = (period: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (period) {
      case 'thisMonth':
        return { startDate: startOfMonth, endDate: now };
      case 'lastMonth':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0)
        };
      case 'thisYear':
        return { startDate: startOfYear, endDate: now };
      case 'last3Months':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
          endDate: now
        };
      default:
        return { startDate: null, endDate: null };
    }
  };
  
  // Build filters
  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    ...(selectedPeriod !== 'all' && {
      ...getPeriodDates(selectedPeriod)
    })
  };
  
  // Hooks
  const { reports, isLoading: reportsLoading, createReport, updateReport, deleteReport, submitReport, summary } = useExpenseReports(filters);
  const { stats, isLoading: statsLoading } = useExpenseStats();
  const { pendingApprovals, approveExpense, rejectExpense } = useExpenseApprovals();
  const { policies, updatePolicy } = useExpensePolicies();
  const { categories } = useExpenseCategories();
  const { analytics, isLoading: analyticsLoading } = useExpenseAnalytics();
  const { items, createItem, updateItem, deleteItem, total: itemsTotal, byCategory } = useExpenseItems(selectedReportForItems || '');
  
  // Filter reports based on search
  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const query = searchQuery.toLowerCase();
    return reports.filter(report => 
      report.title?.toLowerCase().includes(query) ||
      report.reportNumber?.toLowerCase().includes(query) ||
      report.description?.toLowerCase().includes(query)
    );
  }, [reports, searchQuery]);
  
  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'total',
      title: 'Spese Totali',
      value: `€${(stats?.totalExpenses || 0).toFixed(2)}`,
      description: `${reports.length} note spese`,
      icon: <Euro className="h-4 w-4 text-blue-600" />,
    },
    {
      id: 'pending',
      title: 'In Attesa',
      value: stats?.pendingApproval || 0,
      description: 'Richiede approvazione',
      trend: stats?.pendingApproval > 0 ? { value: stats.pendingApproval, label: 'da approvare' } : undefined,
      icon: <Clock className="h-4 w-4 text-orange-600" />,
    },
    {
      id: 'reimbursed',
      title: 'Rimborsati',
      value: `€${(stats?.totalReimbursed || 0).toFixed(2)}`,
      description: 'Questo mese',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    },
    {
      id: 'average',
      title: 'Media Report',
      value: `€${(stats?.averagePerReport || 0).toFixed(2)}`,
      description: 'Per nota spese',
      icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
    },
  ], [stats, reports]);
  
  // Prepare columns for reports list
  const reportColumns: Column[] = useMemo(() => [
    {
      key: 'reportNumber',
      label: 'Numero',
      render: (report: any) => (
        <span className="font-medium">{report.reportNumber}</span>
      ),
    },
    {
      key: 'period',
      label: 'Periodo',
      render: (report: any) => {
        const start = report.periodStart || report.startDate;
        const end = report.periodEnd || report.endDate;
        if (!start || !end) return 'N/A';
        return `${format(new Date(start), 'dd/MM')} - ${format(new Date(end), 'dd/MM/yyyy')}`;
      },
    },
    {
      key: 'title',
      label: 'Titolo',
      render: (report: any) => (
        <div>
          <p className="font-medium">{report.title}</p>
          {report.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{report.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Importo',
      render: (report: any) => (
        <span className="font-medium">€{report.totalAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (report: any) => {
        const statusConfig = {
          draft: { color: 'gray', label: 'Bozza', icon: <FileText className="h-3 w-3" /> },
          submitted: { color: 'orange', label: 'In Attesa', icon: <Clock className="h-3 w-3" /> },
          approved: { color: 'green', label: 'Approvata', icon: <CheckCircle className="h-3 w-3" /> },
          rejected: { color: 'red', label: 'Rifiutata', icon: <XCircle className="h-3 w-3" /> },
          reimbursed: { color: 'blue', label: 'Rimborsata', icon: <DollarSign className="h-3 w-3" /> },
        }[report.status];
        
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        );
      },
    },
    {
      key: 'submittedAt',
      label: 'Inviata',
      render: (report: any) => report.submittedAt 
        ? format(new Date(report.submittedAt), 'dd/MM/yyyy', { locale: it })
        : '-',
    },
  ], []);
  
  // Prepare columns for expense items
  const itemColumns: Column[] = useMemo(() => [
    {
      key: 'date',
      label: 'Data',
      render: (item: any) => format(new Date(item.date), 'dd/MM/yyyy'),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (item: any) => (
        <Badge variant="outline">{item.category}</Badge>
      ),
    },
    {
      key: 'description',
      label: 'Descrizione',
      render: (item: any) => (
        <div>
          <p className="font-medium">{item.description}</p>
          {item.vendor && <p className="text-xs text-gray-500">{item.vendor}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Importo',
      render: (item: any) => (
        <span className="font-medium">€{item.amount.toFixed(2)}</span>
      ),
    },
    {
      key: 'receipt',
      label: 'Ricevuta',
      render: (item: any) => item.receiptUrl ? (
        <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          <Receipt className="h-4 w-4" />
        </a>
      ) : '-',
    },
  ], []);
  
  // Handlers
  const handleCreateReport = () => {
    setSelectedReport(null);
    setShowCreateDialog(true);
  };
  
  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setShowCreateDialog(true);
  };
  
  const handleSubmitReport = async (reportId: string) => {
    await submitReport.mutateAsync(reportId);
  };
  
  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Sei sicuro di voler eliminare questa nota spese?')) {
      await deleteReport.mutateAsync(reportId);
    }
  };
  
  const handleApproveReport = async (reportId: string) => {
    await approveExpense.mutateAsync(reportId);
  };
  
  const handleRejectReport = async (reportId: string) => {
    const reason = prompt('Motivo del rifiuto:');
    if (reason) {
      await rejectExpense.mutateAsync({ id: reportId, reason });
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] }),
      queryClient.invalidateQueries({ queryKey: ['expenseStats'] }),
      queryClient.invalidateQueries({ queryKey: ['expenseAnalytics'] }),
    ]);
    setIsRefreshing(false);
    toast({
      title: 'Dashboard aggiornato',
      description: 'Tutti i dati sono stati aggiornati',
    });
  };
  
  const handleExport = () => {
    const csv = [
      ['Numero', 'Titolo', 'Periodo', 'Importo', 'Stato', 'Data Invio'],
      ...filteredReports.map(r => [
        r.reportNumber,
        r.title,
        `${format(new Date(r.periodStart || r.startDate), 'dd/MM/yyyy')} - ${format(new Date(r.periodEnd || r.endDate), 'dd/MM/yyyy')}`,
        r.totalAmount.toFixed(2),
        r.status,
        r.submittedAt ? format(new Date(r.submittedAt), 'dd/MM/yyyy') : ''
      ])
    ];
    
    const csvContent = csv.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Export completato",
      description: "Il file CSV è stato scaricato"
    });
  };
  
  // Quick actions for dashboard
  const quickActions = [
    {
      label: 'Nuova Nota Spese',
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateReport,
      variant: 'default' as const,
    },
    {
      label: 'Scansiona Ricevuta',
      icon: <Camera className="h-4 w-4" />,
      onClick: () => {
        toast({
          title: "Funzione OCR",
          description: "Scansione ricevuta disponibile a breve"
        });
      },
      variant: 'outline' as const,
    },
  ];
  
  // Render content based on tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTemplate
            title="Dashboard Note Spese"
            subtitle={`${selectedPeriod === 'all' ? 'Tutto il periodo' : selectedPeriod === 'thisMonth' ? 'Questo mese' : selectedPeriod === 'lastMonth' ? 'Mese scorso' : selectedPeriod === 'thisYear' ? 'Quest\'anno' : 'Ultimi 3 mesi'} • ${user?.fullName || user?.email}`}
            metrics={metrics}
            metricsLoading={statsLoading}
            quickActions={quickActions}
            showFilters={false}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onExport={handleExport}
            lastUpdated={new Date()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Recent Reports */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Note Spese Recenti</CardTitle>
                  <CardDescription>Le tue ultime note spese</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredReports.slice(0, 5).map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => handleEditReport(report)}>
                        <div className="flex-1">
                          <p className="font-medium">{report.title}</p>
                          <p className="text-sm text-gray-500">
                            €{report.totalAmount.toFixed(2)} • {format(new Date(report.createdAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                    {filteredReports.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nessuna nota spese trovata
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Category Breakdown */}
              {analytics && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Top Categorie</CardTitle>
                    <CardDescription>Spese per categoria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topCategories?.slice(0, 5).map((cat: any) => (
                        <div key={cat.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">€{cat.amount.toFixed(2)}</span>
                            <Badge variant="outline">{cat.count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Approval Queue for Managers */}
              {canApprove && pendingApprovals.length > 0 && (
                <Card className="glass-card border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Da Approvare
                    </CardTitle>
                    <CardDescription>{pendingApprovals.length} note spese in attesa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingApprovals.slice(0, 3).map((report: any) => (
                        <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                          <div>
                            <p className="font-medium">{report.userName}</p>
                            <p className="text-sm text-gray-500">
                              €{report.totalAmount.toFixed(2)} • {report.title}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectReport(report.id)}
                              data-testid={`button-reject-${report.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveReport(report.id)}
                              data-testid={`button-approve-${report.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setActiveTab('approvals')}
                        data-testid="button-view-all-approvals"
                      >
                        Visualizza tutte →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Compliance Status */}
              {analytics && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Stato Compliance</CardTitle>
                    <CardDescription>Conformità alle policy aziendali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tasso di conformità</span>
                        <span className="text-sm font-medium">{analytics.complianceRate}%</span>
                      </div>
                      <Progress value={analytics.complianceRate} className="h-2" />
                      {policies && (
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-xs">
                            <span>Ricevuta obbligatoria oltre</span>
                            <span className="font-medium">€{policies.receiptRequired}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Scadenza invio</span>
                            <span className="font-medium">{policies.submitDeadlineDays} giorni</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DashboardTemplate>
        );
        
      case 'reports':
        return (
          <ListPageTemplate
            title="Note Spese"
            subtitle="Gestisci le tue note spese e richieste di rimborso"
            data={filteredReports}
            columns={reportColumns}
            isLoading={reportsLoading}
            searchPlaceholder="Cerca note spese..."
            filters={[
              {
                id: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'draft', label: 'Bozza' },
                  { value: 'submitted', label: 'Inviata' },
                  { value: 'approved', label: 'Approvata' },
                  { value: 'rejected', label: 'Rifiutata' },
                  { value: 'reimbursed', label: 'Rimborsata' },
                ],
                value: statusFilter,
                onChange: (value: string) => setStatusFilter(value as any),
              },
              {
                id: 'period',
                label: 'Periodo',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutto' },
                  { value: 'thisMonth', label: 'Questo mese' },
                  { value: 'lastMonth', label: 'Mese scorso' },
                  { value: 'thisYear', label: "Quest'anno" },
                  { value: 'last3Months', label: 'Ultimi 3 mesi' },
                ],
                value: selectedPeriod,
                onChange: (value: string) => setSelectedPeriod(value as any),
              },
            ]}
            itemActions={(report) => {
              const actions = [];
              
              if (report.status === 'draft') {
                actions.push({
                  id: 'edit',
                  label: 'Modifica',
                  onClick: () => handleEditReport(report),
                });
                actions.push({
                  id: 'submit',
                  label: 'Invia',
                  onClick: () => handleSubmitReport(report.id),
                });
                actions.push({
                  id: 'delete',
                  label: 'Elimina',
                  onClick: () => handleDeleteReport(report.id),
                });
              }
              
              if (report.status === 'submitted' && canApprove) {
                actions.push({
                  id: 'approve',
                  label: 'Approva',
                  onClick: () => handleApproveReport(report.id),
                });
                actions.push({
                  id: 'reject',
                  label: 'Rifiuta',
                  onClick: () => handleRejectReport(report.id),
                });
              }
              
              actions.push({
                id: 'items',
                label: 'Voci Spesa',
                onClick: () => {
                  setSelectedReportForItems(report.id);
                  setActiveTab('items');
                },
              });
              
              return actions;
            }}
            primaryAction={{
              label: 'Nuova Nota Spese',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreateReport,
            }}
            emptyStateProps={{
              title: 'Nessuna nota spese',
              description: 'Crea la tua prima nota spese per iniziare',
              icon: <Receipt className="h-8 w-8 text-gray-400" />,
              primaryAction: {
                label: 'Crea nota spese',
                onClick: handleCreateReport,
              },
            }}
          />
        );
        
      case 'items':
        return selectedReportForItems ? (
          <ListPageTemplate
            title="Voci Spesa"
            subtitle={`Report: ${reports.find(r => r.id === selectedReportForItems)?.title || 'N/A'}`}
            data={items}
            columns={itemColumns}
            isLoading={false}
            itemActions={(item) => [
              {
                id: 'edit',
                label: 'Modifica',
                onClick: () => {
                  // Edit item logic
                  toast({
                    title: "Modifica voce",
                    description: "Funzionalità in arrivo"
                  });
                },
              },
              {
                id: 'delete',
                label: 'Elimina',
                onClick: () => {
                  if (confirm('Sei sicuro di voler eliminare questa voce?')) {
                    deleteItem.mutate(item.id);
                  }
                },
              },
            ]}
            primaryAction={{
              label: 'Aggiungi Voce',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => {
                // Add item logic
                toast({
                  title: "Aggiungi voce",
                  description: "Funzionalità in arrivo"
                });
              },
            }}
            secondaryAction={{
              label: 'Torna ai Report',
              onClick: () => {
                setSelectedReportForItems(null);
                setActiveTab('reports');
              },
            }}
            emptyStateProps={{
              title: 'Nessuna voce spesa',
              description: 'Aggiungi voci spesa a questo report',
              icon: <FileText className="h-8 w-8 text-gray-400" />,
            }}
          />
        ) : (
          <Card className="glass-card">
            <CardContent className="py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Seleziona un report per visualizzare le voci spesa
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
        
      case 'approvals':
        return canApprove ? (
          <ExpenseApprovalQueue
            pendingApprovals={pendingApprovals}
            onApprove={handleApproveReport}
            onReject={handleRejectReport}
          />
        ) : (
          <Card className="glass-card">
            <CardContent className="py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Non hai i permessi per approvare le note spese
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
        
      case 'analytics':
        return (
          <ExpenseAnalytics
            analytics={analytics}
            loading={analyticsLoading}
          />
        );
        
      case 'policies':
        return canSetPolicies ? (
          <ExpensePolicies
            policies={policies}
            categories={categories}
            onUpdatePolicy={updatePolicy}
          />
        ) : (
          <Card className="glass-card">
            <CardContent className="py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Non hai i permessi per gestire le policy
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="expense-management-page">
        {/* Page Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Gestione Note Spese
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Gestisci le tue note spese, carica scontrini e monitora i rimborsi
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/60 backdrop-blur border-white/30"
                onClick={handleRefresh}
                disabled={isRefreshing}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                className="bg-white/60 backdrop-blur border-white/30"
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabView)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="reports">
              Note Spese
              {reports.filter(r => r.status === 'draft').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {reports.filter(r => r.status === 'draft').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="items">Voci Spesa</TabsTrigger>
            {canApprove && (
              <TabsTrigger value="approvals">
                Approvazioni
                {pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {canSetPolicies && (
              <TabsTrigger value="policies">Policy</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {renderContent()}
          </TabsContent>
        </Tabs>
        
        {/* Create/Edit Report Dialog */}
        {showCreateDialog && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedReport ? 'Modifica Nota Spese' : 'Nuova Nota Spese'}
                </DialogTitle>
              </DialogHeader>
              <ExpenseReportForm
                report={selectedReport}
                onSave={(data) => {
                  if (selectedReport) {
                    updateReport.mutate({ id: selectedReport.id, data });
                  } else {
                    createReport.mutate(data);
                  }
                  setShowCreateDialog(false);
                  setSelectedReport(null);
                }}
                onCancel={() => {
                  setShowCreateDialog(false);
                  setSelectedReport(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default ExpenseManagementPage;