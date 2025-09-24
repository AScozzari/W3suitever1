import React, { useEffect, useState } from 'react';
import { useLocation, Switch, Route, Redirect } from 'wouter';
import { setCurrentTenantId } from '../lib/queryClient';
import { TenantProvider } from '../contexts/TenantContext';

// Import all pages
import DashboardPage from '../pages/DashboardPage';
import SettingsPage from '../pages/SettingsPage';
import WorkflowManagementPage from '../pages/WorkflowManagementPage';
import StandardFieldsDemo from '../pages/StandardFieldsDemo';
import MyPortal from '../pages/MyPortal';
import HRManagementPage from '../pages/HRManagementPage';
import NotificationCenter from '../pages/NotificationCenter';
import TenantVerificationTest from '../pages/TenantVerificationTest';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { useAuth } from '../hooks/useAuth';

interface TenantShellProps {
  tenantSlug: string;
}

/**
 * 🎯 TENANT SHELL - Automatic Tenant Management
 * 
 * Questo componente elimina la necessità di TenantWrapper manuale su ogni route.
 * Gestisce automaticamente:
 * - Risoluzione tenant slug → UUID 
 * - Context provider
 * - Loading/error states
 * - Route enforcement
 * 
 * VANTAGGI:
 * ✅ Ogni nuova pagina automaticamente ha tenant context
 * ✅ Impossibile dimenticare gestione tenant
 * ✅ Single source of truth per risoluzione tenant
 * ✅ Sicurezza: nessun accesso senza tenant valido
 */
