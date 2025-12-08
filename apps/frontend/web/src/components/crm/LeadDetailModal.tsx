import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Store, 
  Hash, 
  Brain, 
  BarChart3,
  CheckCircle,
  Target,
  Globe,
  FileText,
  Activity,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status: string;
  leadScore: number;
  lifecycleStage?: string;
  conversionProbability?: number;
  originStoreName?: string;
  campaignName?: string;
  sourceChannel?: string;
  ownerName?: string;
  createdAt: string;
  
  // GTM Tracking
  gtmClientId?: string;
  gtmSessionId?: string;
  gtmUserId?: string;
  gtmProductsViewed?: string[];
  gtmConversionEvents?: string[];
  gtmGoalsCompleted?: string[];
  
  // Multi-PDV
  originStoreId?: string;
  storesVisited?: string[];
  preferredStoreId?: string;
  nearestStoreId?: string;
  
  // Social & Form
  totalFormsCompleted?: number;
  totalFormsStarted?: number;
  formCompletionRate?: number;
  averageFormTime?: number;
  
  // Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
  firstContactDate?: string;
  lastContactDate?: string;
  contactCount?: number;
  
  // Business
  customerType?: 'B2B' | 'B2C';
  companyRole?: string;
  companySector?: string;
  companySize?: string;
  employeeCount?: number;
  annualRevenue?: number;
  budgetRange?: { min: number; max: number };
  purchaseTimeframe?: string;
  painPoints?: string[];
  competitors?: string[];
  productInterest?: string;
  
  // Fiscal
  fiscalCode?: string;
  vatNumber?: string;
  pecEmail?: string;
  documentType?: string;
  documentNumber?: string;
  documentExpiry?: string;
  
  // Address
  addressStreet?: string;
  addressNumber?: string;
  addressCity?: string;
  addressProvince?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  geoLat?: number;
  geoLng?: number;
  
  // Engagement
  engagementScore?: number;
  pageViewsCount?: number;
  emailsOpenedCount?: number;
  emailsClickedCount?: number;
  documentsDownloaded?: string[];
  videosWatched?: string[];
  sessionDuration?: number;
  deviceType?: string;
  clientIpAddress?: string;
  sessionId?: string;
  
  // Conversion
  convertedToCustomerId?: string;
  conversionDate?: string;
  conversionValue?: number;
  lostReason?: string;
  
  // Privacy
  privacyPolicyAccepted?: boolean;
  marketingConsent?: boolean;
  profilingConsent?: boolean;
  consentTimestamp?: string;
  consentSource?: string;
  
  // AI
  aiEnrichmentDate?: string;
  aiSentimentScore?: number;
  aiPredictedValue?: number;
  aiIntentSignals?: string[];
  aiRecommendations?: Record<string, any>;
  
  // Other
  nextActionType?: string;
  nextActionDate?: string;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper: Get lead score color and category
