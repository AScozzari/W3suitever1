import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';

// Import diretti dei content exports (CRMPage è già lazy-loaded nel routing)
import { DashboardContent } from './crm/CRMDashboardPage';
import { CampaignsContent } from './crm/CampaignsPage';
import { PipelineContent } from './crm/PipelinePage';
import { FunnelContent } from './crm/FunnelPage';
import { LeadsContent } from './crm/LeadsPage';
import { CustomersContent } from './crm/CustomersPage';
import { ActivitiesContent } from './crm/ActivitiesPage';
import { AnalyticsContent } from './crm/AnalyticsPage';

// UI Components
import { 
  LayoutDashboard, 
  Megaphone, 
  Target, 
  UserPlus, 
  Users, 
  CheckSquare, 
  BarChart3,
  Workflow
} from 'lucide-react';
import { useLocation } from 'wouter';

// 🎯 CRM Tabs with Funnels integration
type CRMTab = 'dashboard' | 'campaigns' | 'pipeline' | 'funnels' | 'leads' | 'customers' | 'activities' | 'analytics';

interface TabConfig {
  id: CRMTab;
  label: string;
  icon: React.ElementType;
}

const tabsConfig: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campagne', icon: Megaphone },
  { id: 'pipeline', label: 'Pipeline', icon: Target },
  { id: 'funnels', label: 'Funnels', icon: Workflow },
  { id: 'leads', label: 'Lead', icon: UserPlus },
  { id: 'customers', label: 'Clienti', icon: Users },
  { id: 'activities', label: 'Attività', icon: CheckSquare },
  { id: 'analytics', label: 'Report', icon: BarChart3 }
];

const tabVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

export default function CRMPage() {
  const [currentModule] = useState('crm');
  const [activeTab, setActiveTab] = useState<CRMTab>('dashboard');
  const [location, setLocation] = useLocation();
  const tenantSlug = location.split('/')[1] || 'staging';

  // 🎯 CRITICAL FIX: Read view param from URL and sync activeTab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    
    // Map view param to CRMTab
    const validTabs: CRMTab[] = ['dashboard', 'campaigns', 'pipeline', 'funnels', 'leads', 'customers', 'activities', 'analytics'];
    
    // Handle special case: 'funnel' (singular) maps to 'funnels' (plural)
    let mappedView = viewParam as CRMTab;
    if (viewParam === 'funnel') {
      mappedView = 'funnels';
    }
    
    if (mappedView && validTabs.includes(mappedView)) {
      setActiveTab(mappedView);
    }
  }, [location]); // Re-run when location changes

  // Render del contenuto basato sul tab attivo usando le pagine REALI
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'campaigns':
        return <CampaignsContent />;
      case 'pipeline':
        return <PipelineContent />;
      case 'funnels':
        return <FunnelContent />;
      case 'leads':
        return <LeadsContent />;
      case 'customers':
        return <CustomersContent />;
      case 'activities':
        return <ActivitiesContent />;
      case 'analytics':
        return <AnalyticsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={() => {}}>
      <CRMCommandPalette />
      
      <div className="flex flex-col h-full">
        {/* WindTre Glassmorphism Header con Tabs */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Customer Relationship Management
              </h1>
              <p className="text-gray-600 mt-1">
                Sistema completo per la gestione delle relazioni con i clienti
              </p>
            </div>
            
            {/* Tab Navigation - USANDO ONCLICK INVECE DI HREF! */}
            <div className="flex gap-1 p-1 bg-white/30 rounded-lg overflow-x-auto">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      // Update URL to match tab for proper navigation
                      const newUrl = tab.id === 'dashboard' 
                        ? `/${tenantSlug}/crm` 
                        : `/${tenantSlug}/crm?view=${tab.id}`;
                      setLocation(newUrl);
                    }}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
                      whitespace-nowrap min-w-fit
                      ${isActive 
                        ? 'bg-windtre-orange text-white shadow-lg' 
                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                      }
                    `}
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area con animazione - qui renderizziamo le pagine VERE */}
        <motion.div 
          key={activeTab}
          className="flex-1 overflow-auto"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {renderContent()}
        </motion.div>
      </div>
    </Layout>
  );
}

