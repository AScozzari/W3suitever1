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
  Trash2,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [activeTab, setActiveTab] = useState('Entity Management');
  
  // Modal states
  const [legalEntityModal, setLegalEntityModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [storeModal, setStoreModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });

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

  // Mock data per punti vendita
  const mockPuntiVendita = [
    { 
      id: 1, 
      codice: 'MI001', 
      nome: 'WindTre Milano Centro', 
      indirizzo: 'Via Montenapoleone 15',
      citta: 'Milano',
      canale: 'Franchising', 
      stato: 'Attivo',
      ragioneSociale: 'Franchising Ltd'
    },
    { 
      id: 2, 
      codice: 'RM002', 
      nome: 'WindTre Roma Termini', 
      indirizzo: 'Via Nazionale 123',
      citta: 'Roma',
      canale: 'Top Dealer', 
      stato: 'Attivo',
      ragioneSociale: 'Digital Operations Snc'
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
                color: '#6b7280'
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
                <button 
                  onClick={() => setLegalEntityModal({ open: true, data: item })}
                  style={{
                  background: 'hsla(59, 130, 246, 0.05)',
                  border: '1px solid hsla(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'hsla(59, 130, 246, 0.1)';
                  e.currentTarget.style.color = '#3b82f6';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'hsla(59, 130, 246, 0.05)';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                  <Edit3 size={12} />
                </button>
                <button style={{
                  background: 'hsla(239, 68, 68, 0.05)',
                  border: '1px solid hsla(239, 68, 68, 0.1)',
                  borderRadius: '6px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'hsla(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'hsla(239, 68, 68, 0.05)';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sezione Punti Vendita */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderRadius: '24px',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Store size={20} style={{ color: '#7B2CBF' }} />
            Punti Vendita
          </h3>
          <span style={{
            fontSize: '12px',
            color: '#6b7280',
            padding: '4px 8px',
            background: 'rgba(123, 44, 191, 0.1)',
            borderRadius: '12px'
          }}>
            {mockPuntiVendita.length} punti vendita
          </span>
        </div>

        {/* Header tabella */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 2fr 2fr 1fr 1fr 80px',
          alignItems: 'center',
          padding: '16px 20px',
          gap: '16px'
        }}>
          {['Codice', 'Nome', 'Indirizzo', 'Canale', 'Stato', 'Azioni'].map((header, index) => (
            <div key={index} style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {header}
            </div>
          ))}
        </div>

        {/* Rows tabella */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px'
        }}>
          {mockPuntiVendita.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 2fr 2fr 1fr 1fr 80px',
                alignItems: 'center',
                padding: '16px 20px',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Codice */}
              <div style={{
                fontSize: '14px',
                color: '#111827',
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>
                {item.codice}
              </div>

              {/* Nome */}
              <div style={{
                fontSize: '14px',
                color: '#111827',
                fontWeight: '500'
              }}>
                {item.nome}
              </div>

              {/* Indirizzo */}
              <div style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {item.indirizzo}
              </div>

              {/* Canale */}
              <div>
                <span style={{
                  background: item.canale === 'Franchising' 
                    ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                    : 'linear-gradient(135deg, #7B2CBF, #a855f7)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: item.canale === 'Franchising'
                    ? '0 2px 8px rgba(255, 105, 0, 0.3)'
                    : '0 2px 8px rgba(123, 44, 191, 0.3)'
                }}>
                  {item.canale}
                </span>
              </div>

              {/* Stato */}
              <div>
                <span style={{
                  background: item.stato === 'Attivo' 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: item.stato === 'Attivo'
                    ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                    : '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}>
                  {item.stato}
                </span>
              </div>

              {/* Azioni */}
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button 
                  onClick={() => setStoreModal({ open: true, data: item })}
                  style={{
                  background: 'hsla(123, 44, 191, 0.05)',
                  border: '1px solid hsla(123, 44, 191, 0.1)',
                  borderRadius: '6px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'hsla(123, 44, 191, 0.1)';
                  e.currentTarget.style.color = '#7B2CBF';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'hsla(123, 44, 191, 0.05)';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                  <Edit3 size={12} />
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

  // Modal per editing ragione sociale
  const renderLegalEntityModal = () => {
    if (!legalEntityModal.open) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>Nuova Ragione Sociale</h2>
            <button
              onClick={() => setLegalEntityModal({ open: false, data: null })}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: '#6b7280'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {/* Row 1: Nome e Forma Giuridica */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Nome *</label>
                  <input
                    type="text"
                    defaultValue={legalEntityModal.data?.nome || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Forma Giuridica</label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}>
                    <option>Selezione Forma Giuridica</option>
                    <option selected={legalEntityModal.data?.formaGiuridica === 'Srl'}>Srl</option>
                    <option>Spa</option>
                    <option>Snc</option>
                    <option>Sas</option>
                  </select>
                </div>
              </div>

              {/* Row 2: P.IVA e Codice Fiscale */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>P.IVA</label>
                  <input
                    type="text"
                    defaultValue={legalEntityModal.data?.pIva || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Codice Fiscale</label>
                  <input
                    type="text"
                    defaultValue="FRNCLD80A01H501T"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Indirizzo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>Indirizzo</label>
                <input
                  type="text"
                  defaultValue="Via Roma 123"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Row 4: Città, Paese, CAP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Città</label>
                  <input
                    type="text"
                    defaultValue={legalEntityModal.data?.citta || ''}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Paese</label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    <option>Italia</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>CAP</label>
                  <input
                    type="text"
                    defaultValue="20100"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>Email</label>
                <input
                  type="email"
                  defaultValue="info@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Row 6: Toggle Aziende Settore */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>Ragione Sociale Attiva</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>Abilita per utilizzare questo settore come ragione sociale</div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '44px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#3b82f6',
                    borderRadius: '24px',
                    transition: '0.4s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '',
                      height: '18px',
                      width: '18px',
                      right: '3px',
                      bottom: '3px',
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.4s'
                    }}></span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setLegalEntityModal({ open: false, data: null })}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
            <button
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              Salva
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal per editing punto vendita
  const renderStoreModal = () => {
    if (!storeModal.open) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>Nuovo Punto Vendita</h2>
            <button
              onClick={() => setStoreModal({ open: false, data: null })}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: '#6b7280'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {/* Row 1: Codice e Nome */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Codice *</label>
                  <input
                    type="text"
                    defaultValue={storeModal.data?.codice || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Nome Punto Vendita *</label>
                  <input
                    type="text"
                    defaultValue={storeModal.data?.nome || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#6b7280'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Ragione Sociale */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>Ragione Sociale</label>
                <select style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}>
                  <option>Seleziona Ragione Sociale</option>
                  <option selected={storeModal.data?.ragioneSociale === 'Franchising Ltd'}>Franchising Ltd</option>
                  <option selected={storeModal.data?.ragioneSociale === 'Digital Operations Snc'}>Digital Operations Snc</option>
                  <option selected={storeModal.data?.ragioneSociale === 'Tech Solutions Ltd'}>Tech Solutions Ltd</option>
                </select>
              </div>

              {/* Row 3: Indirizzo completo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>Indirizzo</label>
                <input
                  type="text"
                  defaultValue={storeModal.data?.indirizzo || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Row 4: Città, Provincia, CAP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Città</label>
                  <input
                    type="text"
                    defaultValue={storeModal.data?.citta || ''}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Provincia</label>
                  <input
                    type="text"
                    defaultValue="MI"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>CAP</label>
                  <input
                    type="text"
                    defaultValue="20100"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Canale e Stato */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Canale</label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}>
                    <option>Seleziona Canale</option>
                    <option selected={storeModal.data?.canale === 'Franchising'}>Franchising</option>
                    <option selected={storeModal.data?.canale === 'Top Dealer'}>Top Dealer</option>
                    <option>Dealer</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Stato</label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}>
                    <option>Seleziona Stato</option>
                    <option selected={storeModal.data?.stato === 'Attivo'}>Attivo</option>
                    <option>Inattivo</option>
                    <option>Bozza</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Contatti */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Telefono</label>
                  <input
                    type="tel"
                    defaultValue="+39 02 1234567"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>Email</label>
                  <input
                    type="email"
                    defaultValue="milano.centro@windtre.it"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setStoreModal({ open: false, data: null })}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
            <button
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7B2CBF, #a855f7)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              Salva
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ 
        background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))', 
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
      {renderLegalEntityModal()}
      {renderStoreModal()}
    </Layout>
  );
}