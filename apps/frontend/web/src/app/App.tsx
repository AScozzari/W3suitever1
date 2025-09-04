import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

// Layout components
import { AppShell } from '../layout/AppShell';

// Feature pages
import { Dashboard } from '../features/dashboard/Dashboard';
import { CassaPage } from '../features/cassa/CassaPage';
import { MagazzinoPage } from '../features/magazzino/MagazzinoPage';
import { CrmPage } from '../features/crm/CrmPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AnalyticsPage } from '../features/report/AnalyticsPage';
import { HrPage } from '../features/hr/HrPage';
import { CmsPage } from '../features/cms/CmsPage';
import { GarePage } from '../features/gare/GarePage';

// Auth pages
import { LoginPage } from '../features/auth/LoginPage';

// Core providers and hooks
import { useAuth } from '../hooks/useAuth';
import { ThemeProvider } from '../core/providers/ThemeProvider';
import { TenantProvider } from '../components/TenantProvider';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, x: -20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: 20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<any>(null);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <TenantProvider tenant={currentTenant} setTenant={setCurrentTenant}>
      <Router>
        <AppShell user={user as any} tenant={currentTenant}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/cassa" component={CassaPage} />
            <Route path="/magazzino" component={MagazzinoPage} />
            <Route path="/crm" component={CrmPage} />
            <Route path="/analytics" component={AnalyticsPage} />
            <Route path="/hr" component={HrPage} />
            <Route path="/cms" component={CmsPage} />
            <Route path="/gare" component={GarePage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={() => <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 - Pagina non trovata</h1></div>} />
          </Switch>
        </AppShell>
      </Router>
    </TenantProvider>
  );
}

// Page wrapper with animations
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 dark:from-neutral-950 dark:via-primary-950/20 dark:to-secondary-950/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4">
          <div className="w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gradient-brand mb-2">
          W3 Suite
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Caricamento in corso...
        </p>
      </motion.div>
    </div>
  );
}

// 404 Not Found component
function NotFound() {
  return (
    <PageWrapper>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-6xl font-bold text-gradient-brand mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Pagina non trovata
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          <motion.a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Torna alla Dashboard
          </motion.a>
        </motion.div>
      </div>
    </PageWrapper>
  );
}