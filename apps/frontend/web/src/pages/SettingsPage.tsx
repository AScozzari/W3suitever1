import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Building,
  Server,
  Key,
  Bell,
  Palette,
  User,
  Lock,
  Activity,
  FileText,
  Save,
  Edit3,
  Plus,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Briefcase,
  Store,
  UserCheck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  Globe,
  MapPin,
  Database,
  Cpu,
  HardDrive,
  BarChart
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Entity Management');

  // Mock data per replicare gli esempi
  const mockRagioneSociali = [
    { id: 1, name: 'Franchising Ltd', formaGiuridica: 'Srl', pIva: 'IT12345678901', stato: 'Attiva', città: 'Milano' },
    { id: 2, name: 'Digital Operations Snc', formaGiuridica: 'Snc', pIva: 'IT09876543210', stato: 'Attiva', città: 'Bologna' },
    { id: 3, name: 'Tech Solutions Ltd', formaGiuridica: 'Srl', pIva: 'IT11122233344', stato: 'Bozza', città: 'Roma' }
  ];

  const mockSystemStats = {
    sistema: '174 136 132m',
    configurazioni: '13%',
    monitoraggio: '48%',
    logs: 'Data Corrente'
  };

  const mockDatabase = {
    name: 'windtre_production',
    dimensione: '1.7 MB',
    utilizzo: 64,
    tabelle: [
      { name: 'Connessione Attiva', performance: '1', connections: '5Rows', usage: '1.7 MB', config: '64%' },
    ]
  };

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
    { id: 'Social Network', label: 'Social Network', icon: Globe },
    { id: 'Analytics', label: 'Analytics', icon: BarChart }
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
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb' }}>
          <Building size={16} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Ragione Sociale</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Users size={16} />
          <span style={{ fontSize: '14px' }}>Clienti</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Store size={16} />
          <span style={{ fontSize: '14px' }}>Punti Vendita</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Server size={16} />
          <span style={{ fontSize: '14px' }}>Smart Automation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Activity size={16} />
          <span style={{ fontSize: '14px' }}>Servizi</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <FileText size={16} />
          <span style={{ fontSize: '14px' }}>Auto Reporting</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Shield size={16} />
          <span style={{ fontSize: '14px' }}>GDPR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Bell size={16} />
          <span style={{ fontSize: '14px' }}>Alert Notifications</span>
        </div>
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
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}>
          <Plus size={16} />
          Nuova Ragione Sociale
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Nome</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Forma Giuridica</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>P.IVA</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Stato</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Città</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {mockRagioneSociali.map((item, index) => (
              <tr key={item.id} style={{ 
                borderBottom: index < mockRagioneSociali.length - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '6px',
                      transition: 'all 0.2s ease'
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
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
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <HardDrive size={28} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
            {mockSystemStats.sistema}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Sistema</div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <SettingsIcon size={28} style={{ color: '#2563eb', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
            {mockSystemStats.configurazioni}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Configurazioni</div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <Activity size={28} style={{ color: '#7c3aed', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>
            {mockSystemStats.monitoraggio}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Monitoraggio</div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <FileText size={28} style={{ color: '#d97706', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>
            {mockSystemStats.logs}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Logs</div>
        </div>
      </div>

      {/* Database Configuration */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
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
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>Parametro</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>Performance</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>Utilizzo</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>Configurazione</th>
              </tr>
            </thead>
            <tbody>
              {mockDatabase.tabelle.map((table, index) => (
                <tr key={index}>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>{table.name}</td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>{table.performance}</span>
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
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>{table.usage}</span>
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
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>{table.config}</span>
                      <div style={{
                        width: '80px',
                        height: '6px',
                        background: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}>
                        <div style={{
                          width: `${mockDatabase.utilizzo}%`,
                          height: '100%',
                          background: '#2563eb'
                        }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#ffffff'
    }}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/">
                <button style={{
                  background: '#f8f9fa',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  <ArrowLeft size={20} />
                </button>
              </Link>
              <div>
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
            </div>
          </div>
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
          {activeTab === 'AI Assistant' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <Cpu size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
              <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>AI Assistant</h3>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>Configurazione assistente AI in sviluppo</p>
            </div>
          )}
          {activeTab === 'Channel Settings' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <SettingsIcon size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
              <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>Channel Settings</h3>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>Configurazioni canale in sviluppo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}