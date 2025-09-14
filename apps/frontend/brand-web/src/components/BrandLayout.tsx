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
  Megaphone, Cog, Globe, Moon, Sun
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
      id: 'entities',
      name: 'Entità',
      icon: Building2,
      path: '/entities',
      description: 'Gestione cross-tenant'
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
    navigate(`/brandinterface${path}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/brandinterface/login');
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

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      
      {/* Header moderno con glassmorphism esatto W3 Suite */}
      <header style={{
        position: 'relative',
        zIndex: 50,
        background: 'hsla(255, 255, 255, 0.15)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              {currentNavItem?.name || 'Brand Interface'}
            </h1>
            {currentWorkspace && (
              <div style={{
                background: 'hsla(255, 255, 255, 0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <currentWorkspace.icon size={16} color={currentWorkspace.color} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                  {currentWorkspace.name}
                </span>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search con glassmorphism */}
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.6)'
              }} size={16} />
              <input
                type="text"
                placeholder="Cerca..."
                style={{
                  background: 'hsla(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px 12px 40px',
                  color: 'white',
                  fontSize: '14px',
                  width: '240px',
                  outline: 'none'
                }}
              />
            </div>
            
            {/* Notification button */}
            <button style={{
              background: 'hsla(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <Bell size={16} color="white" />
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                background: COLORS.primary.orange,
                borderRadius: '50%'
              }} />
            </button>
            
            {/* Settings button */}
            <button 
              onClick={() => handleNavigation('/settings')}
              style={{
                background: 'hsla(255, 255, 255, 0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer'
              }}
            >
              <Settings size={16} color="white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout - Struttura tre colonne esatta W3 Suite */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Sidebar - Navigation con auto-collapse */}
        <aside
          onMouseEnter={() => {
            if (leftSidebarCollapsed) {
              setLeftSidebarCollapsed(false);
            }
            if (leftSidebarTimer) {
              clearTimeout(leftSidebarTimer);
              setLeftSidebarTimer(null);
            }
          }}
          onMouseLeave={() => {
            if (!leftSidebarCollapsed) {
              if (leftSidebarTimer) {
                clearTimeout(leftSidebarTimer);
              }
              const timer = setTimeout(() => {
                setLeftSidebarCollapsed(true);
                setLeftSidebarTimer(null);
              }, 1500);
              setLeftSidebarTimer(timer);
            }
          }}
          style={{
            width: leftSidebarCollapsed ? '64px' : '256px',
            background: 'hsla(255, 255, 255, 0.15)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 8px'
          }}
        >
          {/* Brand header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '16px'
          }}>
            {!leftSidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'hsla(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '8px'
                }}>
                  <Shield size={20} color={COLORS.primary.purple} />
                </div>
                <div>
                  <h2 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Brand Interface
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: 0 }}>
                    Control Panel
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tenant context */}
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: isCrossTenant ? 'rgba(255, 105, 0, 0.1)' : 'rgba(123, 44, 191, 0.1)',
            borderRadius: '12px',
            border: `1px solid ${COLORS.glass.white}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={16} color={isCrossTenant ? COLORS.primary.orange : 'white'} />
              {!leftSidebarCollapsed && (
                <div>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    {isCrossTenant ? 'Cross-Tenant' : currentTenant || 'Tenant'}
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: 0 }}>
                    {isCrossTenant ? 'Tutti i tenant' : `ID: ${currentTenantId?.substring(0, 8) || 'N/A'}...`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation menu */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: leftSidebarCollapsed ? '0' : '12px',
                  padding: '12px',
                  background: location.endsWith(item.path) 
                    ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})` 
                    : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: location.endsWith(item.path) ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
                }}
              >
                <item.icon size={20} />
                {!leftSidebarCollapsed && (
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      {item.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* User profile */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
            position: 'relative'
          }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: leftSidebarCollapsed ? '0' : '12px',
                padding: '12px',
                background: 'hsla(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
              }}
            >
              <div style={{
                background: COLORS.primary.orange,
                borderRadius: '50%',
                padding: '6px'
              }}>
                <User size={16} />
              </div>
              {!leftSidebarCollapsed && (
                <>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      {user?.name || 'User'}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
                      {user?.role || 'Role'}
                    </p>
                  </div>
                  <ChevronDown size={16} style={{
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </>
              )}
            </button>

            {/* User menu dropdown */}
            {userMenuOpen && !leftSidebarCollapsed && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '8px',
                background: 'hsla(255, 255, 255, 0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={toggleTheme}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  Tema {isDark ? 'Chiaro' : 'Scuro'}
                </button>
                <button
                  onClick={() => handleNavigation('/settings')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <Settings size={16} />
                  Impostazioni
                </button>
                <div style={{
                  height: '1px',
                  background: COLORS.glass.white,
                  margin: '8px 0'
                }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: COLORS.semantic.error,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <LogOut size={16} />
                  Esci
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area - Identico W3 Suite */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: 'white',
          padding: '24px'
        }}>
          {children}
        </main>

        {/* Right Sidebar - Workspace con auto-collapse */}
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
              }, 1500);
              setWorkspaceTimer(timer);
            }
          }}
          style={{
            width: workspaceCollapsed ? '64px' : '320px',
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 8px'
          }}
        >
          {/* Workspace header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '16px'
          }}>
            {!workspaceCollapsed && (
              <h3 style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                fontWeight: 600,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                WORKSPACE
              </h3>
            )}
          </div>

          {/* Active workspace display */}
          {currentWorkspace && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: `linear-gradient(135deg, ${currentWorkspace.color}15, rgba(255, 255, 255, 0.1))`,
              borderRadius: '12px',
              border: `1px solid ${COLORS.glass.white}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: `${currentWorkspace.color}20`,
                  borderRadius: '8px',
                  padding: '8px'
                }}>
                  <currentWorkspace.icon size={16} color={currentWorkspace.color} />
                </div>
                {!workspaceCollapsed && (
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                      {currentWorkspace.name}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: 0 }}>
                      {currentWorkspace.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workspace list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!workspaceCollapsed && (
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 16px 0'
              }}>
                Aree Funzionali
              </p>
            )}
            
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceTabClick(ws.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: workspaceCollapsed ? '0' : '12px',
                  padding: '12px',
                  background: workspace === ws.id 
                    ? `${ws.color}20` 
                    : 'transparent',
                  border: workspace === ws.id 
                    ? `1px solid ${ws.color}40` 
                    : '1px solid transparent',
                  borderRadius: '12px',
                  color: workspace === ws.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  justifyContent: workspaceCollapsed ? 'center' : 'flex-start'
                }}
              >
                <div style={{
                  background: `${ws.color}20`,
                  borderRadius: '8px',
                  padding: '6px'
                }}>
                  <ws.icon size={16} color={workspace === ws.id ? ws.color : 'rgba(255, 255, 255, 0.8)'} />
                </div>
                {!workspaceCollapsed && (
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      {ws.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                      {ws.description}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Quick stats */}
          {!workspaceCollapsed && (
            <div style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0
              }}>
                Quick Stats
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'hsla(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.glass.white}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={14} color={COLORS.semantic.success} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>Tasks</span>
                  </div>
                  <span style={{
                    background: `${COLORS.semantic.success}20`,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    12
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'hsla(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.glass.white}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={14} color={COLORS.semantic.warning} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>Alerts</span>
                  </div>
                  <span style={{
                    background: `${COLORS.semantic.warning}20`,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    3
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'hsla(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.glass.white}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={14} color={COLORS.semantic.info} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>Users</span>
                  </div>
                  <span style={{
                    background: `${COLORS.semantic.info}20`,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    24
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}