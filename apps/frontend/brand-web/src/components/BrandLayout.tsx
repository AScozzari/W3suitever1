import React, { useState, useRef } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'wouter';
import {
  User, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  LogOut, Shield, Target, Users, BarChart3, Briefcase,
  Megaphone, TrendingUp, Cog, Globe, Building2, Store,
  UserPlus, FileText, PieChart, Zap, Search, Home,
  UserCircle, Building, ChevronDown, Activity, Package,
  DollarSign, Calendar, CheckCircle, AlertCircle, Moon, Sun
} from 'lucide-react';

interface BrandLayoutProps {
  children: React.ReactNode;
}

export default function BrandLayout({ children }: BrandLayoutProps) {
  const { user, logout, workspace, setWorkspace } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();
  const { isDark, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  
  // Sidebar states with auto-collapse
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const leftSidebarTimer = useRef<number | null>(null);
  const rightSidebarTimer = useRef<number | null>(null);

  // Navigation items for left sidebar
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

  // Workspace sections for right sidebar
  const workspaces = [
    {
      id: 'marketing',
      name: 'Marketing',
      icon: Megaphone,
      description: 'Campagne e comunicazione',
      color: 'var(--primary-purple)'
    },
    {
      id: 'sales',
      name: 'Vendite',
      icon: TrendingUp,
      description: 'Listini e supporto vendite',
      color: 'var(--primary-blue)'
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Cog,
      description: 'Gestione operativa',
      color: 'var(--secondary-green)'
    },
    {
      id: 'admin',
      name: 'Amministrazione',
      icon: Shield,
      description: 'Tenant e configurazioni',
      color: 'var(--secondary-amber)'
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

  // Auto-collapse logic for left sidebar
  const handleLeftSidebarMouseEnter = () => {
    if (leftSidebarCollapsed) {
      setLeftSidebarCollapsed(false);
    }
    // Clear existing timer
    if (leftSidebarTimer.current) {
      window.clearTimeout(leftSidebarTimer.current);
      leftSidebarTimer.current = null;
    }
  };

  const handleLeftSidebarMouseLeave = () => {
    if (!leftSidebarCollapsed) {
      // Clear existing timer
      if (leftSidebarTimer.current) {
        window.clearTimeout(leftSidebarTimer.current);
      }
      // Set new timer
      leftSidebarTimer.current = window.setTimeout(() => {
        setLeftSidebarCollapsed(true);
        leftSidebarTimer.current = null;
      }, 1500);
    }
  };

  // Auto-collapse logic for right sidebar
  const handleRightSidebarMouseEnter = () => {
    if (rightSidebarCollapsed) {
      setRightSidebarCollapsed(false);
    }
    // Clear existing timer
    if (rightSidebarTimer.current) {
      window.clearTimeout(rightSidebarTimer.current);
      rightSidebarTimer.current = null;
    }
  };

  const handleRightSidebarMouseLeave = () => {
    if (!rightSidebarCollapsed) {
      // Clear existing timer
      if (rightSidebarTimer.current) {
        window.clearTimeout(rightSidebarTimer.current);
      }
      // Set new timer
      rightSidebarTimer.current = window.setTimeout(() => {
        setRightSidebarCollapsed(true);
        rightSidebarTimer.current = null;
      }, 1500);
    }
  };

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (leftSidebarTimer.current) {
        window.clearTimeout(leftSidebarTimer.current);
      }
      if (rightSidebarTimer.current) {
        window.clearTimeout(rightSidebarTimer.current);
      }
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden brand-gradient">
      
      {/* Fixed Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentNavItem?.name || 'Brand Interface'}
            </h2>
            {currentWorkspace && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg border"
                   style={{ background: `${currentWorkspace.color}10` }}>
                <currentWorkspace.icon className="w-4 h-4" style={{ color: currentWorkspace.color }} />
                <span className="text-sm text-gray-700">{currentWorkspace.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            
            {/* Notifications */}
            <button className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Settings */}
            <button 
              onClick={() => handleNavigation('/settings')}
              className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout - Three Column Structure */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Navigation */}
        <div 
          className={`${leftSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 sidebar-left flex flex-col flex-shrink-0`}
          onMouseEnter={handleLeftSidebarMouseEnter}
          onMouseLeave={handleLeftSidebarMouseLeave}
        >
        
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!leftSidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="glass-button rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">Brand Interface</h1>
                <p className="text-white/60 text-xs">Control Panel</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="toggle-button"
            style={{
              position: 'absolute',
              top: '16px',
              right: '-12px',
              zIndex: 50
            }}
          >
            {leftSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* Tenant Context */}
        <div className="p-4 border-b border-white/10">
          <div className={`glass-button rounded-lg p-3 ${leftSidebarCollapsed ? 'px-3' : ''}`}
               style={{ background: isCrossTenant ? 'var(--glass-blue)' : 'var(--glass-purple)' }}>
            <div className="flex items-center space-x-3">
              <Globe 
                className="w-5 h-5 flex-shrink-0"
                style={{ color: isCrossTenant ? 'var(--primary-blue)' : 'var(--primary-purple)' }} 
              />
              {!leftSidebarCollapsed && (
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">
                    {isCrossTenant ? 'Cross-Tenant' : currentTenant || 'Tenant'}
                  </p>
                  <p className="text-white/60 text-xs">
                    {isCrossTenant ? 'Tutti i tenant' : `ID: ${currentTenantId?.substring(0, 8) || 'N/A'}...`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 p-4 space-y-2">
          {!leftSidebarCollapsed && (
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
              Navigazione
            </p>
          )}
          
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg menu-item text-left
                ${location.endsWith(item.path)
                  ? 'active glass-button border border-white/30' 
                  : ''
                }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon 
                className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                  location.endsWith(item.path) ? 'text-white' : 'text-white/70'
                }`}
              />
              {!leftSidebarCollapsed && (
                <div className="slide-in">
                  <p className={`font-medium text-sm transition-colors duration-200 ${
                    location.endsWith(item.path) ? 'text-white' : 'text-white/80'
                  }`}>
                    {item.name}
                  </p>
                  <p className="text-white/50 text-xs">{item.description}</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center space-x-3 glass-button rounded-lg p-3 text-white/80 hover:text-white"
            >
              <div className="glass-button rounded-full p-2">
                <User className="w-4 h-4" />
              </div>
              {!leftSidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm text-white">{user?.name || 'User'}</p>
                  <p className="text-white/60 text-xs">{user?.role || 'Role'}</p>
                </div>
              )}
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && !leftSidebarCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-card border border-white/10 rounded-lg p-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center space-x-2 p-2 rounded hover:bg-white/10 text-white/80 hover:text-white"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="text-sm">Tema {isDark ? 'Chiaro' : 'Scuro'}</span>
                </button>
                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full flex items-center space-x-2 p-2 rounded hover:bg-white/10 text-white/80 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Impostazioni</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 p-2 rounded hover:bg-white/10 text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Esci</span>
                </button>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="p-6 bg-white min-h-full">
            {children}
          </div>
        </div>

        {/* Right Sidebar - Workspace Selector */}
        <div 
          className={`${rightSidebarCollapsed ? 'w-16' : 'w-72'} transition-all duration-300 sidebar-right flex flex-col flex-shrink-0`}
          onMouseEnter={handleRightSidebarMouseEnter}
          onMouseLeave={handleRightSidebarMouseLeave}
        >
            
            {/* Workspace Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              {!rightSidebarCollapsed && (
                <h3 className="text-white font-medium text-sm">Workspace</h3>
              )}
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="toggle-button"
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '-12px',
                  zIndex: 50
                }}
              >
                {rightSidebarCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>

            {/* Active Workspace */}
            {currentWorkspace && (
              <div className="p-4 border-b border-white/10">
                <div className={`glass-button rounded-lg p-3 ${rightSidebarCollapsed ? 'px-3' : ''}`}
                     style={{ background: `${currentWorkspace.color}20` }}>
                  <div className="flex items-center space-x-3">
                    <currentWorkspace.icon 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: currentWorkspace.color }} 
                    />
                    {!rightSidebarCollapsed && (
                      <div>
                        <p className="text-white font-medium text-sm">{currentWorkspace.name}</p>
                        <p className="text-white/60 text-xs">{currentWorkspace.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Workspace List */}
            <div className="flex-1 p-4 space-y-2">
              {!rightSidebarCollapsed && (
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
                  Aree Funzionali
                </p>
              )}
              
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setWorkspace(ws.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg menu-item text-left
                    ${workspace === ws.id 
                      ? 'active glass-button border border-white/30' 
                      : ''
                    }`}
                  data-testid={`workspace-${ws.id}`}
                >
                  <ws.icon 
                    className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                      workspace === ws.id ? 'text-white' : 'text-white/70'
                    }`}
                    style={{ color: workspace === ws.id ? ws.color : undefined }}
                  />
                  {!rightSidebarCollapsed && (
                    <div className="slide-in">
                      <p className={`font-medium text-sm transition-colors duration-200 ${
                        workspace === ws.id ? 'text-white' : 'text-white/80'
                      }`}>
                        {ws.name}
                      </p>
                      <p className="text-white/50 text-xs">{ws.description}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Quick Stats */}
            {!rightSidebarCollapsed && (
              <div className="p-4 border-t border-white/10 space-y-3">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Quick Stats
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Tasks</span>
                    <span className="text-white font-medium">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Alerts</span>
                    <span className="text-white font-medium">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Users</span>
                    <span className="text-white font-medium">24</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}