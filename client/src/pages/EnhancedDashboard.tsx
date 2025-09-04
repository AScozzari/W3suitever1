import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../contexts/ThemeContext";
import { 
  LayoutDashboard, 
  CreditCard, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  Search,
  Bell,
  Calendar,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Activity,
  Plus,
  Download,
  Filter,
  User,
  Phone,
  Wifi,
  Zap,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'clienti', label: 'Clienti', icon: Users, href: '/clienti' },
  { id: 'contratti', label: 'Contratti', icon: Package, href: '/contratti' },
  { id: 'fatturazione', label: 'Fatturazione', icon: CreditCard, href: '/fatturazione' },
  { id: 'hr', label: 'Human Resources', icon: Users, href: '/hr' },
  { id: 'amministrazione', label: 'Amministrazione', icon: Settings, href: '/amministrazione' },
  { id: 'cassa', label: 'Cassa', icon: CreditCard, href: '/cassa' },
  { id: 'ai', label: 'AI Tools', icon: Zap, href: '/ai' },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings, href: '/impostazioni' },
];

const tasks = [
  { 
    id: 1, 
    title: 'Follow-up cliente Premium', 
    description: 'Chiamare Mario Rossi per rinnovo contratto Enterprise',
    priority: 'high',
    time: '15:00'
  },
  { 
    id: 2, 
    title: 'Preparare documentazione', 
    description: 'Contratto fibra ottica per Laura Bianchi',
    priority: 'medium',
    time: '16:00'
  },
  { 
    id: 3, 
    title: 'Verifica pagamento', 
    description: 'Contratto fattura cliente Giuseppe Verdi',
    priority: 'low',
    time: '17:30'
  },
  { 
    id: 4, 
    title: 'Attivazione servizi', 
    description: 'Nuovo contratto mobile SG - fibra',
    priority: 'high',
    time: '18:00'
  },
];

const stats = [
  {
    title: 'Clienti Attivi',
    value: '12,483',
    description: 'Utenti registrati',
    trend: 'up' as const,
    trendValue: '+12.5%',
    icon: Users,
    variant: 'orange' as const,
  },
  {
    title: 'Linee Mobile',
    value: '8,927',
    description: 'Contratti attivi',
    trend: 'up' as const,
    trendValue: '+8.2%',
    icon: Phone,
    variant: 'purple' as const,
  },
  {
    title: 'Connessioni Fibra',
    value: '3,556',
    description: 'Installazioni attive',
    trend: 'stable' as const,
    trendValue: '+2.1%',
    icon: Wifi,
    variant: 'success' as const,
  },
  {
    title: 'Servizi Energia',
    value: '1,284',
    description: 'Forniture attive',
    trend: 'up' as const,
    trendValue: '+24.3%',
    icon: Zap,
    variant: 'warning' as const,
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#6b7280';
    default: return '#6b7280';
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Bassa';
    default: return 'Normale';
  }
};

