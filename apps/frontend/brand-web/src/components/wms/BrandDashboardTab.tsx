import { useQuery } from '@tanstack/react-query';
import { Package, FolderTree, Building2, FileText, TrendingUp, Plus, GitBranch, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  testId: string;
}

const withAlpha = (hslColor: string, alpha: number) => {
  if (hslColor.includes('var(')) {
    const lastParenIndex = hslColor.lastIndexOf(')');
    return hslColor.slice(0, lastParenIndex) + ` / ${alpha})`;
  } else {
    return hslColor.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }
};

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
        style={{ background: withAlpha(color, 0.15) }}
        data-testid={`${testId}-icon-container`}
      >
        <div style={{ color }} data-testid={`${testId}-icon`}>
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1" data-testid={`${testId}-label`}>
          {label}
        </p>
        <p className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }} data-testid={`${testId}-value`}>
          {value.toLocaleString('it-IT')}
        </p>
      </div>
      <TrendingUp className="h-5 w-5 text-gray-400" data-testid={`${testId}-trend`} />
    </div>
  </Card>
);

export default function BrandDashboardTab() {
  const [, navigate] = useLocation();

  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['/brand-api/wms/products'],
    queryFn: brandWmsApi.getProducts
  });

  const { data: categoriesRes, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/brand-api/wms/categories'],
    queryFn: brandWmsApi.getCategories
  });

  const { data: suppliersRes, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/brand-api/wms/suppliers'],
    queryFn: brandWmsApi.getSuppliers
  });

  const { data: typesRes, isLoading: typesLoading } = useQuery({
    queryKey: ['/brand-api/wms/product-types'],
    queryFn: brandWmsApi.getProductTypes
  });

  const { data: commitsRes, isLoading: commitsLoading } = useQuery<{ data: any[] }>({
    queryKey: ['/brand-api/deploy/commits']
  });

  const isLoading = productsLoading || categoriesLoading || suppliersLoading || typesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
        <Skeleton className="h-40" data-testid="skeleton-actions" />
      </div>
    );
  }

  const products = productsRes?.data || [];
  const categories = categoriesRes?.data || [];
  const suppliers = suppliersRes?.data || [];
  const productTypes = typesRes?.data || [];
  const commits = commitsRes?.data || [];

  const wmsPendingCommits = commits.filter(c => c.tool === 'wms' && c.status === 'pending').length;

  const stats = {
    totalProducts: products.length,
    totalCategories: categories.length,
    totalSuppliers: suppliers.length,
    totalPriceLists: 0
  };

  return (
    <div className="space-y-6" data-testid="dashboard-content">
      {/* Header */}
      <div className="mb-6" data-testid="dashboard-header">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }} data-testid="dashboard-title">
          Dashboard WMS - Catalogo Master
        </h2>
        <p className="text-gray-600" data-testid="dashboard-subtitle">
          Gestisci i cataloghi master prodotti, categorie, tipologie e fornitori. I dati vengono sincronizzati selettivamente ai tenant tramite il sistema di deployment.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-grid">
        <KPICard
          icon={<Package className="h-6 w-6" />}
          label="Prodotti Master"
          value={stats.totalProducts}
          color="hsl(var(--brand-orange))"
          testId="kpi-products"
        />
        <KPICard
          icon={<FolderTree className="h-6 w-6" />}
          label="Categorie"
          value={stats.totalCategories}
          color="hsl(var(--brand-purple))"
          testId="kpi-categories"
        />
        <KPICard
          icon={<Building2 className="h-6 w-6" />}
          label="Fornitori Master"
          value={stats.totalSuppliers}
          color="hsl(142, 76%, 36%)"
          testId="kpi-suppliers"
        />
        <KPICard
          icon={<FileText className="h-6 w-6" />}
          label="Listini Prezzi"
          value={stats.totalPriceLists}
          color="hsl(220, 90%, 56%)"
          testId="kpi-pricelists"
        />
      </div>

      {/* WMS Deploy Mini-Dashboard */}
      <Card
        className="p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.05), rgba(123, 44, 191, 0.05))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 105, 0, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(255, 105, 0, 0.1)'
        }}
        data-testid="wms-deploy-mini-dash"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: 'rgba(255, 105, 0, 0.15)' }}
            >
              <GitBranch className="h-6 w-6" style={{ color: 'hsl(25, 95%, 53%)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Deploy Center
              </h3>
              <p className="text-sm text-gray-600">
                {commitsLoading ? (
                  'Caricamento commits...'
                ) : wmsPendingCommits > 0 ? (
                  <>
                    <span className="font-bold" style={{ color: 'hsl(25, 95%, 53%)' }}>
                      {wmsPendingCommits} commit{wmsPendingCommits !== 1 ? 's' : ''}
                    </span>
                    {' '}WMS pront{wmsPendingCommits === 1 ? 'o' : 'i'} per il deployment
                  </>
                ) : (
                  'Nessun commit WMS in attesa di deployment'
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/deploy-center')}
            style={{
              background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 100%, 60%))',
              color: 'white',
              border: 'none'
            }}
            data-testid="button-navigate-deploy-center"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Vai a Deploy Center
          </Button>
        </div>
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
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }} data-testid="quick-actions-title">
          Azioni Rapide
        </h3>
        <div className="flex flex-wrap gap-3" data-testid="quick-actions-buttons">
          <Button style={{ background: 'hsl(var(--brand-orange))', color: 'white' }} data-testid="button-quick-new-product">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Prodotto
          </Button>
          <Button variant="outline" data-testid="button-quick-new-category">
            <Plus className="h-4 w-4 mr-2" />
            Nuova Categoria
          </Button>
          <Button variant="outline" data-testid="button-quick-new-supplier">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Fornitore
          </Button>
          <Button variant="outline" data-testid="button-quick-new-pricelist" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Listino
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4" data-testid="text-quick-actions-note">
          💡 Utilizza le tab sopra per navigare tra le sezioni e gestire il catalogo master
        </p>
      </Card>
    </div>
  );
}
