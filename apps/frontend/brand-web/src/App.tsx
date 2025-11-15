import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BrandCRM from "./pages/BrandCRM";
import AIManagement from "./pages/AIManagement";
import Management from "./pages/Management";
import OrganizationDetail from "./pages/OrganizationDetail";
import WMSCatalogPage from "./pages/wms/WMSCatalogPage";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";
import { BrandTenantProvider, BrandTenantWrapper } from "./contexts/BrandTenantContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";

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
              <Toaster />
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
      {/* Brand Interface routes - no tenant parameters needed */}
      <Route path="/login">
        <Login />
      </Route>
      
      <Route path="/dashboard">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
      <Route path="/crm">
        <BrandTenantWrapper params={null}><BrandCRM /></BrandTenantWrapper>
      </Route>
      <Route path="/wms/catalog">
        <BrandTenantWrapper params={null}><WMSCatalogPage /></BrandTenantWrapper>
      </Route>
      <Route path="/ai-management">
        <BrandTenantWrapper params={null}><AIManagement /></BrandTenantWrapper>
      </Route>
      <Route path="/management">
        <BrandTenantWrapper params={null}><Management /></BrandTenantWrapper>
      </Route>
      <Route path="/organizations/:orgId">
        <BrandTenantWrapper params={null}><OrganizationDetail /></BrandTenantWrapper>
      </Route>
      
      {/* Default route */}
      <Route path="/">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
    </Switch>
  );
}