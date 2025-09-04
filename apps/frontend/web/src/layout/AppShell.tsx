import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Calendar,
  Globe,
  Briefcase,
  Settings
} from 'lucide-react';

import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  tenant?: {
    id: string;
    name: string;
    logo?: string;
  } | null;
}

export function AppShell({ children, user, tenant }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Navigation items based on W3 Suite modules
  const navigation = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: location.pathname === '/'
    },
    {
      label: 'POS / Cassa',
      href: '/cassa',
      icon: <ShoppingCart className="h-4 w-4" />,
      active: location.pathname.startsWith('/cassa')
    },
    {
      label: 'Magazzino',
      href: '/magazzino', 
      icon: <Package className="h-4 w-4" />,
      active: location.pathname.startsWith('/magazzino')
    },
    {
      label: 'CRM',
      href: '/crm',
      icon: <Users className="h-4 w-4" />,
      active: location.pathname.startsWith('/crm')
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      active: location.pathname.startsWith('/analytics')
    },
    {
      label: 'HR',
      href: '/hr',
      icon: <Calendar className="h-4 w-4" />,
      active: location.pathname.startsWith('/hr')
    },
    {
      label: 'CMS',
      href: '/cms',
      icon: <Globe className="h-4 w-4" />,
      active: location.pathname.startsWith('/cms')
    },
    {
      label: 'Gare',
      href: '/gare',
      icon: <Briefcase className="h-4 w-4" />,
      active: location.pathname.startsWith('/gare')
    },
    {
      label: 'Impostazioni',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />,
      active: location.pathname.startsWith('/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 dark:from-neutral-950 dark:via-primary-950/20 dark:to-secondary-950/20">
      
      {/* W3 Suite Header */}
      <div className="h-16 glass border-b border-white/20">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W3</span>
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Suite
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {user.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          navigation={navigation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 page-layout">
          <div className="container mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}