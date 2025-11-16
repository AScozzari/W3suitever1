import { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import { BrandCampaignWizard } from '../components/BrandCampaignWizard';
import { BrandPipelineWizard } from '../components/BrandPipelineWizard';
import BrandFunnelWizard from '../components/BrandFunnelWizard';
import { BrandWorkflowsTab } from '../components/BrandWorkflowsTab';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  LayoutDashboard, Network, GitBranch, Database, 
  TrendingUp, Users, Workflow, Package, 
  FileJson, Download, Upload, Settings, Plus, Search,
  Megaphone, Target, Zap, CheckSquare
} from 'lucide-react';

type Tab = 'dashboard' | 'templates' | 'workflows' | 'tasks';

export default function BrandCRM() {
  const { isAuthenticated } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  return (
    <BrandLayout>
      <div className="h-full flex flex-col">
        {/* 🎯 WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Network className="h-6 w-6 text-windtre-orange" />
                  Master Catalog CRM
                </h1>
                <p className="text-gray-600 mt-1">
                  Governance centralizzato per {isCrossTenant ? '300+ tenant' : `tenant ${currentTenant}`}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" data-testid="button-import-templates">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Templates
                </Button>
                <Button 
                  className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                  data-testid="button-deploy-bundle"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Deploy Bundle
                </Button>
              </div>
            </div>
            
            {/* 🎯 Navigation Tabs */}
            <div className="flex gap-1 mt-4">
              {[
                { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
                { id: 'templates' as const, label: 'Struttura Campagne', icon: Database },
                { id: 'workflows' as const, label: 'Workflows Builder', icon: GitBranch },
                { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca template, workflow o configurazione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
          {activeTab === 'tasks' && <TasksTab />}
        </div>
      </div>
    </BrandLayout>
  );
}

// Dashboard Tab Component
function DashboardTab() {
  const statCards = [
    {
      title: 'Deployed Bundles',
      value: '23',
      change: '+3 questo mese',
      icon: Package,
      testId: 'card-deployed-bundles',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
      badgeBgColor: 'bg-blue-50'
    },
    {
      title: 'Active Tenants',
      value: '312',
      change: '98% uptime',
      icon: Users,
      testId: 'card-active-tenants',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
      badgeBgColor: 'bg-green-50'
    },
    {
      title: 'Workflow Versions',
      value: '156',
      change: 'v2.4.1 latest',
      icon: Workflow,
      testId: 'card-workflow-versions',
      borderColor: 'border-purple-200',
      hoverBorderColor: 'hover:border-purple-400',
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
      badgeBgColor: 'bg-purple-50'
    },
    {
      title: 'Templates Totali',
      value: '89',
      change: '+12 nuovi',
      icon: FileJson,
      testId: 'card-templates-total',
      borderColor: 'border-orange-200',
      hoverBorderColor: 'hover:border-orange-400',
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      badgeBgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Stats Grid - Con bordi colorati come Strutture Campagne */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.testId}
              className={`bg-white rounded-lg border-2 ${stat.borderColor} ${stat.hoverBorderColor} p-6 hover:shadow-lg transition-all cursor-pointer`}
              data-testid={stat.testId}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 ${stat.iconBgColor} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">{stat.title}</h3>
              <p className={`text-3xl font-bold ${stat.valueColor} mb-3`}>{stat.value}</p>
              <span className={`text-xs text-gray-500 ${stat.badgeBgColor} px-2 py-1 rounded`}>{stat.change}</span>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="windtre-glass-panel p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Attività Recenti</h2>
        <div className="space-y-3">
          {[
            { action: 'Template campagna "Black Friday 2024" creato', time: '2 ore fa', type: 'success' },
            { action: 'Workflow "Lead Nurturing v2" aggiornato', time: '5 ore fa', type: 'info' },
            { action: 'Bundle deployato su 45 tenant', time: '1 giorno fa', type: 'success' }
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <p className="text-sm text-gray-700">{activity.action}</p>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Templates Tab Component
function TemplatesTab() {
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [showPipelineWizard, setShowPipelineWizard] = useState(false);
  const [showFunnelWizard, setShowFunnelWizard] = useState(false);

  const handleSaveTemplate = (template: any) => {
    console.log('Template saved:', template);
    // TODO: Save to JSON file for Git versioning
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Template Types Grid - Styled diversamente dal Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Campagne Card */}
        <div className="bg-white rounded-lg border-2 border-orange-200 p-6 hover:border-orange-400 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Megaphone className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Campagne</h3>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">28 campi configurabili con validazione business italiana</p>
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-orange-600">12</div>
            <span className="text-xs text-gray-500 bg-orange-50 px-2 py-1 rounded">template attivi</span>
          </div>
          <Button
            onClick={() => setShowCampaignWizard(true)}
            className="w-full bg-windtre-orange hover:bg-windtre-orange-dark text-white"
            data-testid="button-create-campaign-template"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crea Template
          </Button>
        </div>

        {/* Pipeline Card */}
        <div className="bg-white rounded-lg border-2 border-purple-200 p-6 hover:border-purple-400 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pipeline</h3>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">41 campi across 3 tabelle con AI orchestration</p>
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-purple-600">8</div>
            <span className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded">template attivi</span>
          </div>
          <Button
            onClick={() => setShowPipelineWizard(true)}
            className="w-full bg-windtre-purple hover:bg-windtre-purple-dark text-white"
            data-testid="button-create-pipeline-template"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crea Template
          </Button>
        </div>

        {/* Funnel Card */}
        <div className="bg-white rounded-lg border-2 border-green-200 p-6 hover:border-green-400 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Funnel</h3>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">15 campi con journey orchestration</p>
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-green-600">5</div>
            <span className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded">template attivi</span>
          </div>
          <Button
            onClick={() => setShowFunnelWizard(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-create-funnel-template"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crea Template
          </Button>
        </div>
      </div>

      {/* Wizards */}
      <BrandCampaignWizard
        open={showCampaignWizard}
        onClose={() => setShowCampaignWizard(false)}
        onSave={handleSaveTemplate}
      />

      <BrandPipelineWizard
        open={showPipelineWizard}
        onClose={() => setShowPipelineWizard(false)}
        onSave={handleSaveTemplate}
      />

      <BrandFunnelWizard
        open={showFunnelWizard}
        onClose={() => setShowFunnelWizard(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}

// Workflows Tab Component - Full implementation with canvas builder
function WorkflowsTab() {
  return <BrandWorkflowsTab />;
}

// Tasks Tab Component - Gestione attività Brand Interface
function TasksTab() {
  const mockTasks = [
    {
      id: '1',
      title: 'Revisione template campagna Black Friday',
      assignee: 'Marco Rossi',
      status: 'In Progress',
      priority: 'High',
      dueDate: '2024-11-20',
      category: 'Templates'
    },
    {
      id: '2',
      title: 'Deploy workflow v2.4.1 su tenant pilot',
      assignee: 'Laura Bianchi',
      status: 'Pending',
      priority: 'Medium',
      dueDate: '2024-11-22',
      category: 'Workflows'
    },
    {
      id: '3',
      title: 'Validazione pipeline CRM Enterprise',
      assignee: 'Giovanni Verdi',
      status: 'Completed',
      priority: 'High',
      dueDate: '2024-11-15',
      category: 'Templates'
    },
    {
      id: '4',
      title: 'Sync bundle master catalog su 50 tenant',
      assignee: 'Sara Neri',
      status: 'Pending',
      priority: 'Low',
      dueDate: '2024-11-25',
      category: 'Deployment'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-orange-100 text-orange-700';
      case 'Low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header con statistiche rapide */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Totali</p>
          <p className="text-2xl font-bold text-gray-900">{mockTasks.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {mockTasks.filter(t => t.status === 'In Progress').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {mockTasks.filter(t => t.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {mockTasks.filter(t => t.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Tasks DataTable */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tasks Attività</h2>
          <Button
            className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
            data-testid="button-create-task"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Task
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assegnato a
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorità
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scadenza
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockTasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  data-testid={`task-row-${task.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{task.assignee}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{task.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {task.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
