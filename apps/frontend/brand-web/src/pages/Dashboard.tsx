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
  { name: 'Mobile 5G', value: 30, color: 'var(--accent-orange)' },
  { name: 'Business', value: 15, color: 'var(--secondary-green)' },
  { name: 'IoT', value: 10, color: 'var(--supporting-purple)' },
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
        {/* Modern Glass Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200" data-testid="dashboard-header">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Brand Interface Dashboard
              </h1>
              <p className="text-gray-700 mt-3 flex items-center gap-3 font-medium">
                <Globe className="w-5 h-5 text-purple-600" strokeWidth={2} />
                {isCrossTenant ? "Modalità Cross-Tenant" : `Tenant: ${currentTenant || currentTenantId}`}
                {isCrossTenant && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold ml-2">MULTI</span>}
              </p>
            </div>
            
            {/* Modern Controls */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-6 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                data-testid="select-area-filter"
              >
                {commercialAreas.map((area) => (
                  <option key={area.id} value={area.id} className="bg-gray-800 text-white">
                    {area.name} ({area.stores} PDV)
                  </option>
                ))}
              </select>
              
              <button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-6 py-3 flex items-center space-x-3 transition-colors" data-testid="button-filters">
                <Filter className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Filtri Avanzati</span>
              </button>
            </div>
          </div>
          
          {/* Modern KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-all duration-300" data-testid="card-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                  Revenue Totale
                </CardTitle>
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <DollarSign className="h-6 w-6 text-purple-600" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-800 mb-2">€1.2M</div>
                <div className="flex items-center text-sm text-purple-700 font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  +12.5% dal mese scorso
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-all duration-300" data-testid="card-customers">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
                  Nuovi Clienti
                </CardTitle>
                <div className="p-2 bg-orange-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-orange-600" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-800 mb-2">842</div>
                <div className="flex items-center text-sm text-orange-700 font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  +8.3% questa settimana
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-all duration-300" data-testid="card-conversion">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                  Tasso Conversione
                </CardTitle>
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <Target className="h-6 w-6 text-green-600" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800 mb-2">68.2%</div>
                <div className="flex items-center text-sm text-green-700 font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  +3.1% vs obiettivo
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-all duration-300" data-testid="card-stores">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                  PDV Attivi
                </CardTitle>
                <div className="p-2 bg-purple-400/20 rounded-xl">
                  <Store className="h-6 w-6 text-purple-600" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-800 mb-2">42</div>
                <div className="flex items-center text-sm text-purple-700 font-medium">
                  <Activity className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  38 operativi oggi
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold ml-2 text-xs">LIVE</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modern Charts Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="dashboard-tabs">
          <TabsList className="bg-white border border-gray-200 grid w-full grid-cols-4 p-2">
            <TabsTrigger 
              value="overview" 
              className="bg-purple-600 hover:bg-purple-700 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
              data-testid="tab-overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
              data-testid="tab-revenue"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
              data-testid="tab-performance"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
              data-testid="tab-analytics"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modern Revenue Trend Chart */}
              <Card className="bg-white border border-gray-200 border-2 border-purple-300/20" data-testid="chart-revenue-trend">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
                    Trend Revenue per Area
                  </CardTitle>
                  <CardDescription className="text-gray-700 font-medium">Andamento mensile per area commerciale</CardDescription>
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

              {/* Modern Product Mix Pie Chart */}
              <Card className="bg-white border border-gray-200 border-2 border-orange-300/20" data-testid="chart-product-mix">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-3">
                    <Package className="w-6 h-6 text-orange-600" strokeWidth={2.5} />
                    Mix Prodotti
                  </CardTitle>
                  <CardDescription className="text-gray-700 font-medium">Distribuzione vendite per categoria</CardDescription>
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

            {/* Modern Conversion Rate by Area */}
            <Card className="bg-white border border-gray-200 border-2 border-green-300/20" data-testid="chart-conversion-rate">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-green-800 flex items-center gap-3">
                  <Target className="w-6 h-6 text-green-600" strokeWidth={2.5} />
                  Tasso Conversione per Area Commerciale
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium">Performance di conversione lead per area geografica</CardDescription>
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

            {/* Modern Store Performance Table */}
            <Card className="bg-white border border-gray-200 border-2 border-purple-300/20" data-testid="table-store-performance">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-3">
                  <Store className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
                  Top Performing Stores
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold ml-auto">REAL-TIME</span>
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium">I migliori punti vendita per revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-purple-200/50">
                        <th className="text-left py-4 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">PDV</th>
                        <th className="text-left py-4 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Revenue</th>
                        <th className="text-left py-4 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Clienti</th>
                        <th className="text-left py-4 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Conversione</th>
                        <th className="text-left py-4 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceByStore.map((store, index) => (
                        <tr key={index} className="border-b border-purple-100/50 hover:bg-purple-50/30 transition-all duration-200" data-testid={`row-store-${index}`}>
                          <td className="py-5 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Store className="w-5 h-5 text-purple-600" strokeWidth={2} />
                              </div>
                              <span className="font-semibold text-gray-800">{store.store}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <span className="font-bold text-2xl text-purple-700">€{store.revenue.toLocaleString()}</span>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-500" strokeWidth={2} />
                              <span className="text-gray-800 font-medium">{store.customers}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-purple-600 to-orange-500 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${store.conversion}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-purple-700">{store.conversion}%</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                              <ArrowUpRight className="w-5 h-5 mr-2" strokeWidth={2.5} />
                              <span className="font-bold">+{Math.floor(Math.random() * 20 + 5)}%</span>
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
            <Card className="bg-white border border-gray-200 border-2 border-orange-300/20" data-testid="revenue-analysis">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-orange-800 flex items-center gap-3">
                  <DollarSign className="w-7 h-7 text-orange-600" strokeWidth={2.5} />
                  Analisi Revenue Dettagliata
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold ml-auto">LIVE DATA</span>
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium text-lg">Breakdown completo dei ricavi per area e periodo</CardDescription>
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
              <Card className="bg-white border border-gray-200 border-2 border-green-300/20" data-testid="performance-nord">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                    Performance Nord
                  </CardTitle>
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