import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CustomerTimelineView } from '@/components/crm/CustomerTimelineView';
import { CustomerConsentManager } from '@/components/crm/CustomerConsentManager';
import { CustomerActions } from '@/components/crm/CustomerActions';
import { CustomerAnalytics } from '@/components/crm/CustomerAnalytics';
import { CustomerOverviewTab } from '@/components/crm/CustomerOverviewTab';
import { CustomerSalesTab } from '@/components/crm/CustomerSalesTab';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  ShoppingCart,
  FileText,
  BarChart3,
  MessageSquare,
  Eye
} from 'lucide-react';

interface Customer360Data {
  customer: any;
  leads: any[];
  deals: any[];
  orders: any[];
  interactions: any[];
  analytics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null;
    totalLeads: number;
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalInteractions: number;
  };
}

export default function CustomerDetailPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [activeTab, setActiveTab] = useState('overview');
  const params = useParams();
  const customerId = params.id;

  const { data: customer360, isLoading } = useQuery<Customer360Data>({
    queryKey: [`/api/crm/customers/${customerId}/360`],
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <div className="p-6">
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!customer360?.customer) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <div className="text-center py-12">Cliente non trovato</div>
      </Layout>
    );
  }

  const { customer, leads, deals, orders, interactions, analytics } = customer360;

  const isB2B = customer.type === 'business';
  const customerName = isB2B 
    ? customer.businessName || 'N/D'
    : `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/D';
  
  const initials = isB2B
    ? (customer.businessName?.[0] || 'B').toUpperCase()
    : `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();

  const statusConfig = {
    active: { label: 'Attivo', color: 'hsl(142, 76%, 36%)' },
    inactive: { label: 'Inattivo', color: 'hsl(0, 84%, 60%)' },
    prospect: { label: 'Prospect', color: 'hsl(220, 90%, 56%)' }
  };
  const status = statusConfig[customer.status as keyof typeof statusConfig] || { 
    label: customer.status || 'N/D', 
    color: 'hsl(220, 90%, 56%)' 
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6">
          <Card 
            className="p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
            }}
          >
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback 
                  className="text-2xl font-bold"
                  style={{ 
                    background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                    color: 'white' 
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 
                    className="text-3xl font-bold" 
                    style={{ color: '#1a1a1a' }}
                    data-testid="customer-name"
                  >
                    {customerName}
                  </h1>
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: status.color, color: status.color }}
                  >
                    {status.label}
                  </Badge>
                  {isB2B && (
                    <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-orange))', color: 'hsl(var(--brand-orange))' }}>
                      <Building2 className="h-3 w-3 mr-1" />
                      B2B
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4" style={{ color: '#6b7280' }}>
                  {customer.emailCanonical && (
                    <div className="flex items-center gap-2" data-testid="customer-email">
                      <Mail className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                      <span>{customer.emailCanonical}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2" data-testid="customer-phone">
                      <Phone className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {isB2B && customer.vatNumber && (
                    <div className="flex items-center gap-2" data-testid="customer-vat">
                      <Building2 className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                      <span>P.IVA: {customer.vatNumber}</span>
                    </div>
                  )}
                  {!isB2B && customer.fiscalCode && (
                    <div className="flex items-center gap-2" data-testid="customer-fiscal-code">
                      <User className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                      <span>CF: {customer.fiscalCode}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2" data-testid="customer-address">
                      <MapPin className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  {customer.createdAt && (
                    <div className="flex items-center gap-2" data-testid="customer-created">
                      <Calendar className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                      <span>Cliente dal {new Date(customer.createdAt).toLocaleDateString('it-IT')}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                    </div>
                    <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                      €{analytics.totalRevenue.toLocaleString('it-IT')}
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>Revenue Totale</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <ShoppingCart className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
                    </div>
                    <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                      {analytics.totalOrders}
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>Ordini</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                    </div>
                    <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                      {analytics.wonDeals}/{analytics.totalDeals}
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>Deal Vinti</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Activity className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
                    </div>
                    <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                      {analytics.totalInteractions}
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>Interazioni</div>
                  </Card>
                </div>
              </div>

              <div>
                <CustomerActions customerId={customerId as string} customer={customer} />
              </div>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Eye className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="vendite" data-testid="tab-vendite">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Vendite
              </TabsTrigger>
              <TabsTrigger value="marketing" data-testid="tab-marketing">
                <TrendingUp className="h-4 w-4 mr-2" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="attivita" data-testid="tab-attivita">
                <Activity className="h-4 w-4 mr-2" />
                Attività
              </TabsTrigger>
              <TabsTrigger value="documenti" data-testid="tab-documenti">
                <FileText className="h-4 w-4 mr-2" />
                Documenti
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="consensi" data-testid="tab-consensi">
                <Target className="h-4 w-4 mr-2" />
                Consensi
              </TabsTrigger>
              <TabsTrigger value="note" data-testid="tab-note">
                <MessageSquare className="h-4 w-4 mr-2" />
                Note
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <CustomerOverviewTab
                customer={customer}
                leads={leads}
                deals={deals}
                orders={orders}
                interactions={interactions}
                analytics={analytics}
              />
            </TabsContent>

            <TabsContent value="vendite" className="space-y-6">
              <CustomerSalesTab
                orders={orders}
                analytics={analytics}
              />
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Attribution & Campagne</h3>
                <p className="text-sm text-muted-foreground">
                  UTM attribution, canali preferiti, attribution path - Da implementare
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="attivita" className="space-y-6">
              <CustomerTimelineView customerId={customerId as string} />
            </TabsContent>

            <TabsContent value="documenti" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Documenti</h3>
                <p className="text-sm text-muted-foreground">
                  Upload/download documenti, preview, versioning - Da implementare
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <CustomerAnalytics customerId={customerId as string} />
            </TabsContent>

            <TabsContent value="consensi" className="space-y-6">
              <CustomerConsentManager customerId={customerId as string} />
            </TabsContent>

            <TabsContent value="note" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Note Team</h3>
                <p className="text-sm text-muted-foreground">
                  Editor note, tag manager, segmentazione manuale - Da implementare
                </p>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </Layout>
  );
}
