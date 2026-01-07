import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { 
  Building2, Store, Users, TrendingUp, Activity,
  Clock, CheckCircle, AlertCircle, BarChart3
} from 'lucide-react';

const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
  },
  gradients: {
    orange: 'linear-gradient(135deg, #FF6900, #ff8533)',
    purple: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
    blue: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    green: 'linear-gradient(135deg, #10b981, #34d399)',
  }
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  border: '0.0625rem solid #e5e7eb',
  boxShadow: '0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  trend?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, trend }: StatCardProps) {
  return (
    <div 
      style={{
        ...cardStyle,
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div style={{
        position: 'absolute',
        top: '-1rem',
        right: '-1rem',
        width: '5rem',
        height: '5rem',
        background: gradient,
        borderRadius: '50%',
        opacity: 0.1,
      }} />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ 
            fontSize: '0.875rem', 
            color: COLORS.neutral.medium, 
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            {title}
          </p>
          <p style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: COLORS.neutral.dark, 
            margin: 0,
            lineHeight: 1.2
          }}>
            {value}
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: COLORS.neutral.light, 
            margin: 0,
            marginTop: '0.25rem'
          }}>
            {subtitle}
          </p>
        </div>
        <div style={{
          width: '3rem',
          height: '3rem',
          background: gradient,
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: 'white' }} />
        </div>
      </div>
      
      {trend && (
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          color: trend.startsWith('+') ? COLORS.semantic.success : COLORS.semantic.error,
        }}>
          <TrendingUp size={14} />
          {trend}
        </div>
      )}
    </div>
  );
}

export default function ManagementDashboardTab() {
  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/brand-api/organizations'],
    queryFn: () => apiRequest('/brand-api/organizations'),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['/brand-api/analytics/cross-tenant'],
    queryFn: () => apiRequest('/brand-api/analytics/cross-tenant'),
  });

  const tenants = tenantsData?.organizations || [];
  const analytics = analyticsData?.summary || {};
  
  // Use real analytics data (supports both 'active'/'attivo' and 'suspended'/'sospeso')
  const activeTenants = analytics.activeTenants ?? tenants.filter((t: any) => 
    t.status === 'active' || t.status === 'attivo'
  ).length;
  const suspendedTenants = analytics.suspendedTenants ?? tenants.filter((t: any) => 
    t.status === 'suspended' || t.status === 'sospeso' || t.status === 'inactive'
  ).length;
  const totalUsers = analytics.activeUsers ?? analytics.totalUsers ?? '--';

  const recentActivities = [
    {
      id: '1',
      title: 'Nuovo tenant creato',
      description: 'Tenant "Demo Company" aggiunto al sistema',
      time: '2 ore fa',
      icon: Building2,
      color: COLORS.semantic.success,
    },
    {
      id: '2',
      title: 'Store aggiunto',
      description: 'Store "Milano Centro" creato per WindTre Retail',
      time: '4 ore fa',
      icon: Store,
      color: COLORS.primary.orange,
    },
    {
      id: '3',
      title: 'Utente invitato',
      description: 'Accesso concesso a marco.rossi@example.com',
      time: '1 giorno fa',
      icon: Users,
      color: COLORS.primary.purple,
    },
  ];

  if (tenantsLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '4rem',
        color: COLORS.neutral.medium
      }}>
        <Clock className="animate-spin mr-2" size={20} />
        Caricamento dashboard...
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="Tenant Totali"
          value={tenants.length}
          subtitle="Organizzazioni registrate"
          icon={Building2}
          gradient={COLORS.gradients.orange}
          trend="+2 questo mese"
        />
        <StatCard
          title="Tenant Attivi"
          value={activeTenants}
          subtitle="Organizzazioni operative"
          icon={CheckCircle}
          gradient={COLORS.gradients.green}
        />
        <StatCard
          title="Tenant Sospesi"
          value={suspendedTenants}
          subtitle="In attesa di riattivazione"
          icon={AlertCircle}
          gradient={COLORS.gradients.purple}
        />
        <StatCard
          title="Utenti Totali"
          value={totalUsers}
          subtitle="Cross-tenant"
          icon={Users}
          gradient={COLORS.gradients.blue}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ ...cardStyle, padding: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: COLORS.neutral.dark,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Activity size={18} style={{ color: COLORS.primary.orange }} />
              Attività Recenti
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div 
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: COLORS.neutral.lightest,
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.5rem',
                    background: `${activity.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={14} style={{ color: activity.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500, 
                      color: COLORS.neutral.dark,
                      margin: 0 
                    }}>
                      {activity.title}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: COLORS.neutral.medium,
                      margin: 0,
                      marginTop: '0.125rem'
                    }}>
                      {activity.description}
                    </p>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: COLORS.neutral.light,
                    flexShrink: 0
                  }}>
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: COLORS.neutral.dark,
            margin: 0,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={18} style={{ color: COLORS.primary.purple }} />
            Stato Sistema
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                Uptime
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: COLORS.semantic.success 
              }}>
                99.9%
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                Database
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: COLORS.semantic.success,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: COLORS.semantic.success,
                }} />
                Operativo
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                API
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: COLORS.semantic.success,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: COLORS.semantic.success,
                }} />
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
