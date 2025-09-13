import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import MarketingWorkspace from '../components/workspaces/MarketingWorkspace';
import SalesWorkspace from '../components/workspaces/SalesWorkspace';
import OperationsWorkspace from '../components/workspaces/OperationsWorkspace';
import AdminWorkspace from '../components/workspaces/AdminWorkspace';
import { Building2, Users, TrendingUp, Settings, Globe, ChartBar, Activity, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function Dashboard() {
  const { isAuthenticated, user } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();
  const [activeTab, setActiveTab] = useState('overview');
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated using wouter
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]);

  // Render loading or return early if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-violet-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <BrandLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50">
        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-violet-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-orange-500 bg-clip-text text-transparent">
                  Brand Interface HQ
                </h1>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Gestione centralizzata per {isCrossTenant ? "tutti i tenant" : currentTenant || currentTenantId}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="px-4 py-2 bg-violet-100 rounded-lg">
                  <span className="text-sm text-violet-600">Modalità:</span>
                  <span className="ml-2 font-semibold text-violet-800">
                    {isCrossTenant ? "Cross-Tenant" : "Tenant Specifico"}
                  </span>
                </div>
                {user && (
                  <div className="px-4 py-2 bg-orange-100 rounded-lg">
                    <span className="text-sm text-orange-600">Utente:</span>
                    <span className="ml-2 font-semibold text-orange-800">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-violet-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Organizzazioni
                </CardTitle>
                <Building2 className="h-5 w-5 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-700">6</div>
                <p className="text-xs text-muted-foreground">
                  +2 nuove questo mese
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Utenti Attivi
                </CardTitle>
                <Users className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">22</div>
                <p className="text-xs text-muted-foreground">
                  85% tasso di attività
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Campagne Attive
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">4</div>
                <p className="text-xs text-muted-foreground">
                  2 in deployment
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Revenue Totale
                </CardTitle>
                <ChartBar className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">€1.2M</div>
                <p className="text-xs text-muted-foreground">
                  +12.5% dal mese scorso
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm shadow-md">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-100 data-[state=active]:to-orange-100 data-[state=active]:text-violet-700"
              >
                <Activity className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="admin" 
                className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Marketing
              </TabsTrigger>
              <TabsTrigger 
                value="sales" 
                className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
              >
                <ChartBar className="w-4 h-4 mr-2" />
                Sales
              </TabsTrigger>
              <TabsTrigger 
                value="operations" 
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Operations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-violet-100">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Panoramica Sistema
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attività Recenti</CardTitle>
                      <CardDescription>Ultime operazioni cross-tenant</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Nuova campagna deployata su 3 tenant</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>Listino prezzi aggiornato</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span>Report analytics generato</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Sistema</CardTitle>
                      <CardDescription>Metriche in tempo reale</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>API Response Time</span>
                          <span className="font-semibold text-green-600">45ms</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Uptime Sistema</span>
                          <span className="font-semibold text-green-600">99.98%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Database Load</span>
                          <span className="font-semibold text-yellow-600">Medium</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="admin" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-violet-100">
                <AdminWorkspace />
              </div>
            </TabsContent>
            
            <TabsContent value="marketing" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-orange-100">
                <MarketingWorkspace />
              </div>
            </TabsContent>
            
            <TabsContent value="sales" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100">
                <SalesWorkspace />
              </div>
            </TabsContent>
            
            <TabsContent value="operations" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100">
                <OperationsWorkspace />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </BrandLayout>
  );
}