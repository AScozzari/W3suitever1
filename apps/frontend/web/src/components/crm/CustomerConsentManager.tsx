import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';

interface CustomerConsentManagerProps {
  customerId: string;
}

export function CustomerConsentManager({ customerId }: CustomerConsentManagerProps) {
  // Fetch consent data
  const { data: consentsData, isLoading } = useQuery({
    queryKey: [`/api/crm/persons/${customerId}/consents`],
    enabled: !!customerId,
  });

  const consents = consentsData?.data || [];

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const consentTypes = [
    { type: 'privacy_policy', label: 'Privacy Policy', icon: Shield },
    { type: 'marketing', label: 'Marketing', icon: Mail },
    { type: 'profiling', label: 'Profilazione', icon: MessageSquare },
    { type: 'third_party', label: 'Terze Parti', icon: Phone },
  ];

  return (
    <>
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
            Gestione Consensi GDPR
          </h3>
        </div>

        {/* Consent Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {consentTypes.map((ct) => {
            const Icon = ct.icon;
            const consent = consents.find((c: any) => c.consentType === ct.type);
            const isActive = consent?.status === 'granted';
            const isExpired = consent?.status === 'expired';
            const isWithdrawn = consent?.status === 'withdrawn';

            return (
              <Card
                key={ct.type}
                className="p-4"
                style={{
                  background: isActive
                    ? 'rgba(34, 197, 94, 0.05)'
                    : isExpired
                    ? 'rgba(251, 191, 36, 0.05)'
                    : 'rgba(239, 68, 68, 0.05)',
                  border: isActive
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : isExpired
                    ? '1px solid rgba(251, 191, 36, 0.3)'
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
                          : isExpired
                          ? 'rgba(251, 191, 36, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)',
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{
                          color: isActive ? '#22c55e' : isExpired ? '#fbbf24' : '#ef4444',
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{ct.label}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>
                        {consent ? 'Configurato' : 'Non configurato'}
                      </p>
                    </div>
                  </div>

                  {isActive && <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />}
                  {isExpired && <Clock className="h-5 w-5" style={{ color: '#fbbf24' }} />}
                  {isWithdrawn && <XCircle className="h-5 w-5" style={{ color: '#ef4444' }} />}
                </div>

                {consent && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6b7280' }}>Canale:</span>
                      <Badge variant="outline" className="text-xs">
                        {consent.channel}
                      </Badge>
                    </div>
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
      </Card>
    </>
  );
}
