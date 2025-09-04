import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  UserCheck, 
  Settings, 
  Store,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnterpriseSidebarProps {
  collapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'clienti', label: 'Clienti', icon: Users, href: '/clienti' },
  { id: 'contratti', label: 'Contratti', icon: FileText, href: '/contratti' },
  { id: 'fatturazione', label: 'Fatturazione', icon: CreditCard, href: '/fatturazione' },
  { id: 'hr', label: 'Human Resources', icon: UserCheck, href: '/hr' },
  { id: 'amministrazione', label: 'Amministrazione', icon: Settings, href: '/amministrazione' },
  { id: 'cassa', label: 'Cassa', icon: Store, href: '/cassa' },
  { id: 'ai', label: 'AI Tools', icon: Zap, href: '/ai' },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings, href: '/impostazioni' },
];

export const EnterpriseSidebar = ({ collapsed, onCollapseChange }: EnterpriseSidebarProps) => {
  const [location] = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 z-40 glass-strong border-r border-border/50",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <div className="absolute -right-3 top-6 z-50">
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 rounded-full glass-strong border-border/50 p-0"
          onClick={() => onCollapseChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 transition-all duration-200",
                  collapsed ? "px-3" : "px-4",
                  isActive 
                    ? "bg-gradient-primary text-white shadow-glow-orange" 
                    : "hover:bg-windtre-orange/10 hover:text-windtre-orange"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - User */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AU</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">Tenant: Corporate</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};