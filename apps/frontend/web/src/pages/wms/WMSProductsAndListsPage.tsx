import { useState, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTabRouter } from '@/hooks/useTabRouter';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  FolderTree, 
  Building2,
  Plus,
  ShoppingCart,
  Landmark
} from 'lucide-react';
import DashboardTabContent from '@/components/wms/DashboardTabContent';
import ListiniTabContent from '@/components/wms/ListiniTabContent';
import FornitoriTabContent from '@/components/wms/FornitoriTabContent';
import CategoriesTypologiesTabContent from '@/components/wms/CategoriesTypologiesTabContent';
import EntiFinanziariTabContent from '@/components/wms/EntiFinanziariTabContent';

// Lazy load heavy components
const ProductsPage = lazy(() => import('./ProductsPage'));

// Loading fallback
const TabLoadingFallback = () => (
  <div className="p-8 text-center">
    <div 
      className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin mx-auto"
      style={{ borderTopColor: 'hsl(var(--brand-orange))' }}
    />
    <p className="mt-4 text-gray-600">Caricamento...</p>
  </div>
);

export default function WMSProductsAndListsPage() {
  const [currentModule, setCurrentModule] = useState('prodotti-listini');

  // Tab configuration with validation
  const validTabs = useMemo(() => [
    'dashboard',
    'prodotti',
    'categorie',
    'fornitori',
    'enti-finanziari',
    'listini'
  ], []);

  const tabConfigs = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      testId: 'tab-dashboard'
    },
    {
      id: 'prodotti',
      label: 'Prodotti',
      icon: Package,
      testId: 'tab-prodotti'
    },
    {
      id: 'categorie',
      label: 'Categorie & Tipologie',
      icon: FolderTree,
      testId: 'tab-categorie'
    },
    {
      id: 'fornitori',
      label: 'Fornitori',
      icon: Building2,
      testId: 'tab-fornitori'
    },
    {
      id: 'enti-finanziari',
      label: 'Enti Finanziari',
      icon: Landmark,
      testId: 'tab-enti-finanziari'
    },
    {
      id: 'listini',
      label: 'Listini',
      icon: FileText,
      testId: 'tab-listini'
    }
  ], []);

  // Tab router with URL sync and deep linking
  const { activeTab, setTab } = useTabRouter({
    defaultTab: 'dashboard',
    validTabs,
    tabParam: 'tab'
  });

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="h-full flex flex-col">
        {/* 🎯 WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-windtre-orange" />
                  Gestione Catalogo
                </h1>
                <p className="text-gray-600 mt-1">Gestione completa prodotti, categorie, listini e driver</p>
              </div>
              
            </div>
            
            {/* 🎯 Navigation Tabs */}
            <div className="flex gap-1 mt-4">
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    onClick={() => setTab(tab.id)}
                    className="flex items-center gap-2"
                    data-testid={tab.testId}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🎯 Main Content */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setTab}>

          {/* Tab Contents with conditional mounting */}
          <TabsContent value="dashboard" className="mt-0">
            {activeTab === 'dashboard' && <DashboardTabContent />}
          </TabsContent>

          <TabsContent value="prodotti" className="mt-0">
            {activeTab === 'prodotti' && (
              <Suspense fallback={<TabLoadingFallback />}>
                <ProductsPage 
                  useStandaloneLayout={false}
                  currentModule={currentModule}
                  setCurrentModule={setCurrentModule}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="listini" className="mt-0">
            {activeTab === 'listini' && <ListiniTabContent />}
          </TabsContent>

          <TabsContent value="categorie" className="mt-0">
            {activeTab === 'categorie' && <CategoriesTypologiesTabContent />}
          </TabsContent>

          <TabsContent value="fornitori" className="mt-0">
            {activeTab === 'fornitori' && <FornitoriTabContent />}
          </TabsContent>

          <TabsContent value="enti-finanziari" className="mt-0">
            {activeTab === 'enti-finanziari' && <EntiFinanziariTabContent />}
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </Layout>
  );
}