export default function EnhancedDashboard() {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(true);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const { data: dashboardStats } = useQuery({ queryKey: ["/api/dashboard/stats"] });

  const isMobile = window.innerWidth < 768;

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
        height: '64px',
        background: 'hsla(0, 0%, 100%, 0.35)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid hsla(0, 0%, 100%, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        padding: '0 24px',
        zIndex: 50
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
            justifyContent: 'center'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>W</span>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF6900', margin: 0, lineHeight: 1 }}>WindTre Suite</h1>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1 }}>Multitenant Dashboard</p>
          </div>
        </div>

        {/* Barra di ricerca centrale */}
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

        {/* Sezione destra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Windtre Milano */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
            <span style={{ fontWeight: 500 }}>Windtre Milano</span>
          </div>

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
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '20px',
              height: '20px',
              background: '#FF6900',
              color: 'white',
              borderRadius: '50%',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>3</span>
          </button>

          {/* Profilo utente */}
          <button style={{
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #7B2CBF, #9d44c0)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={16} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Admin</span>
          </button>
        </div>
      </header>

      {/* Layout principale */}
      <div style={{ display: 'flex', paddingTop: '64px' }}>
        {/* Sidebar sinistra */}
        <aside style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          height: 'calc(100vh - 64px)',
          width: leftSidebarCollapsed ? '64px' : '256px',
          background: 'hsla(0, 0%, 100%, 0.35)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid hsla(0, 0%, 100%, 0.18)',
          transition: 'all 0.3s ease',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Toggle Button */}
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

          {/* Menu Items */}
          <nav style={{ padding: '16px', flexGrow: 1 }}>
            {menuItems.map((item) => {
              const isActive = currentModule === item.id;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentModule(item.id)}
                  style={{
                    width: '100%',
                    padding: leftSidebarCollapsed ? '12px' : '12px 16px',
                    marginBottom: '8px',
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                      : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    color: isActive ? 'white' : '#374151',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    justifyContent: leftSidebarCollapsed ? 'center' : 'flex-start'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'hsla(18, 100%, 50%, 0.1)';
                      e.currentTarget.style.color = '#FF6900';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                >
                  <Icon size={20} style={{ flexShrink: 0 }} />
                  {!leftSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          {!leftSidebarCollapsed && (
            <div style={{ padding: '16px', borderTop: '1px solid hsla(0, 0%, 100%, 0.18)' }}>
              <div style={{
                background: 'hsla(0, 0%, 100%, 0.25)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #7B2CBF, #9d44c0)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>AU</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Admin User</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Tenant: Corporate</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: leftSidebarCollapsed ? '64px' : '256px',
          marginRight: !isMobile && !workspaceCollapsed ? '320px' : (!isMobile ? '64px' : '0'),
          padding: '24px',
          transition: 'all 0.3s ease'
        }}>
          {/* Hero Section */}
          <div style={{
            marginBottom: '32px',
            overflow: 'hidden',
            borderRadius: '16px',
            position: 'relative'
          }}>
            <div style={{
              height: '192px',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.1)'
              }} />
              <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '32px',
                height: '100%',
                color: 'white'
              }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    Dashboard Enterprise
                  </h1>
                  <p style={{ fontSize: '18px', opacity: 0.9, margin: 0 }}>
                    Gestisci tutti i tuoi servizi WindTre da un'unica piattaforma
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Tenant: Corporate
                    </span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Ultimo accesso: Oggi
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}>
                    <Download size={16} />
                    Report
                  </button>
                  <button style={{
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    <Plus size={16} />
                    Nuovo Cliente
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Azioni Rapide</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}>
                  <Filter size={14} />
                  Filtri
                </button>
                <button style={{
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}>
                  <Search size={14} />
                  Ricerca
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {[
                { 
                  title: 'Ricerca Cliente', 
                  desc: 'Trova per telefono o codice fiscale', 
                  action: 'Cerca', 
                  bgColor: 'linear-gradient(135deg, rgba(255, 105, 0, 0.2), rgba(255, 105, 0, 0.1))',
                  buttonColor: '#FF6900'
                },
                { 
                  title: 'Nuovo Contratto', 
                  desc: 'Attiva nuova linea o servizio', 
                  action: 'Attiva', 
                  bgColor: 'linear-gradient(135deg, rgba(123, 44, 191, 0.2), rgba(123, 44, 191, 0.1))',
                  buttonColor: '#7B2CBF'
                },
                { 
                  title: 'Gestione Fatture', 
                  desc: 'Visualizza e gestisci fatturazione', 
                  action: 'Apri', 
                  bgColor: 'hsla(0, 0%, 100%, 0.35)',
                  buttonColor: '#6b7280'
                },
                { 
                  title: 'Support Ticket', 
                  desc: 'Crea nuovo ticket di assistenza', 
                  action: 'Crea', 
                  bgColor: 'hsla(0, 0%, 100%, 0.35)',
                  buttonColor: '#6b7280'
                },
              ].map((item, index) => (
                <div key={index} style={{
                  background: item.bgColor,
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '12px',
                  padding: '16px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px 0' }}>{item.desc}</p>
                  <button style={{
                    width: '100%',
                    background: item.buttonColor,
                    color: 'white',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0' }}>Statistiche Generali</h2>
            <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {stats.map((stat) => {
                const Icon = stat.icon;
                const getIconColor = () => {
                  switch (stat.variant) {
                    case 'orange': return '#FF6900';
                    case 'purple': return '#7B2CBF';
                    case 'success': return '#10b981';
                    case 'warning': return '#f59e0b';
                    default: return '#6b7280';
                  }
                };

                return (
                  <div key={stat.title} style={{
                    background: 'hsla(0, 0%, 100%, 0.35)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid hsla(0, 0%, 100%, 0.18)',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{stat.title}</h3>
                      <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: `${getIconColor()}10`,
                        color: getIconColor()
                      }}>
                        <Icon size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{stat.value}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{stat.description}</span>
                      {stat.trend === 'up' && <TrendingUp size={14} style={{ color: '#10b981' }} />}
                      {stat.trend === 'down' && <TrendingDown size={14} style={{ color: '#ef4444' }} />}
                      <span style={{
                        background: stat.trend === 'up' ? '#10b981' : stat.trend === 'down' ? '#ef4444' : '#6b7280',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {stat.trendValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0' }}>Attività Recenti</h2>
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.35)',
              backdropFilter: 'blur(16px)',
              border: '1px solid hsla(0, 0%, 100%, 0.18)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Ultime Operazioni</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>Le attività più recenti del tuo tenant</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { time: '10:30', action: 'Nuovo cliente attivato', user: 'Mario Rossi', type: 'success' },
                  { time: '09:15', action: 'Contratto fibra modificato', user: 'Luigi Bianchi', type: 'default' },
                  { time: '08:45', action: 'Fattura generata', user: 'Anna Verdi', type: 'default' },
                  { time: '07:20', action: 'Ticket risolto', user: 'Paolo Neri', type: 'success' },
                ].map((activity, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'hsla(0, 0%, 100%, 0.25)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        background: activity.type === 'success' ? '#10b981' : '#6b7280',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {activity.time}
                      </span>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{activity.action}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Cliente: {activity.user}</p>
                      </div>
                    </div>
                    <button style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}>
                      Dettagli
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Workspace Sidebar destra */}
        {!isMobile && (
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

            {!workspaceCollapsed && (
              <div style={{ padding: '16px' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#7B2CBF', margin: '0 0 4px 0' }}>Workspace</h2>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>La mie attività</p>
                </div>

                {/* Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '4px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <button style={{
                    flex: 1,
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <CheckSquare size={14} />
                    Tasks
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={14} />
                    Calendario
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <TrendingUp size={14} />
                    Leads
                  </button>
                </div>

                {/* Tasks Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>La mie attività</h3>
                    <span style={{
                      background: '#e5e7eb',
                      color: '#374151',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>4 attive</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tasks.map((task) => (
                      <div key={task.id} style={{
                        background: 'hsla(0, 0%, 100%, 0.25)',
                        border: '1px solid hsla(0, 0%, 100%, 0.18)',
                        borderRadius: '8px',
                        padding: '12px',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
                            {task.title}
                          </h4>
                          <span style={{
                            background: getPriorityColor(task.priority),
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                          {task.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} style={{ color: '#6b7280' }} />
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{task.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 12px 0' }}>Quick Stats</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{
                      background: 'hsla(0, 0%, 100%, 0.25)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF6900' }}>24</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Task oggi</div>
                    </div>
                    <div style={{
                      background: 'hsla(0, 0%, 100%, 0.25)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7B2CBF' }}>12</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Completate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {workspaceCollapsed && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <CheckSquare size={20} />
                </button>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <Calendar size={20} />
                </button>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <TrendingUp size={20} />
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}