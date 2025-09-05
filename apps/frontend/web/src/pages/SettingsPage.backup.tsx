import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Building,
  Server,
  Plus,
  Trash2,
  ArrowLeft,
  Database,
  Cpu,
  HardDrive,
  BarChart,
  Activity,
  FileText,
  Bell,
  Globe,
  Store,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Entity Management');
  const [isMobile, setIsMobile] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header fisso - identico alla dashboard */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'hsla(255, 255, 255, 0.15)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid hsla(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        borderRadius: '0 0 20px 20px'
      }}>
        {/* Logo e Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>W</div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1 }}>WindTre Suite</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1 }}>Multitenant Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
            <span style={{ fontWeight: 500 }}>Windtre Milano</span>
          </div>

          <button style={{
            position: 'relative',
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '8px'
          }}>
            <Bell size={20} />
          </button>

          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #7B2CBF, #a855f7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600
          }}>A</div>
        </div>
      </header>

      <div style={{ display: 'flex', paddingTop: '64px' }}>
        {/* Sidebar sinistra - identica alla dashboard */}
        <aside style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          height: 'calc(100vh - 64px)',
          width: leftSidebarCollapsed ? '64px' : '256px',
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderRight: '1px solid hsla(255, 255, 255, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 40,
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)'
        }}>
          <nav style={{ 
            padding: leftSidebarCollapsed ? '16px 8px' : '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: leftSidebarCollapsed ? '12px' : '0'
          }}>
            {/* Menu items della sidebar */}
            <Link href="/">
              <button style={{
                width: leftSidebarCollapsed ? '40px' : '100%',
                height: leftSidebarCollapsed ? '40px' : 'auto',
                padding: leftSidebarCollapsed ? '12px' : '12px 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
              }}>
                <ArrowLeft size={18} />
                {!leftSidebarCollapsed && 'Torna alla Dashboard'}
              </button>
            </Link>
            
            <button style={{
              width: leftSidebarCollapsed ? '40px' : '100%',
              height: leftSidebarCollapsed ? '40px' : 'auto',
              padding: leftSidebarCollapsed ? '12px' : '12px 16px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
            }}>
              <SettingsIcon size={18} />
              {!leftSidebarCollapsed && 'Impostazioni'}
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: leftSidebarCollapsed ? '64px' : '256px',
          padding: '24px',
          transition: 'all 0.3s ease',
          backgroundColor: '#ffffff'
        }}>
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
            {activeTab === 'Entity Management' && (
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
            )}

            {activeTab === 'System Settings' && (
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
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
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
              </div>
            )}

            {/* Altri tab placeholder */}
            {activeTab !== 'Entity Management' && activeTab !== 'System Settings' && (
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '60px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <SettingsIcon size={64} style={{ color: '#6b7280', margin: '0 auto 24px' }} />
                <h3 style={{ color: '#111827', fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>{activeTab}</h3>
                <p style={{ color: '#6b7280', fontSize: '16px' }}>Modulo in sviluppo</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}