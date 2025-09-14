import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import CrossTenantStoreModal from '../components/CrossTenantStoreModal';
import { 
  Building2, Store, Users, Globe, Plus, Settings, Database,
  Shield, Key, UserPlus, MapPin, ChevronRight, Edit, Trash2,
  RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp, UserCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

// Mock tenant data
const mockTenants = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'staging',
    name: 'Staging Environment',
    type: 'test',
    stores: 3,
    users: 8,
    status: 'active'
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    slug: 'demo',
    name: 'Demo Tenant',
    type: 'demo',
    stores: 5,
    users: 12,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'acme',
    name: 'ACME Corporation',
    type: 'production',
    stores: 15,
    users: 45,
    status: 'active'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'tech',
    name: 'Tech Solutions',
    type: 'production',
    stores: 8,
    users: 22,
    status: 'active'
  }
];

export default function Entities() {
  const { isAuthenticated } = useBrandAuth();
  const { currentTenant, isCrossTenant, switchTenant } = useBrandTenant();
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('stores');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  const entityTypes = [
    {
      id: 'stores',
      name: 'Punti Vendita',
      icon: Store,
      description: 'Gestisci negozi e filiali',
      color: 'var(--primary-orange)',
      count: 42
    },
    {
      id: 'users',
      name: 'Utenti',
      icon: Users,
      description: 'Gestisci utenti e permessi',
      color: 'var(--primary-blue)',
      count: 87
    },
    {
      id: 'tenants',
      name: 'Tenant',
      icon: Building2,
      description: 'Gestisci organizzazioni',
      color: 'var(--secondary-green)',
      count: 4
    },
    {
      id: 'settings',
      name: 'Configurazioni',
      icon: Settings,
      description: 'Impostazioni cross-tenant',
      color: 'var(--secondary-amber)',
      count: 16
    }
  ];

  const getTenantBadge = (type: string) => {
    const styles = {
      production: 'bg-green-100 text-green-800',
      test: 'bg-blue-100 text-blue-800',
      demo: 'bg-yellow-100 text-yellow-800'
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Gestione Entità Cross-Tenant
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {isCrossTenant ? 
                  'Modalità Cross-Tenant: gestione centralizzata di tutte le entità' : 
                  `Gestione entità per ${currentTenant}`
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isCrossTenant && (
                <button 
                  onClick={() => switchTenant(null)}
                  className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-all flex items-center space-x-2"
                >
                  <Globe className="w-5 h-5" />
                  <span>Attiva Cross-Tenant</span>
                </button>
              )}
              <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-blue-600 text-white rounded-lg hover:from-orange-700 hover:to-blue-700 transition-all flex items-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Sincronizza</span>
              </button>
            </div>
          </div>

          {/* Entity Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {entityTypes.map((entity) => (
              <Card 
                key={entity.id}
                className={`cursor-pointer transition-all ${
                  selectedEntity === entity.id 
                    ? 'ring-2 ring-orange-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedEntity(entity.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <entity.icon 
                      className="w-5 h-5" 
                      style={{ color: entity.color }}
                    />
                    <span className="text-2xl font-bold text-gray-800">
                      {entity.count}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">{entity.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{entity.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Content based on selected entity */}
        {selectedEntity === 'stores' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Gestione Punti Vendita Cross-Tenant
              </h2>
              <button 
                onClick={() => setIsStoreModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-blue-600 text-white rounded-lg hover:from-orange-700 hover:to-blue-700 transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Nuovo Punto Vendita</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Store cards */}
              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Store className="w-5 h-5 text-orange-600" />
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Attivo
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Milano Centro</h3>
                  <p className="text-sm text-gray-500">Via Roma, 123</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Tenant: ACME</span>
                    <div className="flex space-x-1">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-3 h-3 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Store className="w-5 h-5 text-orange-600" />
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Attivo
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Roma EUR</h3>
                  <p className="text-sm text-gray-500">Viale Europa, 45</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Tenant: Tech Solutions</span>
                    <div className="flex space-x-1">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-3 h-3 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Store className="w-5 h-5 text-orange-600" />
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      In Setup
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Napoli Centro</h3>
                  <p className="text-sm text-gray-500">Piazza Garibaldi, 78</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Tenant: Demo</span>
                    <div className="flex space-x-1">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-3 h-3 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {selectedEntity === 'tenants' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Gestione Tenant
              </h2>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-blue-600 text-white rounded-lg hover:from-orange-700 hover:to-blue-700 transition-all flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Nuovo Tenant</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tenant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Punti Vendita</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Utenti</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Stato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-sm text-gray-500">/{tenant.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTenantBadge(tenant.type)}`}>
                          {tenant.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          <span>{tenant.stores}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{tenant.users}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-600">Attivo</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => switchTenant(tenant.id)}
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
                          >
                            Entra
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Settings className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedEntity === 'users' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Gestione Utenti Cross-Tenant
              </h2>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-blue-600 text-white rounded-lg hover:from-orange-700 hover:to-blue-700 transition-all flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Nuovo Utente</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <UserCircle className="w-8 h-8 text-orange-600" />
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                      Admin
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Marco Rossi</h3>
                  <p className="text-sm text-gray-500">m.rossi@brandinterface.com</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-gray-600">Accesso: Tutti i tenant</p>
                    <p className="text-xs text-gray-600">Ultimo login: 2 ore fa</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <UserCircle className="w-8 h-8 text-blue-600" />
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      Manager
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Laura Bianchi</h3>
                  <p className="text-sm text-gray-500">l.bianchi@acme.com</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-gray-600">Tenant: ACME Corp</p>
                    <p className="text-xs text-gray-600">Ultimo login: 1 giorno fa</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <UserCircle className="w-8 h-8 text-green-600" />
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Operatore
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-gray-900">Giuseppe Verdi</h3>
                  <p className="text-sm text-gray-500">g.verdi@techsolutions.it</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-gray-600">Tenant: Tech Solutions</p>
                    <p className="text-xs text-gray-600">Ultimo login: 3 ore fa</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {selectedEntity === 'settings' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Configurazioni Cross-Tenant
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    <span>Database Sync</span>
                  </CardTitle>
                  <CardDescription>
                    Sincronizzazione dati tra tenant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-sync attivo</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ultima sync</span>
                      <span className="text-sm text-gray-500">15 min fa</span>
                    </div>
                    <button className="w-full mt-3 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50">
                      Configura
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span>Permessi Globali</span>
                  </CardTitle>
                  <CardDescription>
                    Gestione ruoli e permessi cross-tenant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ruoli definiti</span>
                      <span className="font-medium">8</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Permessi attivi</span>
                      <span className="font-medium">124</span>
                    </div>
                    <button className="w-full mt-3 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50">
                      Gestisci
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="w-5 h-5 text-green-600" />
                    <span>API Keys</span>
                  </CardTitle>
                  <CardDescription>
                    Chiavi API per integrazioni esterne
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Chiavi attive</span>
                      <span className="font-medium">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate limit</span>
                      <span className="text-sm text-gray-500">1000/ora</span>
                    </div>
                    <button className="w-full mt-3 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                      Gestisci
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <span>Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Report e analisi cross-tenant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Report disponibili</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Export schedulati</span>
                      <span className="font-medium">5</span>
                    </div>
                    <button className="w-full mt-3 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                      Visualizza
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Store Modal */}
      {isStoreModalOpen && (
        <CrossTenantStoreModal
          isOpen={isStoreModalOpen}
          onClose={() => setIsStoreModalOpen(false)}
        />
      )}
    </BrandLayout>
  );
}