import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";
import { BrandTenantProvider, BrandTenantWrapper } from "./contexts/BrandTenantContext";

export default function App() {
  return (
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
  );
}

function Routes() {
  return (
    <>
      {/* Brand Interface Login routes - con e senza tenant */}
      <Route path="/:tenant/login">
        {(params) => <BrandTenantWrapper params={params}><Login /></BrandTenantWrapper>}
      </Route>
      <Route path="/login" component={Login} />
      
      {/* Brand Interface Dashboard routes - tenant-specific */}
      <Route path="/:tenant/*">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      <Route path="/:tenant">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      
      {/* Brand Interface Dashboard routes - cross-tenant */}
      <Route path="/*">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
      <Route path="/">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
    </>
  );
}