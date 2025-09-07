import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Route, Switch } from "wouter";
import LoginBrand from "./pages/LoginBrand";
import DashboardBrand from "./pages/DashboardBrand";
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
      <Route path="/brandinterface/login" component={LoginBrand} />
      <Route path="/brandinterface/*">
        <DashboardBrand />
      </Route>
      <Route path="/brandinterface" component={DashboardBrand} />
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