import { useState } from "react";
import { 
  Building2, Users, Settings as SettingsIcon, Shield, 
  Globe, Database, Bell, Cpu, ChevronRight, Plus, Edit,
  Trash2, Search, Filter, MoreHorizontal, Briefcase
} from "lucide-react";
// Per ora uso componenti HTML nativi, da sostituire con UI components quando configurato
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";

// Componenti temporanei
const Card = ({ className = "", children, ...props }: any) => (
  <div className={`backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ${className}`} {...props}>{children}</div>
);
const CardHeader = ({ className = "", children, ...props }: any) => (
  <div className={`p-6 ${className}`} {...props}>{children}</div>
);
const CardTitle = ({ className = "", children, ...props }: any) => (
  <h3 className={`text-xl font-semibold text-white ${className}`} {...props}>{children}</h3>
);
const CardDescription = ({ className = "", children, ...props }: any) => (
  <p className={`text-white/70 ${className}`} {...props}>{children}</p>
);
const CardContent = ({ className = "", children, ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>
);

const Tabs = ({ value, onValueChange, className = "", children, ...props }: any) => (
  <div className={className} data-value={value} {...props}>{children}</div>
);
const TabsList = ({ className = "", children, ...props }: any) => (
  <div className={`flex p-1 ${className}`} {...props}>{children}</div>
);
const TabsTrigger = ({ value, className = "", children, onClick, ...props }: any) => (
  <button 
    className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl text-white/80 hover:text-white ${className}`}
    onClick={() => onClick?.(value)}
    {...props}
  >{children}</button>
);
const TabsContent = ({ value, className = "", children, ...props }: any) => (
  <div className={`mt-6 ${className}`} {...props}>{children}</div>
);

const Button = ({ className = "", variant = "default", children, ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
      variant === "outline" ? "border border-white/20 text-white hover:bg-white/10" : 
      variant === "ghost" ? "text-white/70 hover:text-white hover:bg-white/10" :
      "bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
    } ${className}`}
    {...props}
  >{children}</button>
);

const Input = ({ className = "", ...props }: any) => (
  <input 
    className={`w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-orange-400/50 ${className}`}
    {...props}
  />
);

const Badge = ({ className = "", variant = "default", children, ...props }: any) => (
  <span 
    className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${
      variant === "outline" ? "border-current" :
      variant === "secondary" ? "bg-gray-500/20 text-gray-300 border-gray-500/30" :
      "bg-blue-500/20 text-blue-300 border-blue-500/30"
    } ${className}`}
    {...props}
  >{children}</span>
);

const Table = ({ className = "", children, ...props }: any) => (
  <div className="overflow-x-auto">
    <table className={`w-full ${className}`} {...props}>{children}</table>
  </div>
);
const TableHeader = ({ className = "", children, ...props }: any) => (
  <thead className={className} {...props}>{children}</thead>
);
const TableBody = ({ className = "", children, ...props }: any) => (
  <tbody className={className} {...props}>{children}</tbody>
);
const TableRow = ({ className = "", children, ...props }: any) => (
  <tr className={`border-b border-white/10 hover:bg-white/5 ${className}`} {...props}>{children}</tr>
);
const TableHead = ({ className = "", children, ...props }: any) => (
  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${className}`} {...props}>{children}</th>
);
const TableCell = ({ className = "", children, ...props }: any) => (
  <td className={`px-4 py-3 ${className}`} {...props}>{children}</td>
);

const DropdownMenu = ({ children }: any) => <div className="relative inline-block">{children}</div>;
const DropdownMenuTrigger = ({ asChild, children, ...props }: any) => (
  <div {...props}>{children}</div>
);
const DropdownMenuContent = ({ className = "", children, ...props }: any) => (
  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg backdrop-blur-xl bg-gray-800/95 border border-white/20 py-1 z-50 ${className}`} {...props}>
    {children}
  </div>
);
const DropdownMenuItem = ({ className = "", children, ...props }: any) => (
  <button className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 ${className}`} {...props}>
    {children}
  </button>
);

interface Entity {
  id: string;
  name: string;
  status: "active" | "inactive" | "pending";
  type?: string;
  createdAt: string;
  count?: number;
}

interface SystemStats {
  totalTenants: number;
  totalLegalEntities: number;
  totalStores: number;
  totalUsers: number;
  activeConnections: number;
  systemHealth: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("organization");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - sarà sostituito con API calls
  const systemStats: SystemStats = {
    totalTenants: 12,
    totalLegalEntities: 45,
    totalStores: 174,
    totalUsers: 1250,
    activeConnections: 98,
    systemHealth: "Ottimale"
  };

