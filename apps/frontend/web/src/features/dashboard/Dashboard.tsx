import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient-brand">Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Panoramica generale delle attività aziendali
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Vendite Oggi', value: '€2,847', icon: DollarSign, change: '+12%', trend: 'up' },
          { title: 'Ordini Attivi', value: '47', icon: Activity, change: '+3%', trend: 'up' },
          { title: 'Clienti Totali', value: '1,234', icon: Users, change: '+18%', trend: 'up' },
          { title: 'Prodotti Stock', value: '892', icon: Package, change: '-2%', trend: 'down' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="glass rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </p>
                  <p className={`text-sm mt-1 ${
                    stat.trend === 'up' ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {stat.change} vs ieri
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { 
            title: 'POS / Cassa', 
            description: 'Sistema punto vendita e gestione transazioni',
            icon: ShoppingCart,
            href: '/cassa',
            color: 'primary'
          },
          { 
            title: 'Magazzino', 
            description: 'Gestione inventario e movimenti stock',
            icon: Package,
            href: '/magazzino',
            color: 'secondary'
          },
          { 
            title: 'CRM', 
            description: 'Gestione clienti e relazioni commerciali',
            icon: Users,
            href: '/crm',
            color: 'primary'
          },
          { 
            title: 'Analytics', 
            description: 'Reportistica e business intelligence',
            icon: BarChart3,
            href: '/analytics',
            color: 'secondary'
          },
          { 
            title: 'HR', 
            description: 'Gestione risorse umane e planning',
            icon: Activity,
            href: '/hr',
            color: 'primary'
          },
          { 
            title: 'CMS', 
            description: 'Gestione contenuti e vetrina online',
            icon: LayoutDashboard,
            href: '/cms',
            color: 'secondary'
          }
        ].map((module, index) => (
          <motion.a
            key={index}
            href={module.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`glass rounded-xl p-6 h-full hover:scale-[1.02] transition-all duration-300 ${
              module.color === 'primary' ? 'border-primary/20' : 'border-secondary/20'
            }`}>
              <div className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg ${
                    module.color === 'primary' ? 'bg-primary/20' : 'bg-secondary/20'
                  } flex items-center justify-center`}>
                    <module.icon className={`h-6 w-6 ${
                      module.color === 'primary' ? 'text-primary' : 'text-secondary'
                    }`} />
                  </div>
                  <h3 className="text-lg font-semibold">{module.title}</h3>
                </div>
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {module.description}
                </p>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}