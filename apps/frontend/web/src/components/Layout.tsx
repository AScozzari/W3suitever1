import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { oauth2Client } from '../services/OAuth2Client';
import { UserData } from '@/types';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench,
  LogOut, HelpCircle, MapPin, UserCircle, Store, ListTodo, Package,
  LayoutDashboard, FolderTree, Building2
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../hooks/useAuth';
import { useIdleDetection } from '@/contexts/IdleDetectionContext';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import LoginModal from './LoginModal';
import NotificationBell from './Notifications/NotificationBell';
import ChatWidget from './ChatWidget';
import { SoftphoneWidget } from './crm/SoftphoneWidget';
import { TaskDetailDialog } from './tasks/TaskDetailDialog';

// Palette colori W3 Suite - Coerente e Professionale
const COLORS = {
  // Colori primari brand WindTre
  primary: {
    orange: '#FF6900',      // Arancione WindTre
    orangeLight: '#ff8533', // Arancione chiaro
    purple: '#7B2CBF',      // Viola WindTre
    purpleLight: '#9747ff', // Viola chiaro
  },
  // Colori semantici per stati e feedback
  semantic: {
    success: '#10b981',     // Verde successo
    warning: '#f59e0b',     // Arancione warning
    error: '#ef4444',       // Rosso errore
    info: '#3b82f6',        // Blu info
  },
  // Priorità tasks e leads
  priority: {
    high: '#ef4444',        // Rosso alta priorità
    medium: '#f59e0b',      // Arancione media
    low: '#10b981',         // Verde bassa
  },
  // Grigi per UI neutrale
  neutral: {
    dark: '#1f2937',        // Testo principale
    medium: '#6b7280',      // Testo secondario
    light: '#9ca3af',       // Testo disabilitato
    lighter: '#e5e7eb',     // Bordi
    lightest: '#f9fafb',    // Sfondi
  },
  // Sfondi glassmorphism
  glass: {
    white: 'rgba(255, 255, 255, 0.08)',
    whiteLight: 'rgba(255, 255, 255, 0.03)',
    whiteMedium: 'rgba(255, 255, 255, 0.12)',
  }
};

interface LayoutProps {
  children: React.ReactNode;
  currentModule: string;
  setCurrentModule: (module: string) => void;
}

