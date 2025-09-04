import { EnterpriseLayout } from "../components/EnterpriseLayout";
import { DashboardStats } from "../components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Filter, Search } from 'lucide-react';

const Dashboard = () => {
  return (
    <EnterpriseLayout>
      {/* Hero Section */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="h-48 bg-gradient-to-r from-windtre-orange to-windtre-purple relative">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-8 h-full">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-2">
                Dashboard Enterprise
              </h1>
              <p className="text-white/90 text-lg">
                Gestisci tutti i tuoi servizi WindTre da un'unica piattaforma
              </p>
              <div className="flex gap-2 mt-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Tenant: Corporate
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Ultimo accesso: Oggi
                </Badge>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto md:justify-end">
              <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30 w-full md:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Report
              </Button>
              <Button className="w-full md:w-auto bg-windtre-orange hover:bg-windtre-orange-dark">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Cliente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Azioni Rapide</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="glass">
              <Filter className="h-4 w-4 mr-2" />
              Filtri
            </Button>
            <Button variant="outline" size="sm" className="glass">
              <Search className="h-4 w-4 mr-2" />
              Ricerca
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              title: 'Ricerca Cliente', 
              desc: 'Trova per telefono o codice fiscale', 
              action: 'Cerca', 
              variant: 'bg-gradient-to-r from-windtre-orange/20 to-windtre-orange/10',
              buttonClass: 'bg-windtre-orange hover:bg-windtre-orange-dark text-white'
            },
            { 
              title: 'Nuovo Contratto', 
              desc: 'Attiva nuova linea o servizio', 
              action: 'Attiva', 
              variant: 'bg-gradient-to-r from-windtre-purple/20 to-windtre-purple/10',
              buttonClass: 'bg-windtre-purple hover:bg-windtre-purple-dark text-white'
            },
            { 
              title: 'Gestione Fatture', 
              desc: 'Visualizza e gestisci fatturazione', 
              action: 'Apri', 
              variant: 'glass-strong',
              buttonClass: 'bg-muted hover:bg-muted/80'
            },
            { 
              title: 'Support Ticket', 
              desc: 'Crea nuovo ticket di assistenza', 
              action: 'Crea', 
              variant: 'glass-strong',
              buttonClass: 'bg-muted hover:bg-muted/80'
            },
          ].map((item, index) => (
            <Card key={index} className={`${item.variant} border-border/50 hover:shadow-lg transition-all duration-300`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <CardDescription className="text-xs">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button size="sm" className={`w-full ${item.buttonClass}`}>
                  {item.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Statistiche Generali</h2>
        <DashboardStats />
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Attività Recenti</h2>
        <Card className="glass-strong border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Ultime Operazioni</CardTitle>
            <CardDescription>Le attività più recenti del tuo tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '10:30', action: 'Nuovo cliente attivato', user: 'Mario Rossi', type: 'success' },
                { time: '09:15', action: 'Contratto fibra modificato', user: 'Luigi Bianchi', type: 'default' },
                { time: '08:45', action: 'Fattura generata', user: 'Anna Verdi', type: 'default' },
                { time: '07:20', action: 'Ticket risolto', user: 'Paolo Neri', type: 'success' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg glass hover:glass-strong transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <Badge variant={activity.type === 'success' ? 'default' : 'secondary'} className="text-xs">
                      {activity.time}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">Cliente: {activity.user}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Dettagli
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </EnterpriseLayout>
  );
};

export default Dashboard;