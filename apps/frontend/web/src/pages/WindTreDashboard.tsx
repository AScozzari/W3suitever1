import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Tool
} from 'lucide-react';

export default function WindTreDashboard() {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(true);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const { data: dashboardStats } = useQuery({ queryKey: ["/api/dashboard/stats"] });

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
    { id: 'clienti', label: 'Clienti', icon: Users },
    { id: 'contratti', label: 'Contratti', icon: FileText },
    { id: 'fatturazione', label: 'Fatturazione', icon: DollarSign },
    { id: 'hr', label: 'Human Resources', icon: UserPlus },
    { id: 'amministrazione', label: 'Amministrazione', icon: Building },
    { id: 'cassa', label: 'Cassa', icon: ShoppingBag },
    { id: 'ai', label: 'AI Tools', icon: Zap },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings }
  ];

  // Azioni Rapide come da screenshot
  const azioniRapide = [
    {
      id: 'ricerca',
      title: 'Ricerca Cliente',
      subtitle: 'Trova per telefono o codice fiscale',
      color: '#FF6900',
      textColor: 'white',
      action: 'Cerca'
    },
    {
      id: 'contratto',
      title: 'Nuovo Contratto',
      subtitle: 'Attiva nuova linea o servizio',
      color: '#7B2CBF',
      textColor: 'white', 
      action: 'Attiva'
    },
    {
      id: 'fatture',
      title: 'Gestione Fatture',
      subtitle: 'Visualizza e gestisci fatturazione',
      color: '#E5E7EB',
      textColor: '#374151',
      action: 'Apri'
    },
    {
      id: 'ticket',
      title: 'Support Ticket',
      subtitle: 'Crea nuovo ticket di assistenza',
      color: '#E5E7EB',
      textColor: '#374151',
      action: 'Crea'
    }
  ];

  // Statistiche come da screenshot
  const statistiche = [
    {
      title: 'Clienti Attivi',
      value: '12,483',
      subtitle: 'Utenti registrati',
      trend: '+12.5%',
      trendUp: true,
      icon: Users,
      color: '#FF6900'
    },
    {
      title: 'Linee Mobile',
      value: '8,927',
      subtitle: 'Contratti attivi',
      trend: '+8.2%',
      trendUp: true,
      icon: Smartphone,
      color: '#7B2CBF'
    },
    {
      title: 'Connessioni Fibra',
      value: '3,556',
      subtitle: 'Installazioni attive',
      trend: '+2.1%',
      trendUp: true,
      icon: Wifi,
      color: '#10B981'
    },
    {
      title: 'Servizi Energia',
      value: '1,284',
      subtitle: 'Forniture attive',
      trend: '+24.3%',
      trendUp: true,
      icon: Zap,
      color: '#F59E0B'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative'
    }}>
      {/* Header fisso - Glassmorphism Enhanced */}
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
          {/* Windtre Milano - Hidden on mobile */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
              <span style={{ fontWeight: 500 }}>Windtre Milano</span>
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

          {/* Avatar utente */}
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
              {user?.email?.[0]?.toUpperCase() || 'A'}
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

      {/* Layout principale - Responsive */}
      <div style={{ 
        display: 'flex', 
        paddingTop: isMobile ? '56px' : '64px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Sidebar sinistra - Enhanced Glassmorphism */}
        <aside style={{
          position: isMobile ? 'static' : 'fixed',
          left: 0,
          top: isMobile ? '0' : '64px',
          height: isMobile ? 'auto' : 'calc(100vh - 64px)',
          width: isMobile ? '100%' : (leftSidebarCollapsed ? '64px' : '256px'),
          background: 'hsla(255, 255, 255, 0.12)',
          backdropFilter: 'blur(28px) saturate(150%)',
          WebkitBackdropFilter: 'blur(28px) saturate(150%)',
          borderRight: isMobile ? 'none' : '1px solid hsla(255, 255, 255, 0.25)',
          borderBottom: isMobile ? '1px solid hsla(255, 255, 255, 0.25)' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 40,
          display: isMobile && leftSidebarCollapsed ? 'none' : 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'visible',
          padding: isMobile ? '12px' : '0',
          boxShadow: isMobile ? 'none' : '8px 0 32px rgba(0, 0, 0, 0.06)'
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
          ) : (
            <div style={{ position: 'absolute', right: '-12px', top: '24px', zIndex: 50 }}>
              <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'hsla(0, 0%, 100%, 0.35)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {leftSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
              </button>
            </div>
          )}

          {/* Menu Items - Responsive */}
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
                      : 'hsla(255, 255, 255, 0.08)',
                    backdropFilter: leftSidebarCollapsed ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: leftSidebarCollapsed ? 'blur(12px)' : 'none',
                    border: leftSidebarCollapsed ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                    borderRadius: leftSidebarCollapsed ? '12px' : '12px',
                    color: isActive ? 'white' : '#374151',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: isActive ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '4px' : (leftSidebarCollapsed ? '0' : '12px'),
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    justifyContent: 'center',
                    boxShadow: leftSidebarCollapsed && !isActive ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (leftSidebarCollapsed && !isActive) {
                      e.currentTarget.style.background = 'hsla(25, 100%, 50%, 0.15)';
                      e.currentTarget.style.backdropFilter = 'blur(16px) saturate(200%)';
                      e.currentTarget.style.WebkitBackdropFilter = 'blur(16px) saturate(200%)';
                      e.currentTarget.style.color = '#FF6900';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (leftSidebarCollapsed && !isActive) {
                      e.currentTarget.style.background = 'hsla(255, 255, 255, 0.08)';
                      e.currentTarget.style.backdropFilter = 'blur(12px)';
                      e.currentTarget.style.WebkitBackdropFilter = 'blur(12px)';
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <Icon size={leftSidebarCollapsed && !isMobile ? 18 : (isMobile ? 16 : 20)} />
                  {(!leftSidebarCollapsed || isMobile) && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - Responsive */}
        <main style={{
          flex: 1,
          marginLeft: isMobile ? '0' : (leftSidebarCollapsed ? '64px' : '256px'),
          marginRight: isMobile ? '0' : (!workspaceCollapsed ? '320px' : '64px'),
          padding: isMobile ? '16px' : '24px',
          transition: 'all 0.3s ease',
          minHeight: isMobile ? 'calc(100vh - 120px)' : 'auto'
        }}>
          
          {/* Header principale con gradient come negli screenshots */}
          <div style={{
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            borderRadius: '24px',
            padding: isMobile ? '24px' : '32px',
            marginBottom: '24px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background decorativo */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-20%',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30%',
              left: '-10%',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '16px' : '0'
              }}>
                <div>
                  <h1 style={{
                    fontSize: isMobile ? '24px' : '32px',
                    fontWeight: 'bold',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2
                  }}>Dashboard Enterprise</h1>
                  <p style={{
                    fontSize: isMobile ? '14px' : '16px',
                    opacity: 0.9,
                    margin: 0,
                    lineHeight: 1.4
                  }}>Gestisci tutti i tuoi servizi WindTre da un'unica piattaforma</p>
                  
                  {/* Tags come negli screenshots */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>Tenant: Corporate</span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>Ultimo accesso: Oggi</span>
                  </div>
                </div>

                {/* Bottoni Report e Nuovo Cliente */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: isMobile ? 'column' : 'row',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <button style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    minWidth: isMobile ? '100%' : 'auto'
                  }}>
                    <Download size={16} />
                    Report
                  </button>
                  <button style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    color: '#FF6900',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    minWidth: isMobile ? '100%' : 'auto'
                  }}>
                    <Plus size={16} />
                    Nuovo Cliente
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sezione Azioni Rapide */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0
              }}>Azioni Rapide</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Filter size={14} />
                  Filtri
                </button>
                <button style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Search size={14} />
                  Ricerca
                </button>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '16px', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
            }}>
              {azioniRapide.map((azione) => (
                <div
                  key={azione.id}
                  style={{
                    background: azione.color,
                    borderRadius: '16px',
                    padding: isMobile ? '20px 16px' : '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 600,
                    color: azione.textColor,
                    margin: '0 0 8px 0',
                    lineHeight: 1.3
                  }}>{azione.title}</h3>
                  <p style={{
                    fontSize: isMobile ? '12px' : '14px',
                    color: azione.textColor,
                    opacity: 0.8,
                    margin: '0 0 16px 0',
                    lineHeight: 1.4
                  }}>{azione.subtitle}</p>
                  <button style={{
                    background: azione.color === '#E5E7EB' 
                      ? 'rgba(55, 65, 81, 0.1)' 
                      : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: azione.textColor,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    {azione.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiche Generali */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>Statistiche Generali</h2>
            
            <div style={{ 
              display: 'grid', 
              gap: isMobile ? '16px' : '24px', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
            }}>
              {statistiche.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.title}
                    style={{
                      background: 'hsla(0, 0%, 100%, 0.6)',
                      backdropFilter: 'blur(16px)',
                      borderRadius: '16px',
                      padding: isMobile ? '20px' : '24px',
                      border: '1px solid hsla(0, 0%, 100%, 0.18)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: `${stat.color}15`,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={20} style={{ color: stat.color }} />
                      </div>
                      <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
                    </div>
                    
                    <h3 style={{
                      fontSize: isMobile ? '12px' : '14px',
                      fontWeight: 500,
                      color: '#6b7280',
                      margin: '0 0 4px 0'
                    }}>{stat.title}</h3>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 'bold',
                        color: '#1f2937'
                      }}>{stat.value}</span>
                      <span style={{
                        background: stat.trendUp 
                          ? 'rgba(16, 185, 129, 0.1)' 
                          : 'rgba(239, 68, 68, 0.1)',
                        color: stat.trendUp ? '#10b981' : '#ef4444',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {stat.trend}
                      </span>
                    </div>
                    
                    <p style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      margin: 0
                    }}>{stat.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analytics e Reports come da screenshot */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>Analytics e Reports</h2>
            
            <div style={{
              display: 'grid',
              gap: '24px',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              {/* Andamento Ricavi */}
              <div style={{
                background: 'hsla(0, 0%, 100%, 0.6)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid hsla(0, 0%, 100%, 0.18)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: '0 0 4px 0'
                    }}>Andamento Ricavi</h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>Fatturato mensile per servizio</p>
                  </div>
                  <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>€2.4M</span>
                  <span style={{
                    background: 'rgba(123, 44, 191, 0.1)',
                    color: '#7B2CBF',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>+15.2% vs mese scorso</span>
                </div>

                {/* Placeholder grafico */}
                <div style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.05), rgba(123, 44, 191, 0.05))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #d1d5db'
                }}>
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <BarChart size={48} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Grafico in sviluppo</p>
                    <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
                  </div>
                </div>
              </div>

              {/* Distribuzione Clienti */}
              <div style={{
                background: 'hsla(0, 0%, 100%, 0.6)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid hsla(0, 0%, 100%, 0.18)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: '0 0 4px 0'
                    }}>Distribuzione Clienti</h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>Per tipologia di servizio</p>
                  </div>
                  <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>12,483</span>
                  <button style={{
                    background: 'rgba(123, 44, 191, 0.1)',
                    color: '#7B2CBF',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer'
                  }}>Clienti totali</button>
                </div>

                {/* Placeholder grafico */}
                <div style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.05), rgba(16, 185, 129, 0.05))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #d1d5db'
                }}>
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <BarChart size={48} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Grafico in sviluppo</p>
                    <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metriche Performance come da screenshot */}
          <div style={{
            display: 'grid',
            gap: '24px',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            marginBottom: '32px'
          }}>
            {/* Performance Rete */}
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0
                }}>Performance Rete</h3>
                <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 16px 0'
              }}>Uptime e velocità media</p>
              
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>99.9%</span>
                <button style={{
                  background: 'rgba(123, 44, 191, 0.1)',
                  color: '#7B2CBF',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer'
                }}>Uptime medio</button>
              </div>

              {/* Placeholder grafico */}
              <div style={{
                height: '120px',
                background: 'rgba(123, 44, 191, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #d1d5db'
              }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <BarChart size={32} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', margin: 0 }}>Grafico in sviluppo</p>
                  <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
                </div>
              </div>
            </div>

            {/* Nuove Attivazioni */}
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0
                }}>Nuove Attivazioni</h3>
                <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 16px 0'
              }}>Trend settimanale</p>
              
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>284</span>
                <button style={{
                  background: 'rgba(255, 105, 0, 0.1)',
                  color: '#FF6900',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer'
                }}>+12% questa settimana</button>
              </div>

              {/* Placeholder grafico */}
              <div style={{
                height: '120px',
                background: 'rgba(255, 105, 0, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #d1d5db'
              }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <BarChart size={32} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', margin: 0 }}>Grafico in sviluppo</p>
                  <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
                </div>
              </div>
            </div>

            {/* Ticket Support */}
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0
                }}>Ticket Support</h3>
                <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 16px 0'
              }}>Stato delle richieste</p>
              
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>42</span>
                <button style={{
                  background: 'rgba(123, 44, 191, 0.1)',
                  color: '#7B2CBF',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer'
                }}>Aperti: 12, Risolti: 30</button>
              </div>

              {/* Placeholder grafico */}
              <div style={{
                height: '120px',
                background: 'rgba(123, 44, 191, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #d1d5db'
              }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <BarChart size={32} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', margin: 0 }}>Grafico in sviluppo</p>
                  <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attività Recenti */}
          <div>
            <h2 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>Attività Recenti</h2>
            
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
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
                }}>Ultime Operazioni</h3>
                <button style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}>Dettagli</button>
              </div>
              
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 20px 0'
              }}>Le attività più recenti del tuo tenant</p>

              {/* Timeline attività */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 0',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: 500,
                  minWidth: '48px'
                }}>10:30</div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 4px 0'
                  }}>Nuovo cliente attivato</p>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: 0
                  }}>Mario Rossi - Contratto fibra domestica</p>
                </div>
                <button style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}>Dettagli</button>
              </div>

              {/* Messaggio placeholder per più attività */}
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#6b7280'
              }}>
                <Activity size={24} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}>Timeline attività in sviluppo</p>
                <p style={{ fontSize: '12px', margin: 0 }}>Qui verranno visualizzate tutte le operazioni recenti</p>
              </div>
            </div>
          </div>
        </main>

        {/* Workspace Sidebar destra - Desktop only */}
        {!isMobile && !isTablet && (
          <aside style={{
            position: 'fixed',
            right: 0,
            top: '64px',
            height: 'calc(100vh - 64px)',
            width: workspaceCollapsed ? '64px' : '320px',
            background: 'hsla(0, 0%, 100%, 0.35)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid hsla(0, 0%, 100%, 0.18)',
            transition: 'all 0.3s ease',
            zIndex: 40,
            overflowY: 'auto'
          }}>
            {/* Toggle Button */}
            <div style={{ position: 'absolute', left: '-12px', top: '24px', zIndex: 50 }}>
              <button
                onClick={() => setWorkspaceCollapsed(!workspaceCollapsed)}
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'hsla(0, 0%, 100%, 0.35)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {workspaceCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>

            {workspaceCollapsed ? (
              <div style={{ 
                padding: '24px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Icona Calendario */}
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }} onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#1f2937';
                }} onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}>
                  <Calendar size={18} />
                </button>
                {/* Icona Tasks */}
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }} onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#1f2937';
                }} onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}>
                  <CheckCircle size={18} />
                </button>
                {/* Icona Leads */}
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }} onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#1f2937';
                }} onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}>
                  <Users size={18} />
                </button>
              </div>
            ) : (
              <div style={{ padding: '24px 16px' }}>
                {/* Header Workspace */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid hsla(0, 0%, 100%, 0.18)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, #7B2CBF, #a855f7)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>W</div>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0
                    }}>Workspace</h3>
                  </div>
                </div>

                {/* Tabs come negli screenshots */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '4px',
                  marginBottom: '20px'
                }}>
                  {['Tasks', 'Calendario', 'Leads'].map((tab, index) => (
                    <button
                      key={tab}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: index === 0 ? 'white' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: index === 0 ? 600 : 400,
                        color: index === 0 ? '#1f2937' : '#6b7280',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Le mie attività */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0
                    }}>Le mie attività</h4>
                    <span style={{
                      background: '#FF6900',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>4 attive</span>
                  </div>

                  {/* Task items come negli screenshots */}
                  {[
                    {
                      title: 'Follow-up cliente Premium',
                      subtitle: 'Chiamata Mario Rossi per rinnovo contratto Enterprise',
                      time: '5 set',
                      status: 'Alta',
                      statusColor: '#ef4444'
                    },
                    {
                      title: 'Preparare documentazione',
                      subtitle: 'Contratto fibra ottica per Laura Bianchi',
                      time: 'Domani',
                      status: 'Media',
                      statusColor: '#f59e0b'
                    },
                    {
                      title: 'Verifica pagamento',
                      subtitle: 'Contratto fattura cliente Giuseppe Verdi - € 89.99',
                      time: 'Ven 06',
                      status: 'Bassa',
                      statusColor: '#7B2CBF'
                    },
                    {
                      title: 'Attivazione servizi',
                      subtitle: 'Nuovo contratto mobile 5G + fibra 1000 mega',
                      time: 'Ven 06',
                      status: 'Alta',
                      statusColor: '#ef4444'
                    }
                  ].map((task, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          background: '#10b981',
                          borderRadius: '50%',
                          marginTop: '6px',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1f2937',
                            margin: '0 0 4px 0',
                            lineHeight: 1.3
                          }}>{task.title}</h5>
                          <p style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            margin: '0 0 8px 0',
                            lineHeight: 1.3
                          }}>{task.subtitle}</p>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              fontSize: '10px',
                              color: '#9ca3af'
                            }}>{task.time}</span>
                            <span style={{
                              background: task.statusColor,
                              color: 'white',
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '6px'
                            }}>{task.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calendario come negli screenshots */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{
                      fontSize: '14px',
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
                    }}>16 eventi totali</span>
                  </div>

                  {/* Mini calendario placeholder */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937'
                      }}>Settembre 2025</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <ChevronLeft size={16} style={{ cursor: 'pointer', color: '#6b7280' }} />
                        <ChevronRight size={16} style={{ cursor: 'pointer', color: '#6b7280' }} />
                      </div>
                    </div>

                    {/* Calendar grid placeholder */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      marginBottom: '16px'
                    }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div
                          key={day}
                          style={{
                            textAlign: 'center',
                            fontSize: '10px',
                            color: '#9ca3af',
                            fontWeight: 600,
                            padding: '4px'
                          }}
                        >
                          {day}
                        </div>
                      ))}
                      {/* Date cells placeholder */}
                      {Array.from({ length: 35 }, (_, i) => {
                        const day = i - 6;
                        const isCurrentMonth = day > 0 && day <= 30;
                        const isToday = day === 4;
                        return (
                          <div
                            key={i}
                            style={{
                              textAlign: 'center',
                              fontSize: '11px',
                              padding: '6px 2px',
                              borderRadius: '6px',
                              color: isCurrentMonth ? '#1f2937' : '#d1d5db',
                              background: isToday ? '#FF6900' : 'transparent',
                              fontWeight: isToday ? 600 : 400,
                              cursor: isCurrentMonth ? 'pointer' : 'default'
                            }}
                          >
                            {isCurrentMonth ? day : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Eventi oggi */}
                    <div>
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: '0 0 8px 0'
                      }}>Eventi per giovedì 4 settembre 2025</p>
                      <p style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        margin: '0 0 12px 0'
                      }}>Nessun evento programmato per questa data</p>

                      <div style={{
                        borderTop: '1px solid #f3f4f6',
                        paddingTop: '12px'
                      }}>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1f2937',
                          margin: '0 0 8px 0'
                        }}>Prossimi eventi</p>
                        <p style={{
                          fontSize: '11px',
                          color: '#FF6900',
                          margin: '0 0 4px 0'
                        }}>📅 04/09 - 11/09</p>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 105, 0, 0.1)',
                          borderRadius: '8px',
                          padding: '8px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#FF6900',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'white',
                            fontWeight: 600
                          }}>MR</div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#1f2937',
                              margin: '0 0 2px 0'
                            }}>Riunione Team Vendite Q1</p>
                            <p style={{
                              fontSize: '10px',
                              color: '#6b7280',
                              margin: 0
                            }}>Revisione obiettivi Q1 e pianificazione...</p>
                          </div>
                          <Star size={12} style={{ color: '#f59e0b' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}