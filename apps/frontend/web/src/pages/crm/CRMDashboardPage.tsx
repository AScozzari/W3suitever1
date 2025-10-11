import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Target, 
  UserPlus,
  BarChart3,
  Megaphone,
  Settings,
  ArrowRight,
  CheckSquare
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { useState } from 'react';

interface DashboardStats {
  totalPersons: number;
  totalLeads: number;
  totalDeals: number;
  totalCampaigns: number;
  conversionRate: number;
  openDeals: number;
  wonDeals: number;
  pipelineValue: number;
}

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
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

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17
    }
  }
};

export default function CRMDashboardPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const { navigate, buildUrl } = useTenantNavigation();

  // Fetch dashboard stats
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/crm/dashboard/stats'],
    initialData: {
      totalPersons: 156,
      totalLeads: 47,
      totalDeals: 23,
      totalCampaigns: 8,
      conversionRate: 48.9,
      openDeals: 15,
      wonDeals: 6,
      pipelineValue: 2400000
    }
  });

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
            <ErrorState message="Errore nel caricamento della dashboard CRM" />
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Contatti Totali',
      value: stats?.totalPersons || 0,
      icon: Users,
      gradient: 'var(--brand-glass-orange)',
      iconColor: 'hsl(var(--brand-orange))',
      description: 'Identity graph completo',
      href: buildUrl('crm/persons')
    },
    {
      title: 'Lead Attivi',
      value: stats?.totalLeads || 0,
      icon: UserPlus,
      gradient: 'var(--brand-glass-purple)',
      iconColor: 'hsl(var(--brand-purple))',
      description: 'In fase di qualifica',
      href: buildUrl('crm/leads')
    },
    {
      title: 'Deal Aperti',
      value: stats?.openDeals || 0,
      icon: Target,
      gradient: 'var(--brand-glass-gradient)',
      iconColor: 'hsl(var(--brand-orange))',
      description: 'In trattativa attiva',
      href: buildUrl('crm/deals')
    },
    {
      title: 'Valore Pipeline',
      value: `€${((stats?.pipelineValue || 0) / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      gradient: 'var(--brand-glass-orange)',
      iconColor: 'hsl(var(--success))',
      description: 'Valore totale deals',
      href: buildUrl('crm/pipeline')
    }
  ];

  const quickActions = [
    { 
      label: 'Nuova Campagna', 
      icon: Megaphone, 
      action: 'create-campaign',
      description: 'Avvia campagna marketing',
      gradient: 'var(--brand-glass-orange)'
    },
    { 
      label: 'Nuovo Lead', 
      icon: UserPlus, 
      action: 'create-lead',
      description: 'Aggiungi lead qualificato',
      gradient: 'var(--brand-glass-purple)'
    },
    { 
      label: 'Nuovo Deal', 
      icon: Target, 
      action: 'create-deal',
      description: 'Crea opportunità vendita',
      gradient: 'var(--brand-glass-gradient)'
    },
    { 
      label: 'Nuova Attività', 
      icon: CheckSquare, 
      action: 'create-task',
      description: 'Pianifica task/follow-up',
      gradient: 'var(--brand-glass-orange)'
    }
  ];

  const handleQuickAction = (action: string) => {
    // Trigger Command Palette with pre-filled action
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true
    });
    document.dispatchEvent(event);
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
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                Dashboard CRM
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Customer Relationship Management - WindTre Suite
              </p>
            </div>
          </div>

        {/* Stats Cards - Glassmorphism */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {statCards.map((card, index) => (
            <motion.div
              key={card.title}
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              onClick={() => navigate(card.href)}
              className="cursor-pointer"
              data-testid={`stat-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Card 
                className="glass-card glass-card-hover p-6 border-0"
                style={{ 
                  background: card.gradient,
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  boxShadow: 'var(--shadow-glass)'
                }}
              >
                <motion.div variants={cardHoverVariants}>
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <card.icon className="h-6 w-6" style={{ color: card.iconColor }} />
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-60" />
                  </div>
                  
                  <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {card.title}
                  </h3>
                  <p className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {card.value}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {card.description}
                  </p>
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Azioni Rapide
          </h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {quickActions.map((action) => (
              <motion.div
                key={action.label}
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="glass-card p-6 border-0 cursor-pointer"
                  style={{ 
                    background: action.gradient,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-card-border)',
                    boxShadow: 'var(--shadow-glass-sm)',
                    transition: 'var(--glass-transition)'
                  }}
                  onClick={() => handleQuickAction(action.action)}
                  data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <action.icon className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {action.label}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Two Column Layout - Pipeline & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Overview */}
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pipeline Overview
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('crm/pipeline')}
                data-testid="button-view-pipeline"
              >
                Vedi Pipeline →
              </Button>
            </div>
            
            <div className="space-y-3">
              {[
                { stage: 'Qualifica', value: 12, total: 47, color: 'hsl(var(--brand-orange))' },
                { stage: 'Proposta', value: 8, total: 47, color: 'hsl(var(--brand-purple))' },
                { stage: 'Negoziazione', value: 5, total: 47, color: 'hsl(var(--info))' },
                { stage: 'Chiusura', value: 3, total: 47, color: 'hsl(var(--success))' }
              ].map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{stage.stage}</span>
                    <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
                      {stage.value} deals
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'var(--glass-bg)' }}>
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(stage.value / stage.total) * 100}%`,
                        background: stage.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activities */}
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Attività Recenti
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('crm/activities')}
                data-testid="button-view-activities"
              >
                Vedi Tutte →
              </Button>
            </div>
            
            <div className="space-y-4">
              {[
                { type: 'deal', title: 'Deal "Fibra Business" chiuso', time: '2 ore fa', status: 'success' },
                { type: 'lead', title: 'Nuovo lead da campagna Q1', time: '3 ore fa', status: 'new' },
                { type: 'task', title: 'Follow-up con cliente Acme Corp', time: '5 ore fa', status: 'pending' },
                { type: 'meeting', title: 'Demo prodotto schedulata', time: '1 giorno fa', status: 'scheduled' }
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div 
                    className="w-2 h-2 rounded-full mt-2"
                    style={{ 
                      background: activity.status === 'success' ? 'hsl(var(--success))' : 
                                  activity.status === 'new' ? 'hsl(var(--brand-orange))' :
                                  activity.status === 'pending' ? 'hsl(var(--warning))' :
                                  'hsl(var(--info))'
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {activity.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top Performers & Conversion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Top Performers
            </h2>
            
            <div className="space-y-4">
              {[
                { name: 'Marco Rossi', deals: 15, value: '€450K', avatar: 'MR' },
                { name: 'Laura Bianchi', deals: 12, value: '€380K', avatar: 'LB' },
                { name: 'Giuseppe Verdi', deals: 10, value: '€320K', avatar: 'GV' }
              ].map((performer, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" 
                  style={{ background: 'var(--glass-bg-light)' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                      style={{ 
                        background: i === 0 ? 'var(--brand-glass-orange)' : 
                                   i === 1 ? 'var(--brand-glass-purple)' : 
                                   'var(--brand-glass-gradient)',
                        color: 'hsl(var(--brand-orange))'
                      }}
                    >
                      {performer.avatar}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {performer.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {performer.deals} deals chiusi
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {performer.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Conversion Funnel */}
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Conversion Funnel
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('crm/analytics')}
                data-testid="button-view-analytics"
              >
                Analytics →
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--brand-orange))' }}>
                  {stats?.totalLeads || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Lead</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--brand-purple))' }}>
                  {stats?.openDeals || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--success))' }}>
                  {stats?.wonDeals || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vinti</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--glass-card-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Tasso Conversione Lead → Deal
                </span>
                <span className="text-lg font-bold" style={{ color: 'hsl(var(--success))' }}>
                  {stats?.conversionRate || 0}%
                </span>
              </div>
            </div>
          </Card>
        </div>
        </div>
      </div>
    </Layout>
  );
}
