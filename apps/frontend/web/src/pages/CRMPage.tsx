import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';

// Import tutte le pagine CRM esistenti come componenti
import CRMDashboardContent from './crm/CRMDashboardPage';
import CampaignsContent from './crm/CampaignsPage';
import PipelineContent from './crm/PipelinePage';
import LeadsContent from './crm/LeadsPage';
import CustomersContent from './crm/CustomersPage';
import ActivitiesContent from './crm/ActivitiesPage';
import AnalyticsContent from './crm/AnalyticsPage';
import DealsContent from './crm/DealsPage';

// UI Components
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Megaphone, 
  Target, 
  UserPlus, 
  Users, 
  CheckSquare, 
  BarChart3,
  ShoppingBag
} from 'lucide-react';

// Definizione dei tabs disponibili
type CRMTab = 'dashboard' | 'campaigns' | 'pipeline' | 'leads' | 'customers' | 'activities' | 'analytics' | 'deals';

interface TabConfig {
  id: CRMTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabsConfig: TabConfig[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    description: 'Panoramica CRM'
  },
  { 
    id: 'campaigns', 
    label: 'Campagne', 
    icon: Megaphone, 
    description: 'Gestione campagne'
  },
  { 
    id: 'pipeline', 
    label: 'Pipeline', 
    icon: Target, 
    description: 'Pipeline vendite'
  },
  { 
    id: 'leads', 
    label: 'Lead', 
    icon: UserPlus, 
    description: 'Database lead'
  },
  { 
    id: 'deals', 
    label: 'Deal', 
    icon: ShoppingBag, 
    description: 'Opportunità'
  },
  { 
    id: 'customers', 
    label: 'Clienti', 
    icon: Users, 
    description: 'Database clienti'
  },
  { 
    id: 'activities', 
    label: 'Attività', 
    icon: CheckSquare, 
    description: 'Attività e task'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    icon: BarChart3, 
    description: 'Report e analisi'
  }
];

// Framer Motion Variants
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

  // Render del contenuto basato sul tab attivo (NO URL ROUTING!)
  const renderContent = () => {
    // Rimuoviamo il Layout wrapper dai componenti individuali
    // e rendiamo solo il contenuto interno
    switch (activeTab) {
      case 'dashboard':
        return <CRMDashboardWrapper />;
      case 'campaigns':
        return <CampaignsWrapper />;
      case 'pipeline':
        return <PipelineWrapper />;
      case 'leads':
        return <LeadsWrapper />;
      case 'deals':
        return <DealsWrapper />;
      case 'customers':
        return <CustomersWrapper />;
      case 'activities':
        return <ActivitiesWrapper />;
      case 'analytics':
        return <AnalyticsWrapper />;
      default:
        return <CRMDashboardWrapper />;
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
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area con animazione */}
        <motion.div 
          key={activeTab}
          className="flex-1 px-6 pb-6 overflow-auto"
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

// Wrapper components che estraggono solo il contenuto (senza Layout)
// Questi componenti renderizzeranno le pagine esistenti senza il loro Layout wrapper

function CRMDashboardWrapper() {
  // Invece di importare l'intero componente con Layout,
  // creiamo una versione semplificata qui
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Lead Totali" value="2,543" icon={UserPlus} trend="+12%" />
        <StatCard title="Deal Aperti" value="145" icon={ShoppingBag} trend="+8%" />
        <StatCard title="Clienti Attivi" value="1,285" icon={Users} trend="+5%" />
        <StatCard title="Conversione" value="23.5%" icon={Target} trend="+2.3%" />
      </div>
      <div className="windtre-glass rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Attività Recenti</h2>
        <p className="text-gray-600">Dashboard content da implementare...</p>
      </div>
    </div>
  );
}

function CampaignsWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Gestione Campagne</h2>
      <p className="text-gray-600">Contenuto campagne da implementare...</p>
    </div>
  );
}

function PipelineWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Pipeline Vendite</h2>
      <p className="text-gray-600">Contenuto pipeline da implementare...</p>
    </div>
  );
}

function LeadsWrapper() {
  // Per ora una versione semplificata - dopo integreremo il contenuto reale
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Database Lead</h2>
      <p className="text-gray-600">Contenuto lead da implementare...</p>
    </div>
  );
}

function DealsWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Gestione Deal</h2>
      <p className="text-gray-600">Contenuto deal da implementare...</p>
    </div>
  );
}

function CustomersWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Database Clienti</h2>
      <p className="text-gray-600">Contenuto clienti da implementare...</p>
    </div>
  );
}

function ActivitiesWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Attività e Task</h2>
      <p className="text-gray-600">Contenuto attività da implementare...</p>
    </div>
  );
}

function AnalyticsWrapper() {
  return (
    <div className="windtre-glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Analytics e Report</h2>
      <p className="text-gray-600">Contenuto analytics da implementare...</p>
    </div>
  );
}

// Componente per le stat card
function StatCard({ title, value, icon: Icon, trend }: any) {
  const isPositive = trend.startsWith('+');
  
  return (
    <motion.div 
      className="windtre-glass rounded-lg p-4"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className={`text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend} vs mese scorso
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-windtre-orange/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-windtre-orange" />
        </div>
      </div>
    </motion.div>
  );
}