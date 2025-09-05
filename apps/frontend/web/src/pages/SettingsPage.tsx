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
  HelpCircle,
  Factory,
  Briefcase,
  Heart,
  Star,
  Target,
  TrendingUp,
  DollarSign,
  Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeTab, setActiveTab] = useState('Entity Management');

  // Mock data per ragioni sociali
  const mockRagioneSociali = [
    { 
      id: 1, 
      nome: 'Franchising Ltd', 
      formaGiuridica: 'Srl', 
      pIva: 'IT12345678901', 
      stato: 'Attiva',
      citta: 'Milano',
      azioni: 'edit'
    },
    { 
      id: 2, 
      nome: 'Digital Operations Snc', 
      formaGiuridica: 'Snc', 
      pIva: 'IT09876543210', 
      stato: 'Attiva',
      citta: 'Bologna',
      azioni: 'edit'
    },
    { 
      id: 3, 
      nome: 'Tech Solutions Ltd', 
      formaGiuridica: 'Srl', 
      pIva: 'IT11122233344', 
      stato: 'Bozza',
      citta: 'Roma',
      azioni: 'edit'
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
      {/* Header Configurazione Entità */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione Entità
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci entità aziendali, configurazioni generali
        </p>
      </div>

      {/* Sezione Icone Configurazione - Identica al print screen */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          alignItems: 'center',
          gap: '16px'
        }}>
          {[
            { icon: Building2, label: 'Ragione Sociale', active: true, color: '#FF6900' },
            { icon: Users, label: 'Clienti', color: '#3b82f6' },
            { icon: Store, label: 'Punti Vendita', color: '#7B2CBF' },
            { icon: Server, label: 'Smart Automation', color: '#10b981' },
            { icon: Activity, label: 'Servizi', color: '#f59e0b' },
            { icon: FileText, label: 'Auto Reporting', color: '#ef4444' },
            { icon: Shield, label: 'GDPR', color: '#8b5cf6' },
            { icon: Bell, label: 'Alert Notifications', color: '#06b6d4' }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                style={{
                  background: item.active 
                    ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)`
                    : 'transparent',
                  border: item.active 
                    ? `1px solid ${item.color}30`
                    : '1px solid transparent',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  if (!item.active) {
                    e.currentTarget.style.background = `${item.color}10`;
                    e.currentTarget.style.borderColor = `${item.color}20`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!item.active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Icon size={16} style={{ color: item.active ? item.color : '#6b7280' }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: item.active ? '600' : '500',
                  color: item.active ? item.color : '#6b7280'
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Gestione Ragioni Sociali */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          Gestione Ragioni Sociali
        </h3>
        <button style={{
          background: 'linear-gradient(135deg, #FF6900, #ff8533)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 105, 0, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.3)';
        }}>
          <Plus size={16} />
          Nuova Ragione Sociale
        </button>
      </div>

      {/* Tabella Gestione Ragioni Sociali - Identica al print screen */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        {/* Header tabella */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.05)',
          borderBottom: '1px solid hsla(255, 255, 255, 0.08)',
          padding: '0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 80px',
            alignItems: 'center',
            padding: '16px 20px',
            gap: '16px'
          }}>
            {['Nome', 'Forma Giuridica', 'P.IVA', 'Stato', 'Città', 'Azioni'].map((header, index) => (
              <div key={index} style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {header}
              </div>
            ))}
          </div>
        </div>

        {/* Righe tabella */}
        <div>
          {mockRagioneSociali.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 80px',
                alignItems: 'center',
                padding: '16px 20px',
                gap: '16px',
                borderBottom: index < mockRagioneSociali.length - 1 
                  ? '1px solid hsla(255, 255, 255, 0.06)' 
                  : 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Nome */}
              <div style={{
                fontSize: '14px',
                color: '#111827',
                fontWeight: '500'
              }}>
                {item.nome}
              </div>

              {/* Forma Giuridica */}
              <div style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {item.formaGiuridica}
              </div>

              {/* P.IVA */}
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                fontFamily: 'monospace'
              }}>
                {item.pIva}
              </div>

              {/* Stato */}
              <div>
                <span style={{
                  background: item.stato === 'Attiva' 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: item.stato === 'Attiva'
                    ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                    : '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}>
                  {item.stato}
                </span>
              </div>

              {/* Città */}
              <div style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {item.citta}
              </div>

              {/* Azioni */}
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button style={{
                  background: 'hsla(59, 130, 246, 0.1)',
                  border: '1px solid hsla(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  padding: '6px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'hsla(59, 130, 246, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'hsla(59, 130, 246, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                  <Edit3 size={14} />
                </button>
                <button style={{
                  background: 'hsla(239, 68, 68, 0.1)',
                  border: '1px solid hsla(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '6px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'hsla(239, 68, 68, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'hsla(239, 68, 68, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(123, 44, 191, 0.3)',
        animation: 'float 3s ease-in-out infinite'
      }}>
        <Cpu size={32} style={{ color: 'white' }} />
      </div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '12px'
      }}>
        AI Assistant
      </h3>
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        maxWidth: '400px',
        lineHeight: 1.6
      }}>
        Configurazione assistente AI per automazione processi e supporto decisionale enterprise
      </p>
    </div>
  );

  const renderChannelSettings = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
        animation: 'float 3s ease-in-out infinite'
      }}>
        <Globe size={32} style={{ color: 'white' }} />
      </div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '12px'
      }}>
        Channel Settings
      </h3>
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        maxWidth: '400px',
        lineHeight: 1.6
      }}>
        Gestione canali di comunicazione multitenant e configurazioni brand WindTre/Very Mobile
      </p>
    </div>
  );

  const renderSystemSettings = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
        animation: 'float 3s ease-in-out infinite'
      }}>
        <Server size={32} style={{ color: 'white' }} />
      </div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '12px'
      }}>
        System Settings
      </h3>
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        maxWidth: '400px',
        lineHeight: 1.6
      }}>
        Configurazioni avanzate sistema, database PostgreSQL, OAuth2/OIDC e monitoring enterprise
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
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: 'calc(100vh - 48px)',
        position: 'relative',
        width: 'calc(100% + 48px)',
        margin: '-24px',
        padding: 0
      }}>
        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes glow {
            0%, 100% { box-shadow: 0 4px 20px rgba(255, 105, 0, 0.2); }
            50% { box-shadow: 0 8px 32px rgba(255, 105, 0, 0.4); }
          }
        `}</style>

        {/* Header con titolo e descrizione */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid hsla(255, 255, 255, 0.12)'
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
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            Gestisci entità, AI, canali di comunicazione, backup e configurazioni sistema
          </p>
        </div>

        {/* Tabs orizzontali con glassmorphism moderno */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid hsla(255, 255, 255, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '6px',
            gap: '4px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
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
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    color: isActive ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive 
                      ? '0 4px 16px rgba(255, 105, 0, 0.3)' 
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'hsla(255, 255, 255, 0.08)';
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
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px' }}>
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}