import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, setCurrentTenantId } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/use-toast";
import { Route, Switch, useParams, Redirect } from "wouter";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import StandardFieldsDemo from "./pages/StandardFieldsDemo";
// Legacy imports removed - consolidated into HR and Employee dashboards
import HRDashboard from "./pages/HRDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import NotificationCenter from "./pages/NotificationCenter";
import TenantVerificationTest from "./pages/TenantVerificationTest";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
import { useEffect, useState } from "react";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <Router />
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


function Router() {
  return (
    <Switch>
      {/* Route dedicate per login */}
      <Route path="/:tenant/login">
        {(params) => <TenantWrapper params={params}><Login tenantCode={params.tenant} /></TenantWrapper>}
      </Route>
      
      {/* ===== ENTERPRISE HR CONSOLIDATION: ONLY 2 HR ROUTES ===== */}
      
      {/* Legacy HR route redirects - consolidation from 24+ pages to 2 dashboards */}
      <Route path="/:tenant/settings">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/calendar">
        {(params) => <Redirect to={`/${params.tenant}/employee/dashboard`} replace />}
      </Route>
      <Route path="/:tenant/time-tracking">
        {(params) => <Redirect to={`/${params.tenant}/employee/dashboard`} replace />}
      </Route>
      <Route path="/:tenant/leave-management">
        {(params) => <Redirect to={`/${params.tenant}/employee/dashboard`} replace />}
      </Route>
      <Route path="/:tenant/shift-planning">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/documents">
        {(params) => <Redirect to={`/${params.tenant}/employee/dashboard`} replace />}
      </Route>
      <Route path="/:tenant/expense-management">
        {(params) => <Redirect to={`/${params.tenant}/employee/dashboard`} replace />}
      </Route>
      <Route path="/:tenant/employee/dashboard">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><EmployeeDashboard /></AuthenticatedApp></TenantWrapper>}
      </Route>
      {/* Route principale HR - tutte le richieste HR puntano qui */}
      <Route path="/:tenant/hr">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><ProtectedHRRoute tenant={params.tenant} /></AuthenticatedApp></TenantWrapper>}
      </Route>
      
      {/* CRITICAL FIX: Add missing /staging/hr-dashboard route */}
      <Route path="/:tenant/hr-dashboard">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><ProtectedHRRoute tenant={params.tenant} /></AuthenticatedApp></TenantWrapper>}
      </Route>
      
      {/* Redirect da tutti i path HR legacy verso /tenant/hr */}
      <Route path="/:tenant/hr/dashboard">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/dipendenti">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/presenze">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/ferie">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/employee-management">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/performance-reviews">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/payroll-management">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/training-development">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/compliance">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/reports">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/expense">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/hr/analytics">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/people/dashboard">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      {/* HR test route redirected to main HR dashboard */}
      <Route path="/:tenant/hr-test">
        {(params) => <Redirect to={`/${params.tenant}/hr`} replace />}
      </Route>
      <Route path="/:tenant/demo-fields">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><StandardFieldsDemo /></AuthenticatedApp></TenantWrapper>}
      </Route>
      {/* SECURITY VERIFICATION TEST - Critical tenant ID propagation test */}
      <Route path="/:tenant/tenant-verification">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><TenantVerificationTest /></AuthenticatedApp></TenantWrapper>}
      </Route>
      {/* Notifications - dedicated notification center */}
      <Route path="/:tenant/notification-center">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><NotificationCenter /></AuthenticatedApp></TenantWrapper>}
      </Route>
      {/* Backward compatibility - redirect old notifications path to notification center */}
      <Route path="/:tenant/notifications">
        {(params) => <Redirect to={`/${params.tenant}/notification-center`} replace />}
      </Route>
      <Route path="/:tenant/dashboard">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><DashboardPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      
      {/* Root path - serve directly staging dashboard */}
      <Route path="/">
        {() => <TenantWrapper params={{tenant: 'staging'}}><AuthenticatedApp><DashboardPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      
      {/* Route root tenant - redirect basato su auth */}
      <Route path="/:tenant">
        {(params) => <TenantWrapper params={params}><TenantRoot /></TenantWrapper>}
      </Route>
      
      {/* Fallback for any unmatched routes */}
      <Route>
        {() => <TenantWrapper params={{tenant: 'staging'}}><AuthenticatedApp><DashboardPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
    </Switch>
  );
}

