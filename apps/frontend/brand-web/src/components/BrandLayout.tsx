import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  User, Bell, Settings, Menu, ChevronLeft, ChevronRight,
  LogOut, Shield, Target, Users, BarChart3, Briefcase,
  Megaphone, TrendingUp, Cog, Globe, Building2, Store,
  UserPlus, FileText, PieChart, Zap, Search
} from 'lucide-react';

interface BrandLayoutProps {
  children: React.ReactNode;
}

export default function BrandLayout({ children }: BrandLayoutProps) {
  const { user, logout, workspace, setWorkspace } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Workspace sections for Brand Interface
  const workspaces = [
    {
      id: 'marketing',
      name: 'Marketing',
      icon: Megaphone,
      description: 'Campagne e comunicazione',
      color: '#FF6900'
    },
    {
      id: 'sales',
      name: 'Vendite',
      icon: TrendingUp,
      description: 'Listini e supporto vendite',
      color: '#7B2CBF'
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Cog,
      description: 'Gestione operativa',
      color: '#10b981'
    },
    {
      id: 'admin',
      name: 'Amministrazione',
      icon: Shield,
      description: 'Tenant e configurazioni',
      color: '#f59e0b'
    }
  ];

  const currentWorkspace = workspaces.find(w => w.id === workspace);

  return (
    <div className="h-screen flex overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
         }}>
      
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} transition-all duration-300 glass-card border-r border-white/10 flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="glass-button rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">Brand Interface</h1>
                <p className="text-white/60 text-xs">W3 Suite Enterprise</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="glass-button rounded-lg p-2 text-white/80 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Tenant Context Indicator */}
        <div className="p-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="mb-3">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
                Contesto Tenant
              </p>
            </div>
          )}
          
          <div className={`glass-button rounded-lg p-3 ${sidebarCollapsed ? 'px-3' : ''}`}
               style={{ background: isCrossTenant ? '#10b98120' : '#FF690020' }}>
            <div className="flex items-center space-x-3">
              <Globe 
                className="w-5 h-5 flex-shrink-0"
                style={{ color: isCrossTenant ? '#10b981' : '#FF6900' }} 
              />
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">
                    {isCrossTenant ? 'Cross-Tenant' : currentTenant}
                  </p>
                  <p className="text-white/60 text-xs">
                    {isCrossTenant ? 'Tutti i tenant' : `ID: ${currentTenantId?.substring(0, 8)}...`}
                  </p>
                  {!isCrossTenant && (
                    <button
                      onClick={() => switchTenant(null)}
                      className="mt-2 text-xs text-white/70 hover:text-white transition-colors"
                    >
                      → Modalità Cross-Tenant
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="p-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="mb-3">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
                Workspace Attivo
              </p>
            </div>
          )}
          
          <div className={`glass-button rounded-lg p-3 ${sidebarCollapsed ? 'px-3' : ''}`}
               style={{ background: `${currentWorkspace?.color}20` }}>
            <div className="flex items-center space-x-3">
              {currentWorkspace && (
                <currentWorkspace.icon 
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: currentWorkspace.color }} 
                />
              )}
              {!sidebarCollapsed && (
                <div>
                  <p className="text-white font-medium text-sm">{currentWorkspace?.name}</p>
                  <p className="text-white/60 text-xs">{currentWorkspace?.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Navigation */}
        <div className="flex-1 p-4 space-y-2">
          {!sidebarCollapsed && (
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
              Settori Aziendali
            </p>
          )}
          
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setWorkspace(ws.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left
                ${workspace === ws.id 
                  ? 'glass-button border border-white/20' 
                  : 'hover:bg-white/5'
                }`}
            >
              <ws.icon 
                className={`w-5 h-5 flex-shrink-0 ${
                  workspace === ws.id ? 'text-white' : 'text-white/70'
                }`}
                style={{ color: workspace === ws.id ? ws.color : undefined }}
              />
              {!sidebarCollapsed && (
                <div>
                  <p className={`font-medium text-sm ${
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center space-x-3 glass-button rounded-lg p-3 text-white/80 hover:text-white"
            >
              <div className="glass-button rounded-full p-2">
                <User className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm text-white">{user?.name}</p>
                  <p className="text-white/60 text-xs">{user?.role}</p>
                </div>
              )}
            </button>

            {/* User Menu */}
            {userMenuOpen && !sidebarCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-card border border-white/10 rounded-lg p-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center space-x-3 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Impostazioni</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 p-2 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentWorkspace && (
                <>
                  <div className="glass-button rounded-lg p-2"
                       style={{ background: `${currentWorkspace.color}20` }}>
                    <currentWorkspace.icon 
                      className="w-6 h-6"
                      style={{ color: currentWorkspace.color }} 
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {currentWorkspace.name}
                    </h1>
                    <p className="text-white/60 text-sm">
                      {currentWorkspace.description}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button className="glass-button rounded-lg p-2 text-white/80 hover:text-white">
                <Search className="w-5 h-5" />
              </button>
              <button className="glass-button rounded-lg p-2 text-white/80 hover:text-white">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}