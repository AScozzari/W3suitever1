import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { Route, Switch, useParams, Redirect } from "wouter";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import StandardFieldsDemo from "./pages/StandardFieldsDemo";
import CalendarPage from "./pages/CalendarPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import { LeaveManagementPage } from "./pages/LeaveManagementPage";
import ShiftPlanningPage from "./pages/ShiftPlanningPage";
import DocumentDrivePage from "./pages/DocumentDrivePage";
import ExpenseManagementPage from "./pages/ExpenseManagementPage";
import HRAnalyticsPage from "./pages/HRAnalyticsPage";
import HRDashboardSimple from "./pages/HRDashboardSimple";
import HRTestPage from "./pages/HRTestPage";
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
      {/* Route dedicate per login */}
      <Route path="/:tenant/login">
        {(params) => <TenantWrapper params={params}><LoginPage /></TenantWrapper>}
      </Route>
      
      {/* Route con tenant nel path - richiedono autenticazione */}
      <Route path="/:tenant/settings">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><SettingsPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/calendar">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><CalendarPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/time-tracking">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><TimeTrackingPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/leave-management">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><LeaveManagementPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/shift-planning">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><ShiftPlanningPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/documents">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><DocumentDrivePage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/expense-management">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><ExpenseManagementPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/hr-analytics">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><HRAnalyticsPage /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/hr">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><HRDashboardSimple /></AuthenticatedApp></TenantWrapper>}
      </Route>
      <Route path="/:tenant/hr-test">
        {(params) => <TenantWrapper params={params}><AuthenticatedApp><HRTestPage /></AuthenticatedApp></TenantWrapper>}
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
  const params = useParams();
  const tenant = (params as any).tenant;
  
  useEffect(() => {
    // Sempre vai alla dashboard
    window.location.href = `/${tenant}/dashboard`;
  }, [tenant]);

  // Loading screen durante il check (nascosto)
  return null;
}

// Pagina login dedicata
function LoginPage() {
  const params = useParams();
  const tenant = (params as any).tenant;
  return <Login tenantCode={tenant} />;
}

// Wrapper per pagine che richiedono autenticazione
function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = (params as any).tenant;
  
  // DEVELOPMENT MODE - Sempre autorizzato per staging
  const isDevelopment = true; // Forza sempre development mode per ora
  
  useEffect(() => {
    // Setta sempre un token demo per development
    const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZW1vLXVzZXIiLCJ0ZW5hbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.demo';
    localStorage.setItem('auth_token', demoToken);
    localStorage.setItem('currentTenant', tenant || 'staging');
    localStorage.setItem('currentTenantId', '00000000-0000-0000-0000-000000000001');
  }, [tenant]);

  // Sempre autorizzato in development
  return <>{children}</>;
}