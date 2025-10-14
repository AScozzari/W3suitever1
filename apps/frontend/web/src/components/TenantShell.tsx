import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, Switch, Route, Redirect } from 'wouter';
import { setCurrentTenantId } from '../lib/queryClient';
import { TenantProvider } from '../contexts/TenantContext';
import { useAuth } from '../hooks/useAuth';

// 🚀 PERFORMANCE: Lazy load all pages for code splitting
// Critical pages (Login, NotFound) loaded immediately for UX
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';

// All other pages lazy loaded to reduce initial bundle size
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const WorkflowManagementPage = lazy(() => import('../pages/WorkflowManagementPage'));
const StandardFieldsDemo = lazy(() => import('../pages/StandardFieldsDemo'));
const MyPortal = lazy(() => import('../pages/MyPortal'));
const HRManagementPage = lazy(() => import('../pages/HRManagementPage'));
const NotificationCenter = lazy(() => import('../pages/NotificationCenter'));
const TenantVerificationTest = lazy(() => import('../pages/TenantVerificationTest'));
const TasksPage = lazy(() => import('../pages/TasksPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const AIToolsDashboardPage = lazy(() => import('../pages/AIToolsDashboardPage'));
const PDCAnalyzerPage = lazy(() => import('../pages/PDCAnalyzerPage'));
const CRMPage = lazy(() => import('../pages/CRMPage'));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    width: '100%'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #FF6900',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <p style={{ color: '#6b7280', fontSize: '14px' }}>Caricamento...</p>
    </div>
  </div>
);

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
        setTenantValid(false);
        return;
      }
      
      try {
        // Save tenant slug for reference
        localStorage.setItem('currentTenant', tenantSlug);
        
        // Call API to resolve tenant slug to UUID
        const response = await fetch(`/api/tenants/resolve?slug=${tenantSlug}`);
        
        if (!response.ok) {
          // Development fallback for known tenants
          if (import.meta.env.DEV) {
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
              setTenantValid(true);
              return;
            }
          }
          
          // Tenant not found
          setTenantValid(false);
          return;
        }
        
        const data = await response.json();
        
        // Set resolved tenant data
        setTenantId(data.tenantId);
        setTenantData(data);
        localStorage.setItem('currentTenantId', data.tenantId);
        setCurrentTenantId(data.tenantId);
        
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
  const [location] = useLocation();
  
  // Extract the sub-path after /:tenant/
  const segments = location.split('/').filter(Boolean);
  const subPath = segments.slice(1).join('/'); // Remove tenant segment
  const currentPath = subPath || 'dashboard'; // Default to dashboard
  
  // Route handling managed by TenantShell
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Login route - no auth required */}
        <Route path={`/${tenantSlug}/login`}>
          <Login tenantCode={tenantSlug} />
        </Route>
      
      {/* All other routes require authentication */}
      <Route path={`/${tenantSlug}/portale`}>
        <AuthenticatedRoute>
          <MyPortal />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/my-portal`}>
        <AuthenticatedRoute>
          <MyPortal />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/hr-management`}>
        <AuthenticatedRoute>
          <HRManagementPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/settings`}>
        <AuthenticatedRoute>
          <SettingsPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/impostazioni`}>
        <AuthenticatedRoute>
          <SettingsPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/workflow-management`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage />
        </AuthenticatedRoute>
      </Route>
      
      {/* 🎯 WORKFLOW ROUTES - Direct access to workflow views */}
      <Route path={`/${tenantSlug}/workflows/dashboard`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="dashboard" />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/workflows/analytics`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="analytics" />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/workflows/builder`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="builder" />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/workflows/timeline`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="timeline" />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/workflows/teams`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="teams" />
        </AuthenticatedRoute>
      </Route>
      
      {/* 🔄 LEGACY REDIRECT - workflow-management -> workflows/dashboard */}
      <Route path={`/${tenantSlug}/workflows`}>
        <AuthenticatedRoute>
          <WorkflowManagementPage defaultView="dashboard" />
        </AuthenticatedRoute>
      </Route>
      
      
      <Route path={`/${tenantSlug}/demo-fields`}>
        <AuthenticatedRoute>
          <StandardFieldsDemo />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/tenant-verification`}>
        <AuthenticatedRoute>
          <TenantVerificationTest />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/notification-center`}>
        <AuthenticatedRoute>
          <NotificationCenter />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/tasks`}>
        <AuthenticatedRoute>
          <TasksPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/chat`}>
        <AuthenticatedRoute>
          <ChatPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/ai-tools/pdc-analyzer`}>
        <AuthenticatedRoute>
          <PDCAnalyzerPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/ai-tools`}>
        <AuthenticatedRoute>
          <AIToolsDashboardPage />
        </AuthenticatedRoute>
      </Route>
      
      {/* 🎯 CRM ROUTE UNIFICATA - Usa state-based tabs come HR (niente più sub-routes!) */}
      <Route path={`/${tenantSlug}/crm`}>
        <AuthenticatedRoute>
          <CRMPage />
        </AuthenticatedRoute>
      </Route>
      
      <Route path={`/${tenantSlug}/dashboard`}>
        <AuthenticatedRoute>
          <DashboardPage />
        </AuthenticatedRoute>
      </Route>
      
      {/* Legacy redirects */}
      <Route path={`/${tenantSlug}/calendar`}>
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path={`/${tenantSlug}/time-tracking`}>
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path={`/${tenantSlug}/leave-management`}>
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path={`/${tenantSlug}/shift-planning`}>
        <Redirect to={`/${tenantSlug}/hr-management`} replace />
      </Route>
      <Route path={`/${tenantSlug}/documents`}>
        <Redirect to={`/${tenantSlug}/portale`} replace />
      </Route>
      <Route path={`/${tenantSlug}/expense-management`}>
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
      <Route path={`/${tenantSlug}`}>
        <Redirect to={`/${tenantSlug}/dashboard`} replace />
      </Route>
      
      {/* 404 for unmatched routes */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
    </Suspense>
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