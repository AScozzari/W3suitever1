import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, FolderTree, Building2, FileText, Plus, TrendingUp, TrendingDown,
  Landmark, Box, Globe, Palette, Wrench, ArrowUpDown, ChevronUp, ChevronDown,
  Eye, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalPriceLists: number;
  totalTypologies?: number;
  totalFinancialEntities?: number;
  productsByType?: {
    PHYSICAL: number;
    VIRTUAL: number;
    CANVAS: number;
    SERVICE: number;
  };
  categoriesByType?: {
    name: string;
    count: number;
  }[];
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  testId: string;
}

const KPICard = ({ icon, label, value, subValue, color, trend = 'neutral', trendValue, testId }: KPICardProps) => (
  <Card
    className="p-5 hover:shadow-lg transition-all duration-300"
    style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
    }}
    data-testid={testId}
  >
    <div className="flex items-start justify-between">
      <div
        className="p-3 rounded-xl"
        style={{ background: `${color}15` }}
        data-testid={`${testId}-icon-container`}
      >
        <div style={{ color }} data-testid={`${testId}-icon`}>
          {icon}
        </div>
      </div>
      {trend !== 'neutral' && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p
        className="text-3xl font-bold"
        style={{ color: 'hsl(var(--foreground))' }}
        data-testid={`${testId}-value`}
      >
        {value.toLocaleString('it-IT')}
      </p>
      <p
        className="text-sm text-gray-600 mt-1"
        data-testid={`${testId}-label`}
      >
        {label}
      </p>
      {subValue && (
        <p className="text-xs text-gray-400 mt-1" data-testid={`${testId}-subvalue`}>
          {subValue}
        </p>
      )}
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
  categoryName?: string;
  isActive?: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  productType: string;
  source: string;
}

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  PHYSICAL: '#FF6900',
  VIRTUAL: '#7B2CBF',
  CANVAS: '#3B82F6',
  SERVICE: '#10B981'
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: 'Fisico',
  VIRTUAL: 'Virtuale',
  CANVAS: 'Canvas',
  SERVICE: 'Servizio'
};

const PRODUCT_TYPE_ICONS: Record<string, React.ReactNode> = {
  PHYSICAL: <Box className="h-4 w-4" />,
  VIRTUAL: <Globe className="h-4 w-4" />,
  CANVAS: <Palette className="h-4 w-4" />,
  SERVICE: <Wrench className="h-4 w-4" />
};

type SortField = 'sku' | 'nome' | 'productType' | 'prezzoVendita' | 'quantitaDisponibile';
type SortOrder = 'asc' | 'desc';

