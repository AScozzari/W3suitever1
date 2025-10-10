import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Target, 
  DollarSign,
  ArrowUpRight,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  BarChart3
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useState } from 'react';

interface DashboardStats {
  totalPersons: number;
  totalLeads: number;
  totalDeals: number;
  totalCampaigns: number;
  conversionRate: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
}

export default function CRMDashboardPage() {
  const [currentModule, setCurrentModule] = useState('crm');

  // Fetch dashboard stats
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/crm/dashboard/stats'],
    // Fallback to demo data if API not ready
    initialData: {
      totalPersons: 156,
      totalLeads: 47,
      totalDeals: 23,
      totalCampaigns: 8,
      conversionRate: 48.9,
      openDeals: 15,
      wonDeals: 6,
      lostDeals: 2
    }
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <LoadingState />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <ErrorState message="Errore nel caricamento della dashboard CRM" />
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Contatti Totali',
      value: stats?.totalPersons || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: 'Identity graph completo'
    },
    {
      title: 'Lead Attivi',
      value: stats?.totalLeads || 0,
      icon: UserPlus,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'from-orange-50 to-amber-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      description: 'In fase di qualifica'
    },
    {
      title: 'Deal Aperti',
      value: stats?.openDeals || 0,
      icon: Target,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      description: 'In trattativa attiva'
    },
    {
      title: 'Tasso Conversione',
      value: `${stats?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Lead → Deal'
    }
  ];

  const quickActions = [
    { 
      label: 'Nuovo Contatto', 
      icon: UserPlus, 
      href: '/crm/persons/new',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      label: 'Nuovo Lead', 
      icon: Phone, 
      href: '/crm/leads/new',
      color: 'from-orange-500 to-orange-600'
    },
    { 
      label: 'Nuova Campagna', 
      icon: Mail, 
      href: '/crm/campaigns/new',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      label: 'Report Analytics', 
      icon: BarChart3, 
      href: '/crm/analytics',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6" data-testid="crm-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              CRM Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Customer Relationship Management - Overview completa
            </p>
          </div>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            data-testid="button-new-lead"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuovo Lead
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index}
                className={`relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${stat.bgColor}`}
                data-testid={`stat-card-${index}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                      <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900" data-testid={`stat-value-${index}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Azioni Rapide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={`h-24 flex flex-col items-center justify-center gap-2 hover:border-orange-500 hover:bg-orange-50 transition-all group`}
                    data-testid={`quick-action-${index}`}
                  >
                    <div className={`p-3 rounded-full bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Pipeline Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-full">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deal Vinti</p>
                      <p className="text-2xl font-bold text-green-700">{stats?.wonDeals || 0}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-full">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deal Aperti</p>
                      <p className="text-2xl font-bold text-orange-700">{stats?.openDeals || 0}</p>
                    </div>
                  </div>
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500 rounded-full">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deal Persi</p>
                      <p className="text-2xl font-bold text-gray-700">{stats?.lostDeals || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Campagne Attive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-4xl font-bold text-blue-600 mb-2">{stats?.totalCampaigns || 0}</p>
                  <p className="text-gray-600">Campagne Marketing</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-blue-500 text-blue-600 hover:bg-blue-50"
                    data-testid="button-view-campaigns"
                  >
                    Visualizza Tutte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
