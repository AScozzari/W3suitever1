import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LeadsDataTable from '@/components/crm/LeadsDataTable';
import { 
  Megaphone,
  Plus, 
  Settings,
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle2
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useTenantNavigation } from '@/hooks/useTenantSafety';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  type: 'inbound_media' | 'outbound_crm' | 'retention';
  totalLeads: number;
  workedLeads: number;
  notWorkedLeads: number;
  conversionRate: number;
  budget: number;
  startDate: string;
  endDate: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [currentModule, setCurrentModule] = useState('crm');
  const { navigate } = useTenantNavigation();

  // Fetch campaign details
  const { data: campaignResponse, isLoading, error } = useQuery<Campaign>({
    queryKey: [`/api/crm/campaigns/${id}`],
  });

  const campaign = campaignResponse;

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <LoadingState />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !id) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <ErrorState message="Errore nel caricamento della campagna" />
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'hsl(var(--success))';
      case 'paused': return 'hsl(var(--warning))';
      case 'completed': return 'hsl(var(--brand-purple))';
      case 'draft': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'paused': return 'In pausa';
      case 'completed': return 'Completata';
      case 'draft': return 'Bozza';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inbound_media': return 'Inbound Media';
      case 'outbound_crm': return 'Outbound CRM';
      case 'retention': return 'Retention';
      default: return type;
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        
        {/* Professional Breadcrumb Navigation */}
        <div 
          className="mx-6 mt-4 px-6 py-3 rounded-xl"
          style={{
            background: 'var(--glass-bg-heavy)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-card-border)',
            boxShadow: 'var(--shadow-glass-sm)'
          }}
        >
          <button
            onClick={() => navigate('crm/campaigns')}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-windtre-orange"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="breadcrumb-back-to-campaigns"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna a Campagne</span>
          </button>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl"
                style={{ 
                  background: 'var(--brand-glass-gradient)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <Megaphone className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                    {campaign?.name || 'Campagna'}
                  </h1>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: getStatusColor(campaign?.status || ''),
                      color: getStatusColor(campaign?.status || ''),
                      background: 'var(--glass-bg-light)'
                    }}
                  >
                    {getStatusLabel(campaign?.status || '')}
                  </Badge>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Tipo: {getTypeLabel(campaign?.type || '')} • Budget: €{((campaign?.budget || 0) / 1000).toFixed(0)}k
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                data-testid="button-campaign-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
              <Button
                style={{ 
                  background: 'hsl(var(--brand-orange))',
                  color: 'white'
                }}
                data-testid="button-add-lead"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Lead
              </Button>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'var(--glass-bg-heavy)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--glass-card-border)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Lead Totali
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {campaign?.totalLeads || 0}
              </div>
            </div>

            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'var(--glass-bg-heavy)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--glass-card-border)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Lead Lavorati
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                {campaign?.workedLeads || 0}
              </div>
            </div>

            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'var(--glass-bg-heavy)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--glass-card-border)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Conversion Rate
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-purple))' }}>
                {campaign?.conversionRate || 0}%
              </div>
            </div>
          </div>

          {/* Leads DataTable */}
          <LeadsDataTable campaignId={id} />
        </div>
      </div>
    </Layout>
  );
}
