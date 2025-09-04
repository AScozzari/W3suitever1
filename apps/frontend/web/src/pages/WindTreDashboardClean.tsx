import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { 
  User, Search, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock, Package,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench
} from 'lucide-react';
import { RealWorkspaceSidebar } from '../components/RealWorkspaceSidebar';

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
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'magazzino', label: 'Magazzino', icon: Package },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'gare', label: 'Gare', icon: FileText },
    { id: 'report', label: 'Report', icon: BarChart3 },
    { id: 'hr', label: 'HR', icon: Building },
    { id: 'cms', label: 'CMS', icon: Folder },
    { id: 'ai', label: 'AI Tools', icon: Zap },
    { id: 'settings', label: 'Impostazioni', icon: Wrench }
  ];

  const performanceData = [
    { value: '98.5%', label: 'Uptime', change: '+0.3%', positive: true },
    { value: '€147K', label: 'Ricavi Mese', change: '+12.5%', positive: true },
    { value: '2.3K', label: 'Nuovi Lead', change: '+8.2%', positive: true },
    { value: '89.4%', label: 'Customer Satisfaction', change: '-1.1%', positive: false }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)'
    }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        {/* Left - Logo e Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Menu size={20} />
          </button>
          
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            fontFamily: 'Inter, sans-serif'
          }}>W3 Suite</h1>
        </div>

        {/* Right - Search e Profilo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer'
          }}>
            <Search size={16} />
          </button>

          <button style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <Bell size={16} />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              background: '#FF6900',
              borderRadius: '50%'
            }} />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <User size={16} style={{ color: 'white' }} />
            <span style={{ color: 'white', fontSize: '14px' }}>
              {(user as any)?.email || 'Admin'}
            </span>
            <ChevronDown size={14} style={{ color: 'white' }} />
          </div>
        </div>
      </header>

      {/* Layout Container */}
      <div style={{ 
        display: 'flex', 
        paddingTop: isMobile ? '56px' : '64px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Sidebar sinistra */}
        <aside style={{
          position: isMobile ? 'static' : 'fixed',
          left: 0,
          top: isMobile ? '0' : '64px',
          height: isMobile ? 'auto' : 'calc(100vh - 64px)',
          width: isMobile ? '100%' : (leftSidebarCollapsed ? '64px' : '256px'),
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          zIndex: 40,
          padding: '16px 0'
        }}>
          <nav style={{ padding: '8px' }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentModule(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: leftSidebarCollapsed ? '0' : '12px',
                    padding: leftSidebarCollapsed ? '12px' : '12px 16px',
                    margin: '4px 0',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backdropFilter = 'blur(10px)';
                      (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(10px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.backdropFilter = 'none';
                      (e.currentTarget.style as any).WebkitBackdropFilter = 'none';
                    }
                  }}
                >
                  <Icon size={18} />
                  {(!leftSidebarCollapsed || isMobile) && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: isMobile ? '0' : (leftSidebarCollapsed ? '64px' : '256px'),
          marginRight: isMobile || isTablet ? '0' : '320px',
          padding: '24px',
          transition: 'all 0.3s ease',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {/* Performance Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr 1fr' : 'repeat(4, 1fr)'),
            gap: '16px',
            marginBottom: '32px'
          }}>
            {performanceData.map((stat, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <h3 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: 0
                  }}>{stat.value}</h3>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    margin: 0
                  }}>{stat.label}</p>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: stat.positive ? '#10b981' : '#ef4444'
                  }}>{stat.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dashboard Content */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr' : '2fr 1fr'),
            gap: '24px'
          }}>
            {/* Left Column - Charts */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '20px',
                margin: 0
              }}>Analytics Overview</h2>
              
              <div style={{
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <BarChart3 size={48} />
                <span style={{ marginLeft: '12px', fontSize: '16px' }}>
                  Chart Component Placeholder
                </span>
              </div>
            </div>

            {/* Right Column - Activity */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '20px',
                margin: 0
              }}>Attività Recenti</h2>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {[
                  { title: 'Nuovo ordine ricevuto', time: '5 min fa', icon: ShoppingBag },
                  { title: 'Meeting completato', time: '1h fa', icon: CheckCircle },
                  { title: 'Report generato', time: '2h fa', icon: FileText }
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(255, 105, 0, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={18} style={{ color: '#FF6900' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'white',
                          margin: '0 0 4px 0'
                        }}>{activity.title}</p>
                        <p style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          margin: 0
                        }}>{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Real Workspace Sidebar */}
        {!isMobile && !isTablet && (
          <RealWorkspaceSidebar onCollapseChange={setWorkspaceCollapsed} />
        )}
      </div>
    </div>
  );
}