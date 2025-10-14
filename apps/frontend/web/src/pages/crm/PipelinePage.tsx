import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  TrendingUp,
  Target,
  Euro,
  Eye,
  Search,
  Filter,
  Calendar,
  Users,
  BarChart3,
  LayoutDashboard,
  Megaphone,
  UserPlus,
  CheckSquare,
  Globe,
  Handshake,
  Mail,
  Phone,
  Linkedin,
  MinusCircle,
  Plus,
  X
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { PipelineSettingsDialog } from '@/components/crm/PipelineSettingsDialog';
import { CreatePipelineDialog } from '@/components/crm/CreatePipelineDialog';
import { PipelineFiltersDialog, PipelineFilters } from '@/components/crm/PipelineFiltersDialog';
import { useState, useEffect, useMemo } from 'react';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { useTenantNavigation } from '@/hooks/useTenantSafety';

interface Pipeline {
  id: string;
  name: string;
  driver: 'FISSO' | 'MOBILE' | 'DEVICE' | 'ACCESSORI';
  activeDeals: number;
  totalValue: number;
  conversionRate: number;
  avgDealValue: number;
  products: string[];
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  ownerName?: string;
}

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15
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

const metricVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17
    }
  }
};

// Category color mapping
const categoryColors: Record<string, string> = {
  starter: '#10b981',    // green
  progress: '#3b82f6',   // blue
  pending: '#f59e0b',    // amber
  purchase: '#8b5cf6',   // violet
  finalized: '#22c55e',  // success green
  ko: '#ef4444',         // red
  archive: '#6b7280'     // gray
};

// Channel icon mapping
const getChannelIcon = (channel: string) => {
  if (channel.toLowerCase().includes('web') || channel.toLowerCase().includes('inbound')) return Globe;
  if (channel.toLowerCase().includes('partner') || channel.toLowerCase().includes('referral')) return Handshake;
  if (channel.toLowerCase().includes('email') || channel.toLowerCase().includes('campaign')) return Mail;
  if (channel.toLowerCase().includes('call') || channel.toLowerCase().includes('cold')) return Phone;
  if (channel.toLowerCase().includes('linkedin')) return Linkedin;
  if (channel.toLowerCase().includes('event')) return Target;
  return Users;
};

