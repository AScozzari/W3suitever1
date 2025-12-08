import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, ExternalLink, Link as LinkIcon } from 'lucide-react';

interface UTMLinksTabProps {
  campaign: {
    id: string;
    name: string;
    landingPageUrl?: string | null;
    utmCampaign?: string | null;
    marketingChannels?: string[] | null;
  };
}

// Marketing channels configuration (must match CampaignSettingsDialog)
const MARKETING_CHANNELS = [
  { id: 'facebook_ads', name: 'Facebook Ads', utmSource: 'facebook', utmMedium: 'cpc', icon: '📘', color: 'blue' },
  { id: 'instagram', name: 'Instagram Stories', utmSource: 'instagram', utmMedium: 'social', icon: '📷', color: 'pink' },
  { id: 'google_ads', name: 'Google Ads', utmSource: 'google', utmMedium: 'cpc', icon: '🔍', color: 'green' },
  { id: 'email', name: 'Email Newsletter', utmSource: 'newsletter', utmMedium: 'email', icon: '📧', color: 'orange' },
  { id: 'whatsapp', name: 'WhatsApp Business', utmSource: 'whatsapp', utmMedium: 'messaging', icon: '💬', color: 'emerald' },
  { id: 'linkedin', name: 'LinkedIn Ads', utmSource: 'linkedin', utmMedium: 'cpc', icon: '💼', color: 'blue' },
  { id: 'tiktok', name: 'TikTok Ads', utmSource: 'tiktok', utmMedium: 'cpc', icon: '🎵', color: 'purple' },
];

export function UTMLinksTab({ campaign }: UTMLinksTabProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate UTM link for a specific channel
  const generateUTMLink = (channel: typeof MARKETING_CHANNELS[0]): string => {
    if (!campaign.landingPageUrl || !campaign.utmCampaign) {
      return '';
    }

    const baseUrl = campaign.landingPageUrl;
    const params = new URLSearchParams({
      utm_source: channel.utmSource,
      utm_medium: channel.utmMedium,
      utm_campaign: campaign.utmCampaign,
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // Copy link to clipboard
  const copyToClipboard = async (channelId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(channelId);
      toast({
        title: 'Link Copiato!',
        description: 'Link UTM copiato negli appunti',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile copiare il link',
        variant: 'destructive',
      });
    }
  };

  // Get active channels
  const activeChannels = MARKETING_CHANNELS.filter(channel =>
    campaign.marketingChannels?.includes(channel.id)
  );

  // Validation checks
  const hasLandingUrl = !!campaign.landingPageUrl;
  const hasUtmCampaign = !!campaign.utmCampaign;
  const hasActiveChannels = activeChannels.length > 0;
  const canGenerateLinks = hasLandingUrl && hasUtmCampaign && hasActiveChannels;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Link UTM Generati
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Copia e usa questi link nelle tue campagne marketing
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {activeChannels.length} {activeChannels.length === 1 ? 'Canale' : 'Canali'}
        </Badge>
      </div>

      {/* Validation Warnings */}
      {!canGenerateLinks && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <LinkIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  Configurazione Incompleta
                </h4>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  {!hasLandingUrl && (
                    <li>• Aggiungi una <strong>Landing Page URL</strong> nelle impostazioni campagna</li>
                  )}
                  {!hasUtmCampaign && (
                    <li>• Inserisci un <strong>Nome Campagna UTM</strong> nelle impostazioni</li>
                  )}
                  {!hasActiveChannels && (
                    <li>• Seleziona almeno un <strong>Canale Marketing</strong> nelle impostazioni</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* UTM Links Grid */}
      {canGenerateLinks && (
        <div className="grid gap-4">
          {activeChannels.map((channel) => {
            const utmLink = generateUTMLink(channel);
            const isCopied = copiedId === channel.id;

            return (
              <Card key={channel.id} className="windtre-glass-panel border-white/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Channel Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{channel.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {channel.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            utm_source: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{channel.utmSource}</code>
                            {' • '}
                            utm_medium: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{channel.utmMedium}</code>
                          </p>
                        </div>
                      </div>
                      <Badge className={`bg-${channel.color}-100 text-${channel.color}-800 dark:bg-${channel.color}-900 dark:text-${channel.color}-200`}>
                        Attivo
                      </Badge>
                    </div>

                    {/* URL Display */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={utmLink}
                        readOnly
                        className="font-mono text-xs bg-gray-50 dark:bg-gray-900"
                        data-testid={`input-utm-link-${channel.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(channel.id, utmLink)}
                        data-testid={`button-copy-${channel.id}`}
                        className="flex-shrink-0"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4 mr-1 text-green-600" />
                            Copiato
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copia
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(utmLink, '_blank')}
                        data-testid={`button-preview-${channel.id}`}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Usage Instructions */}
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      <strong>💡 Come usare:</strong> Copia questo link e usalo nelle tue campagne {channel.name}.
                      {channel.id === 'facebook_ads' && ' Incollalo come Destination URL in Facebook Ads Manager.'}
                      {channel.id === 'instagram' && ' Usalo nei link delle Story o nei post Instagram.'}
                      {channel.id === 'google_ads' && ' Impostalo come Final URL in Google Ads.'}
                      {channel.id === 'email' && ' Inseriscilo nei bottoni CTA delle tue email.'}
                      {channel.id === 'whatsapp' && ' Condividilo nei messaggi WhatsApp Business.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasActiveChannels && hasLandingUrl && hasUtmCampaign && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nessun Canale Attivo
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vai nelle impostazioni campagna e seleziona i canali marketing da attivare
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
