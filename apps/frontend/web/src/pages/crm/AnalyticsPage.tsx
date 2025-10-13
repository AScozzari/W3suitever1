import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Wifi,
  Smartphone,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useState } from 'react';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';

interface DriverPerformance {
  driver: string;
  totalRevenue: number;
  dealsWon: number;
  conversionRate: number;
  avgDealSize: number;
  trend: 'up' | 'down';
  trendValue: number;
}

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
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function AnalyticsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Implementare endpoint backend /api/crm/analytics/driver-performance
  const analytics: DriverPerformance[] = [];

  const getDriverIcon = (driver: string) => {
    switch (driver) {
      case 'FISSO': return Wifi;
      case 'MOBILE': return Smartphone;
      case 'DEVICE': return Smartphone;
      case 'ACCESSORI': return ShoppingBag;
      default: return Target;
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

  const getDriverGradient = (driver: string) => {
    switch (driver) {
      case 'FISSO': return 'var(--brand-glass-orange)';
      case 'MOBILE': return 'var(--brand-glass-purple)';
      case 'DEVICE': return 'var(--brand-glass-gradient)';
      case 'ACCESSORI': return 'var(--brand-glass-orange)';
      default: return 'var(--glass-card-bg)';
    }
  };

  const totalRevenue = 0;
  const totalDeals = 0;
  const avgConversion = 0;

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca report..."
        />
        <div className="flex-1 p-6 overflow-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-gradient)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <BarChart3 className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                Analytics CRM
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Performance driver e insights clienti
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={cardVariants}>
            <Card 
              className="glass-card p-6 border-0"
              style={{ 
                background: 'var(--brand-glass-orange)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: 'var(--shadow-glass)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--glass-bg-heavy)' }}
                >
                  <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Fatturato Totale
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                €{(totalRevenue / 1000000).toFixed(2)}M
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card 
              className="glass-card p-6 border-0"
              style={{ 
                background: 'var(--brand-glass-purple)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: 'var(--shadow-glass)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--glass-bg-heavy)' }}
                >
                  <Target className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Deal Vinti
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {totalDeals}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card 
              className="glass-card p-6 border-0"
              style={{ 
                background: 'var(--brand-glass-gradient)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: 'var(--shadow-glass)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--glass-bg-heavy)' }}
                >
                  <Users className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Conversion Media
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {avgConversion.toFixed(1)}%
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Driver Performance Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Performance per Driver
          </h2>
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {analytics?.map((driver) => {
              const DriverIcon = getDriverIcon(driver.driver);
              const TrendIcon = driver.trend === 'up' ? ArrowUpRight : ArrowDownRight;
              
              return (
                <motion.div
                  key={driver.driver}
                  variants={cardVariants}
                  whileHover={{ y: -4 }}
                  data-testid={`analytics-driver-${driver.driver.toLowerCase()}`}
                >
                  <Card 
                    className="glass-card border-0"
                    style={{ 
                      background: getDriverGradient(driver.driver),
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      boxShadow: 'var(--shadow-glass)',
                      transition: 'var(--glass-transition)'
                    }}
                  >
                    {/* Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-3 rounded-lg"
                            style={{ 
                              background: 'var(--glass-bg-heavy)',
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <DriverIcon className="h-5 w-5" style={{ color: getDriverColor(driver.driver) }} />
                          </div>
                          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            {driver.driver}
                          </h3>
                        </div>
                        <div 
                          className="flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ 
                            background: driver.trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: driver.trend === 'up' ? 'hsl(var(--success))' : 'hsl(var(--error))'
                          }}
                        >
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-semibold">
                            {driver.trendValue}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                      <div 
                        className="p-3 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Fatturato
                        </div>
                        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          €{(driver.totalRevenue / 1000).toFixed(0)}k
                        </div>
                      </div>

                      <div 
                        className="p-3 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Deal Vinti
                        </div>
                        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {driver.dealsWon}
                        </div>
                      </div>

                      <div 
                        className="p-3 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Win Rate
                        </div>
                        <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                          {driver.conversionRate}%
                        </div>
                      </div>

                      <div 
                        className="p-3 rounded-lg"
                        style={{ 
                          background: 'var(--glass-bg-heavy)',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Ticket Medio
                        </div>
                        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          €{(driver.avgDealSize / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Coming Soon Section */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card 
            className="glass-card p-12 border-0 text-center"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'hsl(var(--brand-orange))' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Advanced Analytics in arrivo
            </h3>
            <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>
              Conversion funnels, customer lifetime value, product attach rates (Netflix con Fibra), 
              churn prediction AI e cross-sell opportunities
            </p>
          </Card>
        </motion.div>
        </div>
      </div>
    </Layout>
  );
}
