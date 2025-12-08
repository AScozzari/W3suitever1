import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';

interface CustomerSalesTabProps {
  orders: any[];
  analytics: any;
}

export function CustomerSalesTab({
  orders,
  analytics
}: CustomerSalesTabProps) {
  const calculateRFMScore = () => {
    const now = Date.now();
    const recencyDays = analytics.daysSinceLastOrder || 999;
    const frequency = analytics.totalOrders;
    const monetary = analytics.totalRevenue;

    const recencyScore = 
      recencyDays <= 30 ? 5 :
      recencyDays <= 60 ? 4 :
      recencyDays <= 90 ? 3 :
      recencyDays <= 180 ? 2 : 1;

    const frequencyScore =
      frequency >= 10 ? 5 :
      frequency >= 5 ? 4 :
      frequency >= 3 ? 3 :
      frequency >= 2 ? 2 : 1;

    const monetaryScore =
      monetary >= 5000 ? 5 :
      monetary >= 2000 ? 4 :
      monetary >= 1000 ? 3 :
      monetary >= 500 ? 2 : 1;

    const totalScore = recencyScore + frequencyScore + monetaryScore;
    const segment =
      totalScore >= 13 ? 'Champions' :
      totalScore >= 10 ? 'Loyal Customers' :
      totalScore >= 7 ? 'Potential Loyalists' :
      totalScore >= 5 ? 'At Risk' : 'Lost';

    return { recencyScore, frequencyScore, monetaryScore, totalScore, segment };
  };

  const rfm = calculateRFMScore();

  const segmentColors = {
    'Champions': 'hsl(142, 76%, 36%)',
    'Loyal Customers': 'hsl(220, 90%, 56%)',
    'Potential Loyalists': 'hsl(48, 96%, 53%)',
    'At Risk': 'hsl(25, 95%, 53%)',
    'Lost': 'hsl(0, 84%, 60%)'
  };

  const monthlyRevenue = orders.reduce((acc, order) => {
    const month = new Date(order.orderDate).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + Number(order.totalAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  const last6Months = Object.entries(monthlyRevenue)
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  const avgMonthlyRevenue = last6Months.length > 0
    ? last6Months.reduce((sum, m) => sum + m.revenue, 0) / last6Months.length
    : 0;

  const lastMonthRevenue = last6Months[last6Months.length - 1]?.revenue || 0;
  const prevMonthRevenue = last6Months[last6Months.length - 2]?.revenue || 0;
  const trendPercentage = prevMonthRevenue > 0 
    ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
    : 0;

  const statusConfig = {
    completed: { label: 'Completato', color: 'hsl(142, 76%, 36%)' },
    pending: { label: 'In Attesa', color: 'hsl(48, 96%, 53%)' },
    cancelled: { label: 'Annullato', color: 'hsl(0, 84%, 60%)' },
    processing: { label: 'In Lavorazione', color: 'hsl(220, 90%, 56%)' }
  };

  const upsellSuggestions = [
    { 
      title: 'Premium Package Upgrade',
      description: 'Basato sulla cronologia acquisti, potrebbe essere interessato al pacchetto premium',
      potentialValue: 299,
      confidence: 'Alta'
    },
    { 
      title: 'Cross-sell Servizi Aggiuntivi',
      description: 'Prodotti complementari agli acquisti precedenti',
      potentialValue: 150,
      confidence: 'Media'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
            Revenue Trend
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold" style={{ color: '#1a1a1a' }}>
                €{lastMonthRevenue.toLocaleString('it-IT')}
              </div>
              <div className="text-sm" style={{ color: '#6b7280' }}>Ultimo Mese</div>
            </div>
            <div className={`flex items-center gap-2 text-sm font-medium ${trendPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trendPercentage >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{Math.abs(trendPercentage).toFixed(1)}% vs mese precedente</span>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
              <div className="text-sm" style={{ color: '#6b7280' }}>Media Mensile</div>
              <div className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>
                €{avgMonthlyRevenue.toLocaleString('it-IT')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
            RFM Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#6b7280' }}>Segmento Cliente</span>
              <Badge 
                variant="outline" 
                style={{ 
                  borderColor: segmentColors[rfm.segment as keyof typeof segmentColors], 
                  color: segmentColors[rfm.segment as keyof typeof segmentColors] 
                }}
              >
                {rfm.segment}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: '#6b7280' }}>Recency Score</span>
                <span className="font-medium">{rfm.recencyScore}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#6b7280' }}>Frequency Score</span>
                <span className="font-medium">{rfm.frequencyScore}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#6b7280' }}>Monetary Score</span>
                <span className="font-medium">{rfm.monetaryScore}/5</span>
              </div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
              <div className="text-sm" style={{ color: '#6b7280' }}>RFM Score Totale</div>
              <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                {rfm.totalScore}/15
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
            Opportunità Upsell
          </h3>
          <div className="space-y-3">
            {upsellSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                    {suggestion.title}
                  </span>
                  <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-orange))', color: 'hsl(var(--brand-orange))' }}>
                    €{suggestion.potentialValue}
                  </Badge>
                </div>
                <p className="text-xs mb-2" style={{ color: '#6b7280' }}>
                  {suggestion.description}
                </p>
                <div className="text-xs" style={{ color: '#6b7280' }}>
                  Confidenza: <span className="font-medium">{suggestion.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
          Storico Ordini ({orders.length})
        </h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun ordine registrato</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero Ordine</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Prodotti</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Metodo Pagamento</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" style={{ color: '#6b7280' }} />
                        {new Date(order.orderDate).toLocaleDateString('it-IT')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(order.items) ? (
                        <div className="text-sm">
                          {order.items.slice(0, 2).map((p: any, i: number) => (
                            <div key={i} style={{ color: '#6b7280' }}>{p.name}</div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs" style={{ color: '#9ca3af' }}>
                              +{order.items.length - 2} altri
                            </div>
                          )}
                        </div>
                      ) : 'N/D'}
                    </TableCell>
                    <TableCell className="font-semibold" style={{ color: 'hsl(var(--brand-orange))' }}>
                      €{Number(order.totalAmount || 0).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell className="capitalize">{order.paymentMethod || 'N/D'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: status.color, color: status.color }}>
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
