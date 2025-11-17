import { useState, useMemo } from 'react';
import BrandLayout from '@/components/BrandLayout';
import { 
  Rocket, 
  Activity, 
  GitBranch,
  Clock
} from 'lucide-react';
import ReadyQueueTab from '@/components/deploy-center/ReadyQueueTab';
import StatusRealTimeTab from '@/components/deploy-center/StatusRealTimeTab';
import BrowseCommitsTab from '@/components/deploy-center/BrowseCommitsTab';

export default function DeployCenterPage() {
  const [activeTab, setActiveTab] = useState('ready-queue');

  const tabConfigs = useMemo(() => [
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
            backdropFilter: 'blur(24px) saturate(140%)',
            borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0
                }}>
                  <GitBranch size={24} style={{ color: '#FF6900' }} />
                  Deploy Center
                </h1>
                <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
                  Gestione centralizzata deployment CRM, WMS, POS e Analytics
                </p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
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
                      gap: '8px',
                      padding: '10px 16px',
                      background: isActive 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                        : 'transparent',
                      color: isActive ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
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
          {activeTab === 'ready-queue' && <ReadyQueueTab />}
          {activeTab === 'status' && <StatusRealTimeTab />}
          {activeTab === 'browse' && <BrowseCommitsTab />}
        </div>
      </div>
    </BrandLayout>
  );
}
