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
  MapPin
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organizzazione');
  const [activeSubTab, setActiveSubTab] = useState('generale');
  const [editMode, setEditMode] = useState(false);

  // Mock data tenant corrente
  const tenantInfo = {
    id: 'current-tenant',
    name: 'WindTre Network Milano',
    organizationType: 'Franchising',
    businessCode: 'WT-MLN-001',
    legalEntitiesCount: 3,
    storesCount: 12,
    usersCount: 28,
    status: 'active'
  };

  const mockLegalEntities = [
    { id: '1', name: 'WindTre Store Milano Centro Srl', vatNumber: 'IT12345678901', storesCount: 5, status: 'active' },
    { id: '2', name: 'Very Mobile Point Nord Srl', vatNumber: 'IT98765432109', storesCount: 4, status: 'active' },
    { id: '3', name: 'Digital Services Milano Srl', vatNumber: 'IT11223344556', storesCount: 3, status: 'pending' }
  ];

  const mockStores = [
    { id: '1', name: 'Milano Duomo', address: 'Via del Corso 15, Milano', legalEntity: 'WindTre Store Milano Centro Srl', status: 'active', usersCount: 8 },
    { id: '2', name: 'Milano Centrale', address: 'P.za Duca d\'Aosta 9, Milano', legalEntity: 'WindTre Store Milano Centro Srl', status: 'active', usersCount: 6 },
    { id: '3', name: 'Very Mobile Isola', address: 'Via Brera 22, Milano', legalEntity: 'Very Mobile Point Nord Srl', status: 'active', usersCount: 4 }
  ];

  const mockUsers = [
    { id: '1', name: 'Marco Rossi', email: 'marco.rossi@windtre.it', role: 'Store Manager', store: 'Milano Duomo', status: 'active', lastAccess: '2024-12-05' },
    { id: '2', name: 'Laura Bianchi', email: 'laura.bianchi@windtre.it', role: 'Sales Agent', store: 'Milano Centrale', status: 'active', lastAccess: '2024-12-05' },
    { id: '3', name: 'Giuseppe Verde', email: 'giuseppe.verde@verymobile.it', role: 'Assistant Manager', store: 'Very Mobile Isola', status: 'active', lastAccess: '2024-12-04' }
  ];

  const mainTabs = [
    { id: 'organizzazione', label: 'Organizzazione', icon: Building },
    { id: 'utenti', label: 'Utenti & Ruoli', icon: Users },
    { id: 'sistema', label: 'Sistema', icon: Server },
    { id: 'sicurezza', label: 'Sicurezza', icon: Shield }
  ];

  const subTabs = {
    organizzazione: [
      { id: 'generale', label: 'Info Generali', icon: Building },
      { id: 'ragioni-sociali', label: 'Ragioni Sociali', icon: FileText },
      { id: 'punti-vendita', label: 'Punti Vendita', icon: Store },
      { id: 'branding', label: 'Personalizzazione', icon: Palette }
    ],
    utenti: [
      { id: 'gestione', label: 'Gestione Utenti', icon: User },
      { id: 'ruoli', label: 'Ruoli & Permessi', icon: Key }
    ],
    sistema: [
      { id: 'configurazione', label: 'Configurazione', icon: Server },
      { id: 'notifiche', label: 'Notifiche', icon: Bell }
    ],
    sicurezza: [
      { id: 'autenticazione', label: 'Autenticazione', icon: Lock },
      { id: 'sessioni', label: 'Sessioni Attive', icon: Activity },
      { id: 'audit', label: 'Log Attività', icon: FileText }
    ]
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-500/20 text-green-300 border-green-500/30",
      inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30", 
      pending: "bg-orange-500/20 text-orange-300 border-orange-500/30"
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const renderContent = () => {
    if (activeTab === 'organizzazione' && activeSubTab === 'generale') {
      return (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}>
          {/* Header */}
          <div style={{ 
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0 0 8px 0',
                  background: 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Informazioni Organizzazione
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', margin: 0 }}>
                  Gestione dei dati principali della tua organizzazione
                </p>
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                style={{
                  background: editMode ? 'linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 100%)' : 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(255,105,0,0.3)'
                }}
              >
                <Edit3 size={16} />
                {editMode ? 'Annulla' : 'Modifica'}
              </button>
            </div>
          </div>

          {/* Form Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px'
              }}>
                Nome Organizzazione
              </label>
              <input 
                type="text"
                value={tenantInfo.name}
                disabled={!editMode}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: editMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  cursor: editMode ? 'text' : 'not-allowed'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px'
              }}>
                Codice Business
              </label>
              <input 
                type="text"
                value={tenantInfo.businessCode}
                disabled={!editMode}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: editMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: editMode ? 'text' : 'not-allowed'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px'
              }}>
                Tipo Organizzazione
              </label>
              <input 
                type="text"
                value={tenantInfo.organizationType}
                disabled={!editMode}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: editMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: editMode ? 'text' : 'not-allowed'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px'
              }}>
                Stato
              </label>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(34,197,94,0.2)',
                color: '#4ADE80',
                border: '1px solid rgba(34,197,94,0.3)'
              }}>
                <CheckCircle size={14} style={{ marginRight: '6px' }} />
                Attivo
              </span>
            </div>
          </div>

          {/* Save Button */}
          {editMode && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                onClick={() => setEditMode(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Annulla
              </button>
              <button
                style={{
                  background: 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(255,105,0,0.3)'
                }}
              >
                <Save size={16} />
                Salva Modifiche
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '40px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <FileText size={32} style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ADE80', marginBottom: '4px' }}>
                {tenantInfo.legalEntitiesCount}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(74,222,128,0.8)' }}>
                Ragioni Sociali
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <Store size={32} style={{ color: '#60A5FA', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#60A5FA', marginBottom: '4px' }}>
                {tenantInfo.storesCount}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(96,165,250,0.8)' }}>
                Punti Vendita
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <UserCheck size={32} style={{ color: '#A855F7', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#A855F7', marginBottom: '4px' }}>
                {tenantInfo.usersCount}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(168,85,247,0.8)' }}>
                Utenti Attivi
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Altri contenuti per altri tab/subtab
    return (
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>
          Sezione in Sviluppo
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>
          Le impostazioni per {activeTab} - {activeSubTab} saranno disponibili presto.
        </p>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 50%, #FF6900 100%)',
      backgroundAttachment: 'fixed'
    }}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
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
                  transition: 'all 0.3s ease'
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
                  Impostazioni Organizzazione
                </h1>
                <p style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '18px', 
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {tenantInfo.name}
                </p>
              </div>
            </div>
            <div>
              <span style={{
                background: 'linear-gradient(135deg, rgba(255,105,0,0.2) 0%, rgba(123,44,191,0.2) 100%)',
                border: '1px solid rgba(255,105,0,0.3)',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#FFB366'
              }}>
                {tenantInfo.organizationType}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px' }}>
          {/* Sidebar Navigation */}
          <div style={{ width: '320px', flexShrink: 0 }}>
            {/* Main Tabs */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mainTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setActiveSubTab(subTabs[tab.id as keyof typeof subTabs][0].id);
                      }}
                      style={{
                        background: isActive 
                          ? 'linear-gradient(135deg, #FF6900 0%, #FFB366 100%)'
                          : 'transparent',
                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '16px',
                        fontWeight: isActive ? '600' : '500',
                        transition: 'all 0.3s ease',
                        boxShadow: isActive ? '0 4px 16px rgba(255,105,0,0.3)' : 'none'
                      }}
                    >
                      <Icon size={20} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub Tabs */}
            {subTabs[activeTab as keyof typeof subTabs] && (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
              }}>
                <h3 style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  margin: '0 0 16px 0'
                }}>
                  Sezioni
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {subTabs[activeTab as keyof typeof subTabs].map((subTab) => {
                    const Icon = subTab.icon;
                    const isActive = activeSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setActiveSubTab(subTab.id)}
                        style={{
                          background: isActive 
                            ? 'rgba(255,255,255,0.2)' 
                            : 'transparent',
                          border: isActive ? '1px solid rgba(255,255,255,0.3)' : 'none',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          fontWeight: isActive ? '600' : '500',
                          transition: 'all 0.3s ease',
                          textAlign: 'left'
                        }}
                      >
                        <Icon size={16} />
                        {subTab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1 }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}