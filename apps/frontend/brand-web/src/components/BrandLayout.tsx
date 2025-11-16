import React, { useState, useEffect } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'wouter';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench,
  LogOut, HelpCircle, MapPin, UserCircle, Store, Building2,
  Megaphone, Cog, Globe, Moon, Sun, Brain, Package, GitBranch
} from 'lucide-react';

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

interface BrandLayoutProps {
  children: React.ReactNode;
}

export default function BrandLayout({ children }: BrandLayoutProps) {
  const { user, logout, workspace, setWorkspace } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();
  const { isDark, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  
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
    setWorkspace(tab);
    // Se il workspace era collapsed, espandilo senza timer automatico
    if (workspaceCollapsed) {
      setWorkspaceCollapsed(false);
    }
    // NO click-based auto-collapse timer - solo hover-only behavior
  };

  // Navigation items for Brand Interface
  const navigationItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      description: 'Overview generale'
    },
    {
      id: 'crm',
      name: 'CRM',
      icon: Users,
      path: '/crm',
      description: 'Gestione clienti'
    },
    {
      id: 'wms-catalog',
      name: 'Prodotti e Listini',
      icon: Package,
      path: '/wms/catalog',
      description: 'Catalogo master prodotti WMS'
    },
    {
      id: 'deploy-center',
      name: 'Deploy Center',
      icon: GitBranch,
      path: '/deploy-center',
      description: 'Gestione deployment CRM/WMS/POS/Analytics'
    },
    {
      id: 'ai-management',
      name: 'AI Management',
      icon: Brain,
      path: '/ai-management',
      description: 'Gestione agenti AI centralizzata'
    },
    {
      id: 'management',
      name: 'Gestione',
      icon: Building2,
      path: '/management',
      description: 'Gestione enterprise multi-tenant'
    }
  ];

  // Workspace sections exactly like W3 Suite structure
  const workspaces = [
    {
      id: 'marketing',
      name: 'Marketing',
      icon: Megaphone,
      description: 'Campagne e comunicazione',
      color: COLORS.primary.purple
    },
    {
      id: 'sales',
      name: 'Vendite',
      icon: TrendingUp,
      description: 'Listini e supporto vendite',
      color: COLORS.primary.orange
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Cog,
      description: 'Gestione operativa',
      color: COLORS.semantic.success
    },
    {
      id: 'admin',
      name: 'Amministrazione',
      icon: Shield,
      description: 'Tenant e configurazioni',
      color: COLORS.primary.purpleLight
    }
  ];

  const currentWorkspace = workspaces.find(w => w.id === workspace);
  const currentNavItem = navigationItems.find(item => location.endsWith(item.path));

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Responsive detection like W3 Suite
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize collapsed on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setLeftSidebarCollapsed(true);
      setWorkspaceCollapsed(true);
    }
  }, [isMobile, isTablet]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative'
    }}>
      
      {/* Header fisso - Glassmorphism Enhanced - EXACT COPY FROM W3 SUITE */}
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
          {/* Hamburger menu for mobile */}
          {isMobile && (
            <button
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu size={20} />
            </button>
          )}
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
          }}>B</div>
          {!isMobile && (
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1 }}>Brand Interface</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1 }}>Control Panel</p>
            </div>
          )}
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
                placeholder="Cerca tenant, store, utenti..."
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
              {user?.email?.[0]?.toUpperCase() || 'A'}
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
                    {user?.name || 'Utente'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {user?.email || 'admin@brandinterface.com'}
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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

      {/* Layout principale - Responsive - EXACT COPY FROM W3 SUITE */}
      <div style={{ 
        display: 'flex', 
        paddingTop: isMobile ? '56px' : '64px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* Sidebar sinistra - Smart Hover Glassmorphism - EXACT COPY FROM W3 SUITE */}
        <aside 
          onMouseEnter={() => {
            if (!isMobile && leftSidebarCollapsed) {
              setLeftSidebarCollapsed(false);
            }
            if (leftSidebarTimer) {
              clearTimeout(leftSidebarTimer);
              setLeftSidebarTimer(null);
            }
          }}
          onMouseLeave={() => {
            if (!isMobile && !leftSidebarCollapsed) {
              if (leftSidebarTimer) {
                clearTimeout(leftSidebarTimer);
              }
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
          }}
        >
          {/* Navigation */}
          <nav style={{ 
            padding: '16px 12px',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? '8px' : '4px',
            flex: 1,
            whiteSpace: isMobile ? 'nowrap' : 'normal'
          }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.endsWith(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isActive 
                      ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
                      : 'transparent',
                    borderRadius: '8px',
                    color: isActive ? 'white' : '#374151',
                    transition: 'all 0.2s ease',
                    border: 'none',
                    cursor: 'pointer',
                    width: isMobile ? 'auto' : '100%',
                    minWidth: isMobile ? '120px' : 'auto',
                    textAlign: 'left',
                    whiteSpace: isMobile ? 'nowrap' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ 
                    minWidth: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} color={isActive ? 'white' : '#6b7280'} />
                  </div>
                  {!leftSidebarCollapsed && (
                    <span style={{ 
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 400
                    }}>
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - EXACT margins from W3 Suite */}
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

        {/* Workspace Sidebar destra - Hidden on mobile/tablet - EXACT COPY FROM W3 SUITE */}
        {!isMobile && !isTablet && (
          <aside 
            onMouseEnter={() => {
              if (workspaceCollapsed) {
                setWorkspaceCollapsed(false);
              }
              if (workspaceTimer) {
                clearTimeout(workspaceTimer);
                setWorkspaceTimer(null);
              }
            }}
            onMouseLeave={() => {
              if (!workspaceCollapsed) {
                if (workspaceTimer) {
                  clearTimeout(workspaceTimer);
                }
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
            }}
          >
            {workspaceCollapsed ? (
              <div style={{
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                {workspaces.map((ws) => {
                  const Icon = ws.icon;
                  const isActive = workspace === ws.id;
                  
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleWorkspaceTabClick(ws.id)}
                      style={{
                        width: '40px',
                        height: '40px',
                        background: isActive 
                          ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`
                          : 'transparent',
                        border: 'none',
                        borderRadius: '12px',
                        color: isActive ? 'white' : '#6b7280',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
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
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleWorkspaceTabClick(ws.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: workspace === ws.id 
                          ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})` 
                          : 'transparent',
                        color: workspace === ws.id ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>

                {/* Workspace content based on selection */}
                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  overflowX: 'visible',
                  paddingRight: '8px',
                  marginRight: '-8px'
                }}>
                  {currentWorkspace && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <currentWorkspace.icon size={20} color={currentWorkspace.color} />
                        <h4 style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1f2937',
                          margin: 0
                        }}>{currentWorkspace.name}</h4>
                      </div>
                      <p style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        {currentWorkspace.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}