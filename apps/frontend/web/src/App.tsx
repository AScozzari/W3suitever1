import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { Route, Switch } from "wouter";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";

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
  const { isAuthenticated, isLoading, user } = useAuth();
  
  console.log('Auth status:', { isAuthenticated, isLoading, user });
  
  // Debug panel per testing
  if (window.location.search.includes('debug=true')) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h2>Debug Auth</h2>
        <p>isLoading: {String(isLoading)}</p>
        <p>isAuthenticated: {String(isAuthenticated)}</p>
        <p>user: {JSON.stringify(user)}</p>
        <button onClick={() => {
          localStorage.clear();
          queryClient.clear();
          window.location.href = '/';
        }}>Clear All & Reload</button>
      </div>
    );
  }

  if (isLoading) {
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
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: 'white', fontSize: '24px' }}>Caricamento WindTre Suite...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/" component={DashboardPage} />
    </Switch>
  );
}