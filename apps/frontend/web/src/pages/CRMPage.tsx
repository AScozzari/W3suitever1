import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';

// Import dei content exports (senza Layout/tabs) dalle pagine CRM esistenti
import { LeadsContent } from './crm/LeadsPage';

// TODO: Aggiungere content exports per le altre pagine
import CRMDashboardPage from './crm/CRMDashboardPage';
import CampaignsPage from './crm/CampaignsPage';
import PipelinePage from './crm/PipelinePage';
import CustomersPage from './crm/CustomersPage';
import ActivitiesPage from './crm/ActivitiesPage';
import AnalyticsPage from './crm/AnalyticsPage';

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
        return <DashboardPlaceholder />;
      case 'campaigns':
        return <CampaignsPlaceholder />;
      case 'pipeline':
        return <PipelinePlaceholder />;
      case 'leads':
        return <LeadsContent />;
      case 'customers':
        return <CustomersPlaceholder />;
      case 'activities':
        return <ActivitiesPlaceholder />;
      case 'analytics':
        return <AnalyticsPlaceholder />;
      default:
        return <DashboardPlaceholder />;
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
          {renderContent()}
        </motion.div>
      </div>
    </Layout>
  );
}

// 🎯 Placeholder Components (TODO: sostituire con content exports reali)
function DashboardPlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Dashboard CRM</h3>
        <p className="text-gray-600">Contenuto dashboard in arrivo...</p>
      </div>
    </div>
  );
}

function CampaignsPlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <Megaphone className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Gestione Campagne</h3>
        <p className="text-gray-600">Contenuto campagne in arrivo...</p>
      </div>
    </div>
  );
}

function PipelinePlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <Target className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Pipeline Vendite</h3>
        <p className="text-gray-600">Contenuto pipeline in arrivo...</p>
      </div>
    </div>
  );
}

function CustomersPlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Database Clienti</h3>
        <p className="text-gray-600">Contenuto clienti in arrivo...</p>
      </div>
    </div>
  );
}

function ActivitiesPlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <CheckSquare className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Attività e Task</h3>
        <p className="text-gray-600">Contenuto attività in arrivo...</p>
      </div>
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="px-6 py-6">
      <div className="windtre-glass rounded-lg p-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-windtre-orange" />
        <h3 className="text-xl font-semibold mb-2">Report e Analisi</h3>
        <p className="text-gray-600">Contenuto analytics in arrivo...</p>
      </div>
    </div>
  );
}
