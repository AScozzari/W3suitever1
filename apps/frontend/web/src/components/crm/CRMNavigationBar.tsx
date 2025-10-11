import { useLocation } from 'wouter';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { 
  LayoutDashboard, 
  Megaphone, 
  UserPlus, 
  Target, 
  Users, 
  CheckSquare, 
  BarChart3 
} from 'lucide-react';

interface CRMNavigationBarProps {
  className?: string;
}

export function CRMNavigationBar({ className = '' }: CRMNavigationBarProps) {
  const [location] = useLocation();
  const { navigate, buildUrl } = useTenantNavigation();

  const tabs = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: buildUrl('crm')
    },
    {
      value: 'campaigns',
      label: 'Campagne',
      icon: Megaphone,
      path: buildUrl('crm/campaigns')
    },
    {
      value: 'leads',
      label: 'Lead',
      icon: UserPlus,
      path: buildUrl('crm/leads')
    },
    {
      value: 'pipeline',
      label: 'Pipeline',
      icon: Target,
      path: buildUrl('crm/pipeline')
    },
    {
      value: 'customers',
      label: 'Clienti',
      icon: Users,
      path: buildUrl('crm/customers')
    },
    {
      value: 'activities',
      label: 'Attività',
      icon: CheckSquare,
      path: buildUrl('crm/activities')
    },
    {
      value: 'analytics',
      label: 'Report',
      icon: BarChart3,
      path: buildUrl('crm/analytics')
    }
  ];

  // Determine active tab based on current location
  const getActiveTab = () => {
    if (location.includes('/crm/campaigns')) return 'campaigns';
    if (location.includes('/crm/leads')) return 'leads';
    if (location.includes('/crm/pipeline')) return 'pipeline';
    if (location.includes('/crm/customers')) return 'customers';
    if (location.includes('/crm/activities')) return 'activities';
    if (location.includes('/crm/analytics')) return 'analytics';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <nav 
      className={`sticky top-0 z-40 border-b ${className}`}
      style={{ 
        background: 'var(--glass-card-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderColor: 'var(--glass-card-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-center h-14 px-4 max-w-full overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          
          return (
            <button
              key={tab.value}
              onClick={() => navigate(tab.path.replace(/^\/[^/]+\//, ''))}
              className="relative flex items-center gap-2 px-4 py-2 h-10 rounded-lg transition-all duration-200 whitespace-nowrap hover:bg-white/10"
              style={{
                background: isActive ? 'var(--brand-glass-orange)' : 'transparent',
                color: isActive ? 'hsl(var(--brand-orange))' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '500'
              }}
              data-testid={`crm-tab-${tab.value}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{tab.label}</span>
              
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'hsl(var(--brand-orange))' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
