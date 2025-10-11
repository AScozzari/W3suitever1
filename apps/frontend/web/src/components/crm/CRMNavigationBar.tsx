import { useLocation } from 'wouter';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div 
      className={`border-b ${className}`}
      style={{ 
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderColor: 'var(--glass-card-border)'
      }}
    >
      <Tabs value={activeTab} className="w-full">
        <TabsList 
          className="h-14 w-full justify-start rounded-none border-0 bg-transparent p-0"
          style={{ background: 'transparent' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                onClick={() => navigate(tab.path.replace(/^\/[^/]+\//, ''))}
                className="relative h-14 rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                style={{
                  borderBottomColor: isActive ? 'hsl(var(--brand-orange))' : 'transparent',
                  color: isActive ? 'hsl(var(--brand-orange))' : 'var(--text-secondary)'
                }}
                data-testid={`crm-tab-${tab.value}`}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