// CategoryBars Component - Tutte le 7 categorie standard
function CategoryBars({ pipelineId, driverColor }: { pipelineId: string; driverColor: string }) {
  const { data: categoryStats } = useQuery<Array<{ category: string; count: number; percentage: number }>>({
    queryKey: [`/api/crm/pipelines/${pipelineId}/category-stats`],
  });

  // 🎯 Categorie standard in ordine fisso (sempre mostrate)
  const standardCategories = ['starter', 'progress', 'pending', 'purchase', 'finalized', 'ko', 'archive'];
  
  // Combina dati API con categorie standard
  const fullCategories = standardCategories.map(category => {
    const stat = categoryStats?.find(s => s.category === category);
    return {
      category,
      count: stat?.count || 0,
      percentage: stat?.percentage || 0
    };
  });

  return (
    <div className="px-6 pb-4">
      <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Distribuzione per Categoria
      </div>
      <div className="space-y-2">
        {fullCategories.map((stat, idx) => (
          <motion.div
            key={stat.category}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
            className="flex items-center gap-2"
            style={{ transformOrigin: 'left' }}
          >
            <span className="text-xs capitalize min-w-[80px]" style={{ color: stat.percentage > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
              {stat.category}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg-heavy)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.percentage}%` }}
                transition={{ delay: idx * 0.03 + 0.1, duration: 0.4 }}
                className="h-full"
                style={{ background: stat.percentage > 0 ? (categoryColors[stat.category] || driverColor) : 'transparent' }}
              />
            </div>
            <span className="text-xs font-medium min-w-[40px] text-right" style={{ color: stat.percentage > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
              {stat.percentage.toFixed(0)}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ChannelBars Component - Sempre 5 righe standardizzate
function ChannelBars({ pipelineId, driverColor }: { pipelineId: string; driverColor: string }) {
  const { data: channelStats } = useQuery<Array<{ channel: string; count: number; percentage: number }>>({
    queryKey: [`/api/crm/pipelines/${pipelineId}/channel-stats`],
  });

  // 🎯 Top 5 canali + placeholder se necessario (altezza costante)
  const topChannels = channelStats?.slice(0, 5) || [];
  const displayChannels = [...topChannels.map(ch => ({ ...ch, isPlaceholder: false }))];
  
  // Aggiungi placeholder per arrivare a 5 righe
  while (displayChannels.length < 5) {
    displayChannels.push({
      channel: displayChannels.length === 0 ? 'Nessun canale' : 'Altri canali',
      count: 0,
      percentage: 0,
      isPlaceholder: true
    });
  }

  return (
    <div className="px-6 pb-4">
      <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Canali di Contatto
      </div>
      <div className="space-y-2">
        {displayChannels.map((stat, idx) => {
          const isPlaceholder = stat.isPlaceholder || false;
          const isNotContacted = stat.channel === 'Non contattato';
          const ChannelIcon = isPlaceholder ? MinusCircle : getChannelIcon(stat.channel);
          const barColor = isPlaceholder ? 'transparent' : isNotContacted ? 'hsl(0, 84%, 60%)' : driverColor;
          const iconColor = isPlaceholder ? 'var(--text-tertiary)' : isNotContacted ? 'hsl(0, 84%, 60%)' : driverColor;
          
          return (
            <motion.div
              key={`${stat.channel}-${idx}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <ChannelIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: iconColor }} />
              <span className="text-xs min-w-[120px] truncate" style={{ color: isPlaceholder ? 'var(--text-tertiary)' : 'var(--text-secondary)' }} title={stat.channel}>
                {stat.channel}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg-heavy)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.percentage}%` }}
                  transition={{ delay: idx * 0.03 + 0.1, duration: 0.4 }}
                  className="h-full"
                  style={{ background: barColor }}
                />
              </div>
              <span className="text-xs font-medium min-w-[40px] text-right" style={{ color: isPlaceholder ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                {stat.percentage.toFixed(0)}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsPipelineId, setSettingsPipelineId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [defaultFilterTab, setDefaultFilterTab] = useState<string>('base');
  const [filters, setFilters] = useState<PipelineFilters>({
    stores: [],
    drivers: [],
    stato: 'tutte',
  });
  const [location] = useLocation();
  const { buildUrl } = useTenantNavigation();

  // Load filters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pipeline-filters-v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore dates from ISO strings
        if (parsed.dataCreazioneDa) parsed.dataCreazioneDa = new Date(parsed.dataCreazioneDa);
        if (parsed.dataCreazioneA) parsed.dataCreazioneA = new Date(parsed.dataCreazioneA);
        if (parsed.dataAggiornamentoDa) parsed.dataAggiornamentoDa = new Date(parsed.dataAggiornamentoDa);
        if (parsed.dataAggiornamentoA) parsed.dataAggiornamentoA = new Date(parsed.dataAggiornamentoA);
        setFilters(parsed);
      } catch (e) {
        console.error('Error loading filters from localStorage:', e);
      }
    }
  }, []);

  // Save filters to localStorage on change
  useEffect(() => {
    localStorage.setItem('pipeline-filters-v1', JSON.stringify(filters));
  }, [filters]);
  
  // CRM Navigation Tabs
  const crmTabs = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: buildUrl('crm') },
    { value: 'campaigns', label: 'Campagne', icon: Megaphone, path: buildUrl('crm/campaigns') },
    { value: 'pipeline', label: 'Pipeline', icon: Target, path: buildUrl('crm/pipeline') },
    { value: 'leads', label: 'Lead', icon: UserPlus, path: buildUrl('crm/leads') },
    { value: 'customers', label: 'Clienti', icon: Users, path: buildUrl('crm/customers') },
    { value: 'activities', label: 'Attività', icon: CheckSquare, path: buildUrl('crm/activities') },
    { value: 'analytics', label: 'Report', icon: BarChart3, path: buildUrl('crm/analytics') }
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

  const { data: pipelinesResponse, isLoading, error } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
  });

  const pipelines = pipelinesResponse || [];

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.stores.length > 0) count++;
    if (filters.drivers.length > 0) count++;
    if (filters.stato !== 'tutte') count++;
    if (filters.valoreMin !== undefined || filters.valoreMax !== undefined) count++;
    if (filters.conversionMin !== undefined || filters.conversionMax !== undefined) count++;
    if (filters.dealsMin !== undefined || filters.dealsMax !== undefined) count++;
    if (filters.avgDealMin !== undefined || filters.avgDealMax !== undefined) count++;
    if (filters.dataCreazioneDa || filters.dataCreazioneA) count++;
    if (filters.dataAggiornamentoDa || filters.dataAggiornamentoA) count++;
    if (filters.ownerId) count++;
    if (filters.teamId) count++;
    return count;
  }, [filters]);

  // Filter pipelines based on search and advanced filters
  const filteredPipelines = useMemo(() => {
    let result = [...pipelines];

    // Apply search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.driver?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.ownerName?.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (filters.drivers.length > 0) {
      result = result.filter(p => filters.drivers.includes(p.driver));
    }

    if (filters.stato === 'attiva') {
      result = result.filter(p => p.isActive !== false);
    } else if (filters.stato === 'non_attiva') {
      result = result.filter(p => p.isActive === false);
    }

    if (filters.valoreMin !== undefined) {
      result = result.filter(p => p.totalValue >= filters.valoreMin!);
    }
    if (filters.valoreMax !== undefined) {
      result = result.filter(p => p.totalValue <= filters.valoreMax!);
    }

    if (filters.conversionMin !== undefined) {
      result = result.filter(p => p.conversionRate >= filters.conversionMin!);
    }
    if (filters.conversionMax !== undefined) {
      result = result.filter(p => p.conversionRate <= filters.conversionMax!);
    }

    if (filters.dealsMin !== undefined) {
      result = result.filter(p => p.activeDeals >= filters.dealsMin!);
    }
    if (filters.dealsMax !== undefined) {
      result = result.filter(p => p.activeDeals <= filters.dealsMax!);
    }

    if (filters.avgDealMin !== undefined) {
      result = result.filter(p => p.avgDealValue >= filters.avgDealMin!);
    }
    if (filters.avgDealMax !== undefined) {
      result = result.filter(p => p.avgDealValue <= filters.avgDealMax!);
    }

    if (filters.dataCreazioneDa) {
      result = result.filter(p => p.createdAt && new Date(p.createdAt) >= filters.dataCreazioneDa!);
    }
    if (filters.dataCreazioneA) {
      result = result.filter(p => p.createdAt && new Date(p.createdAt) <= filters.dataCreazioneA!);
    }

    if (filters.dataAggiornamentoDa) {
      result = result.filter(p => p.updatedAt && new Date(p.updatedAt) >= filters.dataAggiornamentoDa!);
    }
    if (filters.dataAggiornamentoA) {
      result = result.filter(p => p.updatedAt && new Date(p.updatedAt) <= filters.dataAggiornamentoA!);
    }

    if (filters.ownerId) {
      result = result.filter(p => p.ownerId === filters.ownerId);
    }

    return result;
  }, [pipelines, searchQuery, filters]);

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          {/* WindTre Glassmorphism Header */}
          <div className="windtre-glass-panel border-b border-white/20 mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Target className="h-6 w-6 text-windtre-orange" />
                    CRM - Pipeline e Fasi
                  </h1>
                  <p className="text-gray-600 mt-1">Gestione pipeline di vendita e workflow</p>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex gap-1 mt-4">
                {crmTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <Link
                      key={tab.value}
                      href={tab.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-windtre-orange text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          
          <CRMSearchBar 
            onSearch={setSearchQuery}
            placeholder="Cerca pipeline..."
          />
          <div className="flex-1 p-6 overflow-auto">
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
        <div className="flex flex-col h-full">
          {/* WindTre Glassmorphism Header */}
          <div className="windtre-glass-panel border-b border-white/20 mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Target className="h-6 w-6 text-windtre-orange" />
                    CRM - Pipeline e Fasi
                  </h1>
                  <p className="text-gray-600 mt-1">Gestione pipeline di vendita e workflow</p>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex gap-1 mt-4">
                {crmTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <Link
                      key={tab.value}
                      href={tab.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-windtre-orange text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          
          <CRMSearchBar 
            onSearch={setSearchQuery}
            placeholder="Cerca pipeline..."
          />
          <div className="flex-1 p-6 overflow-auto">
            <ErrorState message="Errore nel caricamento delle pipeline" />
          </div>
        </div>
      </Layout>
    );
  }

  const getDriverGradient = (driver: string) => {
    switch (driver) {
      case 'FISSO': return 'var(--brand-glass-orange)';
      case 'MOBILE': return 'var(--brand-glass-purple)';
      case 'DEVICE': return 'var(--brand-glass-gradient)';
      case 'ACCESSORI': return 'var(--brand-glass-orange)';
      default: return 'var(--glass-card-bg)';
    }
  };

  const getDriverColor = (driver: string) => {
    switch (driver) {
      case 'FISSO': return 'hsl(var(--brand-orange))';
      case 'MOBILE': return 'hsl(var(--brand-purple))';
      case 'DEVICE': return 'hsl(var(--brand-orange))';
      case 'ACCESSORI': return 'hsl(var(--brand-purple))';
      default: return 'var(--text-primary)';
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        {/* WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-6 w-6 text-windtre-orange" />
                  CRM - Pipeline e Fasi
                </h1>
                <p className="text-gray-600 mt-1">Gestione pipeline di vendita e workflow</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-1 mt-4">
              {crmTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={tab.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-windtre-orange text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca pipeline..."
        />
        <div className="flex-1 p-6 overflow-auto space-y-6">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                €{((pipelines?.reduce((sum: number, p: Pipeline) => sum + p.totalValue, 0) || 0) / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Valore totale pipeline
              </div>
            </div>
          </div>

        {/* Search & Filters */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <Input
                  placeholder="Cerca pipeline per nome, driver, descrizione o responsabile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                  style={{ 
                    background: searchQuery ? 'var(--glass-bg-heavy)' : 'var(--glass-bg-light)',
                    border: searchQuery ? '2px solid hsl(var(--brand-orange))' : '1px solid var(--glass-card-border)',
                    transition: 'all 0.2s ease'
                  }}
                  data-testid="input-search-pipelines"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                    data-testid="button-clear-search"
                    title="Cancella ricerca"
                  >
                    <X className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setFiltersDialogOpen(true)}
                data-testid="button-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri Avanzati
                {activeFiltersCount > 0 && (
                  <Badge 
                    className="ml-2" 
                    style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                    data-testid="badge-filters-count"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                style={{ background: 'hsl(var(--brand-orange))' }}
                className="text-white"
                data-testid="button-create-pipeline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuova Pipeline
              </Button>
            </div>

            {/* Results Counter */}
            {(searchQuery || activeFiltersCount > 0) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }} data-testid="text-results-count">
                  Trovate <strong style={{ color: 'hsl(var(--brand-orange))' }}>{filteredPipelines.length}</strong> pipeline su <strong>{pipelines.length}</strong>
                </p>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ stores: [], drivers: [], stato: 'tutte' })}
                    data-testid="button-reset-all-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Rimuovi filtri
                  </Button>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Pipeline Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredPipelines?.map((pipeline: Pipeline) => {
            return (
              <motion.div
                key={pipeline.id}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                className="cursor-pointer"
                onClick={() => setSelectedPipeline(pipeline)}
                data-testid={`pipeline-card-${pipeline.driver?.toLowerCase() || 'unknown'}`}
              >
                <Card 
                  className="glass-card border-0"
                  style={{ 
                    background: 'var(--glass-card-bg)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid var(--glass-card-border)',
                    borderLeft: `4px solid ${getDriverColor(pipeline.driver || 'FISSO')}`,
                    boxShadow: 'var(--shadow-glass)',
                    transition: 'var(--glass-transition)'
                  }}
                >
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                          {pipeline.name}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Driver: <span style={{ color: getDriverColor(pipeline.driver || 'FISSO'), fontWeight: 500 }}>
                            {pipeline.driver || 'N/D'}
                          </span>
                        </p>
                      </div>
                      
                      {/* Inline Shortcuts: View + Settings */}
                      <div className="flex items-center gap-2">
                        <Link href={`/staging/crm/pipelines/${pipeline.id}`}>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-lg"
                            style={{ 
                              background: 'var(--glass-bg-heavy)',
                              color: getDriverColor(pipeline.driver || 'FISSO')
                            }}
                            data-testid={`button-view-${pipeline.driver?.toLowerCase() || 'unknown'}`}
                            title="Visualizza Pipeline"
                          >
                            <Eye className="h-5 w-5" />
                          </motion.button>
                        </Link>
                        <motion.button
                          whileHover={{ rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            color: getDriverColor(pipeline.driver || 'FISSO')
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettingsPipelineId(pipeline.id);
                            setSettingsDialogOpen(true);
                          }}
                          data-testid={`button-settings-${pipeline.driver?.toLowerCase() || 'unknown'}`}
                          title="Impostazioni Pipeline"
                        >
                          <Settings className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Products Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(pipeline.products || []).slice(0, 3).map((product: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-md"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {product}
                        </span>
                      ))}
                      {(pipeline.products || []).length > 3 && (
                        <span
                          className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            color: getDriverColor(pipeline.driver || 'FISSO')
                          }}
                        >
                          +{(pipeline.products || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid - 1x4 orizzontale */}
                  <motion.div 
                    className="px-6 pb-6 grid grid-cols-4 gap-3"
                    initial="rest"
                    whileHover="hover"
                    variants={{ hover: { transition: { staggerChildren: 0.05 } } }}
                  >
                    <motion.div 
                      className="p-4 rounded-lg"
                      variants={metricVariants}
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Deal Attivi</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pipeline.activeDeals}
                      </div>
                    </motion.div>

                    <motion.div 
                      className="p-4 rounded-lg"
                      variants={metricVariants}
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Euro className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Valore Pipeline</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        €{(pipeline.totalValue / 1000000).toFixed(1)}M
                      </div>
                    </motion.div>

                    <motion.div 
                      className="p-4 rounded-lg"
                      variants={metricVariants}
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Win Rate</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                        {pipeline.conversionRate}%
                      </div>
                    </motion.div>

                    <motion.div 
                      className="p-4 rounded-lg"
                      variants={metricVariants}
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Avg Deal</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        €{(pipeline.avgDealValue / 1000).toFixed(0)}k
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Category Distribution Bars */}
                  <div style={{ minHeight: '200px' }}>
                    <CategoryBars pipelineId={pipeline.id} driverColor={getDriverColor(pipeline.driver || 'FISSO')} />
                  </div>

                  {/* Channel Attribution Bars */}
                  <div style={{ minHeight: '200px' }}>
                    <ChannelBars pipelineId={pipeline.id} driverColor={getDriverColor(pipeline.driver || 'FISSO')} />
                  </div>

                  {/* Footer CTA */}
                  <div 
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      borderTop: '1px solid var(--glass-card-border)'
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Vedi Kanban / DataTable
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Pipeline View - Coming Soon */}
        {selectedPipeline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                  {selectedPipeline.name} - Vista Kanban/DataTable
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Kanban
                  </Button>
                  <Button variant="outline" size="sm">
                    DataTable
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPipeline(null)}
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: getDriverColor(selectedPipeline.driver) }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Vista Kanban dinamica con drag & drop e DataTable deals in arrivo
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pipeline Settings Dialog */}
        {settingsPipelineId && (
          <PipelineSettingsDialog
            open={settingsDialogOpen}
            onClose={() => {
              setSettingsDialogOpen(false);
              setSettingsPipelineId(null);
            }}
            pipelineId={settingsPipelineId}
          />
        )}

        {/* Create Pipeline Dialog */}
        <CreatePipelineDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
        />

        {/* Pipeline Filters Dialog */}
        <PipelineFiltersDialog
          open={filtersDialogOpen}
          onClose={() => setFiltersDialogOpen(false)}
          filters={filters}
          onApplyFilters={setFilters}
          defaultTab={defaultFilterTab}
        />
        </div>
      </div>
    </Layout>
  );
}

// 🎯 EXPORT CONTENT-ONLY per CRMPage unificato (senza Layout/tabs)
export function PipelineContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsPipelineId, setSettingsPipelineId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<PipelineFilters>({
    stores: [],
    drivers: [],
    stato: 'tutte',
  });
  const [defaultFilterTab, setDefaultFilterTab] = useState<'base' | 'metriche' | 'temporali' | 'organizzazione'>('base');

  const { data: pipelinesResponse, isLoading, error } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
  });

  const pipelines = pipelinesResponse || [];

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.stores.length > 0) count++;
    if (filters.drivers.length > 0) count++;
    if (filters.stato !== 'tutte') count++;
    if (filters.valoreMin !== undefined || filters.valoreMax !== undefined) count++;
    if (filters.conversionMin !== undefined || filters.conversionMax !== undefined) count++;
    if (filters.dealsMin !== undefined || filters.dealsMax !== undefined) count++;
    if (filters.avgDealMin !== undefined || filters.avgDealMax !== undefined) count++;
    if (filters.dataCreazioneDa || filters.dataCreazioneA) count++;
    if (filters.dataAggiornamentoDa || filters.dataAggiornamentoA) count++;
    if (filters.ownerId) count++;
    if (filters.teamId) count++;
    return count;
  }, [filters]);

  // Filter pipelines based on search and advanced filters
  const filteredPipelines = useMemo(() => {
    let result = [...pipelines];

    // Apply search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.driver?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.ownerName?.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (filters.drivers.length > 0) {
      result = result.filter(p => filters.drivers.includes(p.driver));
    }

    if (filters.stato === 'attiva') {
      result = result.filter(p => p.isActive !== false);
    } else if (filters.stato === 'non_attiva') {
      result = result.filter(p => p.isActive === false);
    }

    if (filters.valoreMin !== undefined) {
      result = result.filter(p => p.totalValue >= filters.valoreMin!);
    }
    if (filters.valoreMax !== undefined) {
      result = result.filter(p => p.totalValue <= filters.valoreMax!);
    }

    if (filters.conversionMin !== undefined) {
      result = result.filter(p => p.conversionRate >= filters.conversionMin!);
    }
    if (filters.conversionMax !== undefined) {
      result = result.filter(p => p.conversionRate <= filters.conversionMax!);
    }

    if (filters.dealsMin !== undefined) {
      result = result.filter(p => p.activeDeals >= filters.dealsMin!);
    }
    if (filters.dealsMax !== undefined) {
      result = result.filter(p => p.activeDeals <= filters.dealsMax!);
    }

    if (filters.avgDealMin !== undefined) {
      result = result.filter(p => p.avgDealValue >= filters.avgDealMin!);
    }
    if (filters.avgDealMax !== undefined) {
      result = result.filter(p => p.avgDealValue <= filters.avgDealMax!);
    }

    if (filters.dataCreazioneDa) {
      result = result.filter(p => p.createdAt && new Date(p.createdAt) >= filters.dataCreazioneDa!);
    }
    if (filters.dataCreazioneA) {
      result = result.filter(p => p.createdAt && new Date(p.createdAt) <= filters.dataCreazioneA!);
    }

    if (filters.dataAggiornamentoDa) {
      result = result.filter(p => p.updatedAt && new Date(p.updatedAt) >= filters.dataAggiornamentoDa!);
    }
    if (filters.dataAggiornamentoA) {
      result = result.filter(p => p.updatedAt && new Date(p.updatedAt) <= filters.dataAggiornamentoA!);
    }

    if (filters.ownerId) {
      result = result.filter(p => p.ownerId === filters.ownerId);
    }

    return result;
  }, [pipelines, searchQuery, filters]);

  const getDriverGradient = (driver: string) => {
    switch (driver) {
      case 'FISSO': return 'var(--brand-glass-orange)';
      case 'MOBILE': return 'var(--brand-glass-purple)';
      case 'DEVICE': return 'var(--brand-glass-gradient)';
      case 'ACCESSORI': return 'var(--brand-glass-orange)';
      default: return 'var(--glass-card-bg)';
    }
  };

  const getDriverColor = (driver: string) => {
    switch (driver) {
      case 'FISSO': return 'hsl(var(--brand-orange))';
      case 'MOBILE': return 'hsl(var(--brand-purple))';
      case 'DEVICE': return 'hsl(var(--brand-orange))';
      case 'ACCESSORI': return 'hsl(var(--brand-purple))';
      default: return 'var(--text-primary)';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <ErrorState message="Errore nel caricamento delle pipeline" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
            €{((pipelines?.reduce((sum: number, p: Pipeline) => sum + p.totalValue, 0) || 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Valore totale pipeline
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input
                placeholder="Cerca pipeline per nome, driver o stato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-card-border)'
                }}
                data-testid="input-search-pipelines"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setDefaultFilterTab('base');
                setFiltersDialogOpen(true);
              }}
              data-testid="button-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtri Avanzati
              {activeFiltersCount > 0 && (
                <Badge 
                  className="ml-2" 
                  style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                  data-testid="badge-filters-count"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              style={{ background: 'hsl(var(--brand-orange))' }}
              className="text-white"
              data-testid="button-create-pipeline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova Pipeline
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Pipeline Cards Grid */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredPipelines?.map((pipeline: Pipeline) => {
          return (
            <motion.div
              key={pipeline.id}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className="cursor-pointer"
              onClick={() => setSelectedPipeline(pipeline)}
              data-testid={`pipeline-card-${pipeline.driver?.toLowerCase() || 'unknown'}`}
            >
              <Card 
                className="glass-card border-0"
                style={{ 
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid var(--glass-card-border)',
                  borderLeft: `4px solid ${getDriverColor(pipeline.driver || 'FISSO')}`,
                  boxShadow: 'var(--shadow-glass)',
                  transition: 'var(--glass-transition)'
                }}
              >
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                        {pipeline.name}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Driver: <span style={{ color: getDriverColor(pipeline.driver || 'FISSO'), fontWeight: 500 }}>
                          {pipeline.driver || 'N/D'}
                        </span>
                      </p>
                    </div>
                    
                    {/* Inline Shortcuts: View + Settings */}
                    <div className="flex items-center gap-2">
                      <Link href={`/staging/crm/pipelines/${pipeline.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            color: getDriverColor(pipeline.driver || 'FISSO')
                          }}
                          data-testid={`button-view-${pipeline.driver?.toLowerCase() || 'unknown'}`}
                          title="Visualizza Pipeline"
                        >
                          <Eye className="h-5 w-5" />
                        </motion.button>
                      </Link>
                      <motion.button
                        whileHover={{ rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          color: getDriverColor(pipeline.driver || 'FISSO')
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsPipelineId(pipeline.id);
                          setSettingsDialogOpen(true);
                        }}
                        data-testid={`button-settings-${pipeline.driver?.toLowerCase() || 'unknown'}`}
                        title="Impostazioni Pipeline"
                      >
                        <Settings className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Products Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(pipeline.products || []).slice(0, 3).map((product: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-md"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {product}
                      </span>
                    ))}
                    {(pipeline.products || []).length > 3 && (
                      <span
                        className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          color: getDriverColor(pipeline.driver || 'FISSO')
                        }}
                      >
                        +{(pipeline.products || []).length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Grid - 1x4 orizzontale */}
                <motion.div 
                  className="px-6 pb-6 grid grid-cols-4 gap-3"
                  initial="rest"
                  whileHover="hover"
                  variants={{ hover: { transition: { staggerChildren: 0.05 } } }}
                >
                  <motion.div 
                    className="p-4 rounded-lg"
                    variants={metricVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Deal Attivi</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {pipeline.activeDeals}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="p-4 rounded-lg"
                    variants={metricVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Valore Pipeline</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      €{(pipeline.totalValue / 1000000).toFixed(1)}M
                    </div>
                  </motion.div>

                  <motion.div 
                    className="p-4 rounded-lg"
                    variants={metricVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Win Rate</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {pipeline.conversionRate}%
                    </div>
                  </motion.div>

                  <motion.div 
                    className="p-4 rounded-lg"
                    variants={metricVariants}
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver || 'FISSO') }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Avg Deal</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      €{(pipeline.avgDealValue / 1000).toFixed(0)}k
                    </div>
                  </motion.div>
                </motion.div>

                {/* Category Distribution Bars */}
                <div style={{ minHeight: '200px' }}>
                  <CategoryBars pipelineId={pipeline.id} driverColor={getDriverColor(pipeline.driver || 'FISSO')} />
                </div>

                {/* Channel Attribution Bars */}
                <div style={{ minHeight: '200px' }}>
                  <ChannelBars pipelineId={pipeline.id} driverColor={getDriverColor(pipeline.driver || 'FISSO')} />
                </div>

                {/* Footer CTA */}
                <div 
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ 
                    background: 'var(--glass-bg-heavy)',
                    borderTop: '1px solid var(--glass-card-border)'
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Vedi Kanban / DataTable
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Pipeline View - Coming Soon */}
      {selectedPipeline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                {selectedPipeline.name} - Vista Kanban/DataTable
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Kanban
                </Button>
                <Button variant="outline" size="sm">
                  DataTable
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedPipeline(null)}
                >
                  Chiudi
                </Button>
              </div>
            </div>
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: getDriverColor(selectedPipeline.driver) }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Vista Kanban dinamica con drag & drop e DataTable deals in arrivo
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Pipeline Settings Dialog */}
      {settingsPipelineId && (
        <PipelineSettingsDialog
          open={settingsDialogOpen}
          onClose={() => {
            setSettingsDialogOpen(false);
            setSettingsPipelineId(null);
          }}
          pipelineId={settingsPipelineId}
        />
      )}

      {/* Create Pipeline Dialog */}
      <CreatePipelineDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      {/* Pipeline Filters Dialog */}
      <PipelineFiltersDialog
        open={filtersDialogOpen}
        onClose={() => setFiltersDialogOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        defaultTab={defaultFilterTab}
      />
    </div>
  );
}
