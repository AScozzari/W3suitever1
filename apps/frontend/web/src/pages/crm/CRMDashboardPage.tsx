import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
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
  CheckSquare,
  LayoutDashboard
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { useState } from 'react';
import { useLocation } from 'wouter';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { navigate, buildUrl } = useTenantNavigation();
  const [location] = useLocation();

  // Fetch dashboard stats
  const { data: statsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/crm/dashboard/stats'],
  });

  const stats = statsResponse?.data;

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
    <div className="windtre-glass-panel border-b border-white/20 mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-windtre-orange" />
              CRM
            </h1>
            <p className="text-gray-600 mt-1">Customer Relationship Management - Lead, Pipeline, Clienti</p>
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
      <div className="h-full flex flex-col">
        <CRMHeader />
        
        <div className="flex-1 px-6 space-y-6 overflow-auto">

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


        {/* Conversion Funnel */}
        <div className="grid grid-cols-1 gap-6">
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
