import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';

// Lazy import dei content exports per ottimizzare il caricamento
const DashboardContent = lazy(() => import('./crm/CRMDashboardPage').then(m => ({ default: m.DashboardContent })));
const CampaignsContent = lazy(() => import('./crm/CampaignsPage').then(m => ({ default: m.CampaignsContent })));
const PipelineContent = lazy(() => import('./crm/PipelinePage').then(m => ({ default: m.PipelineContent })));
const LeadsContent = lazy(() => import('./crm/LeadsPage').then(m => ({ default: m.LeadsContent })));
const CustomersContent = lazy(() => import('./crm/CustomersPage').then(m => ({ default: m.CustomersContent })));
const ActivitiesContent = lazy(() => import('./crm/ActivitiesPage').then(m => ({ default: m.ActivitiesContent })));
const AnalyticsContent = lazy(() => import('./crm/AnalyticsPage').then(m => ({ default: m.AnalyticsContent })));

// UI Components
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Megaphone, 
  Target, 
  UserPlus, 
  Users, 
  CheckSquare, 
  BarChart3
} from 'lucide-react';

// 🎯 TAB ORIGINALI ESATTI (come prima, senza Deals)
type CRMTab = 'dashboard' | 'campaigns' | 'pipeline' | 'leads' | 'customers' | 'activities' | 'analytics';

interface TabConfig {
  id: CRMTab;
  label: string;
  icon: React.ElementType;
}

const tabsConfig: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campagne', icon: Megaphone },
  { id: 'pipeline', label: 'Pipeline', icon: Target },
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

  // Render del contenuto basato sul tab attivo usando le pagine REALI
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'campaigns':
        return <CampaignsContent />;
      case 'pipeline':
        return <PipelineContent />;
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Customer Relationship Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Sistema completo per la gestione delle relazioni con i clienti
                </p>
              </div>
            </div>
            
            {/* Tab Navigation - USANDO ONCLICK INVECE DI HREF! */}
            <div className="flex gap-1 p-1 bg-white/30 rounded-lg overflow-x-auto">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-windtre-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Caricamento...</p>
              </div>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </motion.div>
      </div>
    </Layout>
  );
}

