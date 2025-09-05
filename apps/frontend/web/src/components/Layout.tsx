import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench
} from 'lucide-react';

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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('Tasks');
  
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      if (width < 1024) {
        setLeftSidebarCollapsed(true);
        setWorkspaceCollapsed(true);
      } else {
        setWorkspaceCollapsed(false);
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    const handleUserActivity = () => {
      setLastInteraction(Date.now());
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastInteraction;
      
      if (inactiveTime > 30000 && !isMobile && !isTablet) {
        if (!leftSidebarCollapsed) setLeftSidebarCollapsed(true);
        if (!workspaceCollapsed) setWorkspaceCollapsed(true);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    const inactivityTimer = setInterval(checkInactivity, 5000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      clearInterval(inactivityTimer);
    };
  }, [lastInteraction, leftSidebarCollapsed, workspaceCollapsed, isMobile, isTablet]);

  useEffect(() => {
    return () => {
      if (leftSidebarTimer) clearTimeout(leftSidebarTimer);
      if (workspaceTimer) clearTimeout(workspaceTimer);
    };
  }, [leftSidebarTimer, workspaceTimer]);

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clienti', label: 'Clienti', icon: Users },
    { id: 'contratti', label: 'Contratti', icon: FileText },
    { id: 'fatturazione', label: 'Fatturazione', icon: DollarSign },
    { id: 'hr', label: 'Human Resources', icon: UserPlus },
    { id: 'amministrazione', label: 'Amministrazione', icon: Building },
    { id: 'cassa', label: 'Cassa', icon: ShoppingBag },
    { id: 'ai', label: 'AI Tools', icon: Zap },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative'
    }}>
      {/* Header fisso */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
              <span style={{ fontWeight: 500 }}>Windtre Milano</span>
            </div>
          )}

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            }}>
              {(user as any)?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            {!isMobile && (
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ 
        display: 'flex', 
        paddingTop: isMobile ? '56px' : '64px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* Sidebar sinistra */}
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

        <aside 
          onMouseEnter={() => {
            if (!isMobile && leftSidebarCollapsed) {
              setLeftSidebarCollapsed(false);
              setLastInteraction(Date.now());
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
              }, 1500);
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
              const isActive = currentModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentModule(item.id)}
                  style={{
                    width: isMobile ? 'auto' : (leftSidebarCollapsed ? '40px' : '100%'),
                    height: leftSidebarCollapsed && !isMobile ? '40px' : 'auto',
                    minWidth: isMobile ? '80px' : 'auto',
                    padding: isMobile ? '12px' : (leftSidebarCollapsed ? '12px' : '12px 16px'),
                    marginBottom: isMobile ? '0' : (leftSidebarCollapsed ? '0' : '8px'),
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                      : 'transparent',
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
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <Icon size={leftSidebarCollapsed && !isMobile ? 18 : (isMobile ? 16 : 20)} />
                  </div>
                  {!leftSidebarCollapsed && !isMobile && (
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  )}
                  {isMobile && (
                    <span style={{ 
                      fontSize: '10px', 
                      lineHeight: 1.2,
                      textAlign: 'center' 
                    }}>{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
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

        {/* Workspace Sidebar destra */}
        {!isMobile && !isTablet && (
          <aside 
            onMouseEnter={() => {
              if (workspaceCollapsed) {
                setWorkspaceCollapsed(false);
                setLastInteraction(Date.now());
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
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={18} />
                </button>
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={18} />
                </button>
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={18} />
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
                  <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
                    Workspace in sviluppo
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}