import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Route, Switch } from "wouter";
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
            <Router />
          </BrandAuthProvider>
        </BrandTenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Router() {
  return (
    <Switch>
      {/* Brand Interface Login routes - con e senza tenant */}
      <Route path="/brandinterface/:tenant/login">
        {(params) => <BrandTenantWrapper params={params}><Login /></BrandTenantWrapper>}
      </Route>
      <Route path="/brandinterface/login" component={Login} />
      
      {/* Brand Interface Dashboard routes - tenant-specific */}
      <Route path="/brandinterface/:tenant/*">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      <Route path="/brandinterface/:tenant">
        {(params) => <BrandTenantWrapper params={params}><Dashboard /></BrandTenantWrapper>}
      </Route>
      
      {/* Brand Interface Dashboard routes - cross-tenant */}
      <Route path="/brandinterface/*">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
      <Route path="/brandinterface">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
      
      {/* Fallback to brand interface */}
      <Route>
        {() => {
          window.location.href = '/brandinterface';
          return null;
        }}
      </Route>
    </Switch>
  );
}