import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  Home, Users, Zap, Briefcase, Building, UserPlus, 
  FileText, ShoppingBag, Settings, ChevronLeft, 
  ChevronRight, Menu, Calendar, Clock, CalendarDays,
  BarChart3, UserCheck, Award, DollarSign, BookOpen,
  FileBarChart, Receipt, ChevronDown, ChevronUp,
  Target, Clipboard, TrendingUp, Shield
} from 'lucide-react';
import CompactCalendar from '../Sidebar/CompactCalendar';

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
  hasSubmenu?: boolean;
  submenuItems?: MenuItem[];
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
  { id: 'documents', label: 'Document Drive', icon: FileText, path: '/documents' },
  { id: 'magazzino', label: 'Magazzino', icon: Briefcase },
  { id: 'amministrazione', label: 'Amministrazione', icon: Building },
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
  autoCollapse = false,
  autoCollapseDelay = 3000
}: LeftSidebarProps) {
  const [location, navigate] = useLocation();
  const [collapseTimer, setCollapseTimer] = useState<NodeJS.Timeout | null>(null);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set());

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

  // Handle submenu toggle
  const toggleSubmenu = (itemId: string) => {
    const newExpanded = new Set(expandedSubmenus);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedSubmenus(newExpanded);
  };

  // Handle menu item click
  const handleMenuClick = (item: MenuItem) => {
    // Force use staging tenant
    const tenant = 'staging';
    
    // If HR item with path, navigate and toggle submenu
    if (item.id === 'hr' && item.path) {
      // Use wouter navigation for HR
      navigate(`/${tenant}${item.path}`);
      toggleSubmenu(item.id);
      return;
    }
    
    // If item has both submenu and path, navigate to path and toggle submenu
    if (item.hasSubmenu && item.path) {
      // Navigate to the main path using wouter
      const targetPath = `/${tenant}${item.path}`;
      navigate(targetPath);
      toggleSubmenu(item.id);
      return;
    }
    
    // If item has submenu only, toggle it
    if (item.hasSubmenu) {
      toggleSubmenu(item.id);
      return;
    }

    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[LeftSidebar] Navigation:', {
        item: item.label,
        path: item.path,
        tenant,
        targetPath: item.path ? `/${tenant}${item.path}` : 'module-change'
      });
    }

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
    if (item.hasSubmenu) {
      return item.submenuItems?.some(subItem => location.includes(subItem.path || ''));
    }
    return currentModule === item.id || location.includes(item.path || '');
  };

  // Check if submenu item is active
  const isSubmenuItemActive = (item: MenuItem) => {
    return location.includes(item.path || '');
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
            const isExpanded = expandedSubmenus.has(item.id);
            
            return (
              <div key={item.id}>
                {/* Main menu item */}
                <button
                    onClick={() => handleMenuClick(item)}
                  style={{
                    width: isMobile ? 'auto' : (collapsed ? '40px' : '100%'),
                    height: collapsed && !isMobile ? '40px' : 'auto',
                    minWidth: isMobile ? '80px' : 'auto',
                    padding: isMobile ? '12px' : (collapsed ? '12px' : '12px 16px'),
                    marginBottom: isMobile ? '0' : (collapsed ? '0' : '4px'),
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
                    justifyContent: collapsed ? 'center' : 'space-between',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px' }}>
                    {/* Icon */}
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
                  </div>

                  {/* Submenu chevron */}
                  {item.hasSubmenu && !collapsed && !isMobile && (
                    <div style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ChevronDown size={16} />
                    </div>
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

                {/* Submenu items */}
                {item.hasSubmenu && isExpanded && !collapsed && (
                  <div style={{
                    marginLeft: '16px',
                    borderLeft: '2px solid hsla(255, 255, 255, 0.1)',
                    paddingLeft: '16px',
                    marginBottom: '8px'
                  }}>
                    {item.submenuItems?.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = isSubmenuItemActive(subItem);
                      
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleMenuClick(subItem)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            marginBottom: '2px',
                            background: isSubActive 
                              ? `linear-gradient(135deg, ${COLORS.primary.purple}, ${COLORS.primary.purpleLight})` 
                              : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: isSubActive ? 'white' : '#6b7280',
                            fontSize: '13px',
                            fontWeight: isSubActive ? 600 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                            justifyContent: 'flex-start'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.color = '#374151';
                              e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.color = '#6b7280';
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <SubIcon size={16} />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Compact Calendar Widget */}
        {!isMobile && (
          <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
            <CompactCalendar collapsed={collapsed} />
          </div>
        )}

        {/* Footer info quando expanded */}
        {!collapsed && !isMobile && (
          <div style={{
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