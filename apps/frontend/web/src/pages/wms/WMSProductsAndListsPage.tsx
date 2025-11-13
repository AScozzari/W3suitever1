import { useState, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTabRouter } from '@/hooks/useTabRouter';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  FolderTree, 
  Building2 
} from 'lucide-react';
import DashboardTabContent from '@/components/wms/DashboardTabContent';
import ListiniTabContent from '@/components/wms/ListiniTabContent';

// Lazy load heavy components
const ProductsPage = lazy(() => import('./ProductsPage'));

const CategoriesTypologiesTabContent = () => (
  <div className="p-8 text-center" data-testid="tab-content-categorie">
    <FolderTree size={48} className="mx-auto mb-4 text-gray-400" data-testid="icon-categorie" />
    <h3 className="text-xl font-semibold mb-2" data-testid="heading-categorie">Categorie & Tipologie</h3>
    <p className="text-gray-600" data-testid="text-categorie-status">Task #11: 3-column layout in implementazione</p>
  </div>
);

const FornitoriTabContent = () => (
  <div className="p-8 text-center" data-testid="tab-content-fornitori">
    <Building2 size={48} className="mx-auto mb-4 text-gray-400" data-testid="icon-fornitori" />
    <h3 className="text-xl font-semibold mb-2" data-testid="heading-fornitori">Fornitori</h3>
    <p className="text-gray-600" data-testid="text-fornitori-status">Task #10: In Implementazione</p>
  </div>
);

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
    'listini',
    'categorie',
    'fornitori'
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
      id: 'listini',
      label: 'Listini',
      icon: FileText,
      testId: 'tab-listini'
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
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setTab}>
          {/* Glassmorphism TabsList */}
          <TabsList 
            className="grid w-full mb-6"
            style={{
              gridTemplateColumns: 'repeat(5, 1fr)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              padding: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
            }}
          >
            {tabConfigs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  data-testid={tab.testId}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

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
        </Tabs>
      </div>
    </Layout>
  );
}