export default function DashboardTabContent() {
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/wms/dashboard/stats'],
  });

  const { data: recentProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/wms/products?limit=10&sort_by=created_at&sort_order=desc'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  const { data: financialEntities } = useQuery<any[]>({
    queryKey: ['/api/financial-entities'],
  });

  const isLoading = statsLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" data-testid="skeleton-products" />
      </div>
    );
  }

  const dashboardStats = stats || {
    totalProducts: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    totalPriceLists: 0,
    totalTypologies: 0,
    totalFinancialEntities: 0,
    productsByType: { PHYSICAL: 0, VIRTUAL: 0, CANVAS: 0, SERVICE: 0 }
  };

  const products = recentProducts || [];
  const categoryList = categories || [];
  const financialEntityCount = financialEntities?.length || dashboardStats.totalFinancialEntities || 0;

  // Calcola distribuzione prodotti per tipo
  const productsByType = dashboardStats.productsByType || {
    PHYSICAL: products.filter(p => p.productType === 'PHYSICAL').length,
    VIRTUAL: products.filter(p => p.productType === 'VIRTUAL').length,
    CANVAS: products.filter(p => p.productType === 'CANVAS').length,
    SERVICE: products.filter(p => p.productType === 'SERVICE').length
  };

  const pieChartData = Object.entries(productsByType)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: PRODUCT_TYPE_LABELS[key] || key,
      value,
      color: PRODUCT_TYPE_COLORS[key] || '#6B7280'
    }));

  // Calcola prodotti per categoria (top 5)
  const categoryProductCounts = categoryList.reduce((acc, cat) => {
    const count = products.filter(p => p.categoryName === cat.name).length;
    if (count > 0) {
      acc.push({ name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name, count });
    }
    return acc;
  }, [] as { name: string; count: number }[]);

  const barChartData = categoryProductCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sorting della tabella
  const sortedProducts = [...products].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (sortField === 'prezzoVendita') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6" data-testid="dashboard-content">
      {/* Header */}
      <div className="mb-2" data-testid="dashboard-header">
        <h2
          className="text-2xl font-bold mb-1"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="dashboard-title"
        >
          Dashboard Catalogo
        </h2>
        <p className="text-gray-600" data-testid="dashboard-subtitle">
          Panoramica completa di prodotti, categorie, fornitori e listini
        </p>
      </div>

      {/* KPI Cards Grid - 5 colonne */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="kpi-grid">
        <KPICard
          icon={<Package className="h-6 w-6" />}
          label="Prodotti"
          value={dashboardStats.totalProducts}
          subValue={`${Object.values(productsByType).filter(v => v > 0).length} tipi attivi`}
          color="#FF6900"
          testId="kpi-products"
        />
        <KPICard
          icon={<FolderTree className="h-6 w-6" />}
          label="Categorie"
          value={dashboardStats.totalCategories}
          subValue={dashboardStats.totalTypologies ? `${dashboardStats.totalTypologies} tipologie` : undefined}
          color="#7B2CBF"
          testId="kpi-categories"
        />
        <KPICard
          icon={<Building2 className="h-6 w-6" />}
          label="Fornitori"
          value={dashboardStats.totalSuppliers}
          color="#10B981"
          testId="kpi-suppliers"
        />
        <KPICard
          icon={<Landmark className="h-6 w-6" />}
          label="Enti Finanziari"
          value={financialEntityCount}
          color="#F59E0B"
          testId="kpi-financial-entities"
        />
        <KPICard
          icon={<FileText className="h-6 w-6" />}
          label="Listini"
          value={dashboardStats.totalPriceLists}
          color="#3B82F6"
          testId="kpi-pricelists"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Distribuzione per Tipo */}
        <Card
          className="p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
          }}
          data-testid="chart-product-types"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Distribuzione Prodotti per Tipo
          </h3>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value, 'Prodotti']}
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.95)', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Nessun prodotto disponibile</p>
              </div>
            </div>
          )}
        </Card>

        {/* Bar Chart - Top Categorie */}
        <Card
          className="p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
          }}
          data-testid="chart-top-categories"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Top 5 Categorie per Prodotti
          </h3>
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100} 
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: number) => [value, 'Prodotti']}
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.95)', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#FF6900" 
                  radius={[0, 4, 4, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FolderTree className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Nessuna categoria con prodotti</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Breakdown per Tipo Prodotto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
          <Card
            key={key}
            className="p-4 flex items-center gap-3"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              border: `2px solid ${PRODUCT_TYPE_COLORS[key]}20`,
              borderRadius: '12px',
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ background: `${PRODUCT_TYPE_COLORS[key]}15` }}
            >
              <div style={{ color: PRODUCT_TYPE_COLORS[key] }}>
                {PRODUCT_TYPE_ICONS[key]}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: PRODUCT_TYPE_COLORS[key] }}>
                {productsByType[key as keyof typeof productsByType] || 0}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* DataTable Prodotti Recenti */}
      <Card
        className="p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="recent-products-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Prodotti Recenti
          </h3>
          <Badge variant="outline" className="text-xs">
            Ultimi {products.length} prodotti
          </Badge>
        </div>
        
        {products.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nessun prodotto disponibile</p>
            <p className="text-sm">Crea il tuo primo prodotto per iniziare!</p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="products-table-container">
            <table className="w-full" data-testid="products-table">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <SortHeader field="sku" label="SKU" />
                  <SortHeader field="nome" label="Nome" />
                  <SortHeader field="productType" label="Tipo" />
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Categoria
                  </th>
                  <SortHeader field="prezzoVendita" label="Prezzo" />
                  <SortHeader field="quantitaDisponibile" label="Stock" />
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors"
                    data-testid={`product-row-${product.id}`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {product.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{product.nome || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        style={{
                          background: `${PRODUCT_TYPE_COLORS[product.productType] || '#6B7280'}15`,
                          color: PRODUCT_TYPE_COLORS[product.productType] || '#6B7280',
                          border: `1px solid ${PRODUCT_TYPE_COLORS[product.productType] || '#6B7280'}30`
                        }}
                        className="font-medium"
                      >
                        {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {product.categoryName || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold">
                        {product.prezzoVendita 
                          ? `€${product.prezzoVendita.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` 
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={product.quantitaDisponibile > 10 ? 'default' : product.quantitaDisponibile > 0 ? 'secondary' : 'destructive'}
                        className={
                          product.quantitaDisponibile > 10 
                            ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                            : product.quantitaDisponibile > 0 
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              : ''
                        }
                      >
                        {product.quantitaDisponibile}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizza
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          background: 'linear-gradient(135deg, rgba(255,105,0,0.05) 0%, rgba(123,44,191,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="quick-actions-card"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Azioni Rapide
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="quick-actions-buttons">
          <Button
            className="h-auto py-4 flex flex-col gap-2"
            style={{
              background: 'hsl(var(--brand-orange))',
              color: 'white',
            }}
            data-testid="button-quick-new-product"
          >
            <Package className="h-5 w-5" />
            <span className="text-sm">Nuovo Prodotto</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:border-purple-300 hover:bg-purple-50"
            data-testid="button-quick-new-category"
          >
            <FolderTree className="h-5 w-5 text-purple-600" />
            <span className="text-sm">Nuova Categoria</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:border-green-300 hover:bg-green-50"
            data-testid="button-quick-new-supplier"
          >
            <Building2 className="h-5 w-5 text-green-600" />
            <span className="text-sm">Nuovo Fornitore</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:border-amber-300 hover:bg-amber-50"
            data-testid="button-quick-new-financial-entity"
          >
            <Landmark className="h-5 w-5 text-amber-600" />
            <span className="text-sm">Nuovo Ente</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:border-blue-300 hover:bg-blue-50"
            data-testid="button-quick-new-pricelist"
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Nuovo Listino</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
