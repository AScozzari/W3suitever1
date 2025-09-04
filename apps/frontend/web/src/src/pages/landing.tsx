import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Store, Settings, BarChart3, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* W3 Background Effects */}
      <div className="absolute inset-0 w3-gradient opacity-10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full w3-glow-orange opacity-20 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full w3-glow-purple opacity-20 blur-3xl"></div>
      
      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto w3-fade-in">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-20 h-20 rounded-3xl w3-gradient flex items-center justify-center w3-float shadow-2xl">
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              <span className="w3-gradient-text">W3 Suite</span>
              <span className="block text-3xl md:text-4xl font-medium text-muted-foreground mt-2">
                Enterprise Multi-Tenant Platform
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Piattaforma avanzata per la gestione multitenant con CRM, POS, Magazzino e Analytics enterprise. 
              Architettura scalabile con RLS PostgreSQL e controllo granulare dei permessi.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-6 sm:flex sm:justify-center">
              <Button 
                size="lg" 
                className="w3-gradient hover:opacity-90 text-white font-semibold px-10 py-6 text-lg rounded-xl shadow-xl w3-glow-orange"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Accedi alla Suite
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w3-glass-button font-semibold px-10 py-6 text-lg rounded-xl"
                data-testid="button-demo"
              >
                Demo Platform
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Modules Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16 w3-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Moduli Enterprise <span className="w3-gradient-text">Integrati</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Suite completa di strumenti per la gestione aziendale multitenant con architettura scalabile e sicurezza enterprise.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="w3-glass-card hover:w3-glow-orange transition-all duration-500 rounded-2xl overflow-hidden group">
            <CardHeader className="relative">
              <div className="w-16 h-16 w3-gradient rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">CRM Suite</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Gestione clienti e relazioni commerciali avanzata con analytics integrati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Anagrafica Clienti Multitenant</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Pipeline Vendite</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Campagne Marketing</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Report & Analytics</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w3-glass-card hover:w3-glow-purple transition-all duration-500 rounded-2xl overflow-hidden group">
            <CardHeader className="relative">
              <div className="w-16 h-16 w3-gradient rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Store className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">POS & Cassa</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Sistema punto vendita completo con gestione fiscale e pagamenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Fatturazione Elettronica</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Gestione Scontrini</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Pagamenti Digitali</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Sincronizzazione Cloud</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w3-glass-card hover:w3-glow-orange transition-all duration-500 rounded-2xl overflow-hidden group">
            <CardHeader className="relative">
              <div className="w-16 h-16 w3-gradient rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Magazzino</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Sistema di gestione inventario e logistica avanzato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Tracciabilità Prodotti</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Ordini Automatici</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Multi-Location</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Integrazione Fornitori</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="w3-glass-card hover:w3-glow-purple transition-all duration-500 rounded-2xl overflow-hidden group">
            <CardHeader className="relative">
              <div className="w-16 h-16 w3-gradient rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Analytics</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Business Intelligence e reportistica avanzata in tempo reale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Dashboard Executive</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>KPI Cross-Tenant</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Previsioni AI</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                  <span>Report Personalizzati</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="w3-glass-card hover:w3-glow-orange transition-all duration-500 rounded-2xl overflow-hidden group">
            <CardHeader className="relative">
              <div className="w-16 h-16 w3-gradient rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Settings</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Configurazione e sicurezza enterprise con RBAC granulare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Gestione Multi-Tenant</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Permessi Granulari</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Audit & Compliance</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  <span>Row Level Security</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Architecture Features */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16 w3-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Architettura <span className="w3-gradient-text">Enterprise</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Tecnologie avanzate per scalabilità, sicurezza e performance enterprise.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="w3-gradient-border rounded-xl">
            <div className="p-6 w3-glass rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-lg">PostgreSQL RLS</h4>
              </div>
              <p className="text-sm text-muted-foreground">Row Level Security per isolamento dati multitenant</p>
            </div>
          </div>

          <div className="w3-gradient-border rounded-xl">
            <div className="p-6 w3-glass rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-6 h-6 text-secondary" />
                <h4 className="font-semibold text-lg">RBAC Granulare</h4>
              </div>
              <p className="text-sm text-muted-foreground">Sistema permessi con scope Tenant/RS/Store</p>
            </div>
          </div>

          <div className="w3-gradient-border rounded-xl">
            <div className="p-6 w3-glass rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-lg">Monorepo</h4>
              </div>
              <p className="text-sm text-muted-foreground">Architettura condivisa Frontend/Backend/SDK</p>
            </div>
          </div>

          <div className="w3-gradient-border rounded-xl">
            <div className="p-6 w3-glass rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <BarChart3 className="w-6 h-6 text-secondary" />
                <h4 className="font-semibold text-lg">Data Warehouse</h4>
              </div>
              <p className="text-sm text-muted-foreground">Analytics e BI con ETL automatizzato</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center w3-glass-card rounded-3xl p-16 w3-glow-purple">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Pronto per <span className="w3-gradient-text">W3 Suite</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Scopri la potenza dell'enterprise multitenant per la tua organizzazione. 
            Inizia oggi con la piattaforma più avanzata del mercato.
          </p>
          <Button 
            size="lg" 
            className="w3-gradient hover:opacity-90 text-white font-semibold px-12 py-6 text-xl rounded-xl shadow-2xl"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-login"
          >
            Inizia Subito
          </Button>
        </div>
      </div>
    </div>
  );
}