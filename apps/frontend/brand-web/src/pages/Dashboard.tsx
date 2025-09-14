import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import CrossTenantStoreModal from '../components/CrossTenantStoreModal';
import { 
  Building2, Users, TrendingUp, Settings, Globe, ChartBar, Activity, Package, 
  Store, Plus, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Target,
  ShoppingBag, MapPin, Calendar, Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Mock data for charts
const revenueData = [
  { month: 'Gen', nord: 45000, centro: 38000, sud: 28000 },
  { month: 'Feb', nord: 52000, centro: 42000, sud: 31000 },
  { month: 'Mar', nord: 48000, centro: 45000, sud: 35000 },
  { month: 'Apr', nord: 61000, centro: 50000, sud: 40000 },
  { month: 'Mag', nord: 55000, centro: 48000, sud: 38000 },
  { month: 'Giu', nord: 67000, centro: 52000, sud: 42000 },
];

const conversionData = [
  { area: 'Nord Italia', rate: 68, leads: 245 },
  { area: 'Centro Italia', rate: 72, leads: 189 },
  { area: 'Sud Italia', rate: 58, leads: 156 },
  { area: 'Isole', rate: 61, leads: 98 },
];

const productMixData = [
  { name: 'Fibra', value: 45, color: 'var(--primary-purple)' },
  { name: 'Mobile 5G', value: 30, color: 'var(--primary-blue)' },
  { name: 'Business', value: 15, color: 'var(--secondary-green)' },
  { name: 'IoT', value: 10, color: 'var(--secondary-amber)' },
];

const performanceByStore = [
  { store: 'Milano Centro', revenue: 125000, customers: 342, conversion: 78 },
  { store: 'Roma EUR', revenue: 98000, customers: 287, conversion: 72 },
  { store: 'Napoli', revenue: 67000, customers: 198, conversion: 65 },
  { store: 'Torino', revenue: 89000, customers: 256, conversion: 71 },
  { store: 'Bologna', revenue: 76000, customers: 223, conversion: 69 },
];

export default function Dashboard() {
  const { isAuthenticated, user } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();
  const [selectedArea, setSelectedArea] = useState('all');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  const commercialAreas = [
    { id: 'all', name: 'Tutte le Aree', stores: 42 },
    { id: 'nord', name: 'Nord Italia', stores: 18 },
    { id: 'centro', name: 'Centro Italia', stores: 12 },
    { id: 'sud', name: 'Sud Italia', stores: 8 },
    { id: 'isole', name: 'Isole', stores: 4 },
  ];

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold brand-gradient-text">
                Brand Interface Dashboard
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {isCrossTenant ? "Modalità Cross-Tenant" : `Tenant: ${currentTenant || currentTenantId}`}
              </p>
            </div>
            
            {/* Commercial Area Filter */}
            <div className="flex items-center space-x-3">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-4 py-2 border border-purple-200 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {commercialAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.stores} PDV)
                  </option>
                ))}
              </select>
              
              <button className="px-4 py-2 border border-purple-200 rounded-lg hover:bg-purple-50 flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filtri</span>
              </button>
            </div>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">
                  Revenue Totale
                </CardTitle>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">€1.2M</div>
                <div className="flex items-center text-xs text-purple-600 mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12.5% dal mese scorso
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Nuovi Clienti
                </CardTitle>
                <Users className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">842</div>
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +8.3% questa settimana
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Tasso Conversione
                </CardTitle>
                <Target className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">68.2%</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +3.1% vs obiettivo
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-600">
                  PDV Attivi
                </CardTitle>
                <Store className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">42</div>
                <div className="flex items-center text-xs text-amber-600 mt-1">
                  <Activity className="w-3 h-3 mr-1" />
                  38 operativi oggi
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm shadow-md">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-100 data-[state=active]:to-blue-100 data-[state=active]:text-purple-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Trend Revenue per Area</CardTitle>
                  <CardDescription>Andamento mensile per area commerciale</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="nord" stackId="1" stroke="#9747ff" fill="#9747ff" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="centro" stackId="1" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="sud" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Product Mix Pie Chart */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Mix Prodotti</CardTitle>
                  <CardDescription>Distribuzione vendite per categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productMixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {productMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Rate by Area */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Tasso Conversione per Area Commerciale</CardTitle>
                <CardDescription>Performance di conversione lead per area geografica</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rate" fill="#9747ff" name="Tasso %" />
                    <Bar dataKey="leads" fill="#667eea" name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Store Performance Table */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Top Performing Stores</CardTitle>
                <CardDescription>I migliori punti vendita per revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">PDV</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Revenue</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Clienti</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Conversione</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceByStore.map((store, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Store className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">{store.store}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-purple-700">€{store.revenue.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-700">{store.customers}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                  style={{ width: `${store.conversion}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{store.conversion}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-green-600">
                              <ArrowUpRight className="w-4 h-4 mr-1" />
                              <span className="text-sm">+{Math.floor(Math.random() * 20 + 5)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="revenue" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Analisi Revenue Dettagliata</CardTitle>
                <CardDescription>Breakdown completo dei ricavi per area e periodo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="nord" stroke="#9747ff" strokeWidth={2} />
                    <Line type="monotone" dataKey="centro" stroke="#667eea" strokeWidth={2} />
                    <Line type="monotone" dataKey="sud" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Performance Nord</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="font-medium">€180K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Attuale</span>
                      <span className="font-medium text-green-600">€195K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Achievement</span>
                      <span className="font-medium text-green-600">108%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Performance Centro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="font-medium">€150K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Attuale</span>
                      <span className="font-medium text-yellow-600">€142K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Achievement</span>
                      <span className="font-medium text-yellow-600">95%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Performance Sud</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="font-medium">€120K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Attuale</span>
                      <span className="font-medium text-red-600">€98K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Achievement</span>
                      <span className="font-medium text-red-600">82%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Analytics Avanzate</CardTitle>
                <CardDescription>Metriche dettagliate e insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Customer Acquisition Cost</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Fibra</span>
                        <span className="font-medium">€45</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Mobile 5G</span>
                        <span className="font-medium">€32</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Business</span>
                        <span className="font-medium">€78</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Lifetime Value</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Fibra</span>
                        <span className="font-medium">€1,250</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Mobile 5G</span>
                        <span className="font-medium">€890</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Business</span>
                        <span className="font-medium">€3,450</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Azioni Rapide</h3>
              <p className="text-white/80">Gestione cross-tenant centralizzata</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsStoreModalOpen(true)}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Nuovo PDV</span>
              </button>
              <button className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Gestisci Team</span>
              </button>
              <button className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configurazioni</span>
              </button>
            </div>
          </div>
        </div>
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