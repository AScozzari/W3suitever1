import { useState, useMemo } from 'react';
import BrandLayout from '@/components/BrandLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  FolderTree, 
  Building2,
  Plus,
  ShoppingCart
} from 'lucide-react';

// Tab contents (we'll create these next)
import BrandDashboardTab from '@/components/wms/BrandDashboardTab';
import BrandProductsTab from '@/components/wms/BrandProductsTab';
import BrandCategoriesTab from '@/components/wms/BrandCategoriesTab';
import BrandSuppliersTab from '@/components/wms/BrandSuppliersTab';
import BrandPriceListsTab from '@/components/wms/BrandPriceListsTab';

export default function WMSCatalogPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

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

  return (
    <BrandLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div 
          style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0
                }}>
                  <ShoppingCart size={24} style={{ color: '#FF6900' }} />
                  Prodotti e Listini
                </h1>
                <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
                  Catalogo master prodotti WMS - Brand Interface
                </p>
              </div>
              
              <Button 
                style={{
                  background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                  color: 'white',
                  border: 'none'
                }}
                data-testid="button-create-product"
                onClick={() => setActiveTab('prodotti')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Prodotto
              </Button>
            </div>
            
            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={tab.testId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: isActive 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                        : 'transparent',
                      color: isActive ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard" className="mt-0">
              {activeTab === 'dashboard' && <BrandDashboardTab />}
            </TabsContent>

            <TabsContent value="prodotti" className="mt-0">
              {activeTab === 'prodotti' && <BrandProductsTab />}
            </TabsContent>

            <TabsContent value="listini" className="mt-0">
              {activeTab === 'listini' && <BrandPriceListsTab />}
            </TabsContent>

            <TabsContent value="categorie" className="mt-0">
              {activeTab === 'categorie' && <BrandCategoriesTab />}
            </TabsContent>

            <TabsContent value="fornitori" className="mt-0">
              {activeTab === 'fornitori' && <BrandSuppliersTab />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </BrandLayout>
  );
}
