import { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Calendar,
  Globe,
  Briefcase,
  Settings,
  Menu,
  Bell,
  Search,
  User,
  LogOut
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
      icon: <LayoutDashboard className="h-5 w-5" />,
      active: window.location.pathname === '/'
    },
    {
      label: 'POS / Cassa',
      href: '/cassa',
      icon: <ShoppingCart className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/cassa')
    },
    {
      label: 'Magazzino',
      href: '/magazzino', 
      icon: <Package className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/magazzino')
    },
    {
      label: 'CRM',
      href: '/crm',
      icon: <Users className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/crm')
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/analytics')
    },
    {
      label: 'HR',
      href: '/hr',
      icon: <Calendar className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/hr')
    },
    {
      label: 'CMS',
      href: '/cms',
      icon: <Globe className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/cms')
    },
    {
      label: 'Gare',
      href: '/gare',
      icon: <Briefcase className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/gare')
    },
    {
      label: 'Impostazioni',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
      active: window.location.pathname.startsWith('/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      
      {/* Sidebar */}
      <Sidebar 
        navigation={navigation} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        
        {/* Top Header */}
        <header className="glass border-b border-white/20 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            </button>

            {/* Search bar */}
            <div className="hidden md:flex items-center flex-1 max-w-lg mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cerca in W3 Suite..."
                  className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white/20 bg-white/5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Bell className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {user?.name || 'Utente'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {tenant?.name || 'W3 Suite'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <button 
                  onClick={() => window.location.href = '/api/logout'}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}