import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function Dashboard({ 
  currentModule, 
  setCurrentModule 
}: { 
  currentModule: string, 
  setCurrentModule: (module: string) => void 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          <h2 style={{ color: 'white' }}>Modulo {currentModule} in sviluppo...</h2>
        </div>;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '80px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>W3</span>
          </div>
          {sidebarOpen && (
            <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>W3 Suite</span>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
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
                color: 'white',
                fontSize: '15px',
                fontWeight: currentModule === item.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                if (currentModule !== item.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseOut={(e) => {
                if (currentModule !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
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
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            {sidebarOpen && (
              <div>
                <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: 0 }}>
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <a
            href="/api/logout"
            style={{
              display: 'block',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            {sidebarOpen ? 'Esci' : '🚪'}
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          height: '70px',
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px'
            }}>
              🔔
            </button>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px'
            }}>
              🔍
            </button>
          </div>
        </header>

        {/* Module Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderModule()}
        </div>
      </main>
    </div>
  );
}