const getLeadScoreConfig = (score?: number | null): { color: string; category: string; label: string } => {
  if (score === null || score === undefined) return { color: '#6b7280', category: 'unknown', label: 'N/A' }; // gray for null/undefined only
  if (score >= 80) return { color: '#10b981', category: 'very_hot', label: '🔥 Very Hot' }; // green
  if (score >= 61) return { color: '#eab308', category: 'hot', label: '⭐ Hot' }; // yellow
  if (score >= 31) return { color: '#f97316', category: 'warm', label: '☀️ Warm' }; // orange
  return { color: '#ef4444', category: 'cold', label: '❄️ Cold' }; // red (includes 0-30)
};

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  if (!lead) return null;

  const DetailSection = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--brand-orange))' }}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="space-y-2 pl-6">
        {children}
      </div>
    </div>
  );

  const DetailRow = ({ label, value, icon: Icon }: any) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          {Icon && <Icon className="h-3 w-3" />}
          <span>{label}</span>
        </div>
        <div className="font-medium text-gray-900 text-right max-w-[60%]">{value}</div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
            {lead.firstName} {lead.lastName}
          </DialogTitle>
          <DialogDescription>
            Lead ID: {lead.id} • Creato il {format(new Date(lead.createdAt), 'dd MMMM yyyy', { locale: it })}
          </DialogDescription>
        </DialogHeader>

        {/* Lead Score + Status Header */}
        <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--glass-bg-light)' }}>
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Lead Score</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold" style={{ color: getLeadScoreConfig(lead.leadScore).color }}>
                {lead.leadScore}
              </div>
              <Badge 
                variant="outline"
                className="text-sm font-semibold px-4 py-2"
                style={{ 
                  background: `${getLeadScoreConfig(lead.leadScore).color}15`,
                  borderColor: getLeadScoreConfig(lead.leadScore).color,
                  color: getLeadScoreConfig(lead.leadScore).color
                }}
                data-testid="badge-lead-score-detail"
              >
                {getLeadScoreConfig(lead.leadScore).label}
              </Badge>
            </div>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-orange))', color: 'hsl(var(--brand-orange))' }}>
              {lead.status}
            </Badge>
          </div>
          {lead.lifecycleStage && (
            <>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <div className="text-sm text-gray-600 mb-1">Lifecycle Stage</div>
                <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-purple))', color: 'hsl(var(--brand-purple))' }}>
                  {lead.lifecycleStage}
                </Badge>
              </div>
            </>
          )}
          {lead.conversionProbability !== undefined && (
            <>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <div className="text-sm text-gray-600 mb-1">Probabilità Conversione</div>
                <div className="text-2xl font-bold text-green-600">{Math.round(lead.conversionProbability)}%</div>
              </div>
            </>
          )}
        </div>

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="base">Info Base</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          {/* Tab 1: Info Base */}
          <TabsContent value="base" className="space-y-6 mt-6">
            <DetailSection title="Contatti" icon={User}>
              <DetailRow label="Email" value={lead.email} icon={Mail} />
              <DetailRow label="Telefono" value={lead.phone} icon={Phone} />
              <DetailRow label="PEC" value={lead.pecEmail} icon={Mail} />
            </DetailSection>

            <Separator />

            <DetailSection title="Azienda" icon={Building}>
              <DetailRow label="Nome Azienda" value={lead.companyName} />
              <DetailRow label="Tipo Cliente" value={lead.customerType} />
              <DetailRow label="Ruolo" value={lead.companyRole} />
              <DetailRow label="Settore" value={lead.companySector} />
              <DetailRow label="Dimensione" value={lead.companySize} />
              <DetailRow label="N° Dipendenti" value={lead.employeeCount} />
              <DetailRow label="Fatturato Annuo" value={lead.annualRevenue ? `€${lead.annualRevenue.toLocaleString()}` : null} />
            </DetailSection>

            <Separator />

            <DetailSection title="Documenti" icon={FileText}>
              <DetailRow label="Codice Fiscale" value={lead.fiscalCode} />
              <DetailRow label="Partita IVA" value={lead.vatNumber} />
              <DetailRow label="Tipo Documento" value={lead.documentType} />
              <DetailRow label="N° Documento" value={lead.documentNumber} />
              <DetailRow label="Scadenza" value={lead.documentExpiry ? format(new Date(lead.documentExpiry), 'dd/MM/yyyy', { locale: it }) : null} />
            </DetailSection>

            <Separator />

            <DetailSection title="Indirizzo" icon={MapPin}>
              <DetailRow label="Via" value={lead.addressStreet && lead.addressNumber ? `${lead.addressStreet}, ${lead.addressNumber}` : null} />
              <DetailRow label="Città" value={lead.addressCity} />
              <DetailRow label="Provincia" value={lead.addressProvince} />
              <DetailRow label="CAP" value={lead.addressPostalCode} />
              <DetailRow label="Paese" value={lead.addressCountry} />
              <DetailRow label="Coordinate GPS" value={lead.geoLat && lead.geoLng ? `${lead.geoLat}, ${lead.geoLng}` : null} />
            </DetailSection>
          </TabsContent>

          {/* Tab 2: Tracking */}
          <TabsContent value="tracking" className="space-y-6 mt-6">
            <DetailSection title="GTM Tracking" icon={Hash}>
              <DetailRow label="GTM Client ID" value={lead.gtmClientId} />
              <DetailRow label="GTM Session ID" value={lead.gtmSessionId} />
              <DetailRow label="GTM User ID" value={lead.gtmUserId} />
              <DetailRow label="Prodotti Visualizzati" value={lead.gtmProductsViewed?.join(', ')} />
              <DetailRow label="Eventi Conversione" value={lead.gtmConversionEvents?.join(', ')} />
              <DetailRow label="Obiettivi Completati" value={lead.gtmGoalsCompleted?.join(', ')} />
            </DetailSection>

            <Separator />

            <DetailSection title="Multi-PDV Attribution" icon={Store}>
              <DetailRow label="Store Origine" value={lead.originStoreName} />
              <DetailRow label="PDV Visitati" value={lead.storesVisited?.length} />
              <DetailRow label="Store Preferito" value={lead.preferredStoreId} />
              <DetailRow label="Store Più Vicino" value={lead.nearestStoreId} />
            </DetailSection>

            <Separator />

            <DetailSection title="Social & Form Tracking" icon={Globe}>
              <DetailRow label="Form Completati" value={`${lead.totalFormsCompleted || 0} / ${lead.totalFormsStarted || 0}`} />
              <DetailRow label="Tasso Completamento" value={lead.formCompletionRate ? `${Math.round(lead.formCompletionRate * 100)}%` : null} />
              <DetailRow label="Tempo Medio Form" value={lead.averageFormTime ? `${Math.round(lead.averageFormTime)} sec` : null} />
            </DetailSection>

            <Separator />

            <DetailSection title="Attribution & Journey" icon={Target}>
              <DetailRow label="Campagna" value={lead.campaignName} />
              <DetailRow label="Canale" value={lead.sourceChannel} />
              <DetailRow label="UTM Source" value={lead.utmSource} />
              <DetailRow label="UTM Medium" value={lead.utmMedium} />
              <DetailRow label="UTM Campaign" value={lead.utmCampaign} />
              <DetailRow label="Landing Page" value={lead.landingPageUrl} />
              <DetailRow label="Referrer" value={lead.referrerUrl} />
              <DetailRow label="Primo Contatto" value={lead.firstContactDate ? format(new Date(lead.firstContactDate), 'dd/MM/yyyy HH:mm', { locale: it }) : null} />
              <DetailRow label="Ultimo Contatto" value={lead.lastContactDate ? format(new Date(lead.lastContactDate), 'dd/MM/yyyy HH:mm', { locale: it }) : null} />
              <DetailRow label="N° Contatti" value={lead.contactCount} />
            </DetailSection>
          </TabsContent>

          {/* Tab 3: Business */}
          <TabsContent value="business" className="space-y-6 mt-6">
            <DetailSection title="Profilo Business" icon={Building}>
              <DetailRow label="Budget Range" value={lead.budgetRange ? `€${lead.budgetRange.min} - €${lead.budgetRange.max}` : null} />
              <DetailRow label="Timeframe Acquisto" value={lead.purchaseTimeframe} />
              <DetailRow label="Pain Points" value={lead.painPoints?.join(', ')} />
              <DetailRow label="Competitor Attuali" value={lead.competitors?.join(', ')} />
              <DetailRow label="Interesse Prodotto" value={lead.productInterest} />
            </DetailSection>

            <Separator />

            <DetailSection title="Conversion Tracking" icon={TrendingUp}>
              <DetailRow label="Convertito a Customer ID" value={lead.convertedToCustomerId} />
              <DetailRow label="Data Conversione" value={lead.conversionDate ? format(new Date(lead.conversionDate), 'dd/MM/yyyy', { locale: it }) : null} />
              <DetailRow label="Valore Conversione" value={lead.conversionValue ? `€${lead.conversionValue.toLocaleString()}` : null} />
              <DetailRow label="Motivo Perdita" value={lead.lostReason} />
            </DetailSection>

            <Separator />

            <DetailSection title="Privacy & GDPR" icon={CheckCircle}>
              <DetailRow label="Privacy Policy" value={lead.privacyPolicyAccepted ? '✓ Accettata' : '✗ Non accettata'} />
              <DetailRow label="Marketing Consent" value={lead.marketingConsent ? '✓ Accettato' : '✗ Non accettato'} />
              <DetailRow label="Profiling Consent" value={lead.profilingConsent ? '✓ Accettato' : '✗ Non accettato'} />
              <DetailRow label="Data Consenso" value={lead.consentTimestamp ? format(new Date(lead.consentTimestamp), 'dd/MM/yyyy HH:mm', { locale: it }) : null} />
              <DetailRow label="Fonte Consenso" value={lead.consentSource} />
            </DetailSection>
          </TabsContent>

          {/* Tab 4: Engagement */}
          <TabsContent value="engagement" className="space-y-6 mt-6">
            <DetailSection title="Engagement Metrics" icon={Activity}>
              <DetailRow label="Engagement Score" value={lead.engagementScore ? `${lead.engagementScore}/100` : null} />
              <DetailRow label="Page Views" value={lead.pageViewsCount} />
              <DetailRow label="Email Aperti" value={lead.emailsOpenedCount} />
              <DetailRow label="Email Cliccati" value={lead.emailsClickedCount} />
              <DetailRow label="Documenti Scaricati" value={lead.documentsDownloaded?.length} />
              <DetailRow label="Video Guardati" value={lead.videosWatched?.length} />
              <DetailRow label="Durata Sessione" value={lead.sessionDuration ? `${Math.round(lead.sessionDuration / 60)} min` : null} />
            </DetailSection>

            <Separator />

            <DetailSection title="Device & Browser" icon={Globe}>
              <DetailRow label="Tipo Device" value={lead.deviceType} />
              <DetailRow label="IP Address" value={lead.clientIpAddress} />
              <DetailRow label="Session ID" value={lead.sessionId} />
            </DetailSection>

            <Separator />

            <DetailSection title="Next Action" icon={Calendar}>
              <DetailRow label="Prossima Azione" value={lead.nextActionType} />
              <DetailRow label="Data Prossima Azione" value={lead.nextActionDate ? format(new Date(lead.nextActionDate), 'dd/MM/yyyy', { locale: it }) : null} />
              <DetailRow label="Owner" value={lead.ownerName || 'Non assegnato'} />
            </DetailSection>
          </TabsContent>

          {/* Tab 5: AI Insights */}
          <TabsContent value="ai" className="space-y-6 mt-6">
            <DetailSection title="AI Enrichment" icon={Brain}>
              <DetailRow label="Data Enrichment" value={lead.aiEnrichmentDate ? format(new Date(lead.aiEnrichmentDate), 'dd/MM/yyyy HH:mm', { locale: it }) : 'Non ancora arricchito'} />
            </DetailSection>

            <Separator />

            <DetailSection title="AI Sentiment Analysis" icon={BarChart3}>
              <div className="space-y-2">
                {lead.aiSentimentScore !== undefined && lead.aiSentimentScore !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Sentiment Score</span>
                      <span className="text-lg font-bold" style={{ 
                        color: lead.aiSentimentScore > 0 ? 'hsl(142, 76%, 36%)' : lead.aiSentimentScore < 0 ? 'hsl(0, 84%, 60%)' : 'gray' 
                      }}>
                        {lead.aiSentimentScore > 0 ? '+' : ''}{lead.aiSentimentScore.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={((lead.aiSentimentScore + 1) / 2) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Negativo</span>
                      <span>Positivo</span>
                    </div>
                  </div>
                )}
                {(lead.aiSentimentScore === undefined || lead.aiSentimentScore === null) && (
                  <p className="text-sm text-gray-500">Nessun dato di sentiment disponibile</p>
                )}
              </div>
            </DetailSection>

            <Separator />

            <DetailSection title="AI Predictions" icon={TrendingUp}>
              <DetailRow label="Valore Predetto (LTV)" value={lead.aiPredictedValue ? `€${lead.aiPredictedValue.toLocaleString()}` : null} />
              <DetailRow label="Intent Signals" value={lead.aiIntentSignals?.join(', ')} />
            </DetailSection>

            {lead.aiRecommendations && (
              <>
                <Separator />
                <DetailSection title="AI Recommendations" icon={CheckCircle}>
                  <div className="space-y-2">
                    {Object.entries(lead.aiRecommendations).map(([key, value]: any) => (
                      <div key={key} className="p-3 rounded-lg" style={{ background: 'var(--glass-bg-light)' }}>
                        <div className="font-medium text-sm capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600 mt-1">{value}</div>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Chiudi
          </Button>
          <Button 
            style={{ background: 'hsl(var(--brand-orange))' }} 
            className="flex-1 text-white"
            onClick={() => {
              // TODO: Implement contact action
            }}
          >
            <Phone className="mr-2 h-4 w-4" />
            Contatta
          </Button>
          <Button 
            variant="outline"
            style={{ borderColor: 'hsl(var(--brand-purple))', color: 'hsl(var(--brand-purple))' }}
            onClick={() => {
              // TODO: Implement convert action
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Converti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
