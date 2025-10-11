import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  FileSignature,
  Smartphone,
  RefreshCw,
  Download
} from 'lucide-react';

interface CustomerConsentManagerProps {
  customerId: string;
}

export function CustomerConsentManager({ customerId }: CustomerConsentManagerProps) {
  const { toast } = useToast();
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewMethod, setRenewMethod] = useState<'otp' | 'signature'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Fetch consent data
  const { data: consentsData, isLoading } = useQuery({
    queryKey: [`/api/crm/persons/${customerId}/consents`],
    enabled: !!customerId,
  });

  const consents = consentsData?.data || [];

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/crm/consents/${customerId}/send-otp`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({
        title: 'OTP Inviato',
        description: 'Codice OTP inviato via SMS/Email',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile inviare OTP',
      });
    },
  });

  // Renew consent with OTP
  const renewWithOtpMutation = useMutation({
    mutationFn: async (otp: string) => {
      return await apiRequest(`/api/crm/consents/${customerId}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          method: 'otp',
          otpCode: otp,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/persons/${customerId}/consents`] });
      toast({
        title: 'Consenso Rinnovato',
        description: 'Consenso privacy rinnovato con successo',
      });
      setRenewDialogOpen(false);
      setOtpSent(false);
      setOtpCode('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'OTP non valido',
      });
    },
  });

  // Download consent proof
  const downloadProofMutation = useMutation({
    mutationFn: async (consentId: string) => {
      return await apiRequest(`/api/crm/consents/${consentId}/proof`, {
        method: 'GET',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Download Avviato',
        description: 'Documento prova consenso scaricato',
      });
    },
  });

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
          <Button
            onClick={() => setRenewDialogOpen(true)}
            style={{ background: 'hsl(var(--brand-orange))' }}
            data-testid="button-renew-consent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Rinnova Consensi
          </Button>
        </div>

        {/* Consent Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {consentTypes.map((ct) => {
            const Icon = ct.icon;
            const consent = consents?.data?.find((c: any) => c.consentType === ct.type);
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
                    {consent.proofDocumentId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => downloadProofMutation.mutate(consent.id)}
                        data-testid={`button-download-proof-${ct.type}`}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Download Prova
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Renew Consent Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinnova Consensi Privacy</DialogTitle>
            <DialogDescription>
              Scegli il metodo di verifica per rinnovare i consensi GDPR
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={renewMethod === 'otp' ? 'default' : 'outline'}
                onClick={() => setRenewMethod('otp')}
                className="h-auto py-4"
                data-testid="button-method-otp"
              >
                <div className="text-center">
                  <Smartphone className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">OTP via SMS</p>
                  <p className="text-xs opacity-70">Codice temporaneo</p>
                </div>
              </Button>

              <Button
                variant={renewMethod === 'signature' ? 'default' : 'outline'}
                onClick={() => setRenewMethod('signature')}
                className="h-auto py-4"
                data-testid="button-method-signature"
              >
                <div className="text-center">
                  <FileSignature className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">Firma Digitale</p>
                  <p className="text-xs opacity-70">DSC/QES</p>
                </div>
              </Button>
            </div>

            {/* OTP Flow */}
            {renewMethod === 'otp' && (
              <div className="space-y-3">
                {!otpSent ? (
                  <Button
                    className="w-full"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={sendOtpMutation.isPending}
                    style={{ background: 'hsl(var(--brand-purple))' }}
                    data-testid="button-send-otp"
                  >
                    Invia Codice OTP
                  </Button>
                ) : (
                  <>
                    <Label>Inserisci Codice OTP</Label>
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      data-testid="input-otp"
                    />
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      Codice inviato via SMS. Valido per 5 minuti.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Digital Signature Flow */}
            {renewMethod === 'signature' && (
              <div className="space-y-3">
                <Label>Carica Certificato Digitale (.pfx)</Label>
                <Input type="file" accept=".pfx,.p12" data-testid="input-signature-file" />
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Supporto Class 2/3 DSC o QES (Qualified Electronic Signature)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)} data-testid="button-cancel">
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (renewMethod === 'otp' && otpSent) {
                  renewWithOtpMutation.mutate(otpCode);
                }
              }}
              disabled={renewMethod === 'otp' && (!otpSent || !otpCode)}
              style={{ background: 'hsl(var(--brand-orange))' }}
              data-testid="button-confirm-renew"
            >
              Conferma Rinnovo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
