import { Route, Switch, useLocation, useParams } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// import { Toaster } from "@/components/ui/toaster"; // Rimosso - file non esiste
import Layout from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { useEffect } from "react";
import StandardFieldsDemo from "./pages/StandardFieldsDemo";

// Component wrapper per tenant ID
function TenantWrapper({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = (params as any).tenant;
  
  useEffect(() => {
    if (tenant) {
      // Map tenant codes to IDs (using UUIDs for real tenants)
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

// Component per gestire il redirect dal root tenant - DISABILITATO PER ORA
function TenantRoot() {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const tenant = (params as any).tenant;
  
  // Temporaneamente disabilitato il redirect automatico per fermare i loop
  // useEffect(() => {
  //   if (!isLoading) {
  //     const currentTenant = tenant || 'staging';
  //     const currentPath = window.location.pathname;
  //     if (isAuthenticated) {
  //       const targetPath = `/${currentTenant}/dashboard`;
  //       if (!currentPath.includes('/dashboard')) {
  //         navigate(targetPath, { replace: true });
  //       }
  //     } else {
  //       const targetPath = `/${currentTenant}/login`;
  //       if (!currentPath.includes('/login')) {
  //         navigate(targetPath, { replace: true });
  //       }
  //     }
  //   }
  // }, [isAuthenticated, isLoading, tenant, navigate]);

  // Loading screen durante il check
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
        <h2 style={{ color: 'white', fontSize: '24px' }}>Caricamento W3 Suite...</h2>
        {!isLoading && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            {isAuthenticated ? (
              <a href={`/${tenant || 'staging'}/dashboard`} style={{ color: 'white', textDecoration: 'underline' }}>
                Vai alla Dashboard
              </a>
            ) : (
              <a href={`/${tenant || 'staging'}/login`} style={{ color: 'white', textDecoration: 'underline' }}>
                Vai al Login
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Pagina login dedicata
function LoginPage() {
  const params = useParams();
  const tenant = (params as any).tenant;
  return <Login tenantCode={tenant} />;
}

// Wrapper per pagine che richiedono autenticazione - DISABILITATO PER ORA
function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const tenant = (params as any).tenant;
  
  // Temporaneamente disabilitato il redirect automatico per fermare i loop
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     const currentPath = window.location.pathname;
  //     const targetPath = `/${tenant}/login`;
  //     if (!currentPath.includes('/login')) {
  //       navigate(targetPath, { replace: true });
  //     }
  //   }
  // }, [isAuthenticated, isLoading, tenant, navigate]);
  
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
          <h2 style={{ color: 'white', fontSize: '24px' }}>Caricamento W3 Suite...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
          <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '20px' }}>Non sei autenticato</h2>
          <a href={`/${tenant}/login`} style={{ color: 'white', textDecoration: 'underline' }}>
            Vai al Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <TenantWrapper>
            <Switch>
              {/* Root redirect to default tenant */}
              <Route path="/" component={TenantRoot} />
              
              {/* Tenant-specific routes */}
              <Route path="/:tenant" component={TenantRoot} />
              <Route path="/:tenant/login" component={LoginPage} />
              
              <Route path="/:tenant/dashboard">
                <AuthenticatedApp>
                  <DashboardPage />
                </AuthenticatedApp>
              </Route>
              
              <Route path="/:tenant/settings">
                <AuthenticatedApp>
                  <SettingsPage />
                </AuthenticatedApp>
              </Route>
              
              <Route path="/:tenant/standard-fields-demo">
                <AuthenticatedApp>
                  <StandardFieldsDemo />
                </AuthenticatedApp>
              </Route>
              
              {/* Fallback route */}
              <Route>
                <TenantRoot />
              </Route>
            </Switch>
          </TenantWrapper>
        </TenantProvider>
      </ThemeProvider>
      {/* <Toaster /> */}
    </QueryClientProvider>
  );
}