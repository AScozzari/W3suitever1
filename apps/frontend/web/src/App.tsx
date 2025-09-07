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


function Router() {
  return (
    <Switch>
      {/* Route con tenant nel path */}
      <Route path="/:tenant/login">
        {(params) => <TenantWrapper params={params}><Login tenantCode={params.tenant} /></TenantWrapper>}
      </Route>
      <Route path="/:tenant/settings">
        {(params) => <TenantWrapper params={params}><SettingsPage /></TenantWrapper>}
      </Route>
      <Route path="/:tenant/demo-fields">
        {(params) => <TenantWrapper params={params}><StandardFieldsDemo /></TenantWrapper>}
      </Route>
      <Route path="/:tenant">
        {(params) => <TenantWrapper params={params}><MainApp /></TenantWrapper>}
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

// Main app component che gestisce autenticazione - TEMPORANEAMENTE SEMPLIFICATO
function MainApp() {
  const params = useParams();
  const tenant = (params as any).tenant;
  
  console.log('MainApp render - SIMPLE VERSION:', { tenant });
  
  // Per ora IGNORIAMO completamente l'autenticazione per debug
  // Mostriamo sempre il login
  return <Login tenantCode={tenant} />;
}