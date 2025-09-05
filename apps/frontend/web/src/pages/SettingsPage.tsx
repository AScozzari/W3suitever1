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

// Tenant ID demo per tutti i mock data
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Types for reference data
interface LegalForm {
  id: string;
  code: string;
  name: string;
  description?: string;
  minCapital?: string;
  liability?: string;
  active: boolean;
  sortOrder: number;
}

interface ItalianCity {
  id: string;
  name: string;
  province: string;
  provinceName: string;
  region: string;
  postalCode: string;
  active: boolean;
}

// Mock data per ragioni sociali - codici iniziano con 80 e hanno almeno 6 cifre
const mockRagioneSociali = [
  { 
    id: 1,
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
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
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
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
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
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
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
    ragioneSociale_id: 1, // FK alla ragione sociale
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
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
    ragioneSociale_id: 2, // FK alla ragione sociale
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
    tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
    ragioneSociale_id: 3, // FK alla ragione sociale
    codice: '90002456', 
    nome: 'WindTre Napoli Centrale', 
    indirizzo: 'Piazza Garibaldi 45',
    citta: 'Napoli',
    canale: 'Franchising', 
    stato: 'Attivo',
    ragioneSociale: 'Tech Solutions Ltd'
  }
];

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
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  
  // Role management states
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>('organization');
  const [selectedLegalEntities, setSelectedLegalEntities] = useState<number[]>([]);
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  
  // Handlers per Ragioni Sociali
  const handleCreateRagioneSociale = () => {
    const newCode = `80${String(Math.floor(Math.random() * 99999) + 1000).padStart(4, '0')}`;
    const newItem = {
      id: ragioneSocialiList.length + 1,
      tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
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
  
  const handleDeleteRagioneSociale = (id: number) => {
    setRagioneSocialiList(ragioneSocialiList.filter(item => item.id !== id));
  };
  
  // Handlers per Punti Vendita
  const handleCreatePuntoVendita = () => {
    const newCode = `90${String(Math.floor(Math.random() * 999999) + 100000).padStart(6, '0')}`;
    const newItem = {
      id: puntiVenditaList.length + 1,
      tenant_id: DEMO_TENANT_ID, // TENANT ID OBBLIGATORIO
      ragioneSociale_id: 1, // Default alla prima ragione sociale
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
  
  const handleDeletePuntoVendita = (id: number) => {
    setPuntiVenditaList(puntiVenditaList.filter(item => item.id !== id));
  };
  
  // Load reference data from API
  const { data: legalForms = [] } = useQuery<LegalForm[]>({
    queryKey: ['/api/reference/legal-forms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['/api/reference/countries'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: italianCities = [] } = useQuery<ItalianCity[]>({
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
    const city = italianCities.find((c) => c.name === cityName);
    if (city) {
      setPostalCode(city.postalCode);
    }
  };

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
            { id: 'gestione-ruoli', icon: UserCog, label: 'Gestione Ruoli', color: '#8339ff' },
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
          onClick={() => {
            setNewRagioneSociale({
              codice: '',
              nome: '',
              formaGiuridica: 'Srl',
              pIva: '',
              codiceFiscale: '',
              indirizzo: '',
              citta: '',
              cap: '',
              provincia: '',
              telefono: '',
              email: '',
              pec: '',
              stato: 'Attiva'
            });
            setLegalEntityModal({ open: true, data: null });
          }}>
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
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937'
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
                  color: '#1f2937',
                  fontWeight: '600',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                  {item.codice}
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600'
                }}>
                  {item.nome}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  fontWeight: '500'
                }}>
                  {item.formaGiuridica}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  fontWeight: '500'
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
                  color: '#4b5563',
                  fontWeight: '500'
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
              onClick={() => setStoreModal({ open: true, data: null })}>
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
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937'
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
                  color: '#1f2937',
                  fontWeight: '600',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                  {item.codice}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600'
                }}>
                  {item.nome}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  fontWeight: '500'
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
      
      {/* Gestione Ruoli */}
      {selectedEntity === 'gestione-ruoli' && (
        <div>
          {/* Header sezione */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  borderRadius: '12px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(131, 57, 255, 0.3)'
                }}>
                  <UserCog size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    Gestione Ruoli e Permessi
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0 0 0'
                  }}>
                    Configura template di ruoli e gestisci capability per tenant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateRoleModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(131, 57, 255, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(131, 57, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(131, 57, 255, 0.3)';
                }}
              >
                <Plus size={16} />
                Crea Ruolo Custom
              </button>
            </div>
            
            {/* Template di Ruoli */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {[
                { code: 'admin', name: 'Admin', description: 'Accesso completo', users: 2, color: '#ef4444' },
                { code: 'finance', name: 'Finance', description: 'Gestione finanziaria', users: 5, color: '#10b981' },
                { code: 'direttore', name: 'Direttore', description: 'Supervisione strategica', users: 3, color: '#3b82f6' },
                { code: 'store_manager', name: 'Store Manager', description: 'Gestione punto vendita', users: 12, color: '#f59e0b' },
                { code: 'store_specialist', name: 'Store Specialist', description: 'Operazioni quotidiane', users: 45, color: '#8b5cf6' },
                { code: 'student', name: 'Student', description: 'Accesso limitato formazione', users: 8, color: '#06b6d4' },
                { code: 'marketing', name: 'Marketing', description: 'Campagne e comunicazione', users: 6, color: '#ec4899' },
                { code: 'hr_management', name: 'HR Management', description: 'Gestione risorse umane', users: 4, color: '#14b8a6' },
                { code: 'custom', name: 'Custom', description: 'Ruolo personalizzato', users: 0, color: '#6b7280' }
              ].map((role) => (
                <div
                  key={role.code}
                  style={{
                    background: selectedRole === role.code 
                      ? `linear-gradient(135deg, ${role.color}15, ${role.color}08)`
                      : 'hsla(255, 255, 255, 0.05)',
                    border: selectedRole === role.code
                      ? `2px solid ${role.color}40`
                      : '1px solid hsla(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: 'translateY(0) scale(1) rotateX(0deg)',
                    transformStyle: 'preserve-3d',
                    perspective: '1000px',
                    boxShadow: selectedRole === role.code
                      ? `0 8px 24px ${role.color}20, 0 4px 12px rgba(0, 0, 0, 0.1)`
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  onClick={() => setSelectedRole(role.code)}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Card animations
                    card.style.background = `linear-gradient(135deg, ${role.color}18, ${role.color}10)`;
                    card.style.borderColor = `${role.color}40`;
                    card.style.transform = 'translateY(-8px) scale(1.03) rotateX(-2deg)';
                    card.style.boxShadow = `0 16px 32px ${role.color}25, 0 8px 16px rgba(0, 0, 0, 0.15)`;
                    
                    // Color bar animation
                    if (colorBar) {
                      colorBar.style.height = '5px';
                      colorBar.style.background = `linear-gradient(90deg, ${role.color}, ${role.color}dd, ${role.color})`;
                      colorBar.style.boxShadow = `0 2px 8px ${role.color}60`;
                    }
                    
                    // Icon animation
                    if (icon) {
                      icon.style.transform = 'rotate(360deg) scale(1.2)';
                      icon.style.color = role.color;
                    }
                    
                    // Users count animation
                    if (users) {
                      users.style.transform = 'translateX(4px)';
                      users.style.color = role.color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Reset card
                    card.style.background = selectedRole === role.code 
                      ? `linear-gradient(135deg, ${role.color}15, ${role.color}08)`
                      : 'hsla(255, 255, 255, 0.05)';
                    card.style.borderColor = selectedRole === role.code
                      ? `${role.color}40`
                      : 'hsla(255, 255, 255, 0.08)';
                    card.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
                    card.style.boxShadow = selectedRole === role.code
                      ? `0 8px 24px ${role.color}20, 0 4px 12px rgba(0, 0, 0, 0.1)`
                      : '0 2px 8px rgba(0, 0, 0, 0.05)';
                    
                    // Reset color bar
                    if (colorBar) {
                      colorBar.style.height = '3px';
                      colorBar.style.background = role.color;
                      colorBar.style.boxShadow = 'none';
                    }
                    
                    // Reset icon
                    if (icon) {
                      icon.style.transform = 'rotate(0deg) scale(1)';
                      icon.style.color = role.color;
                    }
                    
                    // Reset users count
                    if (users) {
                      users.style.transform = 'translateX(0)';
                      users.style.color = '#6b7280';
                    }
                  }}
                >
                  {/* Animated background gradient */}
                  <div style={{
                    position: 'absolute',
                    top: '-100%',
                    left: '-100%',
                    width: '300%',
                    height: '300%',
                    background: `radial-gradient(circle at center, ${role.color}10 0%, transparent 70%)`,
                    opacity: 0,
                    transition: 'opacity 0.5s ease',
                    pointerEvents: 'none',
                    animation: 'pulse 3s ease-in-out infinite'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  />
                  
                  <div 
                    className="color-bar"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: role.color,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        {role.name}
                      </h4>
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        {role.description}
                      </p>
                    </div>
                    {role.code === 'admin' && (
                      <Star 
                        size={16} 
                        className="role-icon"
                        style={{ 
                          color: role.color,
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: 'rotate(0deg) scale(1)'
                        }} 
                      />
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <span 
                      className="users-count"
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.3s ease',
                        transform: 'translateX(0)'
                      }}
                    >
                      <Users size={12} />
                      {role.users} utenti
                    </span>
                    <ChevronRight 
                      size={14} 
                      style={{ 
                        color: '#6b7280',
                        transition: 'all 0.3s ease'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dettaglio Ruolo Selezionato */}
          {selectedRole && (
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
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  Permessi del Ruolo: {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ')}
                </h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Duplica
                  </button>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Salva Modifiche
                  </button>
                </div>
              </div>
              
              {/* Categorie di Permessi */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {[
                  { category: 'Dashboard', permissions: ['View', 'Analytics', 'Export'] },
                  { category: 'CRM', permissions: ['Leads View', 'Leads Edit', 'Customers View', 'Customers Edit', 'Deals'] },
                  { category: 'Cassa', permissions: ['Transactions', 'Refund', 'Shifts', 'Drawer'] },
                  { category: 'Magazzino', permissions: ['Products View', 'Stock Adjust', 'Orders'] },
                  { category: 'Finance', permissions: ['Invoices', 'Payments', 'Reports', 'Budget'] },
                  { category: 'Settings', permissions: ['Organization', 'Users', 'Roles', 'Integrations'] }
                ].map((cat) => (
                  <div
                    key={cat.category}
                    style={{
                      background: 'hsla(255, 255, 255, 0.05)',
                      border: '1px solid hsla(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      {cat.category}
                      {/* Switch Toggle */}
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '44px',
                        height: '24px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          defaultChecked={selectedRole === 'admin'}
                          style={{
                            opacity: 0,
                            width: 0,
                            height: 0
                          }}
                          onChange={(e) => {
                            const slider = e.target.nextSibling as HTMLElement;
                            if (e.target.checked) {
                              slider.style.background = 'linear-gradient(135deg, #FF6900, #ff8533)';
                              (slider.firstChild as HTMLElement).style.transform = 'translateX(20px)';
                            } else {
                              slider.style.background = '#e5e7eb';
                              (slider.firstChild as HTMLElement).style.transform = 'translateX(2px)';
                            }
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: selectedRole === 'admin' ? 'linear-gradient(135deg, #FF6900, #ff8533)' : '#e5e7eb',
                          borderRadius: '24px',
                          transition: 'all 0.3s ease',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.12)'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '18px',
                            width: '18px',
                            left: '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            transform: selectedRole === 'admin' ? 'translateX(20px)' : 'translateX(0)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }} />
                        </span>
                      </label>
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.permissions.map((perm) => (
                        <label
                          key={perm}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            fontSize: '13px',
                            color: '#6b7280',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={selectedRole === 'admin' || (selectedRole === 'finance' && cat.category === 'Finance')}
                            style={{ 
                              cursor: 'pointer',
                              width: '16px',
                              height: '16px',
                              accentColor: '#FF6900'
                            }}
                          />
                          {perm}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Scope del Ruolo */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'hsla(123, 43%, 76%, 0.1)',
                border: '1px solid hsla(123, 43%, 76%, 0.2)',
                borderRadius: '8px'
              }}>
                <h5 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px'
                }}>
                  Scope di Applicazione
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <input 
                        type="radio" 
                        name="scope" 
                        value="organization" 
                        checked={selectedScope === 'organization'} 
                        onChange={() => setSelectedScope('organization')}
                      /> 
                      Organizzazione
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <input 
                        type="radio" 
                        name="scope" 
                        value="legal" 
                        checked={selectedScope === 'legal'}
                        onChange={() => setSelectedScope('legal')}
                      /> 
                      Ragioni Sociali Specifiche
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <input 
                        type="radio" 
                        name="scope" 
                        value="store" 
                        checked={selectedScope === 'store'}
                        onChange={() => setSelectedScope('store')}
                      /> 
                      Punti Vendita Specifici
                    </label>
                  </div>
                  
                  {/* Multiselect per Ragioni Sociali */}
                  {selectedScope === 'legal' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'hsla(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      border: '1px solid hsla(255, 255, 255, 0.1)'
                    }}>
                      <label style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        Seleziona Ragioni Sociali:
                      </label>
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        {ragioneSocialiList.map((rs) => (
                          <label
                            key={rs.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              background: selectedLegalEntities.includes(rs.id) ? 'hsla(255, 105, 0, 0.1)' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#6b7280',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              if (!selectedLegalEntities.includes(rs.id)) {
                                e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!selectedLegalEntities.includes(rs.id)) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLegalEntities.includes(rs.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLegalEntities([...selectedLegalEntities, rs.id]);
                                } else {
                                  setSelectedLegalEntities(selectedLegalEntities.filter(id => id !== rs.id));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{rs.nome} ({rs.codice})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Multiselect per Punti Vendita */}
                  {selectedScope === 'store' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'hsla(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      border: '1px solid hsla(255, 255, 255, 0.1)'
                    }}>
                      <label style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        Seleziona Punti Vendita:
                      </label>
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        {puntiVenditaList.map((pv) => (
                          <label
                            key={pv.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              background: selectedStores.includes(pv.id) ? 'hsla(123, 43%, 60%, 0.1)' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#6b7280',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              if (!selectedStores.includes(pv.id)) {
                                e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!selectedStores.includes(pv.id)) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStores.includes(pv.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStores([...selectedStores, pv.id]);
                                } else {
                                  setSelectedStores(selectedStores.filter(id => id !== pv.id));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{pv.nome} - {pv.citta} ({pv.codice})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

  // State per il nuovo modal punto vendita
  const [newStore, setNewStore] = useState({
    codice: '',
    nome: '',
    indirizzo: '',
    citta: '',
    cap: '',
    telefono: '',
    email: '',
    ragioneSociale: '',
    canale: 'Franchising',
    brands: [] as string[],
    stato: 'Attivo'
  });

  // State per il modal ragione sociale
  const [newRagioneSociale, setNewRagioneSociale] = useState({
    codice: '',
    nome: '',
    formaGiuridica: 'Srl',
    pIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
    stato: 'Attiva'
  });

  // Ottieni il tenant ID dal localStorage o usa il demo tenant
  const getCurrentTenantId = () => {
    const tenantId = localStorage.getItem('currentTenantId');
    return tenantId || '00000000-0000-0000-0000-000000000001';
  };

  // Handler per salvare la nuova ragione sociale
  const handleSaveRagioneSociale = () => {
    const currentTenantId = getCurrentTenantId();
    const newCode = newRagioneSociale.codice || `80${String(Math.floor(Math.random() * 9999) + 1000).padStart(4, '0')}`;
    const newItem = {
      id: ragioneSocialiList.length + 1,
      tenant_id: currentTenantId, // TENANT ID AUTOMATICO DAL CONTEXT
      codice: newCode,
      nome: newRagioneSociale.nome || 'Nuova Ragione Sociale',
      formaGiuridica: newRagioneSociale.formaGiuridica,
      pIva: newRagioneSociale.pIva || `IT${String(Math.floor(Math.random() * 99999999999) + 10000000000).padStart(11, '0')}`,
      stato: newRagioneSociale.stato,
      citta: newRagioneSociale.citta || 'Milano',
      azioni: 'edit'
    };
    setRagioneSocialiList([...ragioneSocialiList, newItem]);
    setLegalEntityModal({ open: false, data: null });
    // Reset form
    setNewRagioneSociale({
      codice: '',
      nome: '',
      formaGiuridica: 'Srl',
      pIva: '',
      codiceFiscale: '',
      indirizzo: '',
      citta: '',
      cap: '',
      provincia: '',
      telefono: '',
      email: '',
      pec: '',
      stato: 'Attiva'
    });
  };

  // Handler per salvare il nuovo punto vendita
  const handleSaveStore = () => {
    const currentTenantId = getCurrentTenantId();
    const newCode = newStore.codice || `90${String(Math.floor(Math.random() * 999999) + 100000).padStart(6, '0')}`;
    const newItem = {
      id: puntiVenditaList.length + 1,
      tenant_id: currentTenantId, // TENANT ID AUTOMATICO DAL CONTEXT
      codice: newCode,
      nome: newStore.nome || 'Nuovo Punto Vendita',
      indirizzo: newStore.indirizzo || 'Via Nuova 1',
      citta: newStore.citta || 'Milano',
      canale: newStore.canale,
      stato: newStore.stato,
      ragioneSociale: newStore.ragioneSociale || ragioneSocialiList[0]?.nome || 'Default',
      ragioneSociale_id: ragioneSocialiList.find(rs => rs.nome === newStore.ragioneSociale)?.id || 1 // ID della ragione sociale
    };
    setPuntiVenditaList([...puntiVenditaList, newItem]);
    setStoreModal({ open: false, data: null });
    // Reset form
    setNewStore({
      codice: '',
      nome: '',
      indirizzo: '',
      citta: '',
      cap: '',
      telefono: '',
      email: '',
      ragioneSociale: '',
      canale: 'Franchising',
      brands: [],
      stato: 'Attivo'
    });
  };

  return (
    <>
      {/* Modal Ragione Sociale */}
      {legalEntityModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '32px 32px 24px 32px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#1e293b',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                    }}>
                      {legalEntityModal.data ? 'Modifica Ragione Sociale' : 'Nuova Ragione Sociale'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    {legalEntityModal.data ? 'Modifica i dati dell\'entità giuridica' : 'Inserisci i dati della nuova entità giuridica'}
                  </p>
                </div>
                <button
                  onClick={() => setLegalEntityModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'all 0.15s ease',
                    color: '#64748b',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 250, 252, 0.95)';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Ragione Sociale
                  </label>
                  <input
                    type="text"
                    placeholder="80xxxx (auto-generato)"
                    value={newRagioneSociale.codice}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, codice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Nome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Nome Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Franchising Ltd"
                    value={newRagioneSociale.nome}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Forma Giuridica */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Forma Giuridica <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newRagioneSociale.formaGiuridica}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, formaGiuridica: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <option value="">Seleziona...</option>
                    {legalForms.length > 0 ? (
                      (legalForms as any[]).map((form: any) => (
                        <option key={form.code} value={form.code}>
                          {form.code} - {form.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="SRL">SRL - Società a Responsabilità Limitata</option>
                        <option value="SPA">SPA - Società per Azioni</option>
                        <option value="SNC">SNC - Società in Nome Collettivo</option>
                        <option value="SAS">SAS - Società in Accomandita Semplice</option>
                        <option value="SAPA">SAPA - Società in Accomandita per Azioni</option>
                        <option value="SRLS">SRLS - Società a Responsabilità Limitata Semplificata</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Partita IVA */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Partita IVA <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="IT12345678901"
                    value={newRagioneSociale.pIva}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, pIva: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                {/* Codice Fiscale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    placeholder="RSSMRA80A01H501U"
                    value={newRagioneSociale.codiceFiscale}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, codiceFiscale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                {/* Indirizzo - full width */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Indirizzo Sede Legale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Via Roma 123"
                    value={newRagioneSociale.indirizzo}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, indirizzo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Città */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Città <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newRagioneSociale.citta}
                    onChange={(e) => {
                      const cityName = e.target.value;
                      setNewRagioneSociale({ ...newRagioneSociale, citta: cityName });
                      // Auto-popola CAP e Provincia dalla tabella città
                      const city = (italianCities as any[]).find((c: any) => c.name === cityName);
                      if (city) {
                        setNewRagioneSociale(prev => ({
                          ...prev,
                          cap: city.postalCode || '',
                          provincia: city.province || ''
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <option value="">Seleziona città...</option>
                    {italianCities.length > 0 ? (
                      (italianCities as any[]).map((city: any) => (
                        <option key={city.id} value={city.name}>
                          {city.name} ({city.province})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Milano">Milano</option>
                        <option value="Roma">Roma</option>
                        <option value="Napoli">Napoli</option>
                        <option value="Torino">Torino</option>
                        <option value="Bologna">Bologna</option>
                        <option value="Firenze">Firenze</option>
                      </>
                    )}
                  </select>
                </div>

                {/* CAP */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    CAP
                  </label>
                  <input
                    type="text"
                    placeholder="20121"
                    value={newRagioneSociale.cap}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, cap: e.target.value })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="MI"
                    maxLength={2}
                    value={newRagioneSociale.provincia}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, provincia: e.target.value.toUpperCase() })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                      outline: 'none',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Telefono
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 02 1234567"
                    value={newRagioneSociale.telefono}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, telefono: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@azienda.it"
                    value={newRagioneSociale.email}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* PEC */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    PEC <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="azienda@pec.it"
                    value={newRagioneSociale.pec}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, pec: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato
                  </label>
                  <select
                    value={newRagioneSociale.stato}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, stato: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <option value="Attiva">Attiva</option>
                    <option value="Sospesa">Sospesa</option>
                    <option value="Bozza">Bozza</option>
                    <option value="Cessata">Cessata</option>
                  </select>
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setLegalEntityModal({ open: false, data: null })}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveRagioneSociale}
                  style={{
                    padding: '10px 24px',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 6px 0 rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FF6900';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Punto Vendita */}
      {storeModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '32px 32px 24px 32px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#1e293b',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                    }}>
                      {storeModal.data ? 'Modifica Punto Vendita' : 'Nuovo Punto Vendita'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    {storeModal.data ? 'Modifica i dati del punto vendita' : 'Configura i dettagli del nuovo punto vendita'}
                  </p>
                </div>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'all 0.15s ease',
                    color: '#64748b',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 250, 252, 0.95)';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Punto Vendita
                  </label>
                  <input
                    type="text"
                    placeholder="90xxxxxxxx (auto-generato)"
                    value={newStore.codice}
                    onChange={(e) => setNewStore({ ...newStore, codice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Nome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Nome Punto Vendita <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. WindTre Milano Centro"
                    value={newStore.nome}
                    onChange={(e) => setNewStore({ ...newStore, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Ragione Sociale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.ragioneSociale}
                    onChange={(e) => setNewStore({ ...newStore, ragioneSociale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Seleziona...</option>
                    {ragioneSocialiList.map(rs => (
                      <option key={rs.id} value={rs.nome}>{rs.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Canale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Canale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.canale}
                    onChange={(e) => setNewStore({ ...newStore, canale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="Franchising">Franchising</option>
                    <option value="Top Dealer">Top Dealer</option>
                    <option value="Dealer">Dealer</option>
                  </select>
                </div>

                {/* Indirizzo - full width */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Indirizzo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Via Roma 123"
                    value={newStore.indirizzo}
                    onChange={(e) => setNewStore({ ...newStore, indirizzo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Città */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Città <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.citta}
                    onChange={(e) => {
                      const cityName = e.target.value;
                      setNewStore({ ...newStore, citta: cityName });
                      // Auto-popola CAP dalla tabella città
                      const city = (italianCities as any[]).find((c: any) => c.name === cityName);
                      if (city) {
                        setNewStore(prev => ({
                          ...prev,
                          cap: city.postalCode || ''
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Seleziona città...</option>
                    {italianCities.length > 0 ? (
                      (italianCities as any[]).map((city: any) => (
                        <option key={city.id} value={city.name}>
                          {city.name} ({city.province})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Milano">Milano</option>
                        <option value="Roma">Roma</option>
                        <option value="Napoli">Napoli</option>
                        <option value="Torino">Torino</option>
                        <option value="Bologna">Bologna</option>
                        <option value="Firenze">Firenze</option>
                      </>
                    )}
                  </select>
                </div>

                {/* CAP */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    CAP
                  </label>
                  <input
                    type="text"
                    placeholder="20121"
                    value={newStore.cap}
                    onChange={(e) => setNewStore({ ...newStore, cap: e.target.value })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Telefono
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 02 1234567"
                    value={newStore.telefono}
                    onChange={(e) => setNewStore({ ...newStore, telefono: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="punto.vendita@windtre.it"
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Brand - Multi-select */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Brand Gestiti <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: newStore.brands.includes('WindTre') ? 'rgba(255, 105, 0, 0.1)' : '#f8fafc',
                      borderRadius: '8px',
                      border: `2px solid ${newStore.brands.includes('WindTre') ? '#FF6900' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={newStore.brands.includes('WindTre')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStore({ ...newStore, brands: [...newStore.brands, 'WindTre'] });
                          } else {
                            setNewStore({ ...newStore, brands: newStore.brands.filter(b => b !== 'WindTre') });
                          }
                        }}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          cursor: 'pointer',
                          accentColor: '#FF6900'
                        }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        color: newStore.brands.includes('WindTre') ? '#FF6900' : '#374151',
                        fontWeight: '600'
                      }}>
                        WindTre
                      </span>
                    </label>
                    
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: newStore.brands.includes('Very Mobile') ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                      borderRadius: '8px',
                      border: `2px solid ${newStore.brands.includes('Very Mobile') ? '#10b981' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={newStore.brands.includes('Very Mobile')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStore({ ...newStore, brands: [...newStore.brands, 'Very Mobile'] });
                          } else {
                            setNewStore({ ...newStore, brands: newStore.brands.filter(b => b !== 'Very Mobile') });
                          }
                        }}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          cursor: 'pointer',
                          accentColor: '#10b981'
                        }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        color: newStore.brands.includes('Very Mobile') ? '#10b981' : '#374151',
                        fontWeight: '600'
                      }}>
                        Very Mobile
                      </span>
                    </label>
                  </div>
                </div>

                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato
                  </label>
                  <select
                    value={newStore.stato}
                    onChange={(e) => setNewStore({ ...newStore, stato: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="Attivo">Attivo</option>
                    <option value="Sospeso">Sospeso</option>
                    <option value="Chiuso">Chiuso</option>
                  </select>
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveStore}
                  style={{
                    padding: '10px 24px',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 6px 0 rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FF6900';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}