export const TenantShell: React.FC<TenantShellProps> = ({ tenantSlug }) => {
  const [tenantValid, setTenantValid] = useState<boolean | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  
  useEffect(() => {
    const resolveTenant = async () => {
      if (!tenantSlug) {
        console.error('[TENANT-SHELL] ❌ No tenant slug provided');
        setTenantValid(false);
        return;
      }
      
      try {
        console.log(`[TENANT-SHELL] 🔍 Resolving tenant slug "${tenantSlug}" to UUID`);
        
        // Save tenant slug for reference
        localStorage.setItem('currentTenant', tenantSlug);
        
        // Call API to resolve tenant slug to UUID
        const response = await fetch(`/api/tenants/resolve?slug=${tenantSlug}`);
        
        console.log(`[TENANT-SHELL] 📡 API response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`[TENANT-SHELL] ❌ Tenant resolution failed: ${response.status}`);
          
          // Development fallback for known tenants
          if (import.meta.env.DEV) {
            console.warn('[TENANT-SHELL] ⚠️ Using fallback tenant mapping (development only)');
            const fallbackMapping: Record<string, any> = {
              'staging': { 
                id: '00000000-0000-0000-0000-000000000001',
                name: 'Staging Environment',
                code: 'staging'
              },
              'demo': { 
                id: '99999999-9999-9999-9999-999999999999',
                name: 'Demo Environment',
                code: 'demo'
              },
              'acme': { 
                id: '11111111-1111-1111-1111-111111111111',
                name: 'ACME Corporation',
                code: 'acme'
              },
              'tech': { 
                id: '22222222-2222-2222-2222-222222222222',
                name: 'TechCorp Solutions',
                code: 'tech'
              }
            };
            
            const fallbackData = fallbackMapping[tenantSlug];
            if (fallbackData) {
              setTenantId(fallbackData.id);
              setTenantData(fallbackData);
              localStorage.setItem('currentTenantId', fallbackData.id);
              setCurrentTenantId(fallbackData.id);
              console.warn(`[TENANT-SHELL] ⚠️ Using fallback: ${fallbackData.name} (${fallbackData.id})`);
              setTenantValid(true);
              return;
            }
          }
          
          // Tenant not found
          setTenantValid(false);
          return;
        }
        
        const data = await response.json();
        console.log('[TENANT-SHELL] ✅ Tenant resolution successful:', data);
        
        // Set resolved tenant data
        setTenantId(data.tenantId);
        setTenantData(data);
        localStorage.setItem('currentTenantId', data.tenantId);
        setCurrentTenantId(data.tenantId);
        
        console.log(`[TENANT-SHELL] 🔒 Tenant UUID resolved: "${data.tenantId}"`);
        console.log(`[TENANT-SHELL] 📋 Tenant name: "${data.name}"`);
        console.log(`[TENANT-SHELL] ✅ Ready for authenticated operations`);
        
        setTenantValid(true);
        
      } catch (error) {
        console.error('[TENANT-SHELL] ❌ CRITICAL ERROR: Tenant resolution failed:', error);
        
        // Emergency fallback for development
        if (import.meta.env.DEV) {
          const emergencyFallback = '00000000-0000-0000-0000-000000000001';
          setTenantId(emergencyFallback);
          setTenantData({ 
            id: emergencyFallback, 
            name: 'Emergency Fallback', 
            code: tenantSlug 
          });
          localStorage.setItem('currentTenantId', emergencyFallback);
          setCurrentTenantId(emergencyFallback);
          console.error(`[TENANT-SHELL] ⚠️ EMERGENCY FALLBACK: Using ${emergencyFallback}`);
          setTenantValid(true);
          return;
        }
        
        setTenantValid(false);
      }
    };
    
    resolveTenant();
  }, [tenantSlug]);
  
  // Loading state
  if (tenantValid === null) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(25, 100%, 97%) 0%, hsl(25, 100%, 94%) 100%)'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #FF6900',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <h3 style={{ color: '#FF6900', marginBottom: '8px', fontSize: '18px' }}>
            W3 Suite
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Verifica tenant "{tenantSlug}"...
          </p>
        </div>
      </div>
    );
  }
  
  // Invalid tenant
  if (tenantValid === false || !tenantId) {
    return <NotFound />;
  }
  
  // Valid tenant - render routes with automatic tenant context
  return (
    <TenantProvider>
      <TenantRoutes tenantSlug={tenantSlug} />
    </TenantProvider>
  );
};

/**
 * 🛣️ TENANT ROUTES - Auto-wrapped routes
 * Tutte le route qui dentro hanno automaticamente tenant context
 */
const TenantRoutes: React.FC<{ tenantSlug: string }> = ({ tenantSlug }) => {
  return (
    <Switch>
      {/* Login route - no auth required */}
      <Route path="/login">
        <Login tenantCode={tenantSlug} />
      </Route>
      
      {/* All other routes require authentication */}
      <Route path="/portale">
        <AuthenticatedRoute>
          <MyPortal />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/hr-management">
        <AuthenticatedRoute>
          <HRManagementPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/settings">
        <AuthenticatedRoute>
          <SettingsPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/workflow-management">
        <AuthenticatedRoute>
          <WorkflowManagementPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/demo-fields">
        <AuthenticatedRoute>
          <StandardFieldsDemo />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/tenant-verification">
        <AuthenticatedRoute>
          <TenantVerificationTest />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/notification-center">
        <AuthenticatedRoute>
          <NotificationCenter />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/dashboard">
        <AuthenticatedRoute>
          <DashboardPage />
        </AuthenticatedRoute>
      </Route>
      
      {/* Legacy redirects */}
      <Route path="/calendar">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/time-tracking">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/leave-management">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/shift-planning">
        <Redirect to={`/${tenantSlug}/hr-management`} replace />
      </Route>
      <Route path="/documents">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/expense-management">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/employee/dashboard">
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path="/hr">
        <Redirect to={`/${tenantSlug}/hr-management`} replace />
      </Route>
      <Route path="/hr-dashboard">
        <Redirect to={`/${tenantSlug}/hr-management`} replace />
      </Route>
      <Route path="/notifications">
        <Redirect to={`/${tenantSlug}/notification-center`} replace />
      </Route>
      
      {/* Root tenant path - redirect to dashboard */}
      <Route path="/">
        <Redirect to={`/${tenantSlug}/dashboard`} replace />
      </Route>
      
      {/* 404 for unmatched routes */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};

/**
 * 🔐 AUTHENTICATED ROUTE - Auto-wrapped auth
 * Gestisce automaticamente l'autenticazione per tutte le route
 */
const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Get tenant slug from current location
  const tenantSlug = location.split('/')[1];
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(25, 100%, 97%) 0%, hsl(25, 100%, 94%) 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #FF6900',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Verifica autenticazione...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Login tenantCode={tenantSlug} />;
  }
  
  return <>{children}</>;
};