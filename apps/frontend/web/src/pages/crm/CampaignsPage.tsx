import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Megaphone, 
  Plus, 
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Target,
  Settings,
  LayoutDashboard,
  UserPlus,
  CheckSquare,
  BarChart3,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { CampaignSettingsDialog } from '@/components/crm/CampaignSettingsDialog';
import { CampaignFiltersDialog, type CampaignFilters } from '@/components/crm/CampaignFiltersDialog';
// import { CampaignLeadsDialog } from '@/components/crm/CampaignLeadsDialog'; // Temporarily disabled

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  type: 'inbound_media' | 'outbound_crm' | 'retention';
  brandSourceType?: 'tenant_only' | 'brand_derived';
  storeId?: string;
  totalLeads: number;
  workedLeads: number;
  notWorkedLeads: number;
  conversionRate: number;
  budget: number;
  startDate: string;
  endDate: string;
}

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const statVariants = {
  rest: { opacity: 0.8, scale: 1 },
  hover: { 
    opacity: 1, 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17
    }
  }
};

export default function CampaignsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | undefined>(undefined);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [leadsDialogCampaign, setLeadsDialogCampaign] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState<CampaignFilters>({
    stores: [],
    drivers: [],
    status: [],
    brandSourceType: [],
  });
  const [location] = useLocation();
  const { navigate, buildUrl } = useTenantNavigation();

  const { data: campaignsResponse, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ['/api/crm/campaigns'],
  });

  const allCampaigns = campaignsResponse || [];

  // For now, use campaigns as-is without stats (stats will be added in next iteration)
  const campaignsWithStats = allCampaigns;

  // Apply filters to campaigns with stats
  const campaigns = campaignsWithStats.filter((campaign) => {
    // Search filter
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Stores filter
    if (filters.stores.length > 0 && !filters.stores.includes(campaign.storeId || '')) {
      return false;
    }

    // Drivers filter (campaigns can have multiple drivers)
    if (filters.drivers.length > 0) {
      // Backend returns targetDriverIds array
      const campaignDrivers = (campaign as any).targetDriverIds || [];
      if (!Array.isArray(campaignDrivers) || campaignDrivers.length === 0 || !campaignDrivers.some((id: string) => filters.drivers.includes(id))) {
        return false;
      }
    }

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(campaign.status)) {
      return false;
    }

    // Brand Source Type filter
    if (filters.brandSourceType.length > 0) {
      // Exclude campaigns without brandSourceType when filter is active
      if (!campaign.brandSourceType || !filters.brandSourceType.includes(campaign.brandSourceType)) {
        return false;
      }
    }

    // Budget filter
    if (filters.budgetMin !== undefined && campaign.budget < filters.budgetMin) {
      return false;
    }
    if (filters.budgetMax !== undefined && campaign.budget > filters.budgetMax) {
      return false;
    }

    // Start Date filter
    if (filters.startDateFrom && new Date(campaign.startDate) < filters.startDateFrom) {
      return false;
    }
    if (filters.startDateTo && new Date(campaign.startDate) > filters.startDateTo) {
      return false;
    }

    // End Date filter
    if (filters.endDateFrom && new Date(campaign.endDate) < filters.endDateFrom) {
      return false;
    }
    if (filters.endDateTo && new Date(campaign.endDate) > filters.endDateTo) {
      return false;
    }

    return true;
  });

  const handleCreateCampaign = () => {
    setEditingCampaignId(undefined);
    setIsSettingsDialogOpen(true);
  };

  const handleEditCampaign = (campaignId: string) => {
    setEditingCampaignId(campaignId);
    setIsSettingsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsSettingsDialogOpen(false);
    setEditingCampaignId(undefined);
  };

  // CRM Tabs Configuration
  const crmTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: buildUrl('crm') },
    { id: 'campaigns', label: 'Campagne', icon: Megaphone, path: buildUrl('crm/campaigns') },
    { id: 'pipeline', label: 'Pipeline', icon: Target, path: buildUrl('crm/pipeline') },
    { id: 'leads', label: 'Lead', icon: UserPlus, path: buildUrl('crm/leads') },
    { id: 'customers', label: 'Clienti', icon: Users, path: buildUrl('crm/customers') },
    { id: 'activities', label: 'Attività', icon: CheckSquare, path: buildUrl('crm/activities') },
    { id: 'analytics', label: 'Report', icon: BarChart3, path: buildUrl('crm/analytics') }
  ];

  const getActiveTab = () => {
    if (location.includes('/crm/campaigns')) return 'campaigns';
    if (location.includes('/crm/leads')) return 'leads';
    if (location.includes('/crm/pipeline')) return 'pipeline';
    if (location.includes('/crm/customers')) return 'customers';
    if (location.includes('/crm/activities')) return 'activities';
    if (location.includes('/crm/analytics')) return 'analytics';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const CRMHeader = () => (
    <div className="windtre-glass-panel border-b border-white/20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-windtre-orange" />
              CRM - Campagne Marketing
            </h1>
            <p className="text-gray-600 mt-1">Gestione campagne inbound, outbound e retention</p>
          </div>
        </div>
        
        {/* 🎯 Navigation Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {crmTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => navigate(tab.path)}
              className="flex items-center gap-2 flex-shrink-0"
              data-testid={`crm-tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="h-full flex flex-col">
          <CRMHeader />
          <div className="flex-1 px-6 overflow-auto">
            <LoadingState />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="h-full flex flex-col">
          <CRMHeader />
          <div className="flex-1 px-6 overflow-auto">
            <ErrorState message="Errore nel caricamento delle campagne" />
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'hsl(var(--success))';
      case 'paused': return 'hsl(var(--warning))';
      case 'completed': return 'hsl(var(--brand-purple))';
      case 'draft': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'paused': return 'In pausa';
      case 'completed': return 'Completata';
      case 'draft': return 'Bozza';
      default: return status;
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="h-full flex flex-col">
        <CRMHeader />
        
        {/* Search & Filters Card */}
        <div className="px-6 pt-6">
          <Card 
            className="glass-card p-4 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                <Input
                  placeholder="Cerca campagna per nome, canale, tipo o stato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ 
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)'
                  }}
                  aria-label="Cerca campagne"
                  data-testid="input-search-campaigns"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsFiltersOpen(true)}
                data-testid="button-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri Avanzati
              </Button>
              <Button variant="outline" data-testid="button-date-range">
                <Calendar className="h-4 w-4 mr-2" />
                Periodo
              </Button>
              <Button
                onClick={handleCreateCampaign}
                style={{ background: 'hsl(var(--brand-orange))' }}
                className="text-white"
                data-testid="button-create-campaign"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuova Campagna
              </Button>
            </div>
          </Card>
        </div>
        
        <div className="flex-1 px-6 space-y-6 overflow-auto">
          {/* Campaign Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 py-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {campaigns?.map((campaign) => (
            <motion.div
              key={campaign.id}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`campaign-card-${campaign.id}`}
            >
              <Card 
                  onClick={() => navigate(`crm/leads?campaign=${campaign.id}`)}
                  className="glass-card border-0 overflow-hidden cursor-pointer"
                  style={{ 
                    background: 'var(--glass-card-bg)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid var(--glass-card-border)',
                    borderLeft: `4px solid ${getStatusColor(campaign.status)}`,
                    boxShadow: 'var(--shadow-glass)',
                    transition: 'var(--glass-transition)'
                  }}
                >
                  {/* Campaign Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                          {campaign.name}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: getStatusColor(campaign.status),
                              color: getStatusColor(campaign.status),
                              background: 'var(--glass-bg-light)'
                            }}
                          >
                            {getStatusLabel(campaign.status)}
                          </Badge>
                          {campaign.brandSourceType && (
                            <Badge 
                              variant="outline" 
                              className="text-xs font-semibold"
                              style={{ 
                                borderColor: campaign.brandSourceType === 'brand_derived' 
                                  ? 'hsl(var(--brand-purple))' 
                                  : 'hsl(var(--brand-orange))',
                                color: campaign.brandSourceType === 'brand_derived' 
                                  ? 'hsl(var(--brand-purple))' 
                                  : 'hsl(var(--brand-orange))',
                                background: 'var(--glass-bg-light)'
                              }}
                              data-testid={`badge-brand-type-${campaign.id}`}
                            >
                              {campaign.brandSourceType === 'brand_derived' ? '🔗 Brand HQ' : '🏢 Tenant'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye 
                          className="h-5 w-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" 
                          style={{ color: 'hsl(var(--brand-orange))' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`crm/campaigns/${campaign.id}/leads`);
                          }}
                          data-testid={`button-view-${campaign.id}`}
                        />
                        <Settings 
                          className="h-5 w-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" 
                          style={{ color: 'hsl(var(--brand-orange))' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditCampaign(campaign.id);
                          }}
                          data-testid={`button-settings-${campaign.id}`}
                          title="Impostazioni Campagna"
                        />
                      </div>
                    </div>
                  </div>

                {/* Stats Grid */}
                <motion.div 
                  className="px-6 pb-4 grid grid-cols-3 gap-3"
                  initial="rest"
                  whileHover="hover"
                  variants={{ hover: { transition: { staggerChildren: 0.05 } } }}
                >
                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Totali</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {campaign.totalLeads}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="h-3 w-3" style={{ color: 'hsl(var(--success))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Lavorati</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {campaign.workedLeads}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-3 w-3" style={{ color: 'hsl(var(--warning))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Non lavorati</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'hsl(var(--warning))' }}>
                      {campaign.notWorkedLeads}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Conversion Rate & Budget */}
                <div 
                  className="px-6 py-4 mt-2 flex items-center justify-between"
                  style={{ 
                    background: 'var(--glass-bg-heavy)',
                    borderTop: '1px solid var(--glass-card-border)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Conv. Rate
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {campaign.conversionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      €{(campaign.budget / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Selected Campaign Details - Coming Soon */}
        <AnimatePresence>
          {selectedCampaign && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card 
                className="glass-card p-6 border-0"
                style={{ 
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-card-border)',
                  boxShadow: 'var(--shadow-glass-lg)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Lead della campagna: {selectedCampaign.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedCampaign(null)}
                  >
                    Chiudi
                  </Button>
                </div>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: 'hsl(var(--brand-orange))' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    DataTable leads in arrivo con azioni bulk e export
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Campaign Settings Dialog */}
      <CampaignSettingsDialog
        open={isSettingsDialogOpen}
        onClose={handleCloseDialog}
        campaignId={editingCampaignId}
        mode={editingCampaignId ? 'edit' : 'create'}
      />

      {/* Campaign Filters Dialog */}
      <CampaignFiltersDialog
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setIsFiltersOpen(false);
        }}
      />
    </Layout>
  );
}

// 🎯 EXPORT CONTENT-ONLY per CRMPage unificato (senza Layout/tabs)
export function CampaignsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | undefined>(undefined);
  const { navigate, buildUrl } = useTenantNavigation();

  const { data: campaignsResponse, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ['/api/crm/campaigns'],
  });

  // Apply search filter only (CampaignsContent is simplified version without advanced filters)
  const campaigns = (campaignsResponse || []).filter((campaign) => {
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCreateCampaign = () => {
    setEditingCampaignId(undefined);
    setIsSettingsDialogOpen(true);
  };

  const handleEditCampaign = (campaignId: string) => {
    setEditingCampaignId(campaignId);
    setIsSettingsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsSettingsDialogOpen(false);
    setEditingCampaignId(undefined);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'hsl(var(--success))';
      case 'paused': return 'hsl(var(--warning))';
      case 'completed': return 'hsl(var(--brand-purple))';
      case 'draft': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'paused': return 'In pausa';
      case 'completed': return 'Completata';
      case 'draft': return 'Bozza';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="px-6 py-6">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <ErrorState message="Errore nel caricamento delle campagne" />
      </div>
    );
  }

  return (
    <>
      {/* Search & Filters Card */}
      <div className="px-6 pt-6">
        <Card 
          className="glass-card p-4 border-0"
          style={{ 
            background: 'var(--glass-card-bg)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-card-border)',
            boxShadow: 'var(--shadow-glass-sm)'
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <Input
                placeholder="Cerca campagna per nome, canale, tipo o stato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-card-border)'
                }}
                aria-label="Cerca campagne"
                data-testid="input-search-campaigns"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              Filtri Avanzati
            </Button>
            <Button variant="outline" data-testid="button-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              Periodo
            </Button>
            <Button
              onClick={handleCreateCampaign}
              style={{ background: 'hsl(var(--brand-orange))' }}
              className="text-white"
              data-testid="button-create-campaign"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova Campagna
            </Button>
          </div>
        </Card>
      </div>
      
      <div className="flex-1 px-6 space-y-6 overflow-auto">
        {/* Campaign Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 py-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {campaigns?.map((campaign) => (
            <motion.div
              key={campaign.id}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`campaign-card-${campaign.id}`}
            >
              <Card 
                  onClick={() => navigate(`crm/leads?campaign=${campaign.id}`)}
                  className="glass-card border-0 overflow-hidden cursor-pointer"
                  style={{ 
                    background: 'var(--glass-card-bg)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid var(--glass-card-border)',
                    borderLeft: `4px solid ${getStatusColor(campaign.status)}`,
                    boxShadow: 'var(--shadow-glass)',
                    transition: 'var(--glass-transition)'
                  }}
                >
                  {/* Campaign Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                          {campaign.name}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: getStatusColor(campaign.status),
                              color: getStatusColor(campaign.status),
                              background: 'var(--glass-bg-light)'
                            }}
                          >
                            {getStatusLabel(campaign.status)}
                          </Badge>
                          {campaign.brandSourceType && (
                            <Badge 
                              variant="outline" 
                              className="text-xs font-semibold"
                              style={{ 
                                borderColor: campaign.brandSourceType === 'brand_derived' 
                                  ? 'hsl(var(--brand-purple))' 
                                  : 'hsl(var(--brand-orange))',
                                color: campaign.brandSourceType === 'brand_derived' 
                                  ? 'hsl(var(--brand-purple))' 
                                  : 'hsl(var(--brand-orange))',
                                background: 'var(--glass-bg-light)'
                              }}
                              data-testid={`badge-brand-type-${campaign.id}`}
                            >
                              {campaign.brandSourceType === 'brand_derived' ? '🔗 Brand HQ' : '🏢 Tenant'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye 
                          className="h-5 w-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" 
                          style={{ color: 'hsl(var(--brand-orange))' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`crm/campaigns/${campaign.id}/leads`);
                          }}
                          data-testid={`button-view-${campaign.id}`}
                        />
                        <Settings 
                          className="h-5 w-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" 
                          style={{ color: 'hsl(var(--brand-orange))' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditCampaign(campaign.id);
                          }}
                          data-testid={`button-settings-${campaign.id}`}
                          title="Impostazioni Campagna"
                        />
                      </div>
                    </div>
                  </div>

                {/* Stats Grid */}
                <motion.div 
                  className="px-6 pb-4 grid grid-cols-3 gap-3"
                  initial="rest"
                  whileHover="hover"
                  variants={{ hover: { transition: { staggerChildren: 0.05 } } }}
                >
                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Totali</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {campaign.totalLeads}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="h-3 w-3" style={{ color: 'hsl(var(--success))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Lavorati</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {campaign.workedLeads}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="text-center p-3 rounded-lg"
                    variants={statVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-3 w-3" style={{ color: 'hsl(var(--warning))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Non lavorati</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'hsl(var(--warning))' }}>
                      {campaign.notWorkedLeads}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Conversion Rate & Budget */}
                <div 
                  className="px-6 py-4 mt-2 flex items-center justify-between"
                  style={{ 
                    background: 'var(--glass-bg-heavy)',
                    borderTop: '1px solid var(--glass-card-border)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Conv. Rate
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {campaign.conversionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      €{(campaign.budget / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Selected Campaign Details - Coming Soon */}
        <AnimatePresence>
          {selectedCampaign && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card 
                className="glass-card p-6 border-0"
                style={{ 
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-card-border)',
                  boxShadow: 'var(--shadow-glass-lg)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Lead della campagna: {selectedCampaign.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedCampaign(null)}
                  >
                    Chiudi
                  </Button>
                </div>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: 'hsl(var(--brand-orange))' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    DataTable leads in arrivo con azioni bulk e export
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Campaign Settings Dialog */}
      <CampaignSettingsDialog
        open={isSettingsDialogOpen}
        onClose={handleCloseDialog}
        campaignId={editingCampaignId}
        mode={editingCampaignId ? 'edit' : 'create'}
      />

      {/* Note: CampaignsContent is simplified - no filters dialog */}
    </>
  );
}
