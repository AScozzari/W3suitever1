import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../contexts/ThemeContext";
import DashboardModule from "../modules/DashboardModule";
import POSModule from "../modules/POSModule";
import InventoryModule from "../modules/InventoryModule";
import CRMModule from "../modules/CRMModule";

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'pos', label: 'POS / Cassa', icon: '💳' },
  { id: 'inventory', label: 'Magazzino', icon: '📦' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'settings', label: 'Impostazioni', icon: '⚙️' },
];

const notifications = [
  { id: 1, type: 'lead', title: 'Nuovo Lead', message: 'Mario Rossi ha richiesto info', time: '2 min fa', unread: true },
  { id: 2, type: 'sale', title: 'Vendita Completata', message: '€1,250 - Order #3847', time: '15 min fa', unread: true },
  { id: 3, type: 'task', title: 'Task Scaduto', message: 'Review contratto cliente', time: '1 ora fa', unread: false },
];

const upcomingEvents = [
  { id: 1, title: 'Meeting Cliente ABC', time: '10:00', date: 'Oggi', type: 'meeting' },
  { id: 2, title: 'Call Fornitore', time: '14:30', date: 'Oggi', type: 'call' },
  { id: 3, title: 'Demo Prodotto', time: '11:00', date: 'Domani', type: 'demo' },
];

const tasks = [
  { id: 1, title: 'Completare report vendite', priority: 'high', status: 'in-progress', due: 'Oggi' },
  { id: 2, title: 'Aggiornare inventario', priority: 'medium', status: 'pending', due: 'Domani' },
  { id: 3, title: 'Contattare nuovi lead', priority: 'high', status: 'pending', due: 'Oggi' },
];

