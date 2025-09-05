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
    <div style={{ padding: '24px 0' }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
      }}>
        Configurazione Entità
      </h2>

      {/* Entity Icons Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '8px'
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
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#333',
          margin: 0
        }}>
          Gestione Ragioni Sociali
        </h3>
        <button style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Plus size={14} />
          Nuova Ragione Sociale
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'white',
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
                borderBottom: '1px solid #e5e7eb'
              }}>Nome</th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Forma Giuridica</th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>P.IVA</th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Stato</th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb'
              }}>Città</th>
              <th style={{
                padding: '12px 16px',
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
              <tr key={item.id} style={{ borderBottom: index < mockRagioneSociali.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151'
                }}>{item.name}</td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151'
                }}>{item.formaGiuridica}</td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151'
                }}>{item.pIva}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: item.stato === 'Attiva' ? '#dcfce7' : '#fef3c7',
                    color: item.stato === 'Attiva' ? '#16a34a' : '#d97706',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {item.stato}
                  </span>
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#374151'
                }}>{item.città}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '4px'
                    }}>
                      <Trash2 size={16} />
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
    <div style={{ padding: '24px 0' }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
      }}>
        Configurazione Sistema
      </h2>

      {/* System Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {systemTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'Database'; // Database is active in the example
          return (
            <button
              key={tab.id}
              style={{
                background: isActive ? '#2563eb' : '#f8f9fa',
                color: isActive ? 'white' : '#64748b',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            background: '#16a34a',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Algoritmo
          </span>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <HardDrive size={24} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
              {mockSystemStats.sistema}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Sistema</div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <SettingsIcon size={24} style={{ color: '#2563eb', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
              {mockSystemStats.configurazioni}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Configurazioni</div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <Activity size={24} style={{ color: '#7c3aed', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>
              {mockSystemStats.monitoraggio}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Monitoraggio</div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <FileText size={24} style={{ color: '#d97706', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>
              {mockSystemStats.logs}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Logs</div>
          </div>
        </div>
      </div>

      {/* Database Configuration Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Database size={20} style={{ color: '#2563eb' }} />
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            margin: 0
          }}>
            Configurazione Database
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}>Parametro</th>
              <th style={{
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}>Performance</th>
              <th style={{
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}>Utilizzo</th>
              <th style={{
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: '12px',
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
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>{table.name}</td>
                <td style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#2563eb' }}>{table.performance}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Connessione stabile</span>
                  </div>
                </td>
                <td style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>{table.usage}</span>
                    <div style={{
                      width: '60px',
                      height: '4px',
                      background: '#e5e7eb',
                      borderRadius: '2px',
                      overflow: 'hidden'
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
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#2563eb' }}>{table.config}</span>
                    <div style={{
                      width: '60px',
                      height: '4px',
                      background: '#e5e7eb',
                      borderRadius: '2px',
                      overflow: 'hidden'
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

      {/* Actions Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '12px',
          margin: '0 0 12px 0'
        }}>
          Azioni Rapide
        </h4>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Esegui Backup
          </button>
          <button style={{
            background: 'white',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Ripristina Database
          </button>
        </div>
      </div>

      {/* Backup Status */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '12px',
          margin: '0 0 12px 0'
        }}>
          Stato Backup
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ultimo Backup</div>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>2024-06-06T01:06:54.0562Z</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Automatico</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Antivirus</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Dimensioni Backup</div>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>1.6 MB</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Ultimo completato</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>2024-06-06T01:06:54.0562Z</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/">
              <button style={{
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}>
                <ArrowLeft size={16} />
              </button>
            </Link>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Configurazioni Sistema
            </h1>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
            Gestione complete per sistema di configurazione e sistema aziendale
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '24px',
          display: 'flex',
          gap: '4px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#111827' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{
          background: '#ffffff',
          minHeight: '500px'
        }}>
          {activeTab === 'Entity Management' && renderEntityManagement()}
          {activeTab === 'System Settings' && renderSystemSettings()}
          {activeTab === 'AI Assistant' && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Cpu size={48} style={{ color: '#64748b', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#111827', marginBottom: '8px' }}>AI Assistant</h3>
              <p style={{ color: '#64748b' }}>Configurazione assistente AI in sviluppo</p>
            </div>
          )}
          {activeTab === 'Channel Settings' && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <SettingsIcon size={48} style={{ color: '#64748b', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#111827', marginBottom: '8px' }}>Channel Settings</h3>
              <p style={{ color: '#64748b' }}>Configurazioni canale in sviluppo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}