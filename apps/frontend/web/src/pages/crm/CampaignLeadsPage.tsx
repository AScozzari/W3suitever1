import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LeadsDataTable from '@/components/crm/LeadsDataTable';
import { CreateLeadDialog } from '@/components/crm/CreateLeadDialog';
import { 
  ArrowLeft,
  Target,
  Users,
  CheckCircle2,
  TrendingUp,
  Megaphone,
  Plus
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useTenantNavigation } from '@/hooks/useTenantSafety';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface CampaignStats {
  totalLeads: number;
  workedLeads: number;
  conversionRate: number;
}

export default function CampaignLeadsPage() {
  const { id } = useParams<{ id: string }>();
  const [currentModule, setCurrentModule] = useState('crm');
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const { navigate } = useTenantNavigation();

  // Fetch campaign details
  const { data: campaign, isLoading: loadingCampaign, error: errorCampaign } = useQuery<Campaign>({
    queryKey: [`/api/crm/campaigns/${id}`],
  });

  // Fetch campaign statistics
  const { data: stats, isLoading: loadingStats } = useQuery<CampaignStats>({
    queryKey: [`/api/crm/campaigns/${id}/stats`],
    enabled: !!id,
  });

  if (loadingCampaign) {
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

  if (errorCampaign || !id) {
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
            onClick={() => navigate('crm?view=campaigns')}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-windtre-orange"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="breadcrumb-back-to-campaigns"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna a Campagne</span>
          </button>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header with Campaign Info */}
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
                <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                  Lead Campagna: {campaign?.name || 'Campagna'}
                </h1>
                {campaign?.description && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>
            
            <Button
              onClick={() => setCreateLeadOpen(true)}
              className="glass-button"
              data-testid="button-create-lead"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Lead
            </Button>
          </div>

          {/* Campaign Statistics Cards */}
          {!loadingStats && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="p-6 glass-card border-0"
                style={{
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid var(--glass-card-border)',
                  boxShadow: 'var(--shadow-glass)'
                }}
                data-testid="stat-card-total-leads"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <Users className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Lead Totali</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.totalLeads || 0}
                    </p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-6 glass-card border-0"
                style={{
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid var(--glass-card-border)',
                  boxShadow: 'var(--shadow-glass)'
                }}
                data-testid="stat-card-worked-leads"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5" style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Lead Lavorati</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.workedLeads || 0}
                    </p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-6 glass-card border-0"
                style={{
                  background: 'var(--glass-card-bg)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid var(--glass-card-border)',
                  boxShadow: 'var(--shadow-glass)'
                }}
                data-testid="stat-card-conversion-rate"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      background: 'var(--glass-bg-heavy)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <TrendingUp className="h-5 w-5" style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tasso Conversione</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.conversionRate || 0}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Leads Data Table */}
          <LeadsDataTable campaignId={id} />
        </div>
      </div>
      
      {/* Create Lead Dialog with pre-selected campaign */}
      <CreateLeadDialog 
        open={createLeadOpen} 
        onOpenChange={setCreateLeadOpen}
        preselectedCampaignId={id}
      />
    </Layout>
  );
}