export default function EnhancedDashboard() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarHovered, setLeftSidebarHovered] = useState(false);
  const [rightSidebarHovered, setRightSidebarHovered] = useState(false);
  const { theme, setTheme, currentTheme } = useTheme();
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'pos':
        return <POSModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'crm':
        return <CRMModule />;
      default:
        return <div style={{ padding: '24px' }}>
          <h2 style={{ color: currentTheme === 'dark' ? 'white' : '#1f2937' }}>
            Modulo {currentModule} in sviluppo...
          </h2>
        </div>;
    }
  };

  const getColors = () => ({
    bg: currentTheme === 'dark' 
      ? 'linear-gradient(180deg, #0a0a1e 0%, #1a0033 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    headerBg: currentTheme === 'dark'
      ? 'rgba(0, 0, 0, 0.3)'
      : 'rgba(255, 255, 255, 0.3)',
    sidebarBg: currentTheme === 'dark'
      ? 'rgba(0, 0, 0, 0.4)'
      : 'rgba(255, 255, 255, 0.4)',
    cardBg: currentTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)',
    border: currentTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
    text: currentTheme === 'dark' ? 'white' : '#1f2937',
    textSecondary: currentTheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.7)'
      : 'rgba(31, 41, 55, 0.7)',
    textMuted: currentTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(31, 41, 55, 0.5)',
  });

  const colors = getColors();

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
    }}>
      {/* Header - Sopra tutto */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: colors.headerBg,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Toggle Left Sidebar */}
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '8px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease'
            }}
          >
            ☰
          </button>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold' }}>W3</span>
            </div>
            <span style={{ color: colors.text, fontSize: '18px', fontWeight: '600' }}>
              W3 Suite Enterprise
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            background: colors.cardBg,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '250px'
          }}>
            <span style={{ color: colors.textMuted }}>🔍</span>
            <input
              type="text"
              placeholder="Cerca..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: colors.text,
                width: '100%'
              }}
            />
          </div>

          {/* Theme Switcher */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: colors.cardBg,
            borderRadius: '8px',
            padding: '4px',
            border: `1px solid ${colors.border}`
          }}>
            <button
              onClick={() => setTheme('light')}
              style={{
                padding: '6px 10px',
                background: theme === 'light' ? '#FF6900' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: theme === 'light' ? 'white' : colors.text,
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              ☀️
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                padding: '6px 10px',
                background: theme === 'dark' ? '#FF6900' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: theme === 'dark' ? 'white' : colors.text,
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              🌙
            </button>
            <button
              onClick={() => setTheme('auto')}
              style={{
                padding: '6px 10px',
                background: theme === 'auto' ? '#FF6900' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: theme === 'auto' ? 'white' : colors.text,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              Auto
            </button>
          </div>

          {/* Toggle Right Sidebar */}
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '8px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease'
            }}
          >
            📋
          </button>
        </div>
      </header>

      <div style={{ 
        display: 'flex', 
        paddingTop: '60px',
        minHeight: '100vh'
      }}>
        {/* Left Sidebar - Menu */}
        <aside
          onMouseEnter={() => setLeftSidebarHovered(true)}
          onMouseLeave={() => setLeftSidebarHovered(false)}
          style={{
            width: leftSidebarOpen || leftSidebarHovered ? '260px' : '70px',
            background: colors.sidebarBg,
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${colors.border}`,
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '60px',
            bottom: 0,
            left: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}>
          
          {/* Menu Items */}
          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentModule(item.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  background: currentModule === item.id
                    ? 'linear-gradient(135deg, rgba(255, 105, 0, 0.2) 0%, rgba(123, 44, 191, 0.2) 100%)'
                    : 'transparent',
                  border: currentModule === item.id
                    ? '1px solid rgba(255, 105, 0, 0.3)'
                    : '1px solid transparent',
                  borderRadius: '12px',
                  color: colors.text,
                  fontSize: '15px',
                  fontWeight: currentModule === item.id ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  if (currentModule !== item.id) {
                    e.currentTarget.style.background = colors.cardBg;
                  }
                }}
                onMouseOut={(e) => {
                  if (currentModule !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
                {(leftSidebarOpen || leftSidebarHovered) && (
                  <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* User Section */}
          {(leftSidebarOpen || leftSidebarHovered) && (
            <div style={{
              padding: '16px',
              borderTop: `1px solid ${colors.border}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p style={{ color: colors.text, fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: leftSidebarOpen || leftSidebarHovered ? '260px' : '70px',
          marginRight: rightSidebarOpen || rightSidebarHovered ? '320px' : '70px',
          transition: 'all 0.3s ease',
          padding: '24px'
        }}>
          {renderModule()}
        </main>

        {/* Right Sidebar - Workspace */}
        <aside
          onMouseEnter={() => setRightSidebarHovered(true)}
          onMouseLeave={() => setRightSidebarHovered(false)}
          style={{
            width: rightSidebarOpen || rightSidebarHovered ? '320px' : '70px',
            background: colors.sidebarBg,
            backdropFilter: 'blur(20px)',
            borderLeft: `1px solid ${colors.border}`,
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '60px',
            bottom: 0,
            right: 0,
            zIndex: 100,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
          
          {(rightSidebarOpen || rightSidebarHovered) ? (
            <>
              {/* Notifications */}
              <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}` }}>
                <h3 style={{ 
                  color: colors.text, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>🔔 Notifiche</span>
                  <span style={{
                    background: '#FF6900',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px'
                  }}>
                    {notifications.filter(n => n.unread).length}
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        background: notif.unread ? colors.cardBg : 'transparent',
                        borderRadius: '8px',
                        padding: '12px',
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = currentTheme === 'dark'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = notif.unread ? colors.cardBg : 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                          {notif.title}
                        </span>
                        {notif.unread && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            background: '#FF6900',
                            borderRadius: '50%'
                          }}></span>
                        )}
                      </div>
                      <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '0 0 4px 0' }}>
                        {notif.message}
                      </p>
                      <p style={{ color: colors.textMuted, fontSize: '11px', margin: 0 }}>
                        {notif.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}` }}>
                <h3 style={{ 
                  color: colors.text, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '16px' 
                }}>
                  📅 Prossimi Eventi
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        background: colors.cardBg,
                        borderRadius: '8px',
                        padding: '12px',
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.2) 0%, rgba(123, 44, 191, 0.2) 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        {event.type === 'meeting' ? '🤝' : event.type === 'call' ? '📞' : '🎯'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: colors.text, fontSize: '14px', fontWeight: '500', margin: 0 }}>
                          {event.title}
                        </p>
                        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '2px 0 0 0' }}>
                          {event.date} • {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div style={{ padding: '20px', flex: 1 }}>
                <h3 style={{ 
                  color: colors.text, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '16px' 
                }}>
                  ✅ Task Attivi
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: colors.cardBg,
                        borderRadius: '8px',
                        padding: '12px',
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                          {task.title}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: task.priority === 'high' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(251, 191, 36, 0.2)',
                          color: task.priority === 'high' ? '#ef4444' : '#fbbf24'
                        }}>
                          {task.priority === 'high' ? 'Alta' : 'Media'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{
                          color: colors.textMuted,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          📆 {task.due}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: task.status === 'in-progress'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(156, 163, 175, 0.2)',
                          color: task.status === 'in-progress' ? '#3b82f6' : '#9ca3af'
                        }}>
                          {task.status === 'in-progress' ? 'In corso' : 'In attesa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 10px',
              gap: '20px'
            }}>
              <div style={{
                background: notifications.filter(n => n.unread).length > 0 ? '#FF6900' : colors.cardBg,
                borderRadius: '8px',
                padding: '8px',
                position: 'relative',
                cursor: 'pointer'
              }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                {notifications.filter(n => n.unread).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#FF6900',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {notifications.filter(n => n.unread).length}
                  </span>
                )}
              </div>
              <div style={{
                background: colors.cardBg,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer'
              }}>
                <span style={{ fontSize: '20px' }}>📅</span>
              </div>
              <div style={{
                background: colors.cardBg,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer'
              }}>
                <span style={{ fontSize: '20px' }}>✅</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}