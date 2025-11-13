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

export default function DashboardTabContent() {
  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/wms/dashboard/stats'],
  });

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

  const dashboardStats = stats?.data || {
    totalProducts: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    totalPriceLists: 0
  };

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
