import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
  Settings,
  Building2,
  Users,
  Store,
  Shield,
  Bell,
  Database,
  Server,
  Activity,
  FileText,
  Globe,
  Lock,
  Cpu,
  HardDrive,
  Plus,
  Edit3,
  MoreVertical,
  ChevronRight,
  User,
  UserCog,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Zap,
  Palette,
  Languages,
  Clock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  BarChart3,
  Wifi,
  HelpCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeTab, setActiveTab] = useState('Entity Management');

  // Mock data enterprise
  const mockTenants = [
    { 
      id: '1', 
      name: 'WindTre Franchise Nord', 
      slug: 'windtre-nord',
      type: 'Franchising', 
      status: 'active',
      legalEntities: 3,
      stores: 12,
      users: 45,
      createdAt: '2024-01-15'
    },
    { 
      id: '2', 
      name: 'Very Mobile Premium', 
      slug: 'very-premium',
      type: 'Top Dealer', 
      status: 'active',
      legalEntities: 2,
      stores: 8,
      users: 28,
      createdAt: '2024-02-10'
    },
    { 
      id: '3', 
      name: 'Digital Solutions Hub', 
      slug: 'digital-hub',
      type: 'Dealer', 
      status: 'draft',
      legalEntities: 1,
      stores: 3,
      users: 12,
      createdAt: '2024-03-05'
    }
  ];

  const tabs = [
    { id: 'Entity Management', label: 'Entity Management', icon: Building2 },
    { id: 'AI Assistant', label: 'AI Assistant', icon: Cpu },
    { id: 'Channel Settings', label: 'Channel Settings', icon: Globe },
    { id: 'System Settings', label: 'System Settings', icon: Server }
  ];

  const renderEntityManagement = () => (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Configurazione Sistema
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci le impostazioni generali del sistema e dei servizi
        </p>
      </div>

      {/* First Row - Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {[
          { icon: Calendar, label: 'Calendario' },
          { icon: Database, label: 'Database' },
          { icon: FileText, label: 'Fatture' },
          { icon: Bell, label: 'Notifiche' },
          { icon: Globe, label: 'Internet' }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              <Icon size={24} style={{ color: '#6b7280' }} />
              <span style={{
                fontSize: '14px',
                color: '#374151',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aggiorna Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        <button style={{
          background: '#f8f9fa',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '8px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          fontWeight: '500'
        }}>
          <RefreshCw size={14} />
          Aggiorna
        </button>
      </div>

      {/* System Tabs */}
      <div style={{
        display: 'flex',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {[
          { id: 'sistema', label: 'Sistema', icon: Server, active: true },
          { id: 'configurazioni', label: 'Configurazioni', icon: Settings },
          { id: 'monitoraggio', label: 'Monitoraggio', icon: BarChart3 },
          { id: 'logs', label: 'Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              style={{
                flex: 1,
                background: tab.active ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: tab.active ? '600' : '500',
                color: tab.active ? '#111827' : '#6b7280',
                transition: 'all 0.2s ease',
                boxShadow: tab.active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* System Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Uptime Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Uptime
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#dcfce7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={16} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#16a34a',
            marginBottom: '4px'
          }}>
            17d 14h 45m
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Sistema operativo senza interruzioni
          </div>
        </div>

        {/* Memory Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Memoria
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#dbeafe',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HardDrive size={16} style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#3b82f6',
            marginBottom: '4px'
          }}>
            13%
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            1.04 GB / 7.75 GB
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '13%',
              height: '100%',
              background: '#3b82f6',
              borderRadius: '3px'
            }} />
          </div>
        </div>

        {/* CPU Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              CPU
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#fef3c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={16} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#f59e0b',
            marginBottom: '4px'
          }}>
            24%
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            Utilizzo processore
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '24%',
              height: '100%',
              background: '#f59e0b',
              borderRadius: '3px'
            }} />
          </div>
        </div>

        {/* Network Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Rete
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#f3e8ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wifi size={16} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#8b5cf6',
            marginBottom: '4px'
          }}>
            Online
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Connessione stabile
          </div>
        </div>

        {/* Database Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Database
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#dcfce7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={16} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#16a34a',
            marginBottom: '4px'
          }}>
            PostgreSQL
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Connesso e operativo
          </div>
        </div>

        {/* Tenant Stats Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Tenant Attivi
            </h3>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#fff7ed',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={16} style={{ color: '#FF6900' }} />
            </div>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#FF6900',
            marginBottom: '4px'
          }}>
            {mockTenants.filter(t => t.status === 'active').length}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Organizzazioni enterprise
          </div>
        </div>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <Cpu size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
      <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>
        AI Assistant
      </h3>
      <p style={{ color: '#6b7280', fontSize: '16px' }}>
        Configurazione assistente AI in sviluppo
      </p>
    </div>
  );

  const renderChannelSettings = () => (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <Globe size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
      <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>
        Channel Settings
      </h3>
      <p style={{ color: '#6b7280', fontSize: '16px' }}>
        Configurazione canali di comunicazione in sviluppo
      </p>
    </div>
  );

  const renderSystemSettings = () => (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <Server size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
      <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>
        System Settings
      </h3>
      <p style={{ color: '#6b7280', fontSize: '16px' }}>
        Configurazioni avanzate sistema in sviluppo
      </p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Entity Management':
        return renderEntityManagement();
      case 'AI Assistant':
        return renderAIAssistant();
      case 'Channel Settings':
        return renderChannelSettings();
      case 'System Settings':
        return renderSystemSettings();
      default:
        return renderEntityManagement();
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ backgroundColor: '#ffffff', minHeight: 'calc(100vh - 120px)' }}>
        {/* Header con titolo e descrizione */}
        <div style={{
          padding: '32px 32px 24px 32px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Configurazioni Sistema
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0
          }}>
            Gestisci entità, AI, canali di comunicazione, backup e configurazioni
          </p>
        </div>

        {/* Tabs orizzontali - Identico al design dello screenshot */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{
            display: 'flex',
            background: '#f1f3f4',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#111827' : '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textAlign: 'center'
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '32px' }}>
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}