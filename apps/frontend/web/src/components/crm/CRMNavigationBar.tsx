import { useLocation, Link } from 'wouter';
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
      value: 'pipeline',
      label: 'Pipeline',
      icon: Target,
      path: buildUrl('crm/pipeline')
    },
    {
      value: 'leads',
      label: 'Lead',
      icon: UserPlus,
      path: buildUrl('crm/leads')
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
      label: 'Analytics',
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
      className={`sticky top-0 z-40 ${className}`}
      style={{ 
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(243, 244, 246, 0.5)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          
          return (
            <Link
              key={tab.value}
              href={tab.path}
              className="transition-all duration-200"
              style={{
                flex: 1,
                background: isActive 
                  ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                  : 'transparent',
                color: isActive ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                boxShadow: isActive 
                  ? '0 4px 16px rgba(255, 105, 0, 0.3)' 
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              data-testid={`crm-tab-${tab.value}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
