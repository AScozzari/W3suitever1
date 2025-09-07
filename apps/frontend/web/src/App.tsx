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
  console.log('App rendering');
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


// ROUTER COMPLETAMENTE STATICO PER DEBUG - IGNORA TUTTO IL ROUTING
function Router() {
  console.log('Static Router rendering');
  
  // IGNORO COMPLETAMENTE WOUTER E MOSTRO CONTENUTO STATICO
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
        border: '1px solid rgba(255, 255, 255, 0.2)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>
          W3 Suite - STATIC TEST
        </h1>
        <p style={{ color: 'white', opacity: 0.8 }}>
          Se vedi questo senza loop, il problema è nel routing
        </p>
      </div>
    </div>
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