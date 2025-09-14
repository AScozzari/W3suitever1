import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Entities from "./pages/Entities";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";
import { BrandTenantProvider, BrandTenantWrapper } from "./contexts/BrandTenantContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  // Brand Interface App mounting with providers
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrandTenantProvider>
            <BrandAuthProvider>
              <Router base="/brandinterface">
                <Routes />
              </Router>
            </BrandAuthProvider>
          </BrandTenantProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function Routes() {
  return (
    <Switch>
      {/* ORDINE CRITICO: Route statiche prima di quelle parametrizzate */}
      <Route path="/login">
        <Login />
      </Route>
      
      {/* Static routes */}
      <Route path="/dashboard">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
      <Route path="/crm">
        <BrandTenantWrapper params={null}><CRM /></BrandTenantWrapper>
      </Route>
      <Route path="/entities">
        <BrandTenantWrapper params={null}><Entities /></BrandTenantWrapper>
      </Route>
      
      {/* Tenant-specific routes */}
      <Route path="/:tenant/login">
        {(params) => <BrandTenantWrapper params={params}><Login /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant/dashboard">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant/crm">
        {(params) => <BrandTenantWrapper params={params}><CRM /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant/entities">
        {(params) => <BrandTenantWrapper params={params}><Entities /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      
      {/* Default route */}
      <Route path="/">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
    </Switch>
  );
}