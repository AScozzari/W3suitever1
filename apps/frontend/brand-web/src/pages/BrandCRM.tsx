import { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import { BrandCampaignWizard } from '../components/BrandCampaignWizard';
import { BrandPipelineWizard } from '../components/BrandPipelineWizard';
import BrandFunnelWizard from '../components/BrandFunnelWizard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  LayoutDashboard, Network, GitBranch, Database, 
  TrendingUp, Users, Workflow, Package, 
  FileJson, Download, Upload, Settings, Plus, Search
} from 'lucide-react';

type Tab = 'dashboard' | 'templates' | 'workflows';

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
                { id: 'workflows' as const, label: 'Workflows Builder', icon: GitBranch }
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
      testId: 'card-deployed-bundles'
    },
    {
      title: 'Active Tenants',
      value: '312',
      change: '98% uptime',
      icon: Users,
      testId: 'card-active-tenants'
    },
    {
      title: 'Workflow Versions',
      value: '156',
      change: 'v2.4.1 latest',
      icon: Workflow,
      testId: 'card-workflow-versions'
    },
    {
      title: 'Templates Totali',
      value: '89',
      change: '+12 nuovi',
      icon: FileJson,
      testId: 'card-templates-total'
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.testId}
              className="windtre-glass-panel p-6 hover:shadow-lg transition-shadow cursor-pointer"
              data-testid={stat.testId}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className="h-8 w-8 text-windtre-orange" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.change}</p>
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
      {/* Template Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="windtre-glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Campagne</h3>
            <Button
              onClick={() => setShowCampaignWizard(true)}
              className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
              data-testid="button-create-campaign-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Template
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">28 campi configurabili con validazione business italiana</p>
          <div className="text-2xl font-bold text-gray-900">12 template</div>
        </div>

        <div className="windtre-glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline</h3>
            <Button
              onClick={() => setShowPipelineWizard(true)}
              className="bg-windtre-purple hover:bg-windtre-purple-dark text-white"
              data-testid="button-create-pipeline-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Template
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">41 campi across 3 tabelle con AI orchestration</p>
          <div className="text-2xl font-bold text-gray-900">8 template</div>
        </div>

        <div className="windtre-glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Funnel</h3>
            <Button
              onClick={() => setShowFunnelWizard(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-create-funnel-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Template
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">15 campi con journey orchestration</p>
          <div className="text-2xl font-bold text-gray-900">5 template</div>
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

// Workflows Tab Component (Placeholder - to be implemented)
function WorkflowsTab() {
  return (
    <div className="space-y-6 pb-6">
      <div className="windtre-glass-panel p-12 text-center">
        <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Workflow Builder</h3>
        <p className="text-gray-600 mb-6">
          Crea e gestisci workflow con AI assistant e visual builder
        </p>
        <Button
          className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
          data-testid="button-create-workflow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crea Nuovo Workflow
        </Button>
      </div>
    </div>
  );
}