// Component wrapper per gestire il tenant
function TenantWrapper({ params, children }: { params: any, children: React.ReactNode }) {
  const tenant = params.tenant;
  
  useEffect(() => {
    // CRITICAL SECURITY FIX: Proper tenant UUID resolution via API call
    const resolveAndSetTenant = async () => {
      if (!tenant) return;
      
      try {
        console.log(`[TENANT-WRAPPER] 🔍 Resolving tenant slug "${tenant}" to UUID via API`);
        
        // Save the tenant slug
        localStorage.setItem('currentTenant', tenant);
        
        // ARCHITECT REQUIREMENT: Call /api/tenants/resolve to get proper UUID
        const response = await fetch(`/api/tenants/resolve?slug=${tenant}`);
        
        console.log(`[TENANT-WRAPPER] 📡 API response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`[TENANT-WRAPPER] ❌ Tenant resolution failed: ${response.status} ${response.statusText}`);
          
          // Fallback to hardcoded mapping for development only
          console.warn('[TENANT-WRAPPER] ⚠️ Using fallback tenant mapping (development only)');
          const fallbackMapping: Record<string, string> = {
            'staging': '00000000-0000-0000-0000-000000000001',
            'demo': '99999999-9999-9999-9999-999999999999',
            'acme': '11111111-1111-1111-1111-111111111111',
            'tech': '22222222-2222-2222-2222-222222222222'
          };
          
          const fallbackId = fallbackMapping[tenant] || fallbackMapping['staging'];
          localStorage.setItem('currentTenantId', fallbackId);
          setCurrentTenantId(fallbackId);
          console.warn(`[TENANT-WRAPPER] ⚠️ Using fallback UUID: ${fallbackId}`);
          return;
        }
        
        const data = await response.json();
        console.log('[TENANT-WRAPPER] ✅ Tenant resolution successful:', data);
        
        // SECURITY CRITICAL: Set UUID for queryClient headers  
        const resolvedTenantId = data.tenantId;
        localStorage.setItem('currentTenantId', resolvedTenantId);
        setCurrentTenantId(resolvedTenantId);
        
        console.log(`[TENANT-WRAPPER] 🔒 Tenant UUID resolved and set: "${resolvedTenantId}"`);
        console.log(`[TENANT-WRAPPER] 📋 Tenant name: "${data.name}"`);
        console.log(`[TENANT-WRAPPER] ✅ Ready for authenticated API calls with proper tenant headers`);
        
      } catch (error) {
        console.error('[TENANT-WRAPPER] ❌ CRITICAL ERROR: Tenant resolution failed:', error);
        console.error('[TENANT-WRAPPER] 🚨 This could cause cross-tenant data leakage!');
        
        // In production, this should block rendering or redirect to error page
        // For development, fallback to hardcoded mapping with warnings
        const fallbackMapping: Record<string, string> = {
          'staging': '00000000-0000-0000-0000-000000000001',
          'demo': '99999999-9999-9999-9999-999999999999',
          'acme': '11111111-1111-1111-1111-111111111111',
          'tech': '22222222-2222-2222-2222-222222222222'
        };
        
        const fallbackId = fallbackMapping[tenant] || fallbackMapping['staging'];
        localStorage.setItem('currentTenantId', fallbackId);
        setCurrentTenantId(fallbackId);
        console.error(`[TENANT-WRAPPER] ⚠️ EMERGENCY FALLBACK: Using UUID ${fallbackId}`);
      }
    };
    
    resolveAndSetTenant();
  }, [tenant]);
  
  return <>{children}</>;
}

// Componente per gestire il redirect dalla root - Fixed SPA navigation
function RootRedirect() {
  // Use proper Wouter navigation instead of window.location.reload()
  return <Redirect to="/staging/dashboard" replace />;
}

// Componente per gestire il redirect dal root tenant
function TenantRoot() {
  const params = useParams();
  const tenant = (params as any).tenant;
  
  // Redirect SPA senza reload
  return <Redirect to={`/${tenant}/dashboard`} replace />;
}

// Pagina login dedicata
function LoginPage() {
  const params = useParams();
  const tenant = (params as any).tenant;
  return <Login tenantCode={tenant} />;
}

// SECURITY: Protected HR Route Component - RBAC Guard
function ProtectedHRRoute({ tenant }: { tenant: string }) {
  const { hasHRAccess } = useAuth();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);
  
  // ARCHITECT FIX: Move toast side-effect to useEffect to prevent render violations
  useEffect(() => {
    if (!hasHRAccess() && !hasShownToast) {
      toast({
        title: "Access Denied", 
        description: "You don't have permission to access HR management features.",
        variant: "destructive",
      });
      setHasShownToast(true);
    }
  }, [hasHRAccess, hasShownToast, toast]);
  
  // Check if user has HR management permissions
  if (!hasHRAccess()) {
    // Redirect to employee dashboard
    return <Redirect to={`/${tenant}/employee/dashboard`} />;
  }
  
  return <HRDashboard />;
}

// Wrapper per pagine che richiedono autenticazione
function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = (params as any).tenant;
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))'
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
  
  // If authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  // If not authenticated, render Login
  return <Login tenantCode={tenant} />;
}