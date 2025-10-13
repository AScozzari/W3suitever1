import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Input } from '@/components/ui/input';
import { CreateLeadDialog } from '@/components/crm/CreateLeadDialog';
import { LeadDetailModal } from '@/components/crm/LeadDetailModal';
import { useTenantNavigation, useRequiredTenantId } from '@/hooks/useTenantSafety';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Megaphone, 
  Target, 
  UserPlus, 
  Users, 
  CheckSquare, 
  BarChart3,
  Plus,
  Eye,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store,
  Calendar,
  User,
  Building,
  Hash,
  Brain,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  status: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
  leadScore: number;
  lifecycleStage?: string;
  conversionProbability?: number;
  originStoreName?: string;
  originStoreId?: string;
  campaignName?: string;
  sourceChannel?: string;
  gtmClientId?: string;
  ownerName?: string;
  createdAt: string;
  
  // Campi opzionali
  customerType?: 'B2B' | 'B2C';
  budgetRange?: { min: number; max: number };
  companySector?: string;
  purchaseTimeframe?: string;
  fiscalCode?: string;
  vatNumber?: string;
  pecEmail?: string;
  engagementScore?: number;
  totalFormsCompleted?: number;
  totalFormsStarted?: number;
  storesVisited?: string[];
  gtmProductsViewed?: string[];
  aiSentimentScore?: number;
  aiPredictedValue?: number;
  aiIntentSignals?: string[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

export default function LeadsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [location] = useLocation();
  const { buildUrl, navigate } = useTenantNavigation();
  const tenantId = useRequiredTenantId();
  
  // Extract campaign filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaign');

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

  const { data: leadsResponse, isLoading, error } = useQuery<Lead[]>({
    queryKey: ['/api/crm/leads', searchQuery, campaignId, tenantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campaignId) params.set('campaign', campaignId);
      const url = `/api/crm/leads${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Auth-User': 'admin-user'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const json = await res.json();
      return json.data || json;
    }
  });

  const leads = leadsResponse || [];
  
  // Get campaign name from first lead (all leads have same campaign when filtered)
  const campaignName = campaignId && leads.length > 0 ? leads[0].campaignName : null;
  
  const handleClearCampaignFilter = () => {
    navigate('crm/leads');
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      new: { label: 'Nuovo', color: 'hsl(var(--brand-purple))' },
      qualified: { label: 'Qualificato', color: 'hsl(220, 90%, 56%)' },
      contacted: { label: 'Contattato', color: 'hsl(280, 65%, 60%)' },
      converted: { label: 'Convertito', color: 'hsl(142, 76%, 36%)' },
      lost: { label: 'Perso', color: 'hsl(0, 84%, 60%)' }
    };
    return configs[status] || { label: status, color: 'gray' };
  };

  const getLifecycleStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      Subscriber: 'hsl(200, 70%, 50%)',
      Lead: 'hsl(var(--brand-purple))',
      MQL: 'hsl(280, 65%, 60%)',
      SQL: 'hsl(var(--brand-orange))',
      Opportunity: 'hsl(45, 100%, 51%)',
      Customer: 'hsl(142, 76%, 36%)'
    };
    return colors[stage] || 'gray';
  };

  const toggleRowExpansion = (leadId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <div className="windtre-glass-panel border-b border-white/20">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="h-6 w-6 text-windtre-orange" />
                    CRM - Lead Management
                  </h1>
                  <p className="text-gray-600 mt-1">Gestione lead con tracking GTM e multi-PDV</p>
                </div>
              </div>
              
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
        <ErrorState message="Errore nel caricamento dei lead" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      
      <div className="flex flex-col h-full">
        {/* WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-windtre-orange" />
                  CRM - Lead Management
                </h1>
                <p className="text-gray-600 mt-1">
                  {leads.length} lead totali • Tracking GTM • Multi-PDV Attribution
                </p>
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
                    data-testid={`tab-${tab.value}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campaign Filter Badge */}
        {campaignId && campaignName && (
          <div className="px-6 pt-4">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ 
                background: 'var(--glass-card-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid hsl(var(--brand-orange))',
                boxShadow: 'var(--shadow-glass-sm)'
              }}
            >
              <Megaphone className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Campagna: {campaignName}
              </span>
              <button
                onClick={handleClearCampaignFilter}
                className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
                data-testid="button-clear-campaign-filter"
                aria-label="Rimuovi filtro campagna"
              >
                <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
        )}

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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <Input
                  placeholder="Cerca per nome, email, telefono, CF, P.IVA, GTM ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ 
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)'
                  }}
                  data-testid="input-search-leads"
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
                onClick={() => setIsCreateOpen(true)}
                style={{ background: 'hsl(var(--brand-orange))' }}
                className="text-white"
                data-testid="button-create-lead"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Lead
              </Button>
            </div>
          </Card>
        </div>

        {/* Leads Data Table */}
        <div className="flex-1 overflow-auto">
          <motion.div 
            className="p-6 space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {leads.length === 0 ? (
              <Card className="p-12 text-center">
                <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun lead trovato</h3>
                <p className="text-gray-600 mb-6">
                  Inizia creando il tuo primo lead o modifica i filtri di ricerca
                </p>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  style={{ background: 'hsl(var(--brand-orange))' }}
                  className="text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Primo Lead
                </Button>
              </Card>
            ) : (
              leads.map((lead) => (
                <motion.div key={lead.id} variants={rowVariants}>
                  <Card 
                    className="p-4 hover:shadow-lg transition-all cursor-pointer"
                    style={{ 
                      background: 'var(--glass-card-bg)',
                      borderColor: 'var(--glass-card-border)'
                    }}
                    onClick={() => toggleRowExpansion(lead.id)}
                    data-testid={`lead-card-${lead.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Lead Score */}
                      <div className="flex-shrink-0 text-center w-16">
                        <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                          {lead.leadScore}
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                        <Progress 
                          value={lead.leadScore} 
                          className="h-1 mt-1"
                          style={{ 
                            background: 'hsl(var(--brand-orange))/20'
                          }}
                        />
                      </div>

                      {/* Avatar + Nome */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
                            {lead.firstName[0]}{lead.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </div>
                          {lead.companyName && (
                            <div className="text-xs flex items-center gap-1 text-gray-600">
                              <Building className="h-3 w-3" />
                              {lead.companyName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Email + Phone */}
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                      </div>

                      {/* Store Origine */}
                      {lead.originStoreName && (
                        <div className="min-w-[150px]">
                          <div className="flex items-center gap-1 text-sm">
                            <Store className="h-3 w-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                            <span className="font-medium">{lead.originStoreName}</span>
                          </div>
                          <div className="text-xs text-gray-500">PDV Origine</div>
                        </div>
                      )}

                      {/* Status - Badge Solido */}
                      <div 
                        className="px-3 py-1.5 rounded-md font-semibold text-white text-sm min-w-[110px] text-center"
                        style={{ 
                          background: getStatusConfig(lead.status).color,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        data-testid={`status-${lead.id}`}
                      >
                        {getStatusConfig(lead.status).label}
                      </div>

                      {/* Lifecycle Stage */}
                      {lead.lifecycleStage && (
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: getLifecycleStageColor(lead.lifecycleStage),
                            color: getLifecycleStageColor(lead.lifecycleStage)
                          }}
                        >
                          {lead.lifecycleStage}
                        </Badge>
                      )}

                      {/* Conversion Probability */}
                      {lead.conversionProbability !== undefined && (
                        <div className="min-w-[80px] text-center">
                          <div className="text-lg font-bold text-green-600">
                            {Math.round(lead.conversionProbability)}%
                          </div>
                          <div className="text-xs text-gray-500">Conv.</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setIsDetailOpen(true);
                          }}
                          data-testid={`button-view-${lead.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ color: 'hsl(var(--brand-orange))' }}
                          data-testid={`button-enrich-${lead.id}`}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedRows.has(lead.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4"
                      >
                        {/* Campagna + Canale */}
                        <div>
                          <div className="text-xs text-gray-500">Campagna</div>
                          <div className="text-sm font-medium">{lead.campaignName || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Canale</div>
                          <div className="text-sm font-medium">{lead.sourceChannel || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Owner</div>
                          <div className="text-sm font-medium">{lead.ownerName || 'Non assegnato'}</div>
                        </div>

                        {/* GTM Client ID */}
                        {lead.gtmClientId && (
                          <div>
                            <div className="text-xs text-gray-500">GTM Client ID</div>
                            <div className="text-sm font-mono">{lead.gtmClientId.substring(0, 20)}...</div>
                          </div>
                        )}

                        {/* Data Creazione */}
                        <div>
                          <div className="text-xs text-gray-500">Creato il</div>
                          <div className="text-sm font-medium">
                            {format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: it })}
                          </div>
                        </div>

                        {/* Engagement Score */}
                        {lead.engagementScore !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Engagement</div>
                            <div className="flex items-center gap-2">
                              <Progress value={lead.engagementScore} className="h-2 flex-1" />
                              <span className="text-sm font-medium">{lead.engagementScore}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </div>

      {/* Create Lead Dialog */}
      <CreateLeadDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      {/* Lead Detail Modal */}
      <LeadDetailModal 
        lead={selectedLead} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </Layout>
  );
}

// 🎯 EXPORT CONTENT-ONLY per CRMPage unificato (senza Layout/tabs)
export function LeadsContent() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const tenantId = useRequiredTenantId();
  const [location, setLocation] = useLocation();
  const { buildUrl } = useTenantNavigation();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaign');
  const [activeTab] = useState('leads');

  // Lead Data Query
  const { data: leads = [], isLoading, error } = useQuery<Lead[]>({
    queryKey: [`/api/${tenantId}/crm/leads`, campaignId],
    enabled: !!tenantId
  });

  // Campaign name lookup
  const campaignName = campaignId ? 'Campagna Esempio' : null;

  const handleClearCampaignFilter = () => {
    setLocation(buildUrl('crm/leads'));
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const getStatusConfig = (status: Lead['status']) => {
    const configs = {
      'new': { label: 'Nuovo', color: '#3B82F6' },
      'qualified': { label: 'Qualificato', color: '#8B5CF6' },
      'contacted': { label: 'Contattato', color: '#F59E0B' },
      'converted': { label: 'Convertito', color: '#10B981' },
      'lost': { label: 'Perso', color: '#EF4444' }
    };
    return configs[status] || configs.new;
  };

  const getLifecycleStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'subscriber': '#3B82F6',
      'lead': '#8B5CF6',
      'mql': '#F59E0B',
      'sql': '#10B981',
      'opportunity': '#EF4444',
      'customer': '#06B6D4'
    };
    return colors[stage.toLowerCase()] || '#6B7280';
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
        <ErrorState message="Errore nel caricamento dei lead" />
      </div>
    );
  }

  return (
    <>
      {/* Campaign Filter Badge */}
      {campaignId && campaignName && (
        <div className="px-6 pt-4">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid hsl(var(--brand-orange))',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <Megaphone className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Campagna: {campaignName}
            </span>
            <button
              onClick={handleClearCampaignFilter}
              className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
              data-testid="button-clear-campaign-filter"
              aria-label="Rimuovi filtro campagna"
            >
              <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
      )}

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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input
                placeholder="Cerca per nome, email, telefono, CF, P.IVA, GTM ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-card-border)'
                }}
                data-testid="input-search-leads"
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
              onClick={() => setIsCreateOpen(true)}
              style={{ background: 'hsl(var(--brand-orange))' }}
              className="text-white"
              data-testid="button-create-lead"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Lead
            </Button>
          </div>
        </Card>
      </div>

      {/* Leads Data Table */}
      <div className="flex-1 overflow-auto">
        <motion.div 
          className="p-6 space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {leads.length === 0 ? (
            <Card className="p-12 text-center">
              <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun lead trovato</h3>
              <p className="text-gray-600 mb-6">
                Inizia creando il tuo primo lead o modifica i filtri di ricerca
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                style={{ background: 'hsl(var(--brand-orange))' }}
                className="text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crea Primo Lead
              </Button>
            </Card>
          ) : (
            leads.map((lead) => (
              <motion.div key={lead.id} variants={rowVariants}>
                <Card 
                  className="p-4 hover:shadow-lg transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--glass-card-bg)',
                    borderColor: 'var(--glass-card-border)'
                  }}
                  onClick={() => toggleRowExpansion(lead.id)}
                  data-testid={`lead-card-${lead.id}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Lead Score */}
                    <div className="flex-shrink-0 text-center w-16">
                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                        {lead.leadScore}
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                      <Progress 
                        value={lead.leadScore} 
                        className="h-1 mt-1"
                        style={{ 
                          background: 'hsl(var(--brand-orange))/20'
                        }}
                      />
                    </div>

                    {/* Avatar + Nome */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
                          {lead.firstName[0]}{lead.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </div>
                        {lead.companyName && (
                          <div className="text-xs flex items-center gap-1 text-gray-600">
                            <Building className="h-3 w-3" />
                            {lead.companyName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email + Phone */}
                    <div className="flex-1 min-w-[250px]">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                    </div>

                    {/* Store Origine */}
                    {lead.originStoreName && (
                      <div className="min-w-[150px]">
                        <div className="flex items-center gap-1 text-sm">
                          <Store className="h-3 w-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                          <span className="font-medium">{lead.originStoreName}</span>
                        </div>
                        <div className="text-xs text-gray-500">PDV Origine</div>
                      </div>
                    )}

                    {/* Status - Badge Solido */}
                    <div 
                      className="px-3 py-1.5 rounded-md font-semibold text-white text-sm min-w-[110px] text-center"
                      style={{ 
                        background: getStatusConfig(lead.status).color,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      data-testid={`status-${lead.id}`}
                    >
                      {getStatusConfig(lead.status).label}
                    </div>

                    {/* Lifecycle Stage */}
                    {lead.lifecycleStage && (
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: getLifecycleStageColor(lead.lifecycleStage),
                          color: getLifecycleStageColor(lead.lifecycleStage)
                        }}
                      >
                        {lead.lifecycleStage}
                      </Badge>
                    )}

                    {/* Conversion Probability */}
                    {lead.conversionProbability !== undefined && (
                      <div className="min-w-[80px] text-center">
                        <div className="text-lg font-bold text-green-600">
                          {Math.round(lead.conversionProbability)}%
                        </div>
                        <div className="text-xs text-gray-500">Conv.</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                          setIsDetailOpen(true);
                        }}
                        data-testid={`button-view-${lead.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ color: 'hsl(var(--brand-orange))' }}
                        data-testid={`button-enrich-${lead.id}`}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRows.has(lead.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4"
                    >
                      {/* Campagna + Canale */}
                      <div>
                        <div className="text-xs text-gray-500">Campagna</div>
                        <div className="text-sm font-medium">{lead.campaignName || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Canale</div>
                        <div className="text-sm font-medium">{lead.sourceChannel || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Owner</div>
                        <div className="text-sm font-medium">{lead.ownerName || 'Non assegnato'}</div>
                      </div>

                      {/* GTM Client ID */}
                      {lead.gtmClientId && (
                        <div>
                          <div className="text-xs text-gray-500">GTM Client ID</div>
                          <div className="text-sm font-mono">{lead.gtmClientId.substring(0, 20)}...</div>
                        </div>
                      )}

                      {/* Data Creazione */}
                      <div>
                        <div className="text-xs text-gray-500">Creato il</div>
                        <div className="text-sm font-medium">
                          {format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: it })}
                        </div>
                      </div>

                      {/* Engagement Score */}
                      {lead.engagementScore !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500">Engagement</div>
                          <div className="flex items-center gap-2">
                            <Progress value={lead.engagementScore} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{lead.engagementScore}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Create Lead Dialog */}
      <CreateLeadDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      {/* Lead Detail Modal */}
      <LeadDetailModal 
        lead={selectedLead} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </>
  );
}
