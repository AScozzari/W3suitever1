import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Building,
  Server,
  Key,
  Bell,
  Palette,
  User,
  Lock,
  Activity,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Save,
  Edit3,
  Plus,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Briefcase,
  Store,
  UserCheck
} from 'lucide-react';

// Componenti temporanei con styling glassmorphism WindTre
const Card = ({ className = "", children, ...props }: any) => (
  <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl ${className}`} {...props}>
    {children}
  </div>
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

const Button = ({ className = "", variant = "default", children, ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
      variant === "outline" ? "border border-white/20 text-white hover:bg-white/10" : 
      variant === "ghost" ? "text-white/70 hover:text-white hover:bg-white/10" :
      "bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
    } ${className}`}
    {...props}
  >
    {children}
  </button>
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
  >
    {children}
  </span>
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
  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70 ${className}`} {...props}>{children}</th>
);

const TableCell = ({ className = "", children, ...props }: any) => (
  <td className={`px-4 py-3 text-white/80 ${className}`} {...props}>{children}</td>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organizzazione');
  const [activeSubTab, setActiveSubTab] = useState('generale');
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch dei dati del tenant corrente (non multi-tenant!)
  const { data: currentTenant } = useQuery({ 
    queryKey: ['/api/tenant/current']
  });
  
  const { data: legalEntities } = useQuery({ 
    queryKey: ['/api/tenant/legal-entities'] 
  });
  
  const { data: stores } = useQuery({ 
    queryKey: ['/api/tenant/stores'] 
  });
  
  const { data: tenantUsers } = useQuery({ 
    queryKey: ['/api/tenant/users'] 
  });

  const mainTabs = [
    { id: 'organizzazione', label: 'Organizzazione', icon: Building },
    { id: 'utenti', label: 'Utenti & Ruoli', icon: Users },
    { id: 'sistema', label: 'Sistema', icon: Server },
    { id: 'sicurezza', label: 'Sicurezza', icon: Shield }
  ];

  const subTabs = {
    organizzazione: [
      { id: 'generale', label: 'Info Generali', icon: Building },
      { id: 'ragioni-sociali', label: 'Ragioni Sociali', icon: FileText },
      { id: 'punti-vendita', label: 'Punti Vendita', icon: Store },
      { id: 'branding', label: 'Personalizzazione', icon: Palette }
    ],
    utenti: [
      { id: 'gestione', label: 'Gestione Utenti', icon: User },
      { id: 'ruoli', label: 'Ruoli & Permessi', icon: Key }
    ],
    sistema: [
      { id: 'configurazione', label: 'Configurazione', icon: Server },
      { id: 'notifiche', label: 'Notifiche', icon: Bell }
    ],
    sicurezza: [
      { id: 'autenticazione', label: 'Autenticazione', icon: Lock },
      { id: 'sessioni', label: 'Sessioni Attive', icon: Activity },
      { id: 'audit', label: 'Log Attività', icon: FileText }
    ]
  };

  // Mock data per il tenant corrente (sostituirà con API)
  const tenantInfo = {
    id: 'current-tenant',
    name: 'WindTre Network Milano',
    organizationType: 'Franchising',
    businessCode: 'WT-MLN-001',
    legalEntitiesCount: 3,
    storesCount: 12,
    usersCount: 28,
    status: 'active'
  };

  const mockLegalEntities = [
    { id: '1', name: 'WindTre Store Milano Centro Srl', vatNumber: 'IT12345678901', storesCount: 5, status: 'active' },
    { id: '2', name: 'Very Mobile Point Nord Srl', vatNumber: 'IT98765432109', storesCount: 4, status: 'active' },
    { id: '3', name: 'Digital Services Milano Srl', vatNumber: 'IT11223344556', storesCount: 3, status: 'pending' }
  ];

  const mockStores = [
    { id: '1', name: 'Milano Duomo', address: 'Via del Corso 15, Milano', legalEntity: 'WindTre Store Milano Centro Srl', status: 'active', usersCount: 8 },
    { id: '2', name: 'Milano Centrale', address: 'P.za Duca d\'Aosta 9, Milano', legalEntity: 'WindTre Store Milano Centro Srl', status: 'active', usersCount: 6 },
    { id: '3', name: 'Very Mobile Isola', address: 'Via Brera 22, Milano', legalEntity: 'Very Mobile Point Nord Srl', status: 'active', usersCount: 4 }
  ];

  const mockUsers = [
    { id: '1', name: 'Marco Rossi', email: 'marco.rossi@windtre.it', role: 'Store Manager', store: 'Milano Duomo', status: 'active', lastAccess: '2024-12-05' },
    { id: '2', name: 'Laura Bianchi', email: 'laura.bianchi@windtre.it', role: 'Sales Agent', store: 'Milano Centrale', status: 'active', lastAccess: '2024-12-05' },
    { id: '3', name: 'Giuseppe Verde', email: 'giuseppe.verde@verymobile.it', role: 'Assistant Manager', store: 'Very Mobile Isola', status: 'active', lastAccess: '2024-12-04' }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-500/20 text-green-300 border-green-500/30",
      inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30", 
      pending: "bg-orange-500/20 text-orange-300 border-orange-500/30"
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const renderMainTabButton = (tab: any) => (
    <button
      key={tab.id}
      onClick={() => {
        setActiveTab(tab.id);
        setActiveSubTab(subTabs[tab.id as keyof typeof subTabs][0].id);
      }}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        activeTab === tab.id
          ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      <tab.icon className="w-4 h-4" />
      {tab.label}
    </button>
  );

  const renderSubTabButton = (subTab: any) => (
    <button
      key={subTab.id}
      onClick={() => setActiveSubTab(subTab.id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
        activeSubTab === subTab.id
          ? 'bg-white/20 text-white border border-white/30'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <subTab.icon className="w-4 h-4" />
      {subTab.label}
    </button>
  );

  const renderContent = () => {
    if (activeTab === 'organizzazione') {
      if (activeSubTab === 'generale') {
        return (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Informazioni Organizzazione</CardTitle>
                  <CardDescription>Gestione dei dati principali della tua organizzazione</CardDescription>
                </div>
                <Button onClick={() => setEditMode(!editMode)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  {editMode ? 'Annulla' : 'Modifica'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nome Organizzazione</label>
                  <Input 
                    value={tenantInfo.name} 
                    disabled={!editMode}
                    className={!editMode ? "bg-white/5 cursor-not-allowed" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Codice Business</label>
                  <Input 
                    value={tenantInfo.businessCode} 
                    disabled={!editMode}
                    className={!editMode ? "bg-white/5 cursor-not-allowed" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Tipo Organizzazione</label>
                  <Input 
                    value={tenantInfo.organizationType} 
                    disabled={!editMode}
                    className={!editMode ? "bg-white/5 cursor-not-allowed" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Stato</label>
                  <Badge className={getStatusBadge(tenantInfo.status)}>
                    {tenantInfo.status}
                  </Badge>
                </div>
              </div>
              
              {editMode && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Annulla
                  </Button>
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Salva Modifiche
                  </Button>
                </div>
              )}
              
              {/* Stats della propria organizzazione */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/30">
                  <CardContent className="p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-green-300" />
                    <div className="text-2xl font-bold text-green-300">{tenantInfo.legalEntitiesCount}</div>
                    <div className="text-sm text-green-200">Ragioni Sociali</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30">
                  <CardContent className="p-4 text-center">
                    <Store className="w-8 h-8 mx-auto mb-2 text-blue-300" />
                    <div className="text-2xl font-bold text-blue-300">{tenantInfo.storesCount}</div>
                    <div className="text-sm text-blue-200">Punti Vendita</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/30">
                  <CardContent className="p-4 text-center">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                    <div className="text-2xl font-bold text-purple-300">{tenantInfo.usersCount}</div>
                    <div className="text-sm text-purple-200">Utenti Attivi</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      }

      if (activeSubTab === 'ragioni-sociali') {
        return (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Gestione Ragioni Sociali</CardTitle>
                  <CardDescription>Le entità giuridiche della tua organizzazione</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova Ragione Sociale
                </Button>
              </div>
              
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input 
                    placeholder="Cerca ragioni sociali..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e: any) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtri
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Partita IVA</TableHead>
                    <TableHead>Punti Vendita</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLegalEntities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-orange-400" />
                          {entity.name}
                        </div>
                      </TableCell>
                      <TableCell>{entity.vatNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entity.storesCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(entity.status)}>
                          {entity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      if (activeSubTab === 'punti-vendita') {
        return (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Gestione Punti Vendita</CardTitle>
                  <CardDescription>I punti vendita della tua organizzazione</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Punto Vendita
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Indirizzo</TableHead>
                    <TableHead>Ragione Sociale</TableHead>
                    <TableHead>Utenti</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Store className="w-4 h-4 text-blue-400" />
                          {store.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">{store.address}</TableCell>
                      <TableCell className="text-white/70">{store.legalEntity}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{store.usersCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(store.status)}>
                          {store.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }
    }

    if (activeTab === 'utenti') {
      if (activeSubTab === 'gestione') {
        return (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Gestione Utenti</CardTitle>
                  <CardDescription>Gli utenti della tua organizzazione</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Utente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Punto Vendita</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-purple-400" />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-orange-400/50 text-orange-300">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">{user.store}</TableCell>
                      <TableCell className="text-white/70">{user.lastAccess}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      if (activeSubTab === 'ruoli') {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Ruoli e Permessi</CardTitle>
              <CardDescription>Configurazione RBAC per la tua organizzazione</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Admin', 'Store Manager', 'Sales Agent', 'Assistant Manager'].map((role) => (
                  <Card key={role} className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Key className="w-5 h-5 text-blue-300" />
                        <h4 className="font-medium text-blue-200">{role}</h4>
                      </div>
                      <p className="text-blue-200/70 text-sm mb-3">
                        Permissions configured for {role.toLowerCase()} role in your organization.
                      </p>
                      <Button variant="outline" size="sm" className="w-full border-blue-400/50 text-blue-300">
                        Gestisci Permessi
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      }
    }

    // Placeholder per altri tab
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sezione in Sviluppo</CardTitle>
          <CardDescription>Questa sezione è in fase di sviluppo</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">Le impostazioni per {activeTab} - {activeSubTab} saranno disponibili presto.</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              Impostazioni Organizzazione
            </h1>
            <p className="text-white/70 text-lg mt-2">
              Gestione della tua organizzazione: {tenantInfo.name}
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 text-orange-300 border-orange-400/30">
              {tenantInfo.organizationType}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-80 space-y-4">
          {/* Main Tabs */}
          <Card>
            <CardContent className="p-4 space-y-2">
              {mainTabs.map(renderMainTabButton)}
            </CardContent>
          </Card>

          {/* Sub Tabs */}
          {subTabs[activeTab as keyof typeof subTabs] && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sezioni</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {subTabs[activeTab as keyof typeof subTabs].map(renderSubTabButton)}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}