  const tenants: Entity[] = [
    { id: "1", name: "WindTre Franchising Sud", status: "active", type: "Franchising", createdAt: "2024-01-15", count: 25 },
    { id: "2", name: "Very Mobile Nord Est", status: "active", type: "Top Dealer", createdAt: "2024-02-20", count: 18 },
    { id: "3", name: "Digital Operations Srl", status: "pending", type: "Dealer", createdAt: "2024-12-01", count: 8 }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-500/20 text-green-300 border-green-500/30",
      inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30", 
      pending: "bg-orange-500/20 text-orange-300 border-orange-500/30"
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  return (
    <div className="w-full h-full p-0 m-0">
      {/* Header Glass */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4 mb-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              Configurazioni Sistema
            </h1>
            <p className="text-white/70 text-base mt-1">
              Gestione completa organizzazione e configurazione enterprise
            </p>
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white px-6">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Configurazione
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">{systemStats.totalTenants}</div>
              <div className="text-sm text-blue-200">Tenants</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{systemStats.totalLegalEntities}</div>
              <div className="text-sm text-green-200">Ragioni Sociali</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-300">{systemStats.totalStores}</div>
              <div className="text-sm text-purple-200">Punti Vendita</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-300">{systemStats.totalUsers}</div>
              <div className="text-sm text-orange-200">Utenti</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cyan-300">{systemStats.activeConnections}</div>
              <div className="text-sm text-cyan-200">Connessioni</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-400/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-300">{systemStats.systemHealth}</div>
              <div className="text-sm text-emerald-200">Stato Sistema</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 mb-4">
          <TabsTrigger 
            value="organization" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Organizzazione
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
          >
            <Users className="w-4 h-4 mr-2" />
            Utenti & Ruoli
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
          >
            <Shield className="w-4 h-4 mr-2" />
            Sicurezza
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-xl">Gestione Ragioni Sociali</CardTitle>
                  <CardDescription className="text-white/70">
                    Configurazione entità aziendali e punti vendita
                  </CardDescription>
                </div>
                <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova Ragione Sociale
                </Button>
              </div>
              
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input 
                    placeholder="Cerca ragioni sociali..."
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-orange-400"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtri
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/70">Nome</TableHead>
                    <TableHead className="text-white/70">Tipo Canale</TableHead>
                    <TableHead className="text-white/70">Data Creazione</TableHead>
                    <TableHead className="text-white/70">Punti Vendita</TableHead>
                    <TableHead className="text-white/70">Stato</TableHead>
                    <TableHead className="text-white/70 text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-orange-400" />
                          {tenant.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                          {tenant.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">{tenant.createdAt}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {tenant.count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(tenant.status)}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800/95 backdrop-blur-xl border-white/20">
                            <DropdownMenuItem className="text-white hover:bg-white/10">
                              <Edit className="w-4 h-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-white/10">
                              <Globe className="w-4 h-4 mr-2" />
                              Gestisci PV
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Roles Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <CardTitle className="text-white text-xl mb-4">Gestione Utenti e Ruoli RBAC</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-blue-300 text-lg">Utenti Attivi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-200 mb-2">{systemStats.totalUsers}</div>
                  <p className="text-blue-200/70">Gestione completa utenti</p>
                  <Button className="mt-4 bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 border-blue-400/30">
                    Gestisci Utenti
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-purple-300 text-lg">Ruoli Definiti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-200 mb-2">24</div>
                  <p className="text-purple-200/70">Configurazione RBAC</p>
                  <Button className="mt-4 bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 border-purple-400/30">
                    Gestisci Ruoli
                  </Button>
                </CardContent>
              </Card>
            </div>
          </Card>
        </TabsContent>

        {/* System Configuration Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <CardTitle className="text-white text-xl mb-4">Configurazione Database</CardTitle>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white">Stato Connessione</span>
                  <Badge className="bg-green-500/20 text-green-300">Attiva</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white">Performance</span>
                  <span className="text-green-300">98%</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600">
                  <Database className="w-4 h-4 mr-2" />
                  Gestisci Database
                </Button>
              </div>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <CardTitle className="text-white text-xl mb-4">Configurazione Servizi</CardTitle>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white">Backup Automatico</span>
                  <Badge className="bg-blue-500/20 text-blue-300">Attivato</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white">Monitoraggio</span>
                  <Badge className="bg-green-500/20 text-green-300">Attivo</Badge>
                </div>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600">
                  <Cpu className="w-4 h-4 mr-2" />
                  Gestisci Servizi
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <CardTitle className="text-white text-xl mb-4">Configurazione Sicurezza</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-400/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-red-300" />
                  <div className="text-xl font-bold text-red-300">RLS</div>
                  <div className="text-sm text-red-200">Row Level Security</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-400/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                  <div className="text-xl font-bold text-yellow-300">MFA</div>
                  <div className="text-sm text-yellow-200">Multi-Factor Auth</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border-indigo-400/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-indigo-300" />
                  <div className="text-xl font-bold text-indigo-300">OAuth</div>
                  <div className="text-sm text-indigo-200">OpenID Connect</div>
                </CardContent>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}