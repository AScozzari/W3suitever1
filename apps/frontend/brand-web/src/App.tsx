import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Route, Switch } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandAuthProvider } from "./contexts/BrandAuthContext";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandAuthProvider>
          <Router />
        </BrandAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/brandinterface/login" component={Login} />
      <Route path="/brandinterface/*">
        <Dashboard />
      </Route>
      <Route path="/brandinterface" component={Dashboard} />
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