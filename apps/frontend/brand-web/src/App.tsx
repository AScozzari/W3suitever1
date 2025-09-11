import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";
import { BrandTenantProvider, BrandTenantWrapper } from "./contexts/BrandTenantContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  console.log('[Brand Interface] App mounting...');
  console.log('[Brand Interface] Route location:', window.location.pathname);
  
  return (
    <ErrorBoundary>
      <div style={{ padding: '20px', background: 'lightgreen', border: '2px solid green' }}>
        <h1>🚀 BRAND INTERFACE BOOT TEST</h1>
        <p>Route: {window.location.pathname}</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </div>
      {/* TEMPORANEO: Provider incrementale - aggiungerò uno alla volta */}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div style={{ padding: '10px', background: 'yellow', border: '1px solid orange' }}>
            <p>✅ QueryClient + Theme loaded</p>
            <Router base="/brandinterface">
              <Route path="/">
                <div style={{ padding: '20px', background: 'lightblue' }}>
                  <h2>🏠 DEFAULT ROUTE TEST</h2>
                  <p>Base route working!</p>
                </div>
              </Route>
              <Route path="/login">
                <div style={{ padding: '20px', background: 'lightcoral' }}>
                  <h2>🔐 LOGIN ROUTE TEST</h2>
                  <p>Login route working!</p>
                </div>
              </Route>
              <Route>
                <div style={{ padding: '20px', background: 'lightgray' }}>
                  <h2>🌍 CATCH-ALL ROUTE</h2>
                  <p>Route: {window.location.pathname}</p>
                </div>
              </Route>
            </Router>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function Routes() {
  return (
    <>
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
      
      <Route path="/*">
        <BrandTenantWrapper params={null}><Dashboard /></BrandTenantWrapper>
      </Route>
    </>
  );
}