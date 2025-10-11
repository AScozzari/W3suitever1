import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Wifi,
  Smartphone,
  ShoppingBag,
  TrendingUp,
  Target,
  Euro,
  BarChart3,
  ArrowRight,
  Users
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useState } from 'react';

interface Pipeline {
  id: string;
  name: string;
  driver: 'FISSO' | 'MOBILE' | 'DEVICE' | 'ACCESSORI';
  activeDeals: number;
  totalValue: number;
  conversionRate: number;
  avgDealValue: number;
  products: string[];
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

export default function PipelinePage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  const { data: pipelines, isLoading, error } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
    initialData: [
      {
        id: '1',
        name: 'Pipeline Fisso',
        driver: 'FISSO',
        activeDeals: 47,
        totalValue: 1850000,
        conversionRate: 68.5,
        avgDealValue: 39361,
        products: ['Super Fibra FTTH 2.5 Gbps', 'Super Fibra & Netflix', 'Fibra Amazon Prime', 'Absolute']
      },
      {
        id: '2',
        name: 'Pipeline Mobile',
        driver: 'MOBILE',
        activeDeals: 89,
        totalValue: 890000,
        conversionRate: 72.3,
        avgDealValue: 10000,
        products: ['Unlimited 5G', 'Smart Pack 5G', 'Pack 5G Reload Exchange', 'Call Your Country']
      },
      {
        id: '3',
        name: 'Pipeline Device',
        driver: 'DEVICE',
        activeDeals: 134,
        totalValue: 2680000,
        conversionRate: 81.2,
        avgDealValue: 20000,
        products: ['Apple iPhone 17 Pro', 'Samsung Galaxy S25 FE', 'Xiaomi/Vivo/Oppo', 'Motorola/Huawei']
      },
      {
        id: '4',
        name: 'Pipeline Accessori',
        driver: 'ACCESSORI',
        activeDeals: 212,
        totalValue: 530000,
        conversionRate: 85.7,
        avgDealValue: 2500,
        products: ['Modem Wi-Fi 7', 'Protezioni Smartphone', 'Caricabatterie', 'Cuffie Audio']
      }
    ]
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
            <ErrorState message="Errore nel caricamento delle pipeline" />
          </div>
        </div>
      </Layout>
    );
  }

  const getDriverIcon = (driver: string) => {
    switch (driver) {
      case 'FISSO': return Wifi;
      case 'MOBILE': return Smartphone;
      case 'DEVICE': return Smartphone;
      case 'ACCESSORI': return ShoppingBag;
      default: return Target;
    }
  };

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
        <CRMNavigationBar />
        <CRMScopeBar />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-purple)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Target className="h-6 w-6" style={{ color: 'hsl(var(--brand-purple))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-purple))' }}>
                Pipeline Vendita
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Driver WindTre - FISSO, MOBILE, DEVICE, ACCESSORI
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
              €{((pipelines?.reduce((sum, p) => sum + p.totalValue, 0) || 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Valore totale pipeline
            </div>
          </div>
        </div>

        {/* Pipeline Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {pipelines?.map((pipeline) => {
            const DriverIcon = getDriverIcon(pipeline.driver);
            
            return (
              <motion.div
                key={pipeline.id}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                className="cursor-pointer"
                onClick={() => setSelectedPipeline(pipeline)}
                data-testid={`pipeline-card-${pipeline.driver.toLowerCase()}`}
              >
                <Card 
                  className="glass-card border-0"
                  style={{ 
                    background: getDriverGradient(pipeline.driver),
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid var(--glass-card-border)',
                    boxShadow: 'var(--shadow-glass)',
                    transition: 'var(--glass-transition)'
                  }}
                >
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-3 rounded-lg"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            backdropFilter: 'blur(8px)'
                          }}
                        >
                          <DriverIcon className="h-6 w-6" style={{ color: getDriverColor(pipeline.driver) }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                            {pipeline.name}
                          </h3>
                          <Badge 
                            variant="outline"
                            className="mt-1"
                            style={{ 
                              borderColor: getDriverColor(pipeline.driver),
                              color: getDriverColor(pipeline.driver),
                              background: 'var(--glass-bg-light)'
                            }}
                          >
                            {pipeline.driver}
                          </Badge>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          color: getDriverColor(pipeline.driver)
                        }}
                        data-testid={`button-settings-${pipeline.driver.toLowerCase()}`}
                      >
                        <Settings className="h-5 w-5" />
                      </motion.button>
                    </div>

                    {/* Products Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {pipeline.products.slice(0, 3).map((product, idx) => (
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
                      {pipeline.products.length > 3 && (
                        <span
                          className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ 
                            background: 'var(--glass-bg-heavy)',
                            color: getDriverColor(pipeline.driver)
                          }}
                        >
                          +{pipeline.products.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <motion.div 
                    className="px-6 pb-6 grid grid-cols-2 gap-4"
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
                        <Users className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver) }} />
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
                        <Euro className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver) }} />
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
                        <BarChart3 className="h-4 w-4" style={{ color: getDriverColor(pipeline.driver) }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Avg Deal</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        €{(pipeline.avgDealValue / 1000).toFixed(0)}k
                      </div>
                    </motion.div>
                  </motion.div>

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
                    <ArrowRight className="h-5 w-5" style={{ color: getDriverColor(pipeline.driver) }} />
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
        </div>
      </div>
    </Layout>
  );
}
