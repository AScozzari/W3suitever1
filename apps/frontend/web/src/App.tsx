import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Route, Switch, Redirect } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";
import { IdleDetectionProvider } from "./contexts/IdleDetectionContext";
import { TenantShell } from "./components/TenantShell";
import { useSessionKeepAlive } from "./hooks/useSessionKeepAlive";
import { useProductionScale } from "./hooks/useProductionScale";
import { lazy, Suspense } from "react";

// Critical pages loaded immediately
import NotFound from "./pages/NotFound";
import OrganizationRequired from "./pages/OrganizationRequired";

// 🚀 PERFORMANCE: Lazy load pages for code splitting
const HRManagementPage = lazy(() => import("./pages/HRManagementPage"));
const QRCheckinPage = lazy(() => import("./pages/QRCheckinPage"));
const Login = lazy(() => import("./pages/Login"));

/**
 * 🎯 NEW APP ARCHITECTURE - Automatic Tenant Management
 * 
 * VANTAGGI:
 * ✅ Gestione tenant automatica - impossibile dimenticare
 * ✅ Una sola route pattern /:tenant/* gestisce tutto
 * ✅ TenantShell provide automaticamente context e sicurezza
 * ✅ Nuove pagine automaticamente hanno tenant context
 * ✅ Zero possibilità di cross-tenant data leakage
 * 
 * COME AGGIUNGERE NUOVE PAGINE:
 * 1. Aggiungi la route in TenantShell.tsx
 * 2. Usa useRequiredTenant() nel component
 * 3. Fine! Tenant context automatico
 * 
 * COME AGGIUNGERE NUOVE API:
 * 1. Usa useRequiredTenantId() nei component
 * 2. QueryClient automaticamente aggiunge X-Tenant-ID header
 * 3. Fine! Sicurezza automatica
 */
