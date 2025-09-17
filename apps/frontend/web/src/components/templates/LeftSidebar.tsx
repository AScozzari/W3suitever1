import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Home, Users, Zap, Briefcase, Building, UserPlus, 
  FileText, ShoppingBag, Settings, ChevronLeft, 
  ChevronRight, Menu, Calendar, Clock, CalendarDays
} from 'lucide-react';

// Palette colori W3 Suite - Consistent con Header
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  }
};

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  active?: boolean;
}

interface LeftSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobile?: boolean;
  isTablet?: boolean;
  currentModule?: string;
  onModuleChange?: (moduleId: string) => void;
  menuItems?: MenuItem[];
  autoCollapse?: boolean;
  autoCollapseDelay?: number;
}

const defaultMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'ai', label: 'AI Tools', icon: Zap },
  { id: 'calendario', label: 'Calendario', icon: Calendar, path: '/calendar' },
  { id: 'time-tracking', label: 'Time Tracking', icon: Clock, path: '/time-tracking' },
  { id: 'leave-management', label: 'Gestione Ferie', icon: CalendarDays, path: '/leave-management' },
  { id: 'shift-planning', label: 'Pianificazione Turni', icon: Clock, path: '/shift-planning' },
  { id: 'magazzino', label: 'Magazzino', icon: Briefcase },
  { id: 'amministrazione', label: 'Amministrazione', icon: Building },
  { id: 'hr', label: 'Human Resources', icon: UserPlus },
  { id: 'listini', label: 'Listini', icon: FileText },
  { id: 'cassa', label: 'Cassa', icon: ShoppingBag },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings, path: '/settings' }
];

export default function LeftSidebar({
  collapsed = true,
  onToggleCollapse,
  isMobile = false,
  isTablet = false,
  currentModule = 'dashboard',
  onModuleChange,
  menuItems = defaultMenuItems,
  autoCollapse = true,
  autoCollapseDelay = 1500
}: LeftSidebarProps) {
  const [location, navigate] = useLocation();
  const [collapseTimer, setCollapseTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-collapse logic
  const handleMouseEnter = () => {
    if (!isMobile && collapsed && autoCollapse) {
      onToggleCollapse?.(false);
    }
    // Cancella timer di chiusura se esiste
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      setCollapseTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && !collapsed && autoCollapse) {
      // Cancella timer precedente
      if (collapseTimer) {
        clearTimeout(collapseTimer);
      }
      // Imposta nuovo timer
      const timer = setTimeout(() => {
        onToggleCollapse?.(true);
        setCollapseTimer(null);
      }, autoCollapseDelay);
      setCollapseTimer(timer);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimer) {
        clearTimeout(collapseTimer);
      }
    };
  }, [collapseTimer]);

  // Handle menu item click
  const handleMenuClick = (item: MenuItem) => {
    const pathSegments = location.split('/').filter(Boolean);
    const tenant = pathSegments[0];

    if (item.path) {
      if (item.path === '/') {
        navigate(`/${tenant}`);
      } else if (item.id === 'impostazioni') {
        navigate(`/${tenant}/settings`);
      } else {
        navigate(`/${tenant}${item.path}`);
      }
    } else {
      onModuleChange?.(item.id);
    }
  };

  // Check if item is active
  const isItemActive = (item: MenuItem) => {
    if (item.path === '/' && currentModule === 'dashboard') return true;
    if (item.id === 'impostazioni' && location.includes('/settings')) return true;
    return currentModule === item.id;
  };

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <button
          onClick={() => onToggleCollapse?.(!collapsed)}
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

      {/* Sidebar */}
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: isMobile ? 'static' : 'fixed',
          left: 0,
          top: isMobile ? '0' : '64px',
          height: isMobile ? 'auto' : 'calc(100vh - 64px)',
          width: isMobile ? '100%' : (collapsed ? '64px' : '256px'),
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderRight: isMobile ? 'none' : '1px solid hsla(255, 255, 255, 0.12)',
          borderBottom: isMobile ? '1px solid hsla(255, 255, 255, 0.12)' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 40,
          display: isMobile && collapsed ? 'none' : 'flex',
          flexDirection: 'column',
          padding: isMobile ? '16px' : '16px 8px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Desktop Toggle Button */}
        {!isMobile && !isTablet && (
          <button
            onClick={() => onToggleCollapse?.(!collapsed)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '-12px',
              width: '24px',
              height: '24px',
              background: 'hsla(0, 0%, 100%, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid hsla(0, 0%, 100%, 0.25)',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.background = 'hsla(0, 0%, 100%, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.9)';
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}

        {/* Navigation Menu */}
        <nav style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? '12px' : '4px',
          paddingTop: isMobile ? '0' : '24px',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: '16px'
        }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                style={{
                  width: isMobile ? 'auto' : (collapsed ? '40px' : '100%'),
                  height: collapsed && !isMobile ? '40px' : 'auto',
                  minWidth: isMobile ? '80px' : 'auto',
                  padding: isMobile ? '12px' : (collapsed ? '12px' : '12px 16px'),
                  marginBottom: isMobile ? '0' : (collapsed ? '0' : '8px'),
                  background: isActive 
                    ? `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})` 
                    : 'transparent',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  border: 'none',
                  borderRadius: collapsed ? '12px' : '8px',
                  color: isActive ? 'white' : '#374151',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: isActive ? 600 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '4px' : (collapsed ? '0' : '12px'),
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: collapsed ? 'center' : 'left',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.transform = collapsed ? 'scale(1.1)' : 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
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
                  <Icon size={isMobile ? 16 : 20} />
                  {/* Glow effect per item attivo */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                      borderRadius: '50%',
                      opacity: 0.3,
                      filter: 'blur(8px)',
                      zIndex: -1
                    }} />
                  )}
                </div>
                
                {/* Label */}
                {(!collapsed || isMobile) && (
                  <span style={{
                    fontSize: 'inherit',
                    fontWeight: 'inherit',
                    lineHeight: 1.2,
                    textAlign: isMobile ? 'center' : 'left'
                  }}>
                    {item.label}
                  </span>
                )}
                
                {/* Tooltip per collapsed desktop */}
                {collapsed && !isMobile && (
                  <div style={{
                    position: 'absolute',
                    left: '60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease',
                    zIndex: 1000
                  }}
                  className="sidebar-tooltip"
                  >
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info quando expanded */}
        {!collapsed && !isMobile && (
          <div style={{
            marginTop: 'auto',
            padding: '16px',
            borderTop: '1px solid hsla(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              W3 Suite v2.0
            </div>
            <div style={{
              fontSize: '10px',
              color: '#9ca3af'
            }}>
              Enterprise Platform
            </div>
          </div>
        )}
      </aside>

      {/* CSS for tooltip hover effect */}
      <style>
        {`
          .sidebar-tooltip:hover {
            opacity: 1 !important;
          }
          button:hover .sidebar-tooltip {
            opacity: 1 !important;
          }
        `}
      </style>
    </>
  );
}