import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Search, 
  Plus, 
  Filter,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useState } from 'react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  type: 'inbound_media' | 'outbound_crm' | 'retention';
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

  const { data: campaignsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/crm/campaigns', searchQuery],
  });

  const campaigns = campaignsResponse?.data || [];

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
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
          <CRMNavigationBar />
          <CRMScopeBar />
          <div className="flex-1 p-6 overflow-auto">
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
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMScopeBar />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-orange)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Megaphone className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                Campagne Marketing
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Gestione campagne e lead generation
              </p>
            </div>
          </div>
          <Button
            style={{ 
              background: 'hsl(var(--brand-orange))',
              color: 'white'
            }}
            data-testid="button-create-campaign"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Campagna
          </Button>
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
                  placeholder="Cerca campagne per nome, tipo o stato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ 
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)'
                  }}
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
            </div>
          </Card>
        </motion.div>

        {/* Campaign Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
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
              onClick={() => setSelectedCampaign(campaign)}
              className="cursor-pointer"
              data-testid={`campaign-card-${campaign.id}`}
            >
              <Card 
                className="glass-card border-0 overflow-hidden"
                style={{ 
                  background: 'var(--brand-glass-orange)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid var(--glass-card-border)',
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
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-60" />
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
    </Layout>
  );
}
