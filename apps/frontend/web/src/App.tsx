import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { Route, Switch, useParams, Redirect } from "wouter";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
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

// Wrapper component per gestire il tenant dal path
function TenantRouter() {
  const params = useParams();
  const tenant = (params as any).tenant;
  
  useEffect(() => {
    // Salva il tenant dal path in localStorage per persistenza
    if (tenant) {
      localStorage.setItem('currentTenant', tenant);
      
      // Mappa il codice tenant all'ID
      const tenantMapping: Record<string, string> = {
        'demo': '00000000-0000-0000-0000-000000000001',
        'acme': '11111111-1111-1111-1111-111111111111',
        'tech': '22222222-2222-2222-2222-222222222222'
      };
      
      const tenantId = tenantMapping[tenant] || tenantMapping['demo'];
      localStorage.setItem('currentTenantId', tenantId);
    }
  }, [tenant]);
  
  const { isAuthenticated, isLoading, user } = useAuth();
  
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
    return <Login tenantCode={tenant} />;
  }

  return (
    <Switch>
      <Route path="/:tenant/settings" component={SettingsPage} />
      <Route path="/:tenant" component={DashboardPage} />
    </Switch>
  );
}

function Router() {
  // Se non c'è tenant nel path, redirect a /demo
  const currentPath = window.location.pathname;
  
  // Lista dei tenant validi
  const validTenants = ['demo', 'acme', 'tech'];
  const pathSegments = currentPath.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // Se non c'è tenant o non è valido, redirect a demo
  if (!firstSegment || !validTenants.includes(firstSegment)) {
    // Se siamo già nel login o in un path specifico, mantieni il path
    const savedTenant = localStorage.getItem('currentTenant') || 'demo';
    window.location.href = `/${savedTenant}`;
    return null;
  }
  
  return <TenantRouter />;
}