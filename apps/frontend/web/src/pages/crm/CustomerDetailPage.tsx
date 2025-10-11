import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CustomerTimelineView } from '@/components/crm/CustomerTimelineView';
import { CustomerConsentManager } from '@/components/crm/CustomerConsentManager';
import { CustomerActions } from '@/components/crm/CustomerActions';
import { CustomerAnalytics } from '@/components/crm/CustomerAnalytics';
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
  Activity
} from 'lucide-react';

export function CustomerDetailPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const params = useParams();
  const customerId = params.id;

  // Fetch customer data
  const { data: customerData, isLoading } = useQuery({
    queryKey: ['/api/crm/persons', customerId],
    enabled: !!customerId,
  });

  const customer = customerData?.data;

  // Fetch deals for this customer
  const { data: dealsData } = useQuery({
    queryKey: ['/api/crm/deals', { personId: customerId }],
    enabled: !!customerId,
  });

  const deals = dealsData?.data || [];

  // Fetch leads for this customer
  const { data: leadsData } = useQuery({
    queryKey: ['/api/crm/leads', { personId: customerId }],
    enabled: !!customerId,
  });

  const leads = leadsData?.data || [];

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
          <div className="text-center py-12">Cliente non trovato</div>
        </div>
      </Layout>
    );
  }

  const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();
  const totalDealsValue = deals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);
  const totalLeads = leads.length;
  const wonDeals = deals.filter(d => d.status === 'won').length;

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMScopeBar />

      {/* Header Section with KPI Cards */}
      <div className="mb-8">
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
            {/* Avatar */}
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

            {/* Customer Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ color: '#1a1a1a' }} data-testid="customer-name">
                  {customer.firstName} {customer.lastName}
                </h1>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-3 text-sm" style={{ color: '#6b7280' }}>
                {customer.emailCanonical && (
                  <div className="flex items-center gap-2" data-testid="customer-email">
                    <Mail className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                    <span>{customer.emailCanonical}</span>
                  </div>
                )}
                {customer.phoneCanonical && (
                  <div className="flex items-center gap-2" data-testid="customer-phone">
                    <Phone className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                    <span>{customer.phoneCanonical}</span>
                  </div>
                )}
                {customer.createdAt && (
                  <div className="flex items-center gap-2" data-testid="customer-since">
                    <Calendar className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                    <span>Cliente dal {new Date(customer.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <CustomerActions customerId={customerId!} customer={customer} />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card className="p-4" style={{ background: 'rgba(123, 44, 191, 0.05)', border: '1px solid rgba(123, 44, 191, 0.2)' }} data-testid="kpi-total-value">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Valore Totale Deal</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--brand-purple))' }}>
                    €{totalDealsValue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8" style={{ color: 'hsl(var(--brand-purple))' }} />
              </div>
            </Card>

            <Card className="p-4" style={{ background: 'rgba(255, 105, 0, 0.05)', border: '1px solid rgba(255, 105, 0, 0.2)' }} data-testid="kpi-won-deals">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Deal Vinti</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--brand-orange))' }}>
                    {wonDeals}
                  </p>
                </div>
                <Target className="h-8 w-8" style={{ color: 'hsl(var(--brand-orange))' }} />
              </div>
            </Card>

            <Card className="p-4" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }} data-testid="kpi-total-leads">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Lead Totali</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>
                    {totalLeads}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8" style={{ color: '#22c55e' }} />
              </div>
            </Card>

            <Card className="p-4" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }} data-testid="kpi-conversion-rate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Tasso di Conversione</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>
                    {totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0}%
                  </p>
                </div>
                <Activity className="h-8 w-8" style={{ color: '#3b82f6' }} />
              </div>
            </Card>
          </div>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList 
          className="w-full grid grid-cols-5 mb-6"
          style={{
            background: 'rgba(243, 244, 246, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '4px',
            borderRadius: '12px',
            height: 'auto',
          }}
        >
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            Journey Timeline
          </TabsTrigger>
          <TabsTrigger value="deals" data-testid="tab-deals">
            Deal & Pipeline
          </TabsTrigger>
          <TabsTrigger value="consent" data-testid="tab-consent">
            Consensi GDPR
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            Documenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <CustomerTimelineView customerId={customerId!} />
        </TabsContent>

        <TabsContent value="deals">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Deal History</h3>
            {mockDeals.length > 0 ? (
              <div className="space-y-3">
                {mockDeals.map((deal) => (
                  <div 
                    key={deal.id} 
                    className="p-4 rounded-lg border"
                    style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-sm" style={{ color: '#6b7280' }}>Status: {deal.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                          €{deal.estimatedValue?.toLocaleString()}
                        </p>
                        <Badge variant={deal.status === 'won' ? 'default' : 'outline'}>
                          {deal.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8" style={{ color: '#9ca3af' }}>
                Nessun deal trovato
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <CustomerConsentManager customerId={customerId!} />
        </TabsContent>

        <TabsContent value="analytics">
          <CustomerAnalytics customerId={customerId!} />
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Documenti & Contratti</h3>
            <p className="text-center py-8" style={{ color: '#9ca3af' }}>
              Feature in sviluppo
            </p>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
}
