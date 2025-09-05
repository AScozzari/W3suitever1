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
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: 'white',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
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
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA' }}>
          <Building size={16} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Ragione Sociale</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Users size={16} />
          <span style={{ fontSize: '14px' }}>Clienti</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Store size={16} />
          <span style={{ fontSize: '14px' }}>Punti Vendita</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Server size={16} />
          <span style={{ fontSize: '14px' }}>Smart Automation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Activity size={16} />
          <span style={{ fontSize: '14px' }}>Servizi</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <FileText size={16} />
          <span style={{ fontSize: '14px' }}>Auto Reporting</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Shield size={16} />
          <span style={{ fontSize: '14px' }}>GDPR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
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
          color: 'white',
          margin: 0
        }}>
          Gestione Ragioni Sociali
        </h3>
        <button style={{
          background: 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(255,105,0,0.3)',
          transition: 'all 0.3s ease'
        }}>
          <Plus size={16} />
          Nuova Ragione Sociale
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>Nome</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>Forma Giuridica</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>P.IVA</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>Stato</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>Città</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {mockRagioneSociali.map((item, index) => (
              <tr key={item.id} style={{ 
                borderBottom: index < mockRagioneSociali.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.9)'
                }}>{item.name}</td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)'
                }}>{item.formaGiuridica}</td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)'
                }}>{item.pIva}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    background: item.stato === 'Attiva' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                    color: item.stato === 'Attiva' ? '#4ADE80' : '#F59E0B',
                    border: `1px solid ${item.stato === 'Attiva' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {item.stato}
                  </span>
                </td>
                <td style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)'
                }}>{item.città}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button style={{
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      color: '#F87171',
                      cursor: 'pointer',
                      padding: '8px',
                      transition: 'all 0.3s ease'
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
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: 'white',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
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
          const isActive = tab.id === 'Database'; // Database is active in the example
          return (
            <button
              key={tab.id}
              style={{
                background: isActive ? 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)' : 'rgba(255,255,255,0.1)',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                fontWeight: isActive ? '600' : '500'
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
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <HardDrive size={28} style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ADE80', marginBottom: '4px' }}>
            {mockSystemStats.sistema}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(74,222,128,0.8)' }}>Sistema</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <SettingsIcon size={28} style={{ color: '#60A5FA', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#60A5FA', marginBottom: '4px' }}>
            {mockSystemStats.configurazioni}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(96,165,250,0.8)' }}>Configurazioni</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <Activity size={28} style={{ color: '#A855F7', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#A855F7', marginBottom: '4px' }}>
            {mockSystemStats.monitoraggio}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(168,85,247,0.8)' }}>Monitoraggio</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <FileText size={28} style={{ color: '#F59E0B', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B', marginBottom: '4px' }}>
            {mockSystemStats.logs}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(245,158,11,0.8)' }}>Logs</div>
        </div>
      </div>

      {/* Database Configuration - Glassmorphism Style */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <Database size={24} style={{ color: '#60A5FA' }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            margin: 0
          }}>
            Configurazione Database
          </h3>
        </div>

        {/* Database Table with glassmorphism */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>Parametro</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>Performance</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>Utilizzo</th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>Configurazione</th>
              </tr>
            </thead>
            <tbody>
              {mockDatabase.tabelle.map((table, index) => (
                <tr key={index}>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>{table.name}</td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#60A5FA' }}>{table.performance}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Connessione stabile</span>
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#4ADE80' }}>{table.usage}</span>
                      <div style={{
                        width: '80px',
                        height: '6px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}>
                        <div style={{
                          width: '70%',
                          height: '100%',
                          background: '#4ADE80'
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#60A5FA' }}>{table.config}</span>
                      <div style={{
                        width: '80px',
                        height: '6px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}>
                        <div style={{
                          width: `${mockDatabase.utilizzo}%`,
                          height: '100%',
                          background: '#60A5FA'
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
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 50%, #FF6900 100%)',
      backgroundAttachment: 'fixed'
    }}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header con back button */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/">
                <button style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(20px)'
                }}>
                  <ArrowLeft size={20} />
                </button>
              </Link>
              <div>
                <h1 style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0 0 8px 0',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFB366 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Configurazioni Sistema
                </h1>
                <p style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '18px', 
                  margin: 0,
                  fontWeight: '500'
                }}>
                  Gestione completa per sistema di configurazione e sistema aziendale
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '8px',
          marginBottom: '32px',
          display: 'flex',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.7)',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.id ? '0 4px 16px rgba(255,105,0,0.3)' : 'none',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <tab.icon size={18} />
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
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }}>
              <Cpu size={64} style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 24px' }} />
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>AI Assistant</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>Configurazione assistente AI in sviluppo</p>
            </div>
          )}
          {activeTab === 'Channel Settings' && (
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }}>
              <SettingsIcon size={64} style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 24px' }} />
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>Channel Settings</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>Configurazioni canale in sviluppo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}