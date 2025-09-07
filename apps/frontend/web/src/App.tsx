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
  console.log('Router rendering');
  return (
    <Switch>
      {/* Route con tenant nel path */}
      <Route path="/:tenant/login">
        {(params) => {
          console.log('Login route matched:', params);
          return <TenantWrapper params={params}><Login tenantCode={params.tenant} /></TenantWrapper>;
        }}
      </Route>
      <Route path="/:tenant/settings">
        {(params) => <TenantWrapper params={params}><SettingsPage /></TenantWrapper>}
      </Route>
      <Route path="/:tenant/demo-fields">
        {(params) => <TenantWrapper params={params}><StandardFieldsDemo /></TenantWrapper>}
      </Route>
      <Route path="/:tenant">
        {(params) => {
          console.log('Main route matched:', params);
          return <TenantWrapper params={params}><MainApp /></TenantWrapper>;
        }}
      </Route>
      {/* Fallback - redirect a staging */}
      <Route>
        {() => {
          console.log('Fallback route triggered');
          window.location.href = '/staging';
          return null;
        }}
      </Route>
    </Switch>
  );
}

// Component wrapper per gestire il tenant - SEMPLIFICATO PER DEBUG
function TenantWrapper({ params, children }: { params: any, children: React.ReactNode }) {
  const tenant = params.tenant;
  console.log('TenantWrapper rendering for tenant:', tenant);
  
  // RIMUOVO TEMPORANEAMENTE useEffect che potrebbe causare loop
  
  return <>{children}</>;
}

// Main app component che gestisce autenticazione - DEBUG COMPLETO
function MainApp() {
  const params = useParams();
  const tenant = (params as any).tenant;
  console.log('MainApp rendering for tenant:', tenant);
  
  // TEMPORANEAMENTE IGNORO L'AUTENTICAZIONE PER ISOLARE IL LOOP
  // const { isAuthenticated, isLoading } = useAuth();
  
  console.log('MainApp: showing login directly');
  return <Login tenantCode={tenant} />;
}