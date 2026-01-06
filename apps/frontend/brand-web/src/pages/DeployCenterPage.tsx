import { useState, useMemo } from 'react';
import BrandLayout from '@/components/BrandLayout';
import { 
  Rocket, 
  Activity, 
  GitBranch,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import DashboardTab from '@/components/deploy-center/DashboardTab';
import ReadyQueueTab from '@/components/deploy-center/ReadyQueueTab';
import StatusRealTimeTab from '@/components/deploy-center/StatusRealTimeTab';
import BrowseCommitsTab from '@/components/deploy-center/BrowseCommitsTab';

export default function DeployCenterPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabConfigs = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      testId: 'tab-dashboard'
    },
    {
      id: 'ready-queue',
      label: 'Ready Queue',
      icon: Rocket,
      testId: 'tab-ready-queue'
    },
    {
      id: 'status',
      label: 'Status Real-Time',
      icon: Activity,
      testId: 'tab-status'
    },
    {
      id: 'browse',
      label: 'Browse All Commits',
      icon: Clock,
      testId: 'tab-browse'
    }
  ], []);

  return (
    <BrandLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div 
          style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(1.5rem) saturate(140%)',
            borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0
                }}>
                  <GitBranch size={24} style={{ color: '#FF6900' }} />
                  Deploy Center
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
                  Gestione centralizzata deployment CRM, WMS, POS e Analytics
                </p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem' }}>
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={tab.testId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1rem',
                      background: isActive 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                        : 'transparent',
                      color: isActive ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'ready-queue' && <ReadyQueueTab />}
          {activeTab === 'status' && <StatusRealTimeTab />}
          {activeTab === 'browse' && <BrowseCommitsTab />}
        </div>
      </div>
    </BrandLayout>
  );
}
