import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StrategyCard from "@/components/strategy-card";
import ArchitectureDiagram from "@/components/architecture-diagram";
import ProjectStatusCard from "@/components/project-status-card";
import ResourceCard from "@/components/resource-card";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <Header />
        
        <div className="p-6 space-y-6">
          {/* Code Sharing Strategies */}
          <section>
            <h3 className="text-xl font-semibold mb-4 text-foreground">Replit Code Sharing Strategies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StrategyCard
                icon="template"
                title="Templates"
                description="Convert reusable code into templates for easy project initialization"
                features={["UI Components Library", "Design Tokens Package", "Auth Boilerplate"]}
                color="primary"
              />
              <StrategyCard
                icon="git-branch"
                title="GitHub Bridge"
                description="Use GitHub as intermediary for complex shared libraries"
                features={["Shared SDK Packages", "Database Schemas", "Common Utilities"]}
                color="secondary"
              />
              <StrategyCard
                icon="share"
                title="Public Forks"
                description="Create public projects that can be forked and referenced"
                features={["Demo Applications", "Integration Examples", "Configuration Presets"]}
                color="green"
              />
            </div>
          </section>

          {/* W3 Suite Architecture */}
          <section>
            <h3 className="text-xl font-semibold mb-4 text-foreground">W3 Suite Architecture</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ArchitectureDiagram />
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Project Status</h4>
                <ProjectStatusCard
                  name="Suite Frontend"
                  description="React 18 + Vite + Tailwind"
                  status="active"
                  statusText="Running"
                />
                <ProjectStatusCard
                  name="Suite API"
                  description="NestJS + PostgreSQL"
                  status="active"
                  statusText="Active"
                />
                <ProjectStatusCard
                  name="Brand Interface"
                  description="HQ Management Console"
                  status="pending"
                  statusText="Deploying"
                />
                <ProjectStatusCard
                  name="Shared Database"
                  description="PostgreSQL 16 + RLS"
                  status="active"
                  statusText="Connected"
                />
              </div>
            </div>
          </section>

          {/* Shared Resources */}
          <section>
            <h3 className="text-xl font-semibold mb-4 text-foreground">Shared Resources & Dependencies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ResourceCard
                icon="layers"
                title="@ui/*"
                description="Shared UI components library"
                features={["shadcn/ui base", "Custom components", "Form elements"]}
                color="primary"
              />
              <ResourceCard
                icon="palette"
                title="@tokens/*"
                description="W3 design system tokens"
                features={["Color palette", "Typography scale", "Spacing system"]}
                color="secondary"
              />
              <ResourceCard
                icon="code"
                title="@sdk/*"
                description="API clients and utilities"
                features={["API clients", "Auth helpers", "Type definitions"]}
                color="green"
              />
              <ResourceCard
                icon="database"
                title="@dwh/*"
                description="Data warehouse schemas"
                features={["Drizzle schemas", "Migration scripts", "RLS policies"]}
                color="blue"
              />
            </div>
          </section>

          {/* Implementation Guide */}
          <section>
            <h3 className="text-xl font-semibold mb-4 text-foreground">Implementation Recommendations</h3>
            <div className="glass-card rounded-lg p-6 border border-border">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-foreground">Immediate Steps</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">1</span>
                      </div>
                      <div>
                        <div className="font-medium">Create Template Projects</div>
                        <div className="text-sm text-muted-foreground">Convert @ui, @tokens, and @sdk packages to Replit templates</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">2</span>
                      </div>
                      <div>
                        <div className="font-medium">Setup GitHub Bridge</div>
                        <div className="text-sm text-muted-foreground">Push shared libraries to GitHub for cross-project importing</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">3</span>
                      </div>
                      <div>
                        <div className="font-medium">Implement Database Sharing</div>
                        <div className="text-sm text-muted-foreground">Use Replit PostgreSQL with shared connection strings</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-foreground">Best Practices</h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-accent border border-border">
                      <div className="font-medium text-sm">Version Management</div>
                      <div className="text-xs text-muted-foreground">Use semantic versioning for shared packages</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent border border-border">
                      <div className="font-medium text-sm">Documentation</div>
                      <div className="text-xs text-muted-foreground">Maintain comprehensive docs for shared resources</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent border border-border">
                      <div className="font-medium text-sm">Environment Isolation</div>
                      <div className="text-xs text-muted-foreground">Separate dev/staging/prod configurations</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
