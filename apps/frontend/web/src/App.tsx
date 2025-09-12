import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { Route, Switch, useParams, Redirect } from "wouter";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import StandardFieldsDemo from "./pages/StandardFieldsDemo";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
import { oauth2Client } from "./services/OAuth2Client";
import { useEffect } from "react";

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

// OAuth2 Callback Handler Component - MOVE BEFORE Router
function OAuth2CallbackHandler() {
  useEffect(() => {
    const handleOAuth2Callback = async () => {
      try {
        await oauth2Client.handleCallback();
        
        // Get current tenant and redirect to dashboard
        const currentTenant = localStorage.getItem('currentTenant') || 'staging';
        window.location.href = `/${currentTenant}/dashboard`;
      } catch (error) {
        // Redirect to login on error
        window.location.href = '/staging/login';
      }
    };

    handleOAuth2Callback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2 style={{ color: 'white', fontSize: '24px' }}>Completamento login...</h2>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* OAuth2 Callback Route - BEFORE tenant routes */}
      <Route path="/auth/callback">
        {() => <OAuth2CallbackHandler />}
      </Route>
      
      {/* Route dedicate per login */}
      <Route path="/:tenant/login">
        {(params) => <TenantWrapper params={params}><LoginPage /></TenantWrapper>}
      </Route>
      
      {/* Route con tenant nel path - richiedono autenticazione */}
      <Route path="/:tenant/settings">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><SettingsPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/demo-fields">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><StandardFieldsDemo /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/dashboard">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><DashboardPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      
      {/* Route root tenant - redirect basato su auth */}
      <Route path="/:tenant">
        {(params) => <TenantWrapper params={params}><TenantRoot /></TenantWrapper>}
      </Route>
      
      {/* Fallback - redirect a staging */}
      <Route>
        {() => {
          window.location.href = '/staging';
          return null;
        }}
      </Route>
    </Switch>
  );
}

// Component wrapper per gestire il tenant
function TenantWrapper({ params, children }: { params: any, children: React.ReactNode }) {
  const tenant = params.tenant;
  
  useEffect(() => {
    // Salva il tenant corrente
    if (tenant) {
      localStorage.setItem('currentTenant', tenant);
      
      const tenantMapping: Record<string, string> = {
        'staging': '00000000-0000-0000-0000-000000000001',
        'demo': '99999999-9999-9999-9999-999999999999',
        'acme': '11111111-1111-1111-1111-111111111111',
        'tech': '22222222-2222-2222-2222-222222222222'
      };
      
      const tenantId = tenantMapping[tenant] || tenantMapping['staging'];
      localStorage.setItem('currentTenantId', tenantId);
    }
  }, [tenant]);
  
  return <>{children}</>;
}


// Componente per gestire il redirect dal root tenant
function TenantRoot() {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const tenant = (params as any).tenant;
  
  useEffect(() => {
    if (!isLoading) {
      const currentTenant = tenant || 'staging'; // Default to staging if no tenant
      if (isAuthenticated) {
        // Se autenticato, vai alla dashboard
        window.location.href = `/${currentTenant}/dashboard`;
      } else {
        // Se non autenticato, vai al login della frontend W3 Suite
        window.location.href = `/${currentTenant}/login`;
      }
    }
  }, [isAuthenticated, isLoading, tenant]);

  // Loading screen durante il check
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2 style={{ color: 'white', fontSize: '24px' }}>Caricamento W3 Suite...</h2>
      </div>
    </div>
  );
}

// Pagina login dedicata
function LoginPage() {
  const params = useParams();
  const tenant = (params as any).tenant;
  return <Login tenantCode={tenant} />;
}

// Wrapper per pagine che richiedono autenticazione
function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const tenant = (params as any).tenant;
  
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: 'white', fontSize: '24px' }}>Caricamento W3 Suite...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to canonical login route
    window.location.href = `/${tenant}/login`;
    return null;
  }

  return <>{children}</>;
}