// Chat Icon Button Component with Unread Badge
function ChatIconButton({ isMobile, isIdle }: { isMobile: boolean; isIdle: boolean }) {
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/chat/unread-count'],
    refetchInterval: isIdle ? false : 10000, // Only poll when user is active
    staleTime: 5000
  });

  const unreadCount = unreadData?.unreadCount || 0;
  const { navigate } = useTenantNavigation();

  return (
    <button
      onClick={() => navigate('chat')}
      data-testid="button-chat"
      style={{
        position: 'relative',
        width: isMobile ? '36px' : '40px',
        height: isMobile ? '36px' : '40px',
        padding: 0,
        background: 'hsla(0, 0%, 100%, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid hsla(0, 0%, 100%, 0.15)',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
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
      <MessageCircle size={isMobile ? 18 : 20} style={{ color: '#6b7280' }} />
      
      {/* Unread Badge - Red Circle */}
      {unreadCount > 0 && (
        <div
          data-testid="badge-chat-unread"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            background: '#ef4444',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: 'white',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
}

export default function Layout({ children, currentModule, setCurrentModule }: LayoutProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(true);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [leftSidebarTimer, setLeftSidebarTimer] = useState<NodeJS.Timeout | null>(null);
  const [workspaceTimer, setWorkspaceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  
  const { isIdle } = useIdleDetection();
  const { data: user } = useQuery<UserData | null>({ queryKey: ["/api/auth/session"] });
  const [location] = useLocation();
  const { navigate } = useTenantNavigation();
  const { currentTenant } = useTenant();
  
  // ✅ Sicuro: Ottieni e valida tenant dal path URL con fallback robusto
  const getTenantFromUrl = () => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const tenantSlug = pathSegments[0];
    
    // Valida contro tenant conosciuti
    const validTenants = ['staging', 'demo', 'acme', 'tech'];
    if (tenantSlug && validTenants.includes(tenantSlug)) {
      return tenantSlug;
    }
    
    return 'staging'; // fallback sicuro
  };

  // ✅ Ripristina mappatura slug → UUID per localStorage (necessaria per API headers)
  useEffect(() => {
    const tenantSlug = getTenantFromUrl();
    
    // Map slug to tenant ID per compatibilità con sistema esistente
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
  }, [location]);

  // Query per ottenere i punti vendita del tenant corrente
  const { data: storesResponse, isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ["/api/stores"],
    enabled: !!user,
    retry: 2
  });

  // Ensure stores is always an array
  const stores = Array.isArray(storesResponse) ? storesResponse : [];

  // Check token validity se non c'è token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // NO AUTO-LOGIN - Force manual login
      console.log('No auth token found - login required');
    } else {
      // Verifica che il token sia valido e contenga il tenant ID corretto
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          // Se il token contiene "demo-tenant" invece di UUID, rifai il login
          if (payload.tenantId === 'demo-tenant' || !payload.tenantId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.log('Detected invalid tenant ID in token, clearing...');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('currentTenantId');
            // Force re-login instead of auto-login
          }
        }
      } catch (e) {
        // Token invalido, clear storage
        console.log('Invalid token, clearing...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('currentTenantId');
        // Force re-login instead of auto-login
      }
    }
  }, []);

  // Auto-login removed - manual login required

  // Imposta primo store come selezionato se disponibile
  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore]);
  
  // Tab attiva per workspace
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('Tasks');
  
  // ✅ NAVIGAZIONE MESI PER CALENDARIO WORKSPACE
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (leftSidebarTimer) {
        clearTimeout(leftSidebarTimer);
      }
      if (workspaceTimer) {
        clearTimeout(workspaceTimer);
      }
    };
  }, [leftSidebarTimer, workspaceTimer]);

  // Helper function to handle workspace tab click - 1500ms hover-only behavior
  const handleWorkspaceTabClick = (tab: string) => {
    setActiveWorkspaceTab(tab);
    // Se il workspace era collapsed, espandilo senza timer automatico
    if (workspaceCollapsed) {
      setWorkspaceCollapsed(false);
    }
    // NO click-based auto-collapse timer - solo hover-only behavior
  };
  
  // ✅ TASKS REALI DAL BACKEND - User's tasks
  const { data: tasksRaw = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks/my-tasks'],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 secondi cache
    refetchInterval: isIdle ? false : 60 * 1000, // Only poll when user is active
  });

  // 🔄 FILTRI E MAPPING: Task reali → UI Format
  const tasks = React.useMemo(() => {
    if (!Array.isArray(tasksRaw) || !tasksRaw.length) return [];
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filtra: solo TODO, IN_PROGRESS, REVIEW + questa settimana
    const filtered = tasksRaw.filter((task: any) => {
      // Status filter
      const validStatuses = ['todo', 'in_progress', 'review'];
      if (!validStatuses.includes(task.status)) return false;
      
      // Date filter: task con dueDate oggi o questa settimana
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        return dueDate >= startOfToday && dueDate <= oneWeekFromNow;
      }
      
      // Se non ha dueDate, includi comunque (task senza scadenza)
      return true;
    });
    
    // Mapping: Backend → UI format
    const mapped = filtered.map((task: any) => {
      // Determina ruolo utente
      const getUserRole = () => {
        if (task.creatorId === user?.id) return 'Creatore';
        const assignment = task.assignments?.find((a: any) => a.userId === user?.id);
        if (assignment) {
          return assignment.role === 'assignee' ? 'Assegnato' : 'Osservatore';
        }
        return null;
      };
      
      // Formatta scadenza
      const formatDueDate = (dueDate: string | null) => {
        if (!dueDate) return 'Nessuna scadenza';
        const due = new Date(dueDate);
        const diffDays = Math.floor((due.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return `Oggi ${due.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
        if (diffDays === 1) return `Domani ${due.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
        return due.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      };
      
      return {
        ...task,
        titolo: task.title,
        descrizione: task.description || 'Nessuna descrizione',
        priorita: task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Bassa',
        scadenza: formatDueDate(task.dueDate),
        completato: task.status === 'done',
        urgente: task.urgency === 'critical' || task.urgency === 'high',
        userRole: getUserRole()
      };
    });
    
    return mapped;
  }, [tasksRaw, user]);
  
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
  
  // ✅ EVENTI CALENDARIO REALI DAL BACKEND HR
  const { data: eventiCalendarioRaw = [], isLoading: calendarLoading, error: calendarError } = useQuery({
    queryKey: ['/api/hr/calendar/events'],
    staleTime: 5 * 60 * 1000, // 5 minuti cache
    refetchInterval: isIdle ? false : 30 * 1000, // Only poll when user is active
  });

  // 🔄 MAPPING: Database → Placeholder Structure 
  const eventiCalendario = React.useMemo(() => {
    if (!Array.isArray(eventiCalendarioRaw) || !eventiCalendarioRaw.length) return [];
    
    const mapped = eventiCalendarioRaw.map((event: any) => ({
      id: event.id,
      titolo: event.title,
      ora: new Date(event.startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      dataCompleta: new Date(event.startDate),
      tipo: event.type,
      partecipanti: Array.isArray(event.attendees) ? event.attendees.length : 0,
      location: event.location || 'Sede Principale',
      colore: event.color || (event.type === 'meeting' ? 'blue' : event.type === 'training' ? 'green' : 'purple'),
      descrizione: event.description || 'Nessuna descrizione disponibile'
    }));
    
    return mapped;
  }, [eventiCalendarioRaw]);
  
  // Contatori per stats - basati su dati reali
  const tasksOggi = tasks.filter(task => task.scadenza?.includes('Oggi')).length;
  const tasksCompletate = tasks.filter(task => task.completato).length;
  // ✅ EVENTI TOTALI DINAMICI DAL BACKEND (invece di .length statico)
  const eventiTotali = calendarLoading ? 0 : eventiCalendario.length;

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      if (width < 1024) {
        setLeftSidebarCollapsed(true);
        setWorkspaceCollapsed(true);
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
      console.log('🚪 Logging out via OAuth2...');
      
      // Get current tenant slug for redirect
      const tenantSlug = currentTenant?.code || 'staging';
      
      // Use OAuth2 logout (clears tokens and revokes on server)
      await oauth2Client.logout();
      
      // Clear React Query cache
      queryClient.removeQueries({ queryKey: ['/api/auth/session'] });
      queryClient.clear();
      
      console.log('✅ OAuth2 logout completed');
      
      // Redirect to login page of the same tenant
      window.location.href = `/${tenantSlug}/login`;
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Fallback: force logout even if server call fails
      const tenantSlug = currentTenant?.code || 'staging';
      await oauth2Client.logout();
      queryClient.clear();
      window.location.href = `/${tenantSlug}/login`;
    }
  };

  // Menu items con path normalizzati - SOLUZIONE CLEAN
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, path: '/tasks' },
    { id: 'crm', label: 'CRM', icon: Users, path: '/crm' },
    { id: 'ai', label: 'AI Tools', icon: Zap, path: '/ai-tools' },
    { id: 'magazzino', label: 'Magazzino', icon: Briefcase, path: '/magazzino' },
    { id: 'amministrazione', label: 'Amministrazione', icon: Building, path: '/amministrazione' },
    { id: 'hr-management', label: 'HR Management', icon: UserPlus, path: '/hr-management' },
    { id: 'workflow-management', label: 'Workflow & Teams', icon: Users, path: '/workflow-management' },
    { 
      id: 'prodotti-listini', 
      label: 'Prodotti e Listini', 
      icon: Package, 
      path: '/prodotti-listini',
      hasSubmenu: true,
      submenuItems: [
        { id: 'dashboard-prodotti', label: 'Dashboard', icon: LayoutDashboard, path: '/prodotti-listini' },
        { id: 'catalogo-prodotti', label: 'Catalogo Prodotti', icon: Package, path: '/prodotti-listini?tab=prodotti' },
        { id: 'listini-prezzi', label: 'Listini Prezzi', icon: FileText, path: '/prodotti-listini?tab=listini' },
        { id: 'categorie-tipologie', label: 'Categorie & Tipologie', icon: FolderTree, path: '/prodotti-listini?tab=categorie' },
        { id: 'fornitori', label: 'Fornitori', icon: Building2, path: '/prodotti-listini?tab=fornitori' }
      ]
    },
    { id: 'cassa', label: 'Cassa', icon: ShoppingBag, path: '/cassa' },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings, path: '/settings' }
  ];

  // Helper unificato per active state - FIX DASHBOARD ORANGE
  const getActiveItemId = (location: string) => {
    const segments = location.split('/').filter(Boolean);
    const section = segments[1]; // secondo segmento dopo tenant
    
    // Se non c'è secondo segmento, è dashboard
    if (!section) return 'dashboard';
    
    // Per settings, può essere sia /settings che /impostazioni  
    if (section === 'settings') return 'impostazioni';
    
    // Per workflow-management 
    if (section === 'workflow-management') return 'workflow-management';
    
    // Trova item corrispondente al path
    const matchedItem = menuItems.find(item => 
      item.path === `/${section}` || item.id === section
    );
    
    return matchedItem?.id || 'dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
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
            background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
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
          {/* AI Voice Test Button */}
          {user && !isMobile && (
            <button
              onClick={() => navigate('ai-voice-test')}
              data-testid="button-ai-voice-test"
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                background: 'hsla(0, 0%, 100%, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid hsla(0, 0%, 100%, 0.15)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.15)';
                e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.1)';
                e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.15)';
              }}
              title="Test AI Voice Agent"
            >
              <Smartphone size={20} style={{ color: '#6b7280' }} />
            </button>
          )}
          
          {/* Notification Bell */}
          {user && <NotificationBell isMobile={isMobile} />}
          
          {/* Chat Icon with Unread Badge */}
          {user && <ChatIconButton isMobile={isMobile} isIdle={isIdle} />}
          
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

                {/* Dev Mode User Switcher */}
                {import.meta.env.DEV && (
                  <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid hsla(0, 0%, 0%, 0.1)',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔧 Dev Mode - Cambia Utente
                    </div>
                    <select
                      value={localStorage.getItem('demo_user_id') || 'admin-user'}
                      onChange={(e) => {
                        localStorage.setItem('demo_user_id', e.target.value);
                        window.location.reload();
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                      data-testid="select-demo-user"
                    >
                      <option value="admin-user">👑 Admin Demo</option>
                      <option value="user-002">🏪 Mario Rossi (Store Manager)</option>
                      <option value="user-003">💼 Laura Bianchi (Sales Agent)</option>
                    </select>
                  </div>
                )}

                {/* Menu items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

                  <button
                    onClick={() => {
                      const tenant = localStorage.getItem('currentTenant') || 'staging';
                      window.location.href = `/${tenant}/portale`;
                      setUserMenuOpen(false);
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(123, 47%, 50%, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <BarChart3 size={16} style={{ color: '#10B981' }} />
                    <span>Il mio portale</span>
                  </button>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'hsla(0, 0%, 0%, 0.1)', margin: '8px 0' }}></div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // TODO: Navigate to settings
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
                    <Settings size={16} />
                    <span>Impostazioni</span>
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

          {/* Navigation menu originale */}
          <nav style={{
            padding: isMobile ? '8px' : (leftSidebarCollapsed ? '16px 8px' : '24px 16px'),
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? '0' : '8px',
            overflowX: isMobile ? 'auto' : 'visible'
          }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const activeItemId = getActiveItemId(location);
              const isActive = item.id === activeItemId;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // ✅ Navigation sicura usando useTenantNavigation hook
                    navigate(item.path.replace(/^\//, ''));
                  }}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold shadow-lg' 
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white/10'
                    }
                    ${leftSidebarCollapsed && !isMobile ? 'justify-center w-10 h-10 p-2' : ''}
                    ${isMobile ? 'flex-col text-xs min-w-20' : ''}
                  `}
                >
                  {/* Icon con glow effect solo per dashboard attiva */}
                  <div className="relative flex items-center justify-center">
                    <Icon size={leftSidebarCollapsed && !isMobile ? 18 : (isMobile ? 16 : 20)} />
                    {isActive && item.id === 'dashboard' && (
                      <>
                        <div className="absolute inset-[-6px] bg-orange-400/40 rounded-full filter blur-xl -z-10" />
                        {!leftSidebarCollapsed && (
                          <div className="absolute inset-[-10px] bg-orange-400/20 rounded-full filter blur-2xl -z-20 animate-pulse" />
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
          width: isMobile ? '100%' : `calc(100vw - ${leftSidebarCollapsed ? 64 : 256}px - ${!workspaceCollapsed ? 320 : 64}px)`,
          marginLeft: isMobile ? '0' : (leftSidebarCollapsed ? '64px' : '256px'),
          padding: isMobile ? '16px' : '24px',
          transition: 'all 0.3s ease',
          minHeight: isMobile ? 'calc(100vh - 120px)' : 'auto',
          boxSizing: 'border-box'
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
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)',
            overflow: 'visible'
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
                  onClick={() => handleWorkspaceTabClick('Tasks')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Tasks' 
                      ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
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
                  onClick={() => handleWorkspaceTabClick('Leads')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Leads'
                      ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
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
                  onClick={() => handleWorkspaceTabClick('Calendar')}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: activeWorkspaceTab === 'Calendar'
                      ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
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
                      onClick={() => handleWorkspaceTabClick(tab)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: activeWorkspaceTab === tab 
                          ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})` 
                          : 'transparent',
                        color: activeWorkspaceTab === tab ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  overflowX: 'visible',
                  paddingRight: '8px',
                  marginRight: '-8px'
                }}>
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
                        background: COLORS.primary.orange,
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
                          color: COLORS.primary.orange
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
                          color: COLORS.semantic.success
                        }}>{tasksCompletate}</div>
                        <div style={{
                          fontSize: '8px',
                          color: '#065f46',
                          fontWeight: 500
                        }}>Completate</div>
                      </div>
                    </div>

                    {/* Tasks list - con scroll se molti task */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '16px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {tasksLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12px' }}>
                          Caricamento task...
                        </div>
                      ) : tasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12px' }}>
                          Nessun task da mostrare
                        </div>
                      ) : tasks.map((task) => {
                        const getPriorityColor = (priorita: string) => {
                          switch(priorita) {
                            case 'Alta': return COLORS.priority.high;
                            case 'Media': return COLORS.priority.medium;
                            case 'Bassa': return COLORS.priority.low;
                            default: return COLORS.neutral.medium;
                          }
                        };
                        
                        // Helper per badge ruolo
                        const getRoleBadgeColor = (role: string | null) => {
                          switch(role) {
                            case 'Creatore': return { bg: 'rgba(123, 44, 191, 0.15)', color: '#7B2CBF', icon: '🎨' };
                            case 'Assegnato': return { bg: 'rgba(255, 105, 0, 0.15)', color: '#FF6900', icon: '👤' };
                            case 'Osservatore': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: '👁️' };
                            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', icon: '•' };
                          }
                        };
                        
                        const roleStyle = getRoleBadgeColor(task.userRole);
                        
                        return (
                          <div 
                            key={task.id} 
                            onClick={() => {
                              setSelectedTask(task);
                              setTaskDetailOpen(true);
                            }}
                            style={{
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
                          onMouseEnter={(e) => {
                            const card = e.currentTarget;
                            const title = card.querySelector('.task-title') as HTMLElement;
                            const priority = card.querySelector('.task-priority') as HTMLElement;
                            
                            // Card animations - più evidenti
                            card.style.background = `rgba(255, 105, 0, 0.08)`;
                            card.style.transform = 'translateY(-2px) scale(1.01)';
                            card.style.boxShadow = `0 8px 16px ${getPriorityColor(task.priorita)}30, 0 4px 8px rgba(0, 0, 0, 0.12)`;
                            card.style.borderLeftWidth = '4px';
                            card.style.borderColor = `${getPriorityColor(task.priorita)}`;
                            card.style.borderRightColor = 'rgba(255, 105, 0, 0.2)';
                            card.style.borderTopColor = 'rgba(255, 105, 0, 0.2)';
                            card.style.borderBottomColor = 'rgba(255, 105, 0, 0.2)';
                            
                            // Title animation
                            if (title) {
                              title.style.color = COLORS.primary.orange;
                              title.style.fontWeight = '700';
                            }
                            
                            // Priority badge animation
                            if (priority) {
                              priority.style.transform = 'scale(1.05)';
                              priority.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const card = e.currentTarget;
                            const title = card.querySelector('.task-title') as HTMLElement;
                            const priority = card.querySelector('.task-priority') as HTMLElement;
                            
                            // Reset card
                            card.style.background = 'rgba(255, 255, 255, 0.03)';
                            card.style.transform = 'translateY(0) scale(1)';
                            card.style.boxShadow = 'none';
                            card.style.borderLeftWidth = '3px';
                            // Mantieni solo il bordo sinistro colorato
                            card.style.borderRightColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderTopColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
                            
                            // Reset title
                            if (title) {
                              title.style.color = '#1f2937';
                              title.style.fontWeight = '600';
                            }
                            
                            // Reset priority
                            if (priority) {
                              priority.style.transform = 'scale(1)';
                              priority.style.boxShadow = 'none';
                            }
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div 
                                  className="task-title"
                                  style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#1f2937',
                                  marginBottom: '2px',
                                  lineHeight: 1.3,
                                  textDecoration: task.completato ? 'line-through' : 'none',
                                  transition: 'color 0.3s ease'
                                }}>{task.titolo}</div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#6b7280',
                                  marginBottom: '4px',
                                  lineHeight: 1.3
                                }}>{task.descrizione}</div>
                              </div>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}>
                              <span 
                                className="task-priority"
                                style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: getPriorityColor(task.priorita),
                                background: `${getPriorityColor(task.priorita)}20`,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'inline-block'
                              }}>{task.priorita}</span>
                              
                              {task.userRole && (
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  color: roleStyle.color,
                                  background: roleStyle.bg,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  <span style={{ fontSize: '8px' }}>{roleStyle.icon}</span>
                                  {task.userRole}
                                </span>
                              )}
                              
                              <div style={{
                                fontSize: '9px',
                                color: '#9ca3af',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                marginLeft: 'auto'
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
                            case 'Alta': return COLORS.priority.high;
                            case 'Media': return COLORS.priority.medium;
                            case 'Bassa': return COLORS.priority.low;
                            default: return COLORS.neutral.medium;
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
                          onMouseEnter={(e) => {
                            const card = e.currentTarget;
                            const name = card.querySelector('.lead-name') as HTMLElement;
                            const icon = card.querySelector('.lead-icon') as HTMLElement;
                            const priority = card.querySelector('.lead-priority') as HTMLElement;
                            
                            // Card animations - più evidenti
                            card.style.background = 'rgba(16, 185, 129, 0.08)';
                            card.style.transform = 'translateY(-2px) scale(1.01)';
                            card.style.boxShadow = `0 8px 16px ${getPriorityColor(lead.priorita)}30, 0 4px 8px rgba(0, 0, 0, 0.12)`;
                            card.style.borderLeftWidth = '4px';
                            card.style.borderColor = `${getPriorityColor(lead.priorita)}`;
                            card.style.borderRightColor = 'rgba(16, 185, 129, 0.2)';
                            card.style.borderTopColor = 'rgba(16, 185, 129, 0.2)';
                            card.style.borderBottomColor = 'rgba(16, 185, 129, 0.2)';
                            
                            // Name animation
                            if (name) {
                              name.style.color = '#10b981';
                              name.style.fontWeight = '700';
                            }
                            
                            // Icon animation
                            if (icon) {
                              icon.style.transform = 'scale(1.15)';
                            }
                            
                            // Priority animation
                            if (priority) {
                              priority.style.transform = 'scale(1.05)';
                              priority.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const card = e.currentTarget;
                            const name = card.querySelector('.lead-name') as HTMLElement;
                            const icon = card.querySelector('.lead-icon') as HTMLElement;
                            const priority = card.querySelector('.lead-priority') as HTMLElement;
                            
                            // Reset card
                            card.style.background = 'rgba(255, 255, 255, 0.03)';
                            card.style.transform = 'translateY(0) scale(1)';
                            card.style.boxShadow = 'none';
                            card.style.borderLeftWidth = '3px';
                            card.style.borderLeftColor = `${getPriorityColor(lead.priorita)}`;
                            card.style.borderRightColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderTopColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
                            
                            // Reset name
                            if (name) {
                              name.style.color = '#1f2937';
                              name.style.fontWeight = '600';
                            }
                            
                            // Reset icon
                            if (icon) {
                              icon.style.transform = 'scale(1)';
                            }
                            
                            // Reset priority
                            if (priority) {
                              priority.style.transform = 'scale(1)';
                              priority.style.boxShadow = 'none';
                            }
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px'
                            }}>
                              <div>
                                <div 
                                  className="lead-name"
                                  style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#1f2937',
                                  marginBottom: '2px',
                                  lineHeight: 1.3,
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>{lead.cliente}</div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#6b7280',
                                  marginBottom: '4px'
                                }}>{lead.azienda}</div>
                              </div>
                              <span 
                                className="lead-priority"
                                style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: getPriorityColor(lead.priorita),
                                background: `${getPriorityColor(lead.priorita)}20`,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'inline-block'
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
                                <span 
                                  className="lead-icon"
                                  style={{ 
                                    fontSize: '10px',
                                    display: 'inline-block',
                                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}>{getChannelIcon(lead.fonte)}</span>
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
                        background: calendarLoading ? '#9ca3af' : (calendarError ? '#ef4444' : '#7B2CBF'),
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {calendarLoading ? (
                          <>
                            <Clock size={10} style={{ animation: 'spin 1s linear infinite' }} />
                            Caricamento...
                          </>
                        ) : calendarError ? (
                          <>⚠️ Errore</>
                        ) : (
                          <>{eventiTotali} eventi</>
                        )}
                      </span>
                    </div>

                    {/* Mini calendario con giorni selezionabili */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {/* ✅ HEADER CON NAVIGAZIONE MESI */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <button 
                          onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(123, 44, 191, 0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#1f2937',
                          textAlign: 'center'
                        }}>
                          {currentCalendarMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                        </div>
                        
                        <button 
                          onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(123, 44, 191, 0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      
                      {/* Giorni della settimana */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '4px'
                      }}>
                        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
                          <div key={`day-${index}`} style={{
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
                          const firstDay = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), 1);
                          const dayOfWeek = (firstDay.getDay() + 6) % 7;
                          const day = i - dayOfWeek + 1;
                          const daysInMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 0).getDate();
                          const isCurrentMonth = day > 0 && day <= daysInMonth;
                          const isToday = isCurrentMonth && day === today.getDate() && 
                                         currentCalendarMonth.getMonth() === today.getMonth() && 
                                         currentCalendarMonth.getFullYear() === today.getFullYear();
                          const hasEvent = isCurrentMonth && eventiCalendario.some(evento => {
                            // ✅ FIX: evento.dataCompleta è già un Date object
                            const eventDate = evento.dataCompleta instanceof Date ? evento.dataCompleta : new Date(evento.dataCompleta);
                            return eventDate.getDate() === day && 
                                   eventDate.getMonth() === currentCalendarMonth.getMonth() && 
                                   eventDate.getFullYear() === currentCalendarMonth.getFullYear();
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
                        {/* ✅ LOADING STATE */}
                        {calendarLoading ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                            color: '#6b7280',
                            fontSize: '11px'
                          }}>
                            <Clock size={14} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} />
                            Caricamento eventi...
                          </div>
                        ) : calendarError ? (
                          /* ❌ ERROR STATE */
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#ef4444',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}>
                            ⚠️ Errore nel caricamento eventi
                          </div>
                        ) : eventiCalendario.length === 0 ? (
                          /* 📅 EMPTY STATE */
                          <div style={{
                            background: 'rgba(156, 163, 175, 0.1)',
                            border: '1px solid rgba(156, 163, 175, 0.2)',
                            borderRadius: '8px',
                            padding: '16px',
                            color: '#6b7280',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}>
                            📅 Nessun evento programmato oggi
                          </div>
                        ) : (
                          /* ✅ EVENTI REALI DAL BACKEND */
                          eventiCalendario.slice(0, 3).map((evento) => (
                          <div key={evento.id} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderLeft: '3px solid #7B2CBF',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(8px)',
                            minHeight: '80px'
                          }}
                          onMouseEnter={(e) => {
                            const card = e.currentTarget;
                            const title = card.querySelector('.event-title') as HTMLElement;
                            const time = card.querySelector('.event-time') as HTMLElement;
                            const location = card.querySelector('.event-location') as HTMLElement;
                            
                            // Card animations - più evidenti con tema viola
                            card.style.background = 'rgba(123, 44, 191, 0.08)';
                            card.style.transform = 'translateY(-2px) scale(1.02)';
                            card.style.boxShadow = '0 8px 16px rgba(123, 44, 191, 0.3), 0 4px 8px rgba(0, 0, 0, 0.12)';
                            card.style.borderLeftWidth = '4px';
                            card.style.borderLeftColor = '#8339ff';
                            card.style.borderRightColor = 'rgba(123, 44, 191, 0.2)';
                            card.style.borderTopColor = 'rgba(123, 44, 191, 0.2)';
                            card.style.borderBottomColor = 'rgba(123, 44, 191, 0.2)';
                            
                            // Title animation
                            if (title) {
                              title.style.color = '#7B2CBF';
                              title.style.fontWeight = '700';
                              title.style.fontSize = '13px';
                            }
                            
                            // Time animation
                            if (time) {
                              time.style.color = '#8339ff';
                              time.style.fontWeight = '600';
                              time.style.fontSize = '11px';
                            }
                            
                            // Location badge animation
                            if (location) {
                              location.style.background = 'rgba(123, 44, 191, 0.2)';
                              location.style.color = '#7B2CBF';
                              location.style.transform = 'scale(1.05)';
                              location.style.padding = '2px 6px';
                              location.style.fontWeight = '600';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const card = e.currentTarget;
                            const title = card.querySelector('.event-title') as HTMLElement;
                            const time = card.querySelector('.event-time') as HTMLElement;
                            const location = card.querySelector('.event-location') as HTMLElement;
                            
                            // Reset card
                            card.style.background = 'rgba(255, 255, 255, 0.03)';
                            card.style.transform = 'translateY(0) scale(1)';
                            card.style.boxShadow = 'none';
                            card.style.borderLeftWidth = '3px';
                            card.style.borderLeftColor = '#7B2CBF';
                            card.style.borderRightColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderTopColor = 'rgba(255, 255, 255, 0.06)';
                            card.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
                            
                            // Reset title
                            if (title) {
                              title.style.color = '#1f2937';
                              title.style.fontWeight = '600';
                              title.style.fontSize = '12px';
                            }
                            
                            // Reset time
                            if (time) {
                              time.style.color = '#6b7280';
                              time.style.fontWeight = '400';
                              title.style.fontSize = '10px';
                            }
                            
                            // Reset location
                            if (location) {
                              location.style.background = 'rgba(255, 255, 255, 0.08)';
                              location.style.color = '#9ca3af';
                              location.style.transform = 'scale(1)';
                              location.style.padding = '1px 4px';
                              location.style.fontWeight = '400';
                            }
                          }}>
                            <div 
                              className="event-title"
                              style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1f2937',
                              marginBottom: '4px',
                              lineHeight: 1.3,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>{evento.titolo}</div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span 
                                className="event-time"
                                style={{
                                fontSize: '10px',
                                color: '#6b7280',
                                transition: 'all 0.3s ease'
                              }}>{evento.ora}</span>
                              <span 
                                className="event-location"
                                style={{
                                fontSize: '9px',
                                color: '#9ca3af',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'inline-block'
                              }}>{evento.location}</span>
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </div>

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

      {/* ChatBot AI Tippy - Assistente WindTre */}
      {user && (
        <ChatWidget 
          currentPage={location}
          currentModule={currentModule}
        />
      )}

      {/* Softphone Widget - Enterprise VoIP */}
      {user && <SoftphoneWidget />}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDetailOpen}
          onClose={() => setTaskDetailOpen(false)}
        />
      )}
    </div>
  );
}