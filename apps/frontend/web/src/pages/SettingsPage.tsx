import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
  Settings as SettingsIcon,
  Users,
  Building,
  Server,
  Plus,
  Trash2,
  Database,
  Cpu,
  HardDrive,
  Activity,
  FileText,
  Globe,
  Store,
  Lock,
  Shield,
  Bell
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeTab, setActiveTab] = useState('Entity Management');

  // Mock data
  const mockRagioneSociali = [
    { id: 1, name: 'Franchising Ltd', formaGiuridica: 'Srl', pIva: 'IT12345678901', stato: 'Attiva', città: 'Milano' },
    { id: 2, name: 'Digital Operations Snc', formaGiuridica: 'Snc', pIva: 'IT09876543210', stato: 'Attiva', città: 'Bologna' },
    { id: 3, name: 'Tech Solutions Ltd', formaGiuridica: 'Srl', pIva: 'IT11122233344', stato: 'Bozza', città: 'Roma' }
  ];

  const tabs = [
    { id: 'Entity Management', label: 'Entity Management', icon: Building },
    { id: 'AI Assistant', label: 'AI Assistant', icon: Cpu },
    { id: 'Channel Settings', label: 'Channel Settings', icon: SettingsIcon },
    { id: 'System Settings', label: 'System Settings', icon: Server }
  ];

  const systemTabs = [
    { id: 'Generali', label: 'Generali', icon: SettingsIcon },
    { id: 'Contenuto', label: 'Contenuto', icon: FileText },
    { id: 'Database', label: 'Database', icon: Database },
    { id: 'Backup', label: 'Backup', icon: Shield },
    { id: 'Sicurezza', label: 'Sicurezza', icon: Lock },
    { id: 'Configurazione', label: 'Configurazione', icon: SettingsIcon },
    { id: 'Utenti e Siti', label: 'Utenti e Siti', icon: Users },
    { id: 'Commercio', label: 'Commercio', icon: Store },
    { id: 'Social Network', label: 'Social Network', icon: Globe }
  ];

  const renderEntityManagement = () => (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Configurazione Entità
      </h2>

      {/* Entity Icons Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        {[
          { icon: Building, label: 'Ragione Sociale', active: true },
          { icon: Users, label: 'Clienti' },
          { icon: Store, label: 'Punti Vendita' },
          { icon: Server, label: 'Smart Automation' },
          { icon: Activity, label: 'Servizi' },
          { icon: FileText, label: 'Auto Reporting' },
          { icon: Shield, label: 'GDPR' },
          { icon: Bell, label: 'Alert Notifications' }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: item.active ? '#2563eb' : '#64748b' 
            }}>
              <Icon size={16} />
              <span style={{ fontSize: '14px', fontWeight: item.active ? '500' : '400' }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          Gestione Ragioni Sociali
        </h3>
        <button style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <Plus size={16} />
          Nuova Ragione Sociale
        </button>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Nome', 'Forma Giuridica', 'P.IVA', 'Stato', 'Città', 'Azioni'].map((header, index) => (
                <th key={index} style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockRagioneSociali.map((item, index) => (
              <tr key={item.id} style={{ 
                borderBottom: index < mockRagioneSociali.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '500'
                }}>{item.name}</td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>{item.formaGiuridica}</td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>{item.pIva}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    background: item.stato === 'Attiva' ? '#dcfce7' : '#fef3c7',
                    color: item.stato === 'Attiva' ? '#16a34a' : '#d97706',
                    border: `1px solid ${item.stato === 'Attiva' ? '#bbf7d0' : '#fde68a'}`,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {item.stato}
                  </span>
                </td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>{item.città}</td>
                <td style={{ padding: '16px 20px' }}>
                  <button style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    padding: '6px'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Configurazione Sistema
      </h2>

      {/* System Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {systemTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'Database';
          return (
            <button
              key={tab.id}
              style={{
                background: isActive ? '#2563eb' : '#f8f9fa',
                color: isActive ? 'white' : '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? '500' : '400'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Sistema', value: '174 136 132m', icon: HardDrive, color: '#16a34a' },
          { label: 'Configurazioni', value: '13%', icon: SettingsIcon, color: '#2563eb' },
          { label: 'Monitoraggio', value: '48%', icon: Activity, color: '#7c3aed' },
          { label: 'Logs', value: 'Data Corrente', icon: FileText, color: '#d97706' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <Icon size={28} style={{ color: stat.color, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Database Configuration */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <Database size={24} style={{ color: '#2563eb' }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Configurazione Database
          </h3>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Parametro', 'Performance', 'Utilizzo', 'Configurazione'].map((header, index) => (
                  <th key={index} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>Connessione Attiva</td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>1</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Connessione stabile</span>
                  </div>
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>1.7 MB</span>
                    <div style={{
                      width: '80px',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginTop: '4px'
                    }}>
                      <div style={{
                        width: '70%',
                        height: '100%',
                        background: '#16a34a'
                      }} />
                    </div>
                  </div>
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>64%</span>
                    <div style={{
                      width: '80px',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginTop: '4px'
                    }}>
                      <div style={{
                        width: '64%',
                        height: '100%',
                        background: '#2563eb'
                      }} />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ backgroundColor: '#ffffff', minHeight: 'calc(100vh - 120px)' }}>
        {/* Header Settings */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Configurazioni Sistema
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '16px', 
            margin: 0
          }}>
            Gestione completa per sistema di configurazione e sistema aziendale
          </p>
        </div>

        {/* Main Tabs */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '4px',
          marginBottom: '32px',
          display: 'flex',
          gap: '4px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div>
          {activeTab === 'Entity Management' && renderEntityManagement()}
          {activeTab === 'System Settings' && renderSystemSettings()}
          {(activeTab === 'AI Assistant' || activeTab === 'Channel Settings') && (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <SettingsIcon size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
              <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>
                {activeTab}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>Modulo in sviluppo</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}