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
  
  // Versione semplificata per debug
  return (
    <ErrorBoundary>
      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h1>Brand Interface - Debug Mode</h1>
        <p>If you see this, React is rendering!</p>
        <Router base="/brandinterface">
          <Routes />
        </Router>
      </div>
    </ErrorBoundary>
  );
}

function Routes() {
  return (
    <>
      <Route path="/login">
        <div style={{ padding: '20px' }}>
          <h2>Login Page - Debug</h2>
          <p>Route matched: /login</p>
        </div>
      </Route>
      
      <Route path="/*">
        <div style={{ padding: '20px' }}>
          <h2>Dashboard - Debug</h2>
          <p>Catch-all route matched</p>
        </div>
      </Route>
    </>
  );
}