import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";
import { BrandTenantProvider, BrandTenantWrapper } from "./contexts/BrandTenantContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  
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
      <Route path="/:tenant/login">
        {(params) => <BrandTenantWrapper params={params}><Login /></BrandTenantWrapper>}
      </Route>
      
      <Route path="/:tenant/*">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      
      {/* EXACT route for base dashboard */}
      <Route path="/">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
    </Switch>
  );
}