import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  History,
  Building2
} from 'lucide-react';

interface CustomerConsentManagerProps {
  customerId: string;
}

export function CustomerConsentManager({ customerId }: CustomerConsentManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('current');

  // Fetch customer to get personId
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: [`/api/crm/customers/${customerId}`],
    enabled: !!customerId,
  });

  const personId = customerData?.data?.personId;

  // Fetch consent data
  const { data: consentsData, isLoading: isLoadingConsents } = useQuery({
    queryKey: [`/api/crm/persons/${personId}/consents`],
    enabled: !!personId,
  });

  // Fetch consent history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: [`/api/crm/persons/${personId}/consents/history`],
    enabled: !!personId && activeTab === 'history',
  });

  // Update consents mutation
  const updateConsentsMutation = useMutation({
    mutationFn: async (payload: { consents: Array<{ type: string; status: string; notes?: string }> }) => {
      if (!user?.id) {
        throw new Error('Utente non autenticato');
      }
      
      return apiRequest(`/api/crm/persons/${personId}/consents`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          updatedBy: user.id,
          updatedByName: user.name || user.email || 'Unknown User',
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/persons/${personId}/consents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/persons/${personId}/consents/history`] });
      toast({
        title: 'Consensi aggiornati',
        description: 'I consensi sono stati aggiornati con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare i consensi',
        variant: 'destructive',
      });
    },
  });

  const consents = consentsData?.data || [];
  const timeline = historyData?.data?.timeline || [];

  const handleToggleConsent = (type: string, currentStatus: string) => {
    if (!user) {
      toast({
        title: 'Errore',
        description: 'Utente non autenticato',
        variant: 'destructive',
      });
      return;
    }

    const newStatus = currentStatus === 'granted' ? 'withdrawn' : 'granted';
    
    updateConsentsMutation.mutate({
      consents: [{ type, status: newStatus }]
    });
  };

  if (isLoadingCustomer || isLoadingConsents) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!personId) {
    return (
      <Card className="p-8 text-center">
        <p style={{ color: '#6b7280' }}>Impossibile caricare i consensi: person_id mancante</p>
      </Card>
    );
  }

  const consentTypes = [
    { type: 'privacy_policy', label: 'Privacy Policy', icon: Shield },
    { type: 'marketing', label: 'Marketing', icon: Mail },
    { type: 'profiling', label: 'Profilazione', icon: MessageSquare },
    { type: 'third_party', label: 'Terze Parti', icon: Phone },
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
          Gestione Consensi GDPR
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="current" data-testid="tab-consent-current">
            Stato Attuale
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-consent-history">
            <History className="h-4 w-4 mr-2" />
            Storico
          </TabsTrigger>
        </TabsList>

        {/* Current Consents Tab */}
        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {consentTypes.map((ct) => {
              const Icon = ct.icon;
              const consent = consents.find((c: any) => c.consentType === ct.type);
              const isActive = consent?.status === 'granted';
              const isWithdrawn = consent?.status === 'withdrawn';
              const isDenied = consent?.status === 'denied';

              return (
                <Card
                  key={ct.type}
                  className="p-4"
                  data-testid={`consent-card-${ct.type}`}
                  style={{
                    background: isActive
                      ? 'rgba(34, 197, 94, 0.05)'
                      : 'rgba(239, 68, 68, 0.05)',
                    border: isActive
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          background: isActive
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{
                            color: isActive ? '#22c55e' : '#ef4444',
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{ct.label}</p>
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          {consent ? (isActive ? 'Attivo' : 'Non attivo') : 'Non configurato'}
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleConsent(ct.type, consent?.status || 'denied')}
                      disabled={updateConsentsMutation.isPending}
                      data-testid={`consent-toggle-${ct.type}`}
                    />
                  </div>

                  {consent && (
                    <div className="space-y-2 mt-4 pt-4 border-t">
                      {consent.campaignName && (
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3 w-3" style={{ color: '#6b7280' }} />
                          <span style={{ color: '#6b7280' }}>Campagna:</span>
                          <Badge variant="outline" className="text-xs">
                            {consent.campaignName}
                          </Badge>
                        </div>
                      )}
                      {consent.source && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7280' }}>Fonte:</span>
                          <Badge variant="outline" className="text-xs">
                            {consent.source}
                          </Badge>
                        </div>
                      )}
                      {consent.grantedAt && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7280' }}>Concesso:</span>
                          <span>{new Date(consent.grantedAt).toLocaleDateString('it-IT')}</span>
                        </div>
                      )}
                      {consent.withdrawnAt && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7280' }}>Revocato:</span>
                          <span>{new Date(consent.withdrawnAt).toLocaleDateString('it-IT')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* History Timeline Tab */}
        <TabsContent value="history" className="space-y-4">
          {isLoadingHistory ? (
            <Skeleton className="h-64 w-full" />
          ) : timeline.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="h-12 w-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
              <p style={{ color: '#6b7280' }}>Nessuno storico disponibile</p>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="consent-history-timeline">
              {timeline.map((entry: any, index: number) => {
                const consentType = consentTypes.find(ct => ct.type === entry.consentType);
                const Icon = consentType?.icon || Shield;
                
                return (
                  <Card
                    key={index}
                    className="p-4"
                    data-testid={`timeline-entry-${index}`}
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(101, 47, 142, 0.1)' }}
                      >
                        <Icon className="h-5 w-5" style={{ color: '#652f8e' }} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">{consentType?.label}</p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                              {entry.action === 'create' ? 'Creato' : 'Aggiornato'}
                            </p>
                          </div>
                          <Badge
                            variant={entry.newStatus === 'granted' ? 'default' : 'outline'}
                            style={{
                              background: entry.newStatus === 'granted' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: entry.newStatus === 'granted' ? '#22c55e' : '#ef4444',
                              border: entry.newStatus === 'granted' ? '1px solid #22c55e' : '1px solid #ef4444',
                            }}
                          >
                            {entry.newStatus === 'granted' ? 'Concesso' : 'Revocato'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span style={{ color: '#6b7280' }}>Da:</span>
                            <span className="font-medium">{entry.updatedByName || entry.updatedBy}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3" style={{ color: '#6b7280' }} />
                            <span style={{ color: '#6b7280' }}>
                              {new Date(entry.timestamp).toLocaleString('it-IT')}
                            </span>
                          </div>
                          {entry.campaignName && (
                            <div className="flex items-center gap-2 text-xs">
                              <Building2 className="h-3 w-3" style={{ color: '#6b7280' }} />
                              <span style={{ color: '#6b7280' }}>Campagna:</span>
                              <span className="font-medium">{entry.campaignName}</span>
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-xs mt-2 p-2 rounded" style={{ background: 'rgba(0, 0, 0, 0.02)' }}>
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
