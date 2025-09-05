import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
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
  
  // Form states
  const [selectedCity, setSelectedCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Selected entity tab
  const [selectedEntity, setSelectedEntity] = useState('ragione-sociale');
  
  // Local state for managing items
  const [ragioneSocialiList, setRagioneSocialiList] = useState(mockRagioneSociali);
  const [puntiVenditaList, setPuntiVenditaList] = useState(mockPuntiVendita);
  
  // Modal states
  const [showCreateRagioneSociale, setShowCreateRagioneSociale] = useState(false);
  const [showCreatePuntoVendita, setShowCreatePuntoVendita] = useState(false);
  
  // Handlers per Ragioni Sociali
  const handleCreateRagioneSociale = () => {
    const newCode = `80${String(Math.floor(Math.random() * 99999) + 1000).padStart(4, '0')}`;
    const newItem = {
      id: ragioneSocialiList.length + 1,
      codice: newCode,
      nome: 'Nuova Ragione Sociale',
      formaGiuridica: 'Srl',
      pIva: `IT${String(Math.floor(Math.random() * 99999999999) + 10000000000).padStart(11, '0')}`,
      stato: 'Bozza',
      citta: 'Milano',
      azioni: 'edit'
    };
    setRagioneSocialiList([...ragioneSocialiList, newItem]);
    setShowCreateRagioneSociale(false);
  };
  
  const handleDeleteRagioneSociale = (id) => {
    setRagioneSocialiList(ragioneSocialiList.filter(item => item.id !== id));
  };
  
  // Handlers per Punti Vendita
  const handleCreatePuntoVendita = () => {
    const newCode = `90${String(Math.floor(Math.random() * 999999) + 100000).padStart(6, '0')}`;
    const newItem = {
      id: puntiVenditaList.length + 1,
      codice: newCode,
      nome: 'Nuovo Punto Vendita',
      indirizzo: 'Via Nuova 1',
      citta: 'Milano',
      canale: 'Franchising',
      stato: 'Attivo',
      ragioneSociale: ragioneSocialiList[0]?.nome || 'Default'
    };
    setPuntiVenditaList([...puntiVenditaList, newItem]);
    setShowCreatePuntoVendita(false);
  };
  
  const handleDeletePuntoVendita = (id) => {
    setPuntiVenditaList(puntiVenditaList.filter(item => item.id !== id));
  };
  
  // Load reference data from API
  const { data: legalForms = [] } = useQuery({
    queryKey: ['/api/reference/legal-forms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['/api/reference/countries'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: italianCities = [] } = useQuery({
    queryKey: ['/api/reference/italian-cities'],
    staleTime: 5 * 60 * 1000,
  });

  // Validation functions
  const validateCodiceFiscale = (cf: string): boolean => {
    // Basic Italian fiscal code validation
    const cfRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    return cfRegex.test(cf.toUpperCase());
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    const city = (italianCities as any[]).find((c: any) => c.name === cityName);
    if (city) {
      setPostalCode(city.postalCode);
    }
  };

  // Mock data per ragioni sociali - codici iniziano con 80 e hanno almeno 6 cifre
  const mockRagioneSociali = [
    { 
      id: 1, 
      codice: '800001',
      nome: 'Franchising Ltd', 
      formaGiuridica: 'Srl', 
      pIva: 'IT12345678901', 
      stato: 'Attiva',
      citta: 'Milano',
      azioni: 'edit'
    },
    { 
      id: 2, 
      codice: '800245',
      nome: 'Digital Operations Snc', 
      formaGiuridica: 'Snc', 
      pIva: 'IT09876543210', 
      stato: 'Attiva',
      citta: 'Bologna',
      azioni: 'edit'
    },
    { 
      id: 3, 
      codice: '801567',
      nome: 'Tech Solutions Ltd', 
      formaGiuridica: 'Srl', 
      pIva: 'IT11122233344', 
      stato: 'Bozza',
      citta: 'Roma',
      azioni: 'edit'
    }
  ];

  // Mock data per punti vendita - codici iniziano con 90 e hanno almeno 8 cifre
  const mockPuntiVendita = [
    { 
      id: 1, 
      codice: '90000012', 
      nome: 'WindTre Milano Centro', 
      indirizzo: 'Via Montenapoleone 15',
      citta: 'Milano',
      canale: 'Franchising', 
      stato: 'Attivo',
      ragioneSociale: 'Franchising Ltd'
    },
    { 
      id: 2, 
      codice: '90001234', 
      nome: 'WindTre Roma Termini', 
      indirizzo: 'Via Nazionale 123',
      citta: 'Roma',
      canale: 'Top Dealer', 
      stato: 'Attivo',
      ragioneSociale: 'Digital Operations Snc'
    },
    { 
      id: 3, 
      codice: '90002456', 
      nome: 'WindTre Napoli Centrale', 
      indirizzo: 'Piazza Garibaldi 45',
      citta: 'Napoli',
      canale: 'Franchising', 
      stato: 'Attivo',
      ragioneSociale: 'Tech Solutions Ltd'
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
          Gestisci entità aziendali, ragioni sociali e punti vendita
        </p>
      </div>

      {/* Sezione Icone Configurazione - Barra con tutte le entità */}
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
            { id: 'ragione-sociale', icon: Building2, label: 'Ragione Sociale', color: '#FF6900' },
            { id: 'punti-vendita', icon: Store, label: 'Punti Vendita', color: '#7B2CBF' },
            { id: 'utenti', icon: Users, label: 'Utenti', color: '#3b82f6' },
            { id: 'smart-automation', icon: Server, label: 'Smart Automation', color: '#10b981' },
            { id: 'servizi', icon: Activity, label: 'Servizi', color: '#f59e0b' },
            { id: 'auto-reporting', icon: FileText, label: 'Auto Reporting', color: '#ef4444' },
            { id: 'gdpr', icon: Shield, label: 'GDPR', color: '#8b5cf6' },
            { id: 'alert-notifications', icon: Bell, label: 'Alert Notifications', color: '#06b6d4' }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => setSelectedEntity(item.id)}
                style={{
                  background: selectedEntity === item.id 
                    ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)`
                    : 'transparent',
                  border: selectedEntity === item.id 
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
                  if (selectedEntity !== item.id) {
                    e.currentTarget.style.background = `${item.color}10`;
                    e.currentTarget.style.borderColor = `${item.color}20`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedEntity !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Icon size={16} style={{ color: selectedEntity === item.id ? item.color : '#6b7280' }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: selectedEntity === item.id ? '600' : '500',
                  color: selectedEntity === item.id ? item.color : '#6b7280'
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ragioni Sociali Section */}
      {selectedEntity === 'ragione-sociale' && (
        <div style={{ marginBottom: '48px' }}>
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
            Ragioni Sociali
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
          onClick={() => setLegalEntityModal({ open: true, data: null })}>
            <Plus size={16} />
            Nuova Ragione Sociale
          </button>
        </div>

        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            background: 'hsla(255, 255, 255, 0.05)',
            borderBottom: '1px solid hsla(255, 255, 255, 0.08)',
            padding: '0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '100px 2fr 1fr 1.5fr 1fr 1fr 80px',
              alignItems: 'center',
              padding: '16px 20px',
              gap: '16px'
            }}>
              {['Codice', 'Nome', 'Forma Giuridica', 'P.IVA', 'Stato', 'Città', 'Azioni'].map((header, index) => (
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

          <div>
            {ragioneSocialiList.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 2fr 1fr 1.5fr 1fr 1fr 80px',
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
                <div style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '600',
                  fontFamily: 'monospace'
                }}>
                  {item.codice}
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {item.nome}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {item.formaGiuridica}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {item.pIva}
                </div>

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

                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {item.citta}
                </div>

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
                    transition: 'all 0.2s ease'
                  }}>
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeleteRagioneSociale(item.id)}
                    style={{
                    background: 'hsla(239, 68, 68, 0.05)',
                    border: '1px solid hsla(239, 68, 68, 0.1)',
                    borderRadius: '6px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'all 0.2s ease'
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Punti Vendita Section */}
      {selectedEntity === 'punti-vendita' && (
        <div>
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
                Punti Vendita
              </h3>
              <button style={{
                background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
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
                boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleCreatePuntoVendita()}>
                <Plus size={16} />
                Nuovo Punto Vendita
              </button>
            </div>

        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            background: 'hsla(255, 255, 255, 0.05)',
            borderBottom: '1px solid hsla(255, 255, 255, 0.08)',
            padding: '0'
          }}>
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
          </div>

          <div>
            {puntiVenditaList.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 2fr 2fr 1fr 1fr 80px',
                  alignItems: 'center',
                  padding: '16px 20px',
                  gap: '16px',
                  borderBottom: index < puntiVenditaList.length - 1 
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
                <div style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '600',
                  fontFamily: 'monospace'
                }}>
                  {item.codice}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {item.nome}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {item.indirizzo}
                </div>

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
                    transition: 'all 0.2s ease'
                  }}>
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeletePuntoVendita(item.id)}
                    style={{
                    background: 'hsla(239, 68, 68, 0.05)',
                    border: '1px solid hsla(239, 68, 68, 0.1)',
                    borderRadius: '6px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'all 0.2s ease'
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
      
      {/* Placeholder per altre sezioni */}
      {selectedEntity === 'utenti' && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Gestione Utenti</h3>
          <p>Questa sezione sarà disponibile a breve</p>
        </div>
      )}
      
      {(selectedEntity === 'smart-automation' || 
        selectedEntity === 'servizi' || 
        selectedEntity === 'auto-reporting' || 
        selectedEntity === 'gdpr' || 
        selectedEntity === 'alert-notifications') && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>In Sviluppo</h3>
          <p>Questa funzionalità sarà disponibile a breve</p>
        </div>
      )}
    </div>
  );

  const renderAIAssistant = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione AI Assistant
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci le impostazioni dell'assistente AI e automazioni
        </p>
      </div>

      {/* AI Configuration Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* OpenAI Configuration */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Cpu size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              OpenAI Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura l'integrazione con OpenAI per funzionalità AI avanzate
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Configurato
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Modifica
            </button>
          </div>
        </div>

        {/* Automations */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Zap size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Automazioni
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci automazioni e workflow intelligenti
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              In Configurazione
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Configura
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChannelSettings = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione Canali
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci canali di comunicazione e integrazione
        </p>
      </div>

      {/* Channel Configuration */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Email Channel */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}>
              <Mail size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Email Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura server SMTP e template email
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Attivo
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Gestisci
            </button>
          </div>
        </div>

        {/* Webhook Channel */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)'
            }}>
              <Globe size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Webhook Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci webhook per integrazioni esterne
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Da Configurare
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Configura
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazioni Sistema
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci impostazioni generali del sistema e sicurezza
        </p>
      </div>

      {/* System Configuration */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Security Settings */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}>
              <Shield size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Sicurezza
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci autenticazione, GDPR e politiche sicurezza
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Protetto
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Visualizza
            </button>
          </div>
        </div>

        {/* Backup Settings */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}>
              <Database size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Backup e Ripristino
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura backup automatici e procedure di ripristino
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Attivo
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Gestisci
            </button>
          </div>
        </div>
      </div>
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
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        {/* Header */}
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
            Gestisci AI, canali di comunicazione, backup e configurazioni sistema
          </p>
        </div>

        {/* Tabs */}
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