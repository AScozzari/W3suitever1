import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, GitBranch, Share, LayoutTemplate, Package, Palette } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center float-animation">
                <Code2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              W3 Suite
              <span className="block text-primary">Development Hub</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Master cross-project development and code sharing strategies for enterprise multi-tenant platforms on Replit
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Access Development Hub
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Code Sharing Strategies for Replit
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glass-card border-border hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mb-4">
                <LayoutTemplate className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-foreground">Templates</CardTitle>
              <CardDescription className="text-muted-foreground">
                Convert reusable code into templates for easy project initialization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>UI Components Library</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Design Tokens Package</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Auth Boilerplate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary rounded-lg flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-foreground">GitHub Bridge</CardTitle>
              <CardDescription className="text-muted-foreground">
                Use GitHub as intermediary for complex shared libraries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Shared SDK Packages</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Database Schemas</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Common Utilities</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Share className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-foreground">Public Forks</CardTitle>
              <CardDescription className="text-muted-foreground">
                Create public projects that can be forked and referenced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span>Demo Applications</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span>Integration Examples</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span>Configuration Presets</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shared Resources Preview */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          W3 Suite Shared Resources
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="gradient-border">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <h4 className="font-medium">@ui/*</h4>
              </div>
              <p className="text-sm text-muted-foreground">Shared UI components</p>
            </div>
          </div>

          <div className="gradient-border">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Palette className="w-5 h-5 text-secondary" />
                <h4 className="font-medium">@tokens/*</h4>
              </div>
              <p className="text-sm text-muted-foreground">Design system tokens</p>
            </div>
          </div>

          <div className="gradient-border">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Code2 className="w-5 h-5 text-green-400" />
                <h4 className="font-medium">@sdk/*</h4>
              </div>
              <p className="text-sm text-muted-foreground">API clients</p>
            </div>
          </div>

          <div className="gradient-border">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Share className="w-5 h-5 text-blue-400" />
                <h4 className="font-medium">@dwh/*</h4>
              </div>
              <p className="text-sm text-muted-foreground">Data warehouse schemas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