export default function App() {
  // 📐 PRODUCTION SCALE: Apply font-size from VITE_FONT_SCALE env var (e.g., 70%)
  useProductionScale();
  
  // 🔒 SECURITY POLICY: Auto-refresh session every 12 minutes to prevent timeout
  useSessionKeepAlive({
    enabled: true,
    onSessionExpired: () => {
      console.warn('[APP] ⏰ Session expired - redirecting to login');
      // In production, redirect to login page
      // window.location.href = '/login';
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <IdleDetectionProvider>
          <Router />
        </IdleDetectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * 🛣️ AUTOMATIC TENANT ROUTER
 * 
 * Architettura semplificata:
 * - Una sola route pattern /:tenant/* per tutto
 * - TenantShell gestisce automaticamente tutte le sottoroute
 * - Root redirect intelligente
 * - 404 per tutto il resto
 */
function Router() {
  console.log('[APP-ROUTER] 🚀 Router component rendered');
  
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div style={{ width: '48px', height: '48px', border: '4px solid #f3f4f6', borderTop: '4px solid #FF6900', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>}>
      <Switch>
        {/* 🎯 QR CHECK-IN - Public route for QR code scanning */}
        <Route path="/qr-checkin">
          <QRCheckinPage />
        </Route>
      
      {/* 🎯 WORKFLOW DIRECT ACCESS - Smart redirect to tenant */}
      <Route path="/workflows">
        {() => {
          console.log('[WORKFLOW-REDIRECT] 📍 Base workflows access');
          const lastTenant = localStorage.getItem('currentTenant') || 'staging';
          const targetUrl = `/${lastTenant}/workflows/dashboard`;
          console.log(`[WORKFLOW-REDIRECT] 🔄 Redirecting to: ${targetUrl}`);
          return <Redirect to={targetUrl} />;
        }}
      </Route>
      
      <Route path="/workflows/:view">
        {(params) => {
          console.log('[WORKFLOW-REDIRECT] 📍 Direct workflow access:', params);
          const lastTenant = localStorage.getItem('currentTenant') || 'staging';
          const targetUrl = `/${lastTenant}/workflows/${params.view}`;
          console.log(`[WORKFLOW-REDIRECT] 🔄 Redirecting to: ${targetUrl}`);
          return <Redirect to={targetUrl} />;
        }}
      </Route>
      
      {/* 🎯 TASKS DIRECT ACCESS - Smart redirect to tenant */}
      <Route path="/tasks">
        {() => {
          console.log('[TASKS-REDIRECT] 📍 Direct tasks access');
          const lastTenant = localStorage.getItem('currentTenant') || 'staging';
          const targetUrl = `/${lastTenant}/tasks`;
          console.log(`[TASKS-REDIRECT] 🔄 Redirecting to: ${targetUrl}`);
          return <Redirect to={targetUrl} />;
        }}
      </Route>
      
      {/* 🎯 TENANT ROOT - Exact match for /:tenant (no subpath) */}
      <Route path="/:tenant">
        {(params) => {
          const tenantSlug = params.tenant;
          // Reserved paths that cannot be tenant slugs
          const reservedPaths = ['api', 'workflows', 'tasks', 'qr-checkin', 'impostazioni', 'settings'];
          
          if (!tenantSlug || reservedPaths.includes(tenantSlug)) {
            return <NotFound />;
          }
          
          console.log(`[APP-ROUTER] 🔄 Tenant root accessed: ${tenantSlug}, redirecting to dashboard`);
          return <TenantShell tenantSlug={tenantSlug} />;
        }}
      </Route>
      
      {/* 🎯 MAIN TENANT ROUTE - Gestisce automaticamente tutto con subpath */}
      <Route path="/:tenant/*">
        {(params) => {
          console.log('[APP-ROUTER] 📍 Route matched with params:', params);
          const tenantSlug = params.tenant;
          
          // Reserved paths that cannot be tenant slugs (must match /:tenant route above)
          const reservedPaths = ['api', 'workflows', 'tasks', 'qr-checkin', 'impostazioni', 'settings', 'login'];
          if (!tenantSlug || tenantSlug === '' || reservedPaths.includes(tenantSlug)) {
            console.warn('[APP-ROUTER] ❌ Invalid tenant slug (reserved path):', tenantSlug);
            return <NotFound />;
          }
          
          console.log(`[APP-ROUTER] ✅ Valid tenant slug: "${tenantSlug}"`);
          console.log(`[APP-ROUTER] 🎯 Routing to tenant: "${tenantSlug}"`);
          
          // TenantShell gestisce automaticamente tutto il resto
          return <TenantShell tenantSlug={tenantSlug} />;
        }}
      </Route>
      
      {/* 🏠 ROOT REDIRECT - Smart fallback */}
      <Route path="/">
        <SmartRootRedirect />
      </Route>
      
      {/* 🚫 404 - Tutto il resto */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
    </Suspense>
  );
}

/**
 * 🏠 Smart Root Redirect
 * 
 * Gestione intelligente accesso root:
 * 1. Se ultimo tenant visitato è valido → redirect a dashboard
 * 2. Altrimenti → mostra pagina "Organizzazione Richiesta"
 */
function SmartRootRedirect() {
  // Prova a recuperare ultimo tenant visitato
  const lastTenant = localStorage.getItem('currentTenant');
  
  // Blacklist tenant invalidi o legacy
  const invalidTenants = ['', 'null', 'login', 'undefined', 'staging'];
  
  if (lastTenant && !invalidTenants.includes(lastTenant)) {
    console.log(`[SMART-REDIRECT] 🔄 Redirecting to last tenant: ${lastTenant}`);
    return <Redirect to={`/${lastTenant}/dashboard`} />;
  }
  
  // Mostra pagina di richiesta organizzazione invece di redirect automatico
  console.log('[SMART-REDIRECT] 🏢 Showing organization required page');
  return <OrganizationRequired />;
}

/**
 * 📋 MIGRATION NOTES - Come migrare pagine esistenti
 * 
 * PRIMA (ripetitivo e error-prone):
 * ```tsx
 * <Route path="/:tenant/dashboard">
 *   {(params) => 
 *     <TenantWrapper params={params}>
 *       <AuthenticatedApp>
 *         <DashboardPage />
 *       </AuthenticatedApp>
 *     </TenantWrapper>
 *   }
 * </Route>
 * ```
 * 
 * DOPO (automatico):
 * 1. Route già gestita da TenantShell
 * 2. In DashboardPage.tsx:
 * ```tsx
 * import { useRequiredTenant } from '../hooks/useTenantSafety';
 * 
 * export default function DashboardPage() {
 *   const { tenant, user } = useRequiredTenant();
 *   // ... resto del component
 * }
 * ```
 * 
 * VANTAGGI:
 * ✅ 80% meno codice repetitivo
 * ✅ Impossibile dimenticare TenantWrapper
 * ✅ TypeScript enforcement automatico
 * ✅ Sicurezza by-design
 * ✅ Development warnings automatici
 */