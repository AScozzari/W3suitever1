import { useQuery } from '@tanstack/react-query';
import { Package, FolderTree, Building2, FileText, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalPriceLists: number;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  testId: string;
}

const KPICard = ({ icon, label, value, color, testId }: KPICardProps) => (
  <Card
    className="p-6"
    style={{
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
    }}
    data-testid={testId}
  >
    <div className="flex items-center gap-4">
      <div
        className="p-3 rounded-xl"
        style={{ background: `${color}15` }}
        data-testid={`${testId}-icon-container`}
      >
        <div style={{ color }} data-testid={`${testId}-icon`}>
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <p
          className="text-sm text-gray-600 mb-1"
          data-testid={`${testId}-label`}
        >
          {label}
        </p>
        <p
          className="text-3xl font-bold"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid={`${testId}-value`}
        >
          {value.toLocaleString('it-IT')}
        </p>
      </div>
      <TrendingUp
        className="h-5 w-5 text-gray-400"
        data-testid={`${testId}-trend`}
      />
    </div>
  </Card>
);

interface Product {
  id: string;
  sku: string;
  nome: string;
  productType: string;
  prezzoVendita: number | null;
  quantitaDisponibile: number;
  createdAt: string;
}

export default function DashboardTabContent() {
  // Note: queryClient automatically unwraps {success, data} responses
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/wms/dashboard/stats'],
  });

  // Fetch recent products
  const { data: recentProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products?limit=5&sort_by=created_at&sort_order=desc'],
  });

  const isLoading = statsLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
        <Skeleton className="h-64" data-testid="skeleton-products" />
        <Skeleton className="h-40" data-testid="skeleton-actions" />
      </div>
    );
  }

  const dashboardStats = stats || {
    totalProducts: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    totalPriceLists: 0
  };

  const products = recentProducts || [];

  return (
    <div className="space-y-6" data-testid="dashboard-content">
      {/* Header */}
      <div className="mb-6" data-testid="dashboard-header">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="dashboard-title"
        >
          Dashboard WMS
        </h2>
        <p className="text-gray-600" data-testid="dashboard-subtitle">
          Panoramica del magazzino e gestione prodotti
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-grid">
        <KPICard
          icon={<Package className="h-6 w-6" />}
          label="Prodotti Totali"
          value={dashboardStats.totalProducts}
          color="hsl(var(--brand-orange))"
          testId="kpi-products"
        />
        <KPICard
          icon={<FolderTree className="h-6 w-6" />}
          label="Categorie"
          value={dashboardStats.totalCategories}
          color="hsl(var(--brand-purple))"
          testId="kpi-categories"
        />
        <KPICard
          icon={<Building2 className="h-6 w-6" />}
          label="Fornitori"
          value={dashboardStats.totalSuppliers}
          color="hsl(142, 76%, 36%)"
          testId="kpi-suppliers"
        />
        <KPICard
          icon={<FileText className="h-6 w-6" />}
          label="Listini Prezzi"
          value={dashboardStats.totalPriceLists}
          color="hsl(220, 90%, 56%)"
          testId="kpi-pricelists"
        />
      </div>

      {/* Recent Products */}
      <Card
        className="p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="recent-products-card"
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="recent-products-title"
        >
          Prodotti Recenti
        </h3>
        {products.length === 0 ? (
          <p className="text-gray-500 text-sm" data-testid="no-products-message">
            Nessun prodotto disponibile. Crea il tuo primo prodotto!
          </p>
        ) : (
          <div className="overflow-x-auto" data-testid="products-table-container">
            <table className="w-full" data-testid="products-table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600" data-testid="header-sku">
                    SKU
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600" data-testid="header-nome">
                    Nome
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600" data-testid="header-type">
                    Tipo
                  </th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600" data-testid="header-prezzo">
                    Prezzo
                  </th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600" data-testid="header-stock">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr 
                    key={product.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    data-testid={`product-row-${product.id}`}
                  >
                    <td className="py-3 px-3 text-sm font-mono" data-testid={`product-sku-${product.id}`}>
                      {product.sku}
                    </td>
                    <td className="py-3 px-3 text-sm" data-testid={`product-nome-${product.id}`}>
                      {product.nome}
                    </td>
                    <td className="py-3 px-3 text-sm" data-testid={`product-type-${product.id}`}>
                      <span className="px-2 py-1 rounded-md text-xs bg-gray-100">
                        {product.productType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-right font-medium" data-testid={`product-price-${product.id}`}>
                      {product.prezzoVendita ? `€${product.prezzoVendita.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-sm text-right" data-testid={`product-stock-${product.id}`}>
                      <span 
                        className={`px-2 py-1 rounded-md text-xs ${
                          product.quantitaDisponibile > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.quantitaDisponibile}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card
        className="p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="quick-actions-card"
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="quick-actions-title"
        >
          Azioni Rapide
        </h3>
        <div className="flex flex-wrap gap-3" data-testid="quick-actions-buttons">
          <Button
            style={{
              background: 'hsl(var(--brand-orange))',
              color: 'white',
            }}
            data-testid="button-quick-new-product"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Prodotto
          </Button>
          <Button
            variant="outline"
            data-testid="button-quick-new-category"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Categoria
          </Button>
          <Button
            variant="outline"
            data-testid="button-quick-new-supplier"
            disabled
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Fornitore
          </Button>
          <Button
            variant="outline"
            data-testid="button-quick-new-pricelist"
            disabled
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Listino
          </Button>
        </div>
        <p
          className="text-sm text-gray-500 mt-4"
          data-testid="text-quick-actions-note"
        >
          Nota: Alcune funzionalità sono in fase di implementazione
        </p>
      </Card>
    </div>
  );
}
