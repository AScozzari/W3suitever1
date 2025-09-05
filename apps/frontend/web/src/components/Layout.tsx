import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench,
  LogOut, HelpCircle, MapPin, UserCircle, Store
} from 'lucide-react';
import { useLocation } from 'wouter';
import LoginModal from './LoginModal';

interface LayoutProps {
  children: React.ReactNode;
  currentModule: string;
  setCurrentModule: (module: string) => void;
}

export default function Layout({ children, currentModule, setCurrentModule }: LayoutProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [leftSidebarTimer, setLeftSidebarTimer] = useState<NodeJS.Timeout | null>(null);
  const [workspaceTimer, setWorkspaceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const [location, navigate] = useLocation();

  // Estrai tenant dal path URL per il context
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const tenantSlug = pathSegments[0]; // primo segmento (staging, demo, etc.)
    
    if (tenantSlug) {
      // Map slug to tenant ID
      const tenantMap: Record<string, string> = {
        'staging': '00000000-0000-0000-0000-000000000001',
        'demo': '99999999-9999-9999-9999-999999999999',
        'acme': '11111111-1111-1111-1111-111111111111',
        'tech': '22222222-2222-2222-2222-222222222222'
      };
      
      const tenantId = tenantMap[tenantSlug];
      if (tenantId) {
        localStorage.setItem('currentTenantId', tenantId);
      }
    }
  }, [location]);

  // Query per ottenere i punti vendita del tenant corrente
  const { data: stores = [], isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ["/api/stores"],
    enabled: !!user,
    retry: 2
  });

  // Auto-login per development se non c'è token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token && user) {
      // Simula login automatico per development con token JWT valido
      const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLXVzZXIiLCJlbWFpbCI6ImFkbWluQHczc3VpdGUuY29tIiwidGVuYW50SWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJpYXQiOjE3NTcwOTIwMTYsImV4cCI6MTc1NzY5NjgxNn0.-YyFQ05KOSn4Ts48p92BBUl19G_GBD70s_1npIAErzM';
      localStorage.setItem('auth_token', validJwtToken);
      console.log('Setting valid JWT token for development');
      // Refresh stores query dopo aver impostato il token
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
    }
  }, [user]);

  // Imposta primo store come selezionato se disponibile
  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore]);
  
  // Tab attiva per workspace
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('Tasks');
  
  // Dati tasks dal repository GitHub
  const [tasks, setTasks] = useState([
    {
      id: 1,
      titolo: 'Follow-up cliente Premium',
      descrizione: 'Chiamare Mario Rossi per rinnovo contratto Enterprise',
      priorita: 'Alta',
      scadenza: 'Oggi 15:00',
      completato: false,
      urgente: true,
      categoria: 'vendite'
    },
    {
      id: 2,
      titolo: 'Preparare documentazione',
      descrizione: 'Contratto fibra ottica per Laura Bianchi',
      priorita: 'Media',
      scadenza: 'Domani 10:00',
      completato: false,
      urgente: false,
      categoria: 'documentazione'
    },
    {
      id: 3,
      titolo: 'Verifica pagamento',
      descrizione: 'Controllo fattura cliente Giuseppe Verde - €2.300',
      priorita: 'Bassa',
      scadenza: 'Venerdì 16:00',
      completato: true,
      urgente: false,
      categoria: 'amministrativo'
    },
    {
      id: 4,
      titolo: 'Attivazione servizi',
      descrizione: 'Nuovo contratto mobile 5G + fibra 1GB/s',
      priorita: 'Alta',
      scadenza: 'Oggi 17:30',
      completato: false,
      urgente: true,
      categoria: 'tecnico'
    },
    {
      id: 5,
      titolo: 'Demo prodotto WindTre Business',
      descrizione: 'Presentazione soluzioni per PMI - Azienda Tecno Solutions',
      priorita: 'Alta',
      scadenza: 'Lunedì 09:30',
      completato: false,
      urgente: false,
      categoria: 'vendite'
    }
  ]);
  
  // Dati leads dal repository GitHub
  const [leads, setLeads] = useState([
    {
      id: 1,
      tipo: 'nuovo_lead',
      messaggio: 'Lead interessato a Piano Business Pro',
      cliente: 'Alessandro Martini',
      azienda: 'Digital Marketing SRL',
      fonte: 'LinkedIn Ads',
      priorita: 'Alta',
      tempo: '2 min fa',
      letto: false,
      potenziale: '€15.000/anno',
      telefono: '+39 349 123 4567'
    },
    {
      id: 2,
      tipo: 'lead_qualificato',
      messaggio: 'Lead qualificato pronto per chiamata',
      cliente: 'Francesca Lombardi',
      azienda: 'Consulting Express',
      fonte: 'Campagna Email',
      priorita: 'Alta',
      tempo: '8 min fa',
      letto: false,
      potenziale: '€25.000/anno',
      telefono: '+39 335 987 6543'
    },
    {
      id: 3,
      tipo: 'appuntamento_fissato',
      messaggio: 'Demo confermata per martedì',
      cliente: 'Roberto Conti',
      azienda: 'Startup Innovation Hub',
      fonte: 'Chiamata diretta',
      priorita: 'Media',
      tempo: '45 min fa',
      letto: true,
      potenziale: '€8.500/anno',
      telefono: '+39 347 456 7890'
    },
    {
      id: 4,
      tipo: 'contratto_in_chiusura',
      messaggio: 'Contratto in fase di finalizzazione',
      cliente: 'Maria Ferretti',
      azienda: 'E-commerce Plus',
      fonte: 'Referral Partner',
      priorita: 'Alta',
      tempo: '1 ora fa',
      letto: false,
      potenziale: '€32.000/anno',
      telefono: '+39 366 234 5678'
    },
    {
      id: 5,
      tipo: 'follow_up_richiesto',
      messaggio: 'Richieste info su soluzioni Cloud',
      cliente: 'Giuseppe Bianchi',
      azienda: 'Manufacturing Co.',
      fonte: 'Website Form',
      priorita: 'Media',
      tempo: '2 ore fa',
      letto: true,
      potenziale: '€18.000/anno',
      telefono: '+39 328 876 5432'
    }
  ]);
  
  // Eventi calendario dal repository GitHub
  const [eventiCalendario, setEventiCalendario] = useState(() => {
    const oggi = new Date();
    return [
      {
        id: 1,
        titolo: 'Riunione Team Vendite Q1',
        ora: '14:30',
        dataCompleta: new Date(oggi.getTime() + 1 * 24 * 60 * 60 * 1000),
        tipo: 'meeting',
        partecipanti: 8,
        location: 'Sala Conferenze A',
        colore: 'blue',
        descrizione: 'Revisione obiettivi Q1 e pianificazione strategie commerciali'
      },
      {
        id: 2,
        titolo: 'Presentazione Risultati Trimestrali',
        ora: '16:00',
        dataCompleta: new Date(oggi.getTime() + 1 * 24 * 60 * 60 * 1000),
        tipo: 'presentation',
        partecipanti: 15,
        location: 'Auditorium Principale',
        colore: 'purple',
        descrizione: 'Presentazione KPI e risultati del trimestre agli stakeholder'
      },
      {
        id: 3,
        titolo: 'Training Nuovo Personale Vendite',
        ora: '09:00',
        dataCompleta: new Date(oggi.getTime() + 2 * 24 * 60 * 60 * 1000),
        tipo: 'training',
        partecipanti: 6,
        location: 'Aula Formazione B',
        colore: 'green',
        descrizione: 'Formazione su prodotti WindTre Business e tecniche di vendita'
      },
      {
        id: 4,
        titolo: 'Demo Enterprise per Fortune 500',
        ora: '11:30',
        dataCompleta: new Date(oggi.getTime() + 2 * 24 * 60 * 60 * 1000),
        tipo: 'client',
        partecipanti: 5,
        location: 'Ufficio Direzione',
        colore: 'orange',
        descrizione: 'Presentazione soluzioni enterprise per cliente multinazionale'
      },
      {
        id: 5,
        titolo: 'Revisione Budget Marketing',
        ora: '15:00',
        dataCompleta: new Date(oggi.getTime() + 3 * 24 * 60 * 60 * 1000),
        tipo: 'meeting',
        partecipanti: 4,
        location: 'Sala Riunioni C',
        colore: 'red',
        descrizione: 'Analisi ROI campagne pubblicitarie e allocazione budget 2025'
      },
      {
        id: 6,
        titolo: 'Call con Cliente Premium',
        ora: '10:00',
        dataCompleta: new Date(oggi.getTime() + 4 * 24 * 60 * 60 * 1000),
        tipo: 'client',
        partecipanti: 3,
        location: 'Online - Teams',
        colore: 'blue',
        descrizione: 'Follow-up contratto renewal e upselling servizi aggiuntivi'
      }
    ];
  });
  
  // Funzioni per gestire tasks
  const toggleTaskComplete = (taskId: number) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completato: !task.completato } : task
    ));
  };
  
  // Contatori per stats
  const tasksOggi = tasks.filter(task => task.scadenza.includes('Oggi')).length;
  const tasksCompletate = tasks.filter(task => task.completato).length;
  const eventiTotali = eventiCalendario.length;

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      if (width < 1024) {
        setLeftSidebarCollapsed(true);
        setWorkspaceCollapsed(true);
      } else {
        // Su desktop, inizia con workspace aperta per permettere auto-collapse
        setWorkspaceCollapsed(false);
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Auto-collapse intelligente delle sidebar dopo inattività
  useEffect(() => {
    const handleUserActivity = () => {
      setLastInteraction(Date.now());
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastInteraction;
      
      // Auto-collapse dopo 30 secondi di inattività su desktop
      if (inactiveTime > 30000 && !isMobile && !isTablet) {
        if (!leftSidebarCollapsed) setLeftSidebarCollapsed(true);
        if (!workspaceCollapsed) setWorkspaceCollapsed(true);
      }
    };

    // Eventi per rilevare attività utente
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Check inattività ogni 5 secondi
    const inactivityTimer = setInterval(checkInactivity, 5000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      clearInterval(inactivityTimer);
    };
  }, [lastInteraction, leftSidebarCollapsed, workspaceCollapsed, isMobile, isTablet]);

  // Cleanup dei timer al dismount del componente
  useEffect(() => {
    return () => {
      if (leftSidebarTimer) clearTimeout(leftSidebarTimer);
      if (workspaceTimer) clearTimeout(workspaceTimer);
    };
  }, [leftSidebarTimer, workspaceTimer]);

  // Seleziona automaticamente il primo punto vendita quando disponibile
  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore]);

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
      if (!target.closest('[data-store-menu]')) {
        setStoreMenuOpen(false);
      }
    };

    if (userMenuOpen || storeMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen, storeMenuOpen]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
  };

  // Menu items dalla sidebar mostrata negli screenshots
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'ai', label: 'AI Tools', icon: Zap },
    { id: 'magazzino', label: 'Magazzino', icon: Briefcase },
    { id: 'amministrazione', label: 'Amministrazione', icon: Building },
    { id: 'hr', label: 'Human Resources', icon: UserPlus },
    { id: 'listini', label: 'Listini', icon: FileText },
    { id: 'cassa', label: 'Cassa', icon: ShoppingBag },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative'
    }}>
      {/* Header fisso - Glassmorphism Enhanced - IDENTICO WindTreDashboard */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: isMobile ? '56px' : '64px',
        background: 'hsla(255, 255, 255, 0.15)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid hsla(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 24px',
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

        {/* Barra di ricerca centrale - Hidden on mobile */}
        {!isMobile && (
          <div style={{ flex: 1, maxWidth: '400px', margin: '0 32px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#6b7280' 
              }} />
              <input
                placeholder="Cerca clienti, contratti, fatture..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 40px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Mobile search button */}
        {isMobile && (
          <button style={{
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '8px'
          }}>
            <Search size={20} />
          </button>
        )}

        {/* Sezione destra - Responsive */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
          {/* Selettore Punto Vendita - Professional */}
          {!isMobile && (
            <div style={{ position: 'relative' }} data-store-menu>
              <button
                onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'hsla(0, 0%, 100%, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.15)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.15)';
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.1)';
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.15)';
                }}
              >
                <Store size={16} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: 400 }}>{selectedStore?.name || 'Seleziona Punto Vendita'}</span>
                <ChevronDown size={14} style={{ 
                  transform: storeMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </button>

              {/* Dropdown Menu Punti Vendita */}
              {storeMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    width: '280px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: 'hsla(0, 0%, 100%, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid hsla(0, 0%, 100%, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    zIndex: 1000,
                    padding: '8px'
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '12px',
                    borderBottom: '1px solid hsla(0, 0%, 0%, 0.1)',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      Seleziona Punto Vendita
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {stores?.length || 0} punti vendita disponibili
                    </div>
                  </div>

                  {/* Lista Punti Vendita */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {stores?.map((store: any) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setSelectedStore(store);
                          setStoreMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: selectedStore?.id === store.id ? 'hsla(120, 61%, 50%, 0.1)' : 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedStore?.id !== store.id) {
                            e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedStore?.id !== store.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: selectedStore?.id === store.id 
                            ? 'linear-gradient(135deg, #10b981, #059669)' 
                            : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: selectedStore?.id === store.id ? 'white' : '#666',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {store.code?.slice(-2) || store.name?.slice(0, 2).toUpperCase()}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 500, 
                            marginBottom: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {store.name}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#666',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {store.address || store.code}
                          </div>
                        </div>

                        {selectedStore?.id === store.id && (
                          <CheckCircle size={16} style={{ color: '#6b7280' }} />
                        )}
                      </button>
                    ))}

                    {(!stores || stores.length === 0) && (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        Nessun punto vendita disponibile
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifiche */}
          <button style={{
            position: 'relative',
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '8px'
          }}>
            <Bell size={20} />
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%'
            }}></div>
          </button>

          {/* Avatar utente con dropdown menu */}
          <div style={{ position: 'relative' }} data-user-menu>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #7B2CBF, #a855f7)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {(user as any)?.email?.[0]?.toUpperCase() || 'A'}
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  width: '220px',
                  background: 'hsla(0, 0%, 100%, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  zIndex: 1000,
                  padding: '8px'
                }}
              >
                {/* Header utente */}
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.1)',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {(user as any)?.name || 'Utente'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {(user as any)?.email || 'admin@w3suite.com'}
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // TODO: Navigate to profile
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <UserCircle size={16} />
                    <span>Profilo Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // TODO: Open support ticket
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <HelpCircle size={16} />
                    <span>Apri Ticket</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // TODO: Clock in/out functionality
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin size={16} />
                    <span>Timbratura</span>
                  </button>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'hsla(0, 0%, 0%, 0.1)', margin: '8px 0' }}></div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setLoginModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#FF6900',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(25, 100%, 50%, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={16} />
                    <span>Cambia Utente</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#ef4444',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(239, 84%, 67%, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Layout principale - Responsive - IDENTICO WindTreDashboard */}
      <div style={{ 
        display: 'flex', 
        paddingTop: isMobile ? '56px' : '64px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* Sidebar sinistra - mobile toggle */}
        {isMobile && (
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            style={{
              position: 'fixed',
              top: '14px',
              left: '16px',
              width: '28px',
              height: '28px',
              background: 'hsla(0, 0%, 100%, 0.35)',
              backdropFilter: 'blur(16px)',
              border: '1px solid hsla(0, 0%, 100%, 0.18)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60
            }}
          >
            <Menu size={16} />
          </button>
        )}
        
        {/* Sidebar sinistra - Smart Hover Glassmorphism - IDENTICA WindTreDashboard */}
        <aside 
          onMouseEnter={() => {
            if (!isMobile && leftSidebarCollapsed) {
              setLeftSidebarCollapsed(false);
              setLastInteraction(Date.now());
            }
            // Cancella timer di chiusura se esiste
            if (leftSidebarTimer) {
              clearTimeout(leftSidebarTimer);
              setLeftSidebarTimer(null);
            }
          }}
          onMouseLeave={() => {
            if (!isMobile && !leftSidebarCollapsed) {
              // Cancella timer precedente
              if (leftSidebarTimer) {
                clearTimeout(leftSidebarTimer);
              }
              // Imposta nuovo timer
              const timer = setTimeout(() => {
                setLeftSidebarCollapsed(true);
                setLeftSidebarTimer(null);
              }, 1500); // Delay aumentato per usabilità
              setLeftSidebarTimer(timer);
            }
          }}
          style={{
          position: isMobile ? 'static' : 'fixed',
          left: 0,
          top: isMobile ? '0' : '64px',
          height: isMobile ? 'auto' : 'calc(100vh - 64px)',
          width: isMobile ? '100%' : (leftSidebarCollapsed ? '64px' : '256px'),
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderRight: isMobile ? 'none' : '1px solid hsla(255, 255, 255, 0.12)',
          borderBottom: isMobile ? '1px solid hsla(255, 255, 255, 0.12)' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 40,
          display: isMobile && leftSidebarCollapsed ? 'none' : 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'visible',
          padding: isMobile ? '12px' : '0',
          boxShadow: isMobile ? 'none' : '4px 0 24px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Toggle Button - Mobile hamburger */}
          {isMobile ? (
            <button
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              style={{
                position: 'fixed',
                top: '14px',
                left: '16px',
                width: '28px',
                height: '28px',
                background: 'hsla(0, 0%, 100%, 0.35)',
                backdropFilter: 'blur(16px)',
                border: '1px solid hsla(0, 0%, 100%, 0.18)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 60
              }}
            >
              <Menu size={16} />
            </button>
          ) : null}

          {/* Menu Items - Responsive - IDENTICI WindTreDashboard */}
          <nav style={{ 
            padding: isMobile ? '8px 0' : (leftSidebarCollapsed ? '16px 8px' : '16px'), 
            flexGrow: 1,
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? '8px' : (leftSidebarCollapsed ? '12px' : '0'),
            overflowX: isMobile ? 'auto' : 'visible'
          }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Controlla se il menu è attivo considerando il tenant nel path
              const currentPath = window.location.pathname;
              const pathSegments = currentPath.split('/').filter(Boolean);
              const isSettingsPath = pathSegments[1] === 'settings';
              const isDashboardPath = pathSegments.length === 1; // Solo /:tenant
              
              const isActive = item.id === 'impostazioni' 
                ? isSettingsPath
                : item.id === 'dashboard'
                ? isDashboardPath
                : currentModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // Ottieni il tenant corrente dal path
                    const currentPath = window.location.pathname;
                    const tenant = currentPath.split('/')[1] || 'staging';
                    
                    if (item.id === 'impostazioni') {
                      navigate(`/${tenant}/settings`);
                    } else if (item.id === 'dashboard') {
                      navigate(`/${tenant}`);
                    } else {
                      setCurrentModule(item.id);
                    }
                  }}
                  style={{
                    width: isMobile ? 'auto' : (leftSidebarCollapsed ? '40px' : '100%'),
                    height: leftSidebarCollapsed && !isMobile ? '40px' : 'auto',
                    minWidth: isMobile ? '80px' : 'auto',
                    padding: isMobile ? '12px' : (leftSidebarCollapsed ? '12px' : '12px 16px'),
                    marginBottom: isMobile ? '0' : (leftSidebarCollapsed ? '0' : '8px'),
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                      : 'transparent',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    border: 'none',
                    borderRadius: leftSidebarCollapsed ? '12px' : '8px',
                    color: isActive ? 'white' : '#374151',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: isActive ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '4px' : (leftSidebarCollapsed ? '0' : '12px'),
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: leftSidebarCollapsed ? 'center' : 'left',
                    justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start',
                    boxShadow: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = leftSidebarCollapsed ? 'scale(1.1)' : 'translateX(4px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'scale(1) translateX(0)';
                    }
                  }}
                >
                  {/* Icon con effetti speciali per dashboard */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <Icon size={leftSidebarCollapsed && !isMobile ? 18 : (isMobile ? 16 : 20)} />
                    {isActive && (
                      <>
                        {/* Glow effect base */}
                        <div style={{
                          position: 'absolute',
                          inset: '-6px',
                          background: 'rgba(255, 105, 0, 0.4)',
                          borderRadius: '50%',
                          filter: 'blur(12px)',
                          zIndex: -1,
                          animation: leftSidebarCollapsed ? 'none' : 'dashboardPulse 2s ease-in-out infinite'
                        }} />
                        {/* Enhanced glow quando aperta */}
                        {!leftSidebarCollapsed && (
                          <div style={{
                            position: 'absolute',
                            inset: '-10px',
                            background: 'rgba(255, 105, 0, 0.2)',
                            borderRadius: '50%',
                            filter: 'blur(20px)',
                            zIndex: -2,
                            animation: 'dashboardGlow 3s ease-in-out infinite alternate'
                          }} />
                        )}
                      </>
                    )}
                  </div>
                  {(!leftSidebarCollapsed || isMobile) && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - IDENTICO margini WindTreDashboard */}
        <main style={{
          flex: 1,
          marginLeft: isMobile ? '0' : (leftSidebarCollapsed ? '64px' : '256px'),
          marginRight: isMobile ? '0' : (!workspaceCollapsed ? '320px' : '64px'),
          padding: isMobile ? '16px' : '24px',
          transition: 'all 0.3s ease',
          minHeight: isMobile ? 'calc(100vh - 120px)' : 'auto'
        }}>
          {children}
        </main>

        {/* Workspace Sidebar destra - IDENTICA WindTreDashboard */}
        {!isMobile && !isTablet && (
          <aside 
            onMouseEnter={() => {
              if (workspaceCollapsed) {
                setWorkspaceCollapsed(false);
                setLastInteraction(Date.now());
              }
              // Cancella timer di chiusura se esiste
              if (workspaceTimer) {
                clearTimeout(workspaceTimer);
                setWorkspaceTimer(null);
              }
            }}
            onMouseLeave={() => {
              if (!workspaceCollapsed) {
                // Cancella timer precedente
                if (workspaceTimer) {
                  clearTimeout(workspaceTimer);
                }
                // Imposta nuovo timer
                const timer = setTimeout(() => {
                  setWorkspaceCollapsed(true);
                  setWorkspaceTimer(null);
                }, 1500); // Delay aumentato per usabilità
                setWorkspaceTimer(timer);
              }
            }}
            style={{
            position: 'fixed',
            right: 0,
            top: '64px',
            height: 'calc(100vh - 64px)',
            width: workspaceCollapsed ? '64px' : '320px',
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderLeft: '1px solid hsla(255, 255, 255, 0.12)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 40,
            boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {workspaceCollapsed ? (
              <div style={{
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button 
                  onClick={() => setActiveWorkspaceTab('Tasks')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Tasks' 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    color: activeWorkspaceTab === 'Tasks' ? 'white' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}>
                  <Activity size={18} />
                  {tasks.filter(t => !t.completato).length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '18px',
                      height: '18px',
                      background: '#ef4444',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {tasks.filter(t => !t.completato).length > 9 ? '9+' : tasks.filter(t => !t.completato).length}
                    </div>
                  )}
                </button>
                
                <button 
                  onClick={() => setActiveWorkspaceTab('Leads')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Leads'
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    color: activeWorkspaceTab === 'Leads' ? 'white' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}>
                  <Users size={18} />
                  {leads.filter(l => !l.letto).length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '18px',
                      height: '18px',
                      background: '#10b981',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {leads.filter(l => !l.letto).length > 9 ? '9+' : leads.filter(l => !l.letto).length}
                    </div>
                  )}
                </button>
                
                <button 
                  onClick={() => setActiveWorkspaceTab('Calendar')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Calendar'
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    color: activeWorkspaceTab === 'Calendar' ? 'white' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}>
                  <Calendar size={18} />
                  {eventiTotali > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '18px',
                      height: '18px',
                      background: '#7B2CBF',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {eventiTotali > 9 ? '9+' : eventiTotali}
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: 0
                  }}>Workspace</h3>
                </div>

                <div style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '4px',
                  marginBottom: '20px',
                  gap: '4px'
                }}>
                  {['Tasks', 'Leads', 'Calendar'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveWorkspaceTab(tab)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: activeWorkspaceTab === tab 
                          ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                          : 'transparent',
                        color: activeWorkspaceTab === tab ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {/* Tab Tasks */}
                  {activeWorkspaceTab === 'Tasks' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1f2937',
                        margin: 0
                      }}>Tasks</h4>
                      <span style={{
                        background: '#FF6900',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>{tasks.filter(t => !t.completato).length} attive</span>
                    </div>

                    {/* Tasks stats */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: 'rgba(255, 105, 0, 0.08)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid rgba(255, 105, 0, 0.15)'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#FF6900'
                        }}>{tasksOggi}</div>
                        <div style={{
                          fontSize: '8px',
                          color: '#b45309',
                          fontWeight: 500
                        }}>Oggi</div>
                      </div>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#10b981'
                        }}>{tasksCompletate}</div>
                        <div style={{
                          fontSize: '8px',
                          color: '#065f46',
                          fontWeight: 500
                        }}>Completate</div>
                      </div>
                    </div>

                    {/* Tasks list */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      {tasks.slice(0, 4).map((task) => {
                        const getPriorityColor = (priorita: string) => {
                          switch(priorita) {
                            case 'Alta': return '#ef4444';
                            case 'Media': return '#f59e0b';
                            case 'Bassa': return '#10b981';
                            default: return '#6b7280';
                          }
                        };
                        
                        return (
                          <div key={task.id} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderLeft: `3px solid ${getPriorityColor(task.priorita)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(8px)',
                            opacity: task.completato ? 0.6 : 1
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${getPriorityColor(task.priorita)}25`;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#1f2937',
                                  marginBottom: '2px',
                                  lineHeight: 1.3,
                                  textDecoration: task.completato ? 'line-through' : 'none'
                                }}>{task.titolo}</div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#6b7280',
                                  marginBottom: '4px',
                                  lineHeight: 1.3
                                }}>{task.descrizione}</div>
                              </div>
                              <button
                                onClick={() => toggleTaskComplete(task.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  marginLeft: '8px'
                                }}
                              >
                                {task.completato ? 
                                  <CheckCircle size={14} style={{ color: '#10b981' }} /> :
                                  <div style={{
                                    width: '14px',
                                    height: '14px',
                                    border: '2px solid #6b7280',
                                    borderRadius: '50%'
                                  }} />
                                }
                              </button>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: getPriorityColor(task.priorita),
                                background: `${getPriorityColor(task.priorita)}20`,
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>{task.priorita}</span>
                              
                              <div style={{
                                fontSize: '9px',
                                color: '#9ca3af',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '1px 4px',
                                borderRadius: '4px'
                              }}>{task.scadenza}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(255, 105, 0, 0.08)',
                      border: '1px solid rgba(255, 105, 0, 0.15)',
                      borderRadius: '8px',
                      color: '#FF6900',
                      fontSize: '10px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 105, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 105, 0, 0.08)';
                    }}>
                      Visualizza tutte le tasks
                    </button>
                  </div>
                  )}

                  {/* Tab Leads */}
                  {activeWorkspaceTab === 'Leads' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1f2937',
                        margin: 0
                      }}>Leads</h4>
                      <span style={{
                        background: '#10b981',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>{leads.length} attivi</span>
                    </div>

                    {/* Lead stats */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#10b981'
                        }}>{leads.filter(l => l.priorita === 'Alta').length}</div>
                        <div style={{
                          fontSize: '8px',
                          color: '#065f46',
                          fontWeight: 500
                        }}>Priorità Alta</div>
                      </div>
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.15)'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#3b82f6'
                        }}>{leads.length}</div>
                        <div style={{
                          fontSize: '8px',
                          color: '#1e40af',
                          fontWeight: 500
                        }}>Contatti Attivi</div>
                      </div>
                    </div>

                    {/* Leads list */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      {leads.slice(0, 4).map((lead) => {
                        const getPriorityColor = (priorita: string) => {
                          switch(priorita) {
                            case 'Alta': return '#ef4444';
                            case 'Media': return '#f59e0b';
                            case 'Bassa': return '#10b981';
                            default: return '#6b7280';
                          }
                        };
                        
                        const getChannelIcon = (fonte: string) => {
                          switch(fonte) {
                            case 'LinkedIn Ads': return '💼';
                            case 'Website': return '🌐';
                            case 'Email': return '📧';
                            case 'Telefono': return '📞';
                            case 'Referral': return '👥';
                            default: return '📝';
                          }
                        };
                        
                        return (
                          <div key={lead.id} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderLeft: `3px solid ${getPriorityColor(lead.priorita)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(8px)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${getPriorityColor(lead.priorita)}25`;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px'
                            }}>
                              <div>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#1f2937',
                                  marginBottom: '2px',
                                  lineHeight: 1.3
                                }}>{lead.cliente}</div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#6b7280',
                                  marginBottom: '4px'
                                }}>{lead.azienda}</div>
                              </div>
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: getPriorityColor(lead.priorita),
                                background: `${getPriorityColor(lead.priorita)}20`,
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>{lead.priorita}</span>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ fontSize: '10px' }}>{getChannelIcon(lead.fonte)}</span>
                                <span style={{
                                  fontSize: '9px',
                                  color: '#6b7280'
                                }}>{lead.fonte}</span>
                              </div>
                              
                              <div style={{
                                fontSize: '9px',
                                color: '#9ca3af',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '1px 4px',
                                borderRadius: '4px'
                              }}>{lead.tempo}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      borderRadius: '8px',
                      color: '#10b981',
                      fontSize: '10px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                    }}>
                      Gestisci tutti i leads
                    </button>
                  </div>
                  )}

                  {/* Tab Calendar */}
                  {activeWorkspaceTab === 'Calendar' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1f2937',
                        margin: 0
                      }}>Calendario</h4>
                      <span style={{
                        background: '#7B2CBF',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>{eventiTotali} eventi</span>
                    </div>

                    {/* Mini calendario con giorni selezionabili */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}>
                        {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </div>
                      
                      {/* Giorni della settimana */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '4px'
                      }}>
                        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(day => (
                          <div key={day} style={{
                            fontSize: '8px',
                            color: '#6b7280',
                            textAlign: 'center',
                            fontWeight: 500,
                            padding: '2px'
                          }}>{day}</div>
                        ))}
                      </div>
                      
                      {/* Griglia calendario */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '1px'
                      }}>
                        {Array.from({length: 35}, (_, i) => {
                          const today = new Date();
                          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                          const dayOfWeek = (firstDay.getDay() + 6) % 7;
                          const day = i - dayOfWeek + 1;
                          const isCurrentMonth = day > 0 && day <= new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                          const isToday = isCurrentMonth && day === today.getDate();
                          const hasEvent = isCurrentMonth && eventiCalendario.some(evento => {
                            const eventDate = new Date(evento.dataCompleta);
                            return eventDate.getDate() === day && 
                                   eventDate.getMonth() === today.getMonth() && 
                                   eventDate.getFullYear() === today.getFullYear();
                          });
                          
                          return (
                            <button key={i} style={{
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              color: isCurrentMonth ? (isToday ? 'white' : '#374151') : '#9ca3af',
                              background: isToday ? '#7B2CBF' : (hasEvent ? 'rgba(123, 44, 191, 0.15)' : 'transparent'),
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: isToday ? 600 : (hasEvent ? 500 : 400),
                              cursor: isCurrentMonth ? 'pointer' : 'default',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              if (isCurrentMonth && !isToday) {
                                e.currentTarget.style.background = 'rgba(123, 44, 191, 0.2)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (isCurrentMonth && !isToday) {
                                e.currentTarget.style.background = hasEvent ? 'rgba(123, 44, 191, 0.15)' : 'transparent';
                              }
                            }}>
                              {isCurrentMonth ? day : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Eventi prossimi */}
                    <div style={{
                      marginBottom: '12px'
                    }}>
                      <h5 style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1f2937',
                        margin: '0 0 8px 0'
                      }}>Prossimi eventi</h5>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        {eventiCalendario.slice(0, 3).map((evento) => (
                          <div key={evento.id} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderLeft: '3px solid #7B2CBF',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(8px)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(123, 44, 191, 0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}>
                            <div style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1f2937',
                              marginBottom: '4px',
                              lineHeight: 1.3
                            }}>{evento.titolo}</div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span style={{
                                fontSize: '10px',
                                color: '#6b7280'
                              }}>{evento.ora}</span>
                              <span style={{
                                fontSize: '9px',
                                color: '#9ca3af',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '1px 4px',
                                borderRadius: '4px'
                              }}>{evento.location}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(123, 44, 191, 0.08)',
                      border: '1px solid rgba(123, 44, 191, 0.15)',
                      borderRadius: '8px',
                      color: '#7B2CBF',
                      fontSize: '10px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(123, 44, 191, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(123, 44, 191, 0.08)';
                    }}>
                      Visualizza calendario completo
                    </button>
                  </div>
                  )}

                </div>
              </div>
            )}
          </aside>
        )}

        {/* CSS Animations per effetti dashboard - IDENTICHE WindTreDashboard */}
        <style>{`
          @keyframes dashboardPulse {
            0%, 100% { 
              opacity: 0.4;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
          
          @keyframes dashboardGlow {
            0% { 
              opacity: 0.2;
              transform: scale(0.8);
            }
            100% { 
              opacity: 0.4;
              transform: scale(1.2);
            }
          }
        `}</style>
      </div>

      {/* Modal di Login */}
      <LoginModal 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        tenantCode={localStorage.getItem('currentTenant') || 'staging'}
      />
    </div>
  );
}