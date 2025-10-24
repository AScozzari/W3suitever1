import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { LeadStatusSettingsDialog } from './LeadStatusSettingsDialog';
import { useCampaignCreationMode } from '@/hooks/useCampaignCreationMode';
import { 
  Settings2, 
  Target, 
  Route, 
  Workflow, 
  TrendingUp, 
  Wrench,
  Save,
  AlertCircle,
  Shield,
  ListTodo,
  Copy,
  Link,
  ExternalLink,
  Wand2,
  Zap,
  Check,
  ChevronRight,
  ChevronLeft,
  Edit2,
  RefreshCw,
  Info,
  Bell,
  Users
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

interface CampaignSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId?: string | null;
  mode: 'create' | 'edit';
}

// Lead source enum (matches backend)
const leadSources = ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import'] as const;
type LeadSource = typeof leadSources[number];

// Form schema with validation
const campaignFormSchema = z.object({
  name: z.string().min(1, "Nome campagna obbligatorio").max(255),
  description: z.string().optional(),
  storeId: z.string().uuid("Seleziona un negozio valido"),
  legalEntityId: z.string().uuid().optional(),
  driverIds: z.array(z.string().uuid()).optional().default([]),
  
  // Routing & Workflows Unificato
  routingMode: z.enum(['automatic', 'manual']).optional().nullable(),
  
  // Automatic Mode
  workflowId: z.string().uuid().optional().nullable(),
  fallbackTimeoutSeconds: z.number().int().min(30).max(3600).optional().nullable(),
  fallbackPipelineId1: z.string().uuid().optional().nullable(),
  fallbackPipelineId2: z.string().uuid().optional().nullable(),
  
  // Manual Mode  
  manualPipelineId1: z.string().uuid().optional().nullable(),
  manualPipelineId2: z.string().uuid().optional().nullable(),
  
  // Notifiche
  notifyTeamId: z.string().uuid().optional().nullable(),
  notifyUserIds: z.array(z.string().uuid()).optional().default([]),
  
  // Lead Source & Marketing Channels
  defaultLeadSource: z.enum(leadSources).optional().nullable(),
  landingPageUrl: z.string().url().optional().nullable().or(z.literal('')),
  marketingChannels: z.array(z.string()).optional().default([]),
  
  // UTM Parameters
  utmCampaign: z.string().optional().nullable(),
  
  // Budget & Tracking
  budget: z.number().optional().nullable(),
  actualSpent: z.number().optional().nullable(),
  
  // Dates
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  
  // Status
  isActive: z.boolean().default(true),
  
  // GDPR Consents
  requiredConsents: z.object({
    privacy_policy: z.boolean().default(false),
    marketing: z.boolean().default(false),
    profiling: z.boolean().default(false),
    third_party: z.boolean().default(false),
  }).optional().default({
    privacy_policy: false,
    marketing: false,
    profiling: false,
    third_party: false,
  }),
}).refine(data => {
  // If lead source is landing_page, URL is required
  if (data.defaultLeadSource === 'landing_page' && !data.landingPageUrl) {
    return false;
  }
  return true;
}, {
  message: "Landing Page URL obbligatorio quando Lead Source è 'Landing Page'",
  path: ['landingPageUrl']
}).refine(data => {
  // If marketing channels are selected, landing page URL is required
  if (data.marketingChannels && data.marketingChannels.length > 0 && !data.landingPageUrl) {
    return false;
  }
  return true;
}, {
  message: "Landing Page URL obbligatorio quando sono selezionati canali marketing",
  path: ['landingPageUrl']
}).refine(data => {
  // Validazione AUTOMATIC MODE
  if (data.routingMode === 'automatic') {
    if (!data.workflowId) {
      return false;
    }
    if (!data.fallbackTimeoutSeconds || data.fallbackTimeoutSeconds < 30) {
      return false;
    }
    if (!data.fallbackPipelineId1) {
      return false;
    }
  }
  
  // Validazione MANUAL MODE
  if (data.routingMode === 'manual') {
    if (!data.manualPipelineId1) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Configurazione routing incompleta: verifica tutti i campi obbligatori per la modalità selezionata",
  path: ['routingMode']
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

// WindTre Driver Colors Mapping (8 drivers esatti del sistema)
const DRIVER_COLORS: Record<string, string> = {
  'FISSO': 'hsl(24, 100%, 52%)',          // WindTre Orange
  'MOBILE': 'hsl(271, 56%, 46%)',         // WindTre Purple  
  'DEVICE': 'hsl(200, 70%, 50%)',         // Blue
  'ACCESSORI': 'hsl(142, 76%, 36%)',      // Green
  'ASSICURAZIONE': 'hsl(45, 100%, 51%)',  // Gold
  'PROTEZIONE': 'hsl(0, 84%, 60%)',       // Red
  'ENERGIA': 'hsl(280, 65%, 60%)',        // Light Purple
  'CUSTOMER_BASE': 'hsl(220, 90%, 56%)',  // Sky Blue
};

// UTM Links Tab Component
function UTMLinksTab({ campaignId, mode }: { campaignId?: string | null; mode: 'create' | 'edit' }) {
  const { toast } = useToast();

  // Fetch UTM links for this campaign
  const { data: utmLinksData, isLoading } = useQuery({
    queryKey: [`/api/crm/campaigns/${campaignId}/utm-links`],
    enabled: mode === 'edit' && !!campaignId,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiato!",
        description: `${label} copiato negli appunti`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare negli appunti",
        variant: "destructive",
      });
    }
  };

  if (mode === 'create') {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
        <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h4 className="font-semibold text-lg mb-2">Link UTM non ancora disponibili</h4>
        <p className="text-sm text-muted-foreground">
          I link UTM verranno generati automaticamente dopo aver creato la campagna e selezionato i canali marketing.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Caricamento link UTM..." />;
  }

  const links = utmLinksData?.data?.links || [];
  const campaignName = utmLinksData?.data?.campaignName || '';
  const landingPageUrl = utmLinksData?.data?.landingPageUrl || '';

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
        <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h4 className="font-semibold text-lg mb-2">Nessun link UTM generato</h4>
        <p className="text-sm text-muted-foreground mb-4">
          I link UTM vengono generati automaticamente dai canali marketing selezionati nel tab "Tracking".
        </p>
        <p className="text-xs text-muted-foreground">
          Seleziona almeno un canale marketing e salva la campagna per generare i link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-windtre-orange" />
          <h4 className="font-semibold">Link UTM Generati</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Usa questi link nei tuoi canali marketing per tracciare l'origine dei lead. Ogni link include parametri UTM automatici.
        </p>
      </div>

      <div className="space-y-3">
        {links.map((link: any) => (
          <div
            key={link.id}
            className="rounded-lg border bg-white dark:bg-gray-900 p-4 space-y-3"
            data-testid={`utm-link-${link.channelId}`}
          >
            {/* Channel Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-windtre-orange" />
                <h5 className="font-semibold">{link.channelName}</h5>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {link.utmSource} / {link.utmMedium}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{link.clicks || 0} click</span>
                <span>·</span>
                <span>{link.conversions || 0} conversioni</span>
              </div>
            </div>

            {/* Full URL */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Full URL con parametri UTM:</label>
              <div className="flex gap-2">
                <Input
                  value={link.generatedUrl || ''}
                  readOnly
                  className="font-mono text-xs"
                  data-testid={`input-full-url-${link.channelId}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link.generatedUrl || '', 'Link UTM completo')}
                  data-testid={`button-copy-full-url-${link.channelId}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(link.generatedUrl || '', '_blank')}
                  data-testid={`button-open-full-url-${link.channelId}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Short URL (Placeholder) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Short URL (disponibile prossimamente):</label>
              <div className="flex gap-2">
                <Input
                  value="Configurazione dominio richiesta"
                  readOnly
                  disabled
                  className="font-mono text-xs"
                  data-testid={`input-short-url-${link.channelId}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Short URL disponibile dopo configurazione dominio personalizzato"
                  data-testid={`button-copy-short-url-${link.channelId}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Gli short URL saranno disponibili dopo la configurazione di un dominio personalizzato (es. w3s.io).
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-orange-50 dark:from-purple-950 dark:to-orange-950 p-4">
        <h5 className="font-semibold mb-3">Riepilogo Prestazioni</h5>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Click Totali</p>
            <p className="text-2xl font-bold text-windtre-orange">
              {links.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conversioni Totali</p>
            <p className="text-2xl font-bold text-windtre-purple">
              {links.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tasso Conversione</p>
            <p className="text-2xl font-bold text-green-600">
              {(() => {
                const totalClicks = links.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0);
                const totalConversions = links.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0);
                return totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';
              })()}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mode Selector Component
interface ModeSelectorProps {
  onSelect: (mode: 'wizard' | 'advanced', remember: boolean) => void;
}

function ModeSelector({ onSelect }: ModeSelectorProps) {
  const [rememberChoice, setRememberChoice] = useState(false);

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">Come vuoi creare la campagna?</h3>
        <p className="text-muted-foreground">
          Scegli la modalità più adatta alle tue esigenze
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Wizard Mode Card */}
        <div
          onClick={() => onSelect('wizard', rememberChoice)}
          className="relative overflow-hidden rounded-xl border-2 border-transparent hover:border-windtre-orange bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-6 cursor-pointer transition-all hover:shadow-lg group"
          data-testid="card-wizard-mode"
        >
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
            Consigliato
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-windtre-orange/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wand2 className="h-8 w-8 text-windtre-orange" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-1">Wizard Guidato</h4>
              <p className="text-sm text-muted-foreground">4 passaggi semplici</p>
            </div>
            <ul className="text-sm space-y-2 text-left w-full">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Ideale per principianti</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Solo campi essenziali</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Validazione step-by-step</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Preview finale prima di salvare</span>
              </li>
            </ul>
            <Button className="w-full bg-windtre-orange hover:bg-windtre-orange/90" data-testid="button-select-wizard">
              <Wand2 className="h-4 w-4 mr-2" />
              Usa Wizard
            </Button>
          </div>
        </div>

        {/* Advanced Mode Card */}
        <div
          onClick={() => onSelect('advanced', rememberChoice)}
          className="relative overflow-hidden rounded-xl border-2 border-transparent hover:border-windtre-purple bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-6 cursor-pointer transition-all hover:shadow-lg group"
          data-testid="card-advanced-mode"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-windtre-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-windtre-purple" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-1">Modalità Avanzata</h4>
              <p className="text-sm text-muted-foreground">Tutte le opzioni disponibili</p>
            </div>
            <ul className="text-sm space-y-2 text-left w-full">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                <span>Per utenti esperti</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                <span>Controllo granulare completo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                <span>9 tab di configurazione</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                <span>Accesso a tutte le features</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full border-windtre-purple hover:bg-windtre-purple/10" data-testid="button-select-advanced">
              <Zap className="h-4 w-4 mr-2" />
              Usa Avanzata
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <Checkbox
          id="remember-choice"
          checked={rememberChoice}
          onCheckedChange={(checked) => setRememberChoice(!!checked)}
          data-testid="checkbox-remember-choice"
        />
        <label
          htmlFor="remember-choice"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Ricorda la mia scelta
        </label>
      </div>
    </div>
  );
}

// Wizard Step 1: Basic Info
interface WizardStep1Props {
  form: UseFormReturn<CampaignFormValues>;
  stores: any[];
}

function WizardStep1({ form, stores }: WizardStep1Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 mb-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-windtre-orange" />
          Informazioni di Base
        </h3>
        <p className="text-sm text-muted-foreground">
          Iniziamo con le informazioni essenziali della tua campagna marketing
        </p>
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Campagna *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Es: Promo Black Friday 2025" data-testid="wizard-input-name" />
            </FormControl>
            <FormDescription>Un nome descrittivo per identificare facilmente la campagna</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrizione</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} placeholder="Descrizione della campagna..." data-testid="wizard-textarea-description" />
            </FormControl>
            <FormDescription>Aggiungi dettagli su obiettivi e target della campagna</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="storeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Negozio *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="wizard-select-store">
                  <SelectValue placeholder="Seleziona il negozio" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {stores.map((store: any) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Il punto vendita a cui è associata questa campagna</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Campagna Attiva</FormLabel>
              <FormDescription>
                La campagna sarà immediatamente operativa
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid="wizard-switch-active"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

// Wizard Step 2: Routing & Assignment
interface WizardStep2Props {
  form: UseFormReturn<CampaignFormValues>;
  users: any[];
  teams: any[];
}

function WizardStep2({ form, users, teams }: WizardStep2Props) {
  const selectedRoutingMode = form.watch('routingMode');

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 mb-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Route className="h-5 w-5 text-windtre-orange" />
          Routing e Assegnazione
        </h3>
        <p className="text-sm text-muted-foreground">
          Configura come i lead vengono assegnati al tuo team
        </p>
      </div>

      <FormField
        control={form.control}
        name="routingMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modalità di Gestione Lead *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="wizard-select-routing-mode">
                  <SelectValue placeholder="Seleziona modalità" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="automatic">🤖 Assegnazione Automatica</SelectItem>
                <SelectItem value="manual">👤 Revisione Manuale</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              {field.value === 'automatic' 
                ? 'I lead saranno assegnati automaticamente al team o utente selezionato'
                : 'I lead andranno in coda per una revisione manuale prima dell\'assegnazione'}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedRoutingMode === 'automatic' && (
        <>
          <FormField
            control={form.control}
            name="autoAssignmentUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assegna a Utente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger data-testid="wizard-select-user">
                      <SelectValue placeholder="Seleziona utente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuno (usa team)</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.displayName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Assegna tutti i lead direttamente a un utente specifico</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoAssignmentTeamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assegna a Team</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger data-testid="wizard-select-team">
                      <SelectValue placeholder="Seleziona team" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuno (usa utente)</SelectItem>
                    {teams
                      .filter((team: any) => team.assignedDepartments?.includes('crm'))
                      .map((team: any) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>Assegna tutti i lead a un team CRM</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <strong>Nota:</strong> Devi selezionare almeno un utente o un team per la modalità automatica
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Wizard Step 3: Marketing Channels
interface WizardStep3Props {
  form: UseFormReturn<CampaignFormValues>;
  marketingChannels: any[];
  stores: any[];
  storeTrackingConfig: any;
}

function WizardStep3({ form, marketingChannels, stores, storeTrackingConfig }: WizardStep3Props) {
  const selectedStoreId = form.watch('storeId');
  
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 mb-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Target className="h-5 w-5 text-windtre-orange" />
          Marketing & Obiettivi
        </h3>
        <p className="text-sm text-muted-foreground">
          Configura canali marketing, landing page, lead source e budget
        </p>
      </div>

      {/* Badge Tracking Ereditato dallo Store */}
      {selectedStoreId && storeTrackingConfig && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                🏪 Tracking Pixels Ereditati dallo Store
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                Questa campagna erediterà automaticamente i pixel di tracking configurati nello store{' '}
                <strong>{stores.find((s: any) => s.id === selectedStoreId)?.name}</strong>
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {storeTrackingConfig.ga4MeasurementId && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                    ✓ GA4: {storeTrackingConfig.ga4MeasurementId}
                  </Badge>
                )}
                {storeTrackingConfig.googleAdsConversionId && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                    ✓ Google Ads: {storeTrackingConfig.googleAdsConversionId}
                  </Badge>
                )}
                {storeTrackingConfig.facebookPixelId && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                    ✓ Facebook: {storeTrackingConfig.facebookPixelId}
                  </Badge>
                )}
                {storeTrackingConfig.tiktokPixelId && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                    ✓ TikTok: {storeTrackingConfig.tiktokPixelId}
                  </Badge>
                )}
                {!storeTrackingConfig.ga4MeasurementId && !storeTrackingConfig.googleAdsConversionId && !storeTrackingConfig.facebookPixelId && !storeTrackingConfig.tiktokPixelId && (
                  <p className="col-span-2 text-xs text-gray-600 dark:text-gray-400 italic">
                    ⚠️ Nessun pixel configurato nello store. Vai in Impostazioni → Negozi → Marketing per configurarli.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <FormField
        control={form.control}
        name="marketingChannels"
        render={({ field }) => {
          const digitalChannels = (marketingChannels as any[]).filter(ch => ch.category === 'digital' && ch.active);
          
          return (
            <FormItem>
              <FormLabel>Canali Marketing Attivi</FormLabel>
              <FormDescription className="mb-3">
                Seleziona i canali che utilizzerai per questa campagna
              </FormDescription>
              <div className="grid grid-cols-2 gap-2">
                {digitalChannels.map((channel: any) => {
                  const isChecked = field.value?.includes(channel.code) || false;
                  
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-windtre-orange"
                      style={{
                        borderWidth: isChecked ? '2px' : '1px',
                        borderColor: isChecked ? 'hsl(24, 100%, 52%)' : undefined
                      }}
                      onClick={() => {
                        const currentValue = field.value || [];
                        const newValue = isChecked
                          ? currentValue.filter((code: string) => code !== channel.code)
                          : [...currentValue, channel.code];
                        field.onChange(newValue);
                      }}
                      data-testid={`wizard-channel-${channel.code}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          const newValue = checked
                            ? [...currentValue, channel.code]
                            : currentValue.filter((code: string) => code !== channel.code);
                          field.onChange(newValue);
                        }}
                      />
                      <span className="text-sm font-medium">{channel.name}</span>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="landingPageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Landing Page URL *</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || ''} 
                placeholder="https://esempio.com/promo" 
                data-testid="wizard-input-landing-url" 
              />
            </FormControl>
            <FormDescription>
              URL della landing page dove arriveranno i tuoi lead
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="utmCampaign"
        render={({ field }) => (
          <FormItem>
            <FormLabel>UTM Campaign</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || ''} 
                placeholder="black-friday-2025" 
                data-testid="wizard-input-utm" 
              />
            </FormControl>
            <FormDescription>
              Nome della campagna per il tracking UTM (opzionale)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="defaultLeadSource"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Origine Lead Predefinita</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger data-testid="wizard-select-lead-source">
                  <SelectValue placeholder="Seleziona origine" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="web_form">Form Web</SelectItem>
                <SelectItem value="landing_page">Landing Page</SelectItem>
                <SelectItem value="manual">Inserimento Manuale</SelectItem>
                <SelectItem value="powerful_api">Powerful API</SelectItem>
                <SelectItem value="csv_import">Import CSV</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Come verranno acquisiti i lead (opzionale)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="budget"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Budget Campagna (€)</FormLabel>
            <FormControl>
              <Input 
                type="number"
                {...field} 
                value={field.value || ''} 
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                step="0.01"
                min={0}
                placeholder="0.00"
                data-testid="wizard-input-budget" 
              />
            </FormControl>
            <FormDescription>
              Budget previsto per questa campagna (opzionale)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Wizard Step 4: Review & Submit
interface WizardStep4Props {
  form: UseFormReturn<CampaignFormValues>;
  stores: any[];
  users: any[];
  teams: any[];
  marketingChannels: any[];
  onEditStep: (step: number) => void;
}

function WizardStep4({ form, stores, users, teams, marketingChannels, onEditStep }: WizardStep4Props) {
  const formValues = form.getValues();
  const selectedStore = stores.find((s: any) => s.id === formValues.storeId);
  const selectedUser = users.find((u: any) => u.id === formValues.autoAssignmentUserId);
  const selectedTeam = teams.find((t: any) => t.id === formValues.autoAssignmentTeamId);
  const selectedChannels = marketingChannels.filter((ch: any) => 
    formValues.marketingChannels?.includes(ch.code)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 mb-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Check className="h-5 w-5 text-windtre-orange" />
          Revisione Finale
        </h3>
        <p className="text-sm text-muted-foreground">
          Controlla i dettagli prima di creare la campagna
        </p>
      </div>

      {/* Basic Info Summary */}
      <div className="rounded-lg border p-4 space-y-2" data-testid="wizard-summary-basic">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Informazioni di Base
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(1)}
            data-testid="wizard-edit-step-1"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Modifica
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome:</span>
            <span className="font-medium">{formValues.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Negozio:</span>
            <span className="font-medium">{selectedStore?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stato:</span>
            <span className={`font-medium ${formValues.isActive ? 'text-green-600' : 'text-gray-500'}`}>
              {formValues.isActive ? '✓ Attiva' : '✗ Non attiva'}
            </span>
          </div>
          {formValues.description && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground text-xs">Descrizione:</p>
              <p className="text-sm">{formValues.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Routing Summary */}
      <div className="rounded-lg border p-4 space-y-2" data-testid="wizard-summary-routing">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Route className="h-4 w-4" />
            Routing e Assegnazione
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(2)}
            data-testid="wizard-edit-step-2"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Modifica
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modalità:</span>
            <span className="font-medium">
              {formValues.routingMode === 'automatic' ? '🤖 Automatica' : '👤 Manuale'}
            </span>
          </div>
          {formValues.routingMode === 'automatic' && (
            <>
              {selectedUser && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utente:</span>
                  <span className="font-medium">{selectedUser.displayName || selectedUser.email}</span>
                </div>
              )}
              {selectedTeam && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-medium">{selectedTeam.name}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Marketing Summary */}
      <div className="rounded-lg border p-4 space-y-2" data-testid="wizard-summary-marketing">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Canali Marketing
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(3)}
            data-testid="wizard-edit-step-3"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Modifica
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          {selectedChannels.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-2">Canali selezionati:</p>
              <div className="flex flex-wrap gap-1">
                {selectedChannels.map((ch: any) => (
                  <span
                    key={ch.id}
                    className="px-2 py-0.5 rounded-full bg-windtre-orange/10 text-windtre-orange text-xs"
                  >
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nessun canale selezionato</p>
          )}
          {formValues.landingPageUrl && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Landing Page:</span>
              <span className="font-medium text-xs truncate max-w-[200px]" title={formValues.landingPageUrl}>
                {formValues.landingPageUrl}
              </span>
            </div>
          )}
          {formValues.budget && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">€{formValues.budget.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
        <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
          <Check className="h-4 w-4" />
          <strong>Tutto pronto!</strong> Clicca "Crea Campagna" per completare la configurazione
        </p>
      </div>
    </div>
  );
}

// Wizard Shell with Stepper
interface WizardShellProps {
  form: UseFormReturn<CampaignFormValues>;
  stores: any[];
  users: any[];
  teams: any[];
  marketingChannels: any[];
  storeTrackingConfig: any;
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGoToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onSubmit: () => void;
  isLoading: boolean;
}

function WizardShell({
  form,
  stores,
  users,
  teams,
  marketingChannels,
  storeTrackingConfig,
  currentStep,
  onNextStep,
  onPrevStep,
  onGoToStep,
  isFirstStep,
  isLastStep,
  onSubmit,
  isLoading
}: WizardShellProps) {
  const steps = [
    { number: 1, label: 'Info Base', icon: Settings2 },
    { number: 2, label: 'Routing', icon: Route },
    { number: 3, label: 'Marketing', icon: Target },
    { number: 4, label: 'Revisione', icon: Check }
  ];

  // Validation per step
  const validateCurrentStep = async () => {
    const values = form.getValues();
    
    switch (currentStep) {
      case 1:
        // Step 1: name and storeId required
        if (!values.name || !values.storeId) {
          form.setError('name', { message: 'Nome richiesto' });
          form.setError('storeId', { message: 'Negozio richiesto' });
          return false;
        }
        return true;
      
      case 2:
        // Step 2: If automatic, require user OR team
        if (values.routingMode === 'automatic' && !values.autoAssignmentUserId && !values.autoAssignmentTeamId) {
          form.setError('autoAssignmentUserId', { 
            message: 'Seleziona almeno un utente o un team per la modalità automatica' 
          });
          return false;
        }
        return true;
      
      case 3:
        // Step 3: If channels selected, landingPageUrl required
        if (values.marketingChannels && values.marketingChannels.length > 0 && !values.landingPageUrl) {
          form.setError('landingPageUrl', { 
            message: 'Landing Page URL obbligatorio quando sono selezionati canali marketing' 
          });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      onNextStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isFuture = currentStep < step.number;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    h-10 w-10 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-windtre-orange text-white scale-110' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isFuture ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : ''}
                  `}
                  data-testid={`wizard-step-indicator-${step.number}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-windtre-orange' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && <WizardStep1 form={form} stores={stores} />}
        {currentStep === 2 && <WizardStep2 form={form} users={users} teams={teams} />}
        {currentStep === 3 && <WizardStep3 form={form} marketingChannels={marketingChannels} stores={stores} storeTrackingConfig={storeTrackingConfig} />}
        {currentStep === 4 && (
          <WizardStep4 
            form={form} 
            stores={stores} 
            users={users} 
            teams={teams} 
            marketingChannels={marketingChannels}
            onEditStep={onGoToStep}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevStep}
          disabled={isFirstStep || isLoading}
          data-testid="wizard-button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>

        <div className="text-sm text-muted-foreground">
          Passo {currentStep} di 4
        </div>

        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="bg-windtre-orange hover:bg-windtre-orange/90"
            data-testid="wizard-button-submit"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creazione...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Crea Campagna
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            data-testid="wizard-button-next"
          >
            Avanti
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function CampaignSettingsDialog({ open, onClose, campaignId, mode }: CampaignSettingsDialogProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Campaign creation mode hook (wizard vs advanced)
  const {
    mode: creationMode,
    setMode: setCreationMode,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    preference,
    savePreference,
  } = useCampaignCreationMode();

  // Mode selector disabled - now handled by CampaignCreationChoice in CampaignsPage
  useEffect(() => {
    setShowModeSelector(false); // Never show, choice is made before opening dialog
  }, [open, mode, preference]);

  // Reset nested dialog when parent closes
  useEffect(() => {
    if (!open) {
      setStatusDialogOpen(false);
      setShowModeSelector(false);
    }
  }, [open]);

  // Handle mode selection
  const handleModeSelect = (selectedMode: 'wizard' | 'advanced', remember: boolean) => {
    setCreationMode(selectedMode);
    if (remember) {
      savePreference(selectedMode);
    }
    setShowModeSelector(false);
  };

  // Toggle between wizard and advanced mode
  const toggleCreationMode = () => {
    const newMode = creationMode === 'wizard' ? 'advanced' : 'wizard';
    setCreationMode(newMode);
  };

  // Fetch campaign data (edit mode only)
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: [`/api/crm/campaigns/${campaignId}`],
    enabled: open && mode === 'edit' && !!campaignId,
  });

  // Fetch dropdown data
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['/api/workflows/templates?category=crm'],
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  // Load marketing channels from DB
  const { data: marketingChannels = [] } = useQuery({
    queryKey: ['/api/crm/marketing-channels'],
    enabled: open,
  });

  const { data: utmMappings = [] } = useQuery({
    queryKey: ['/api/crm/marketing-channels/utm-mappings'],
    enabled: open,
  });

  // Initialize form
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      storeId: '',
      legalEntityId: undefined,
      driverIds: [],
      workflowId: null,
      defaultLeadSource: null,
      landingPageUrl: '',
      utmCampaign: null,
      marketingChannels: [],
      budget: null,
      actualSpent: null,
      startDate: null,
      endDate: null,
      isActive: true,
      requiredConsents: {
        privacy_policy: false,
        marketing: false,
        profiling: false,
        third_party: false,
      },
    },
  });

  // Watch storeId to fetch tracking config
  const selectedStoreId = form.watch('storeId');
  
  // Fetch store tracking config when store is selected
  const { data: storeTrackingConfig } = useQuery({
    queryKey: ['/api/stores', selectedStoreId, 'tracking-config'],
    enabled: open && !!selectedStoreId,
  });

  // Calculate suggested UTM values based on selected marketing channels
  const selectedChannelCodes = form.watch('marketingChannels') || [];
  const suggestedUtmValues = selectedChannelCodes.length > 0
    ? (() => {
        // Find first channel with UTM generation enabled
        const firstCode = selectedChannelCodes[0];
        const channel = (marketingChannels as any[]).find((ch: any) => ch.code === firstCode && ch.generatesUtm);
        if (channel) {
          const mapping = (utmMappings as any[]).find((m: any) => m.marketingChannelId === channel.id);
          if (mapping) {
            return {
              source: mapping.suggestedUtmSource,
              medium: mapping.suggestedUtmMedium,
            };
          }
        }
        return null;
      })()
    : null;

  // Update form when campaign data loads (edit mode)
  useEffect(() => {
    if (campaign && mode === 'edit') {
      form.reset({
        name: campaign.name || '',
        description: campaign.description || '',
        storeId: campaign.storeId || '',
        legalEntityId: campaign.legalEntityId || undefined,
        driverIds: campaign.driverIds || [],
        workflowId: campaign.workflowId || null,
        defaultLeadSource: campaign.defaultLeadSource || null,
        landingPageUrl: campaign.landingPageUrl || '',
        utmCampaign: campaign.utmCampaign || null,
        marketingChannels: campaign.marketingChannels || [],
        budget: campaign.budget || null,
        actualSpent: campaign.actualSpent || null,
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : null,
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : null,
        isActive: campaign.isActive ?? true,
        requiredConsents: campaign.requiredConsents || {
          privacy_policy: false,
          marketing: false,
          profiling: false,
          third_party: false,
        },
      });
    }
  }, [campaign, mode, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      // Get legalEntityId from selected store
      const store = stores.find((s: any) => s.id === data.storeId);
      const payload = {
        ...data,
        legalEntityId: store?.legalEntityId,
        tenantId: store?.tenantId,
      };
      return apiRequest('/api/crm/campaigns', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campagna creata",
        description: "La campagna è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile creare la campagna",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      return apiRequest(`/api/crm/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campagna aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/campaigns/${campaignId}`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare la campagna",
        variant: "destructive",
      });
    },
  });

  // Form submit
  const onSubmit = (data: CampaignFormValues) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isLoading = campaignLoading || createMutation.isPending || updateMutation.isPending;
  const selectedRoutingMode = form.watch('routingMode');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {mode === 'create' ? 'Nuova Campagna' : 'Modifica Campagna'}
                {mode === 'create' && !showModeSelector && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-windtre-orange/10 text-windtre-orange border border-windtre-orange/20">
                    {creationMode === 'wizard' ? '🧙 Wizard' : '⚡ Avanzata'}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {mode === 'create' 
                  ? creationMode === 'wizard'
                    ? 'Crea la tua campagna in 4 semplici passaggi'
                    : 'Configura una nuova campagna marketing con routing automatico e workflow integrati'
                  : 'Modifica le impostazioni della campagna marketing'}
              </DialogDescription>
            </div>
            {mode === 'create' && !showModeSelector && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleCreationMode}
                className="text-xs"
                data-testid="button-toggle-mode"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {creationMode === 'wizard' ? 'Passa ad Avanzata' : 'Passa a Wizard'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {showModeSelector ? (
          <ModeSelector onSelect={handleModeSelect} />
        ) : campaignLoading && mode === 'edit' ? (
          <LoadingState message="Caricamento campagna..." />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {mode === 'create' && creationMode === 'wizard' ? (
                <WizardShell
                  form={form}
                  stores={stores}
                  users={users}
                  teams={teams}
                  marketingChannels={marketingChannels}
                  storeTrackingConfig={storeTrackingConfig}
                  currentStep={currentStep}
                  onNextStep={nextStep}
                  onPrevStep={prevStep}
                  onGoToStep={goToStep}
                  isFirstStep={isFirstStep}
                  isLastStep={isLastStep}
                  onSubmit={() => form.handleSubmit(onSubmit)()}
                  isLoading={isLoading}
                />
              ) : (
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid grid-cols-6 w-full">
                    <TabsTrigger value="general" data-testid="tab-general">
                      <Settings2 className="h-4 w-4 mr-1" />
                      Generale
                    </TabsTrigger>
                    <TabsTrigger value="tracking" data-testid="tab-tracking">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Marketing
                    </TabsTrigger>
                    <TabsTrigger value="routing-workflows" data-testid="tab-routing-workflows">
                      <Workflow className="h-4 w-4 mr-1" />
                      Routing
                    </TabsTrigger>
                    <TabsTrigger value="privacy" data-testid="tab-privacy">
                      <Shield className="h-4 w-4 mr-1" />
                      Privacy
                    </TabsTrigger>
                    <TabsTrigger value="utm-links" data-testid="tab-utm-links" disabled={mode === 'create'}>
                      <Link className="h-4 w-4 mr-1" />
                      UTM
                    </TabsTrigger>
                    <TabsTrigger value="lead-statuses" data-testid="tab-lead-statuses" disabled={mode === 'create'}>
                      <ListTodo className="h-4 w-4 mr-1" />
                      Lead
                    </TabsTrigger>
                  </TabsList>

                {/* TAB 1: GENERALE */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Campagna *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es: Promo Black Friday 2025" data-testid="input-campaign-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Descrizione della campagna..." data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negozio *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={mode === 'edit'}>
                          <FormControl>
                            <SelectTrigger data-testid="select-store">
                              <SelectValue placeholder="Seleziona negozio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores.map((store: any) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {mode === 'create' && <AlertCircle className="inline h-3 w-3 mr-1" />}
                          Tutte le campagne sono store-scoped
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driverIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Target (Multi-selezione)</FormLabel>
                        <FormDescription className="mb-3">
                          Seleziona uno o più driver per questa campagna
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-3">
                          {drivers.map((driver: any) => {
                            const isChecked = field.value?.includes(driver.id) || false;
                            const driverColor = DRIVER_COLORS[driver.name] || 'hsl(var(--brand-orange))';
                            
                            return (
                              <div
                                key={driver.id}
                                className="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer"
                                style={{
                                  background: isChecked ? 'var(--glass-card-bg)' : 'transparent',
                                  borderColor: isChecked ? driverColor : 'var(--glass-card-border)',
                                  borderWidth: isChecked ? '2px' : '1px'
                                }}
                                onClick={() => {
                                  const currentValue = field.value || [];
                                  const newValue = isChecked
                                    ? currentValue.filter((id: string) => id !== driver.id)
                                    : [...currentValue, driver.id];
                                  field.onChange(newValue);
                                }}
                                data-testid={`checkbox-driver-${driver.name.toLowerCase()}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    const newValue = checked
                                      ? [...currentValue, driver.id]
                                      : currentValue.filter((id: string) => id !== driver.id);
                                    field.onChange(newValue);
                                  }}
                                  style={{ borderColor: driverColor }}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: driverColor }}
                                  />
                                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {driver.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Inizio</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''} 
                              data-testid="input-start-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Fine</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''} 
                              data-testid="input-end-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Campagna Attiva</FormLabel>
                          <FormDescription>
                            Attiva o disattiva la campagna
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {mode === 'edit' && campaign && (
                    <div className="rounded-lg border p-4 bg-muted/50 mt-4">
                      <h4 className="font-medium mb-2">Statistiche Campagna</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Lead Totali</p>
                          <p className="text-lg font-semibold">{campaign.totalLeads || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deal Totali</p>
                          <p className="text-lg font-semibold">{campaign.totalDeals || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue Totale</p>
                          <p className="text-lg font-semibold">€{campaign.totalRevenue?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* TAB: UTM LINKS */}
                <TabsContent value="utm-links" className="space-y-4 mt-4">
                  <UTMLinksTab campaignId={campaignId} mode={mode} />
                </TabsContent>

                {/* TAB: ROUTING & WORKFLOWS */}
                <TabsContent value="routing-workflows" className="space-y-4 mt-4">
                  <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 border border-orange-200 dark:border-orange-800 mb-4">
                    <div className="flex items-start gap-3">
                      <Workflow className="h-5 w-5 text-windtre-orange flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Routing & Workflows</h4>
                        <p className="text-xs text-muted-foreground">
                          Configura come i lead vengono gestiti e instradati
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="routingMode"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Modalità di Routing *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value || 'automatic'}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-windtre-orange">
                              <RadioGroupItem value="automatic" data-testid="radio-routing-automatic" />
                              <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer font-medium">
                                  Automatico
                                </FormLabel>
                                <FormDescription>
                                  I lead vengono assegnati automaticamente tramite workflow
                                </FormDescription>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-windtre-orange">
                              <RadioGroupItem value="manual" data-testid="radio-routing-manual" />
                              <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer font-medium">
                                  Manuale
                                </FormLabel>
                                <FormDescription>
                                  I lead vanno in pipeline per gestione manuale
                                </FormDescription>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Automatic Mode Fields */}
                  {(selectedRoutingMode === 'automatic' || !selectedRoutingMode) && (
                    <>
                      <FormField
                        control={form.control}
                        name="workflowId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workflow *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-workflow">
                                  <SelectValue placeholder="Seleziona workflow" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {workflows.map((wf: any) => (
                                  <SelectItem key={wf.id} value={wf.id}>
                                    {wf.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Il workflow che gestirà i lead automaticamente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fallbackTimeoutSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timeout Fallback (secondi)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                value={field.value || 300}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 300)}
                                min={30}
                                max={3600}
                                data-testid="input-fallback-timeout"
                              />
                            </FormControl>
                            <FormDescription>
                              Tempo di attesa prima di passare alla pipeline fallback (default: 300s)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fallbackPipelineId1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pipeline Fallback 1</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-fallback-pipeline-1">
                                  <SelectValue placeholder="Seleziona pipeline fallback" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pipelines.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Pipeline di backup se il workflow fallisce
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fallbackPipelineId2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pipeline Fallback 2 (opzionale)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-fallback-pipeline-2">
                                  <SelectValue placeholder="Seleziona seconda pipeline fallback" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pipelines.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Seconda pipeline di backup (opzionale)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Manual Mode Fields */}
                  {selectedRoutingMode === 'manual' && (
                    <>
                      <FormField
                        control={form.control}
                        name="manualPipelineId1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pipeline 1 *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-manual-pipeline-1">
                                  <SelectValue placeholder="Seleziona pipeline principale" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pipelines.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Pipeline principale per i lead in gestione manuale
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="manualPipelineId2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pipeline 2 (opzionale)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-manual-pipeline-2">
                                  <SelectValue placeholder="Seleziona seconda pipeline" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pipelines.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Seconda pipeline per segregare i lead (opzionale)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Notifications (both modes) */}
                  <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Bell className="h-4 w-4 text-windtre-orange" />
                      Notifiche
                    </h4>

                    <FormField
                      control={form.control}
                      name="notifyTeamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team da Notificare</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-notify-team">
                                <SelectValue placeholder="Seleziona team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((t: any) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Il team riceverà notifiche per nuovi lead
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB 5: PRIVACY & GDPR */}
                <TabsContent value="privacy" className="space-y-4 mt-4">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Consensi GDPR Richiesti
                    </h3>
                    <p className="text-sm text-gray-600">
                      Configura quali consensi privacy sono richiesti per i lead di questa campagna
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="requiredConsents.privacy_policy"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Informativa Privacy
                          </FormLabel>
                          <FormDescription>
                            Consenso obbligatorio al trattamento dati personali secondo GDPR Art. 13
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-privacy-policy"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.marketing"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Marketing
                          </FormLabel>
                          <FormDescription>
                            Consenso per attività di marketing e comunicazioni promozionali
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-marketing"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.profiling"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Profilazione
                          </FormLabel>
                          <FormDescription>
                            Consenso per profilazione e analisi comportamentale degli utenti
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-profiling"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.third_party"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Terze Parti
                          </FormLabel>
                          <FormDescription>
                            Consenso per condivisione dati con partner e fornitori terzi
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-third-party"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> I consensi selezionati saranno richiesti durante la creazione di nuovi lead. 
                      I lead senza consensi richiesti potrebbero essere soggetti a restrizioni nel trattamento.
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 6: MARKETING & BUDGET */}
                <TabsContent value="tracking" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="defaultLeadSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Source (Origine Lead Predefinita)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default-lead-source">
                              <SelectValue placeholder="Seleziona l'origine dei lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manuale</SelectItem>
                            <SelectItem value="web_form">Form Web</SelectItem>
                            <SelectItem value="landing_page">Landing Page</SelectItem>
                            <SelectItem value="powerful_api">Powerful API</SelectItem>
                            <SelectItem value="csv_import">Import CSV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Origine predefinita dei lead acquisiti da questa campagna
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="landingPageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landing Page URL</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="https://esempio.com/landing" 
                            data-testid="input-landing-page-url" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Badge Tracking Ereditato dallo Store */}
                  {selectedStoreId && storeTrackingConfig && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-300 dark:border-blue-700">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                          <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                            🏪 Tracking Pixels Ereditati dallo Store
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                            Questa campagna erediterà automaticamente i pixel di tracking configurati nello store{' '}
                            <strong>{stores.find((s: any) => s.id === selectedStoreId)?.name}</strong>
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {storeTrackingConfig.ga4MeasurementId && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                                ✓ GA4: {storeTrackingConfig.ga4MeasurementId}
                              </Badge>
                            )}
                            {storeTrackingConfig.googleAdsConversionId && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                                ✓ Google Ads: {storeTrackingConfig.googleAdsConversionId}
                              </Badge>
                            )}
                            {storeTrackingConfig.facebookPixelId && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                                ✓ Facebook: {storeTrackingConfig.facebookPixelId}
                              </Badge>
                            )}
                            {storeTrackingConfig.tiktokPixelId && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                                ✓ TikTok: {storeTrackingConfig.tiktokPixelId}
                              </Badge>
                            )}
                            {!storeTrackingConfig.ga4MeasurementId && !storeTrackingConfig.googleAdsConversionId && !storeTrackingConfig.facebookPixelId && !storeTrackingConfig.tiktokPixelId && (
                              <p className="col-span-2 text-xs text-gray-600 dark:text-gray-400 italic">
                                ⚠️ Nessun pixel configurato nello store. Vai in Impostazioni → Negozi → Marketing per configurarli.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                    <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Canali Marketing & UTM Tracking
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mb-4">
                      Seleziona i canali marketing da attivare. Il sistema genererà automaticamente link UTM per ogni canale.
                    </p>

                    <FormField
                      control={form.control}
                      name="marketingChannels"
                      render={({ field }) => {
                        const digitalChannels = (marketingChannels as any[]).filter(ch => ch.category === 'digital' && ch.active);
                        const traditionalChannels = (marketingChannels as any[]).filter(ch => ch.category === 'traditional' && ch.active);
                        const directChannels = (marketingChannels as any[]).filter(ch => ch.category === 'direct' && ch.active);
                        
                        return (
                          <FormItem>
                            <FormLabel>Canali Marketing Attivi *</FormLabel>
                            
                            {/* Digital Channels (con generazione UTM) */}
                            {digitalChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                                  🌐 Canali Digitali (con UTM)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {digitalChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Traditional Channels (tracking only) */}
                            {traditionalChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  📺 Canali Tradizionali (tracking)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {traditionalChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Direct Channels (tracking only) */}
                            {directChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  🤝 Canali Diretti (tracking)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {directChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <FormDescription className="text-xs mt-2">
                              {field.value && field.value.length > 0 ? (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  ✅ {field.value.length} canale{field.value.length > 1 ? 'i' : ''} selezionato{field.value.length > 1 ? 'i' : ''} - Link UTM saranno generati dopo il salvataggio per i canali digitali
                                </span>
                              ) : (
                                "Seleziona almeno un canale marketing per questa campagna"
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="utmCampaign"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Nome Campagna UTM *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="promo_black_friday_2025" 
                              data-testid="input-utm-campaign" 
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Nome univoco per identificare questa campagna (usato in tutti i canali)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4 mt-6">
                    <h4 className="font-semibold mb-3">Budget & Spesa</h4>

                          <FormField
                            control={form.control}
                            name="budget"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Budget (€)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value || ''} 
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                    step="0.01"
                                    min={0}
                                    placeholder="0.00"
                                    data-testid="input-budget" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="actualSpent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Spesa Effettiva (€)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value || ''} 
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                    step="0.01"
                                    min={0}
                                    placeholder="0.00"
                                    data-testid="input-actual-spent" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="rounded-lg border p-4 bg-muted/50 mt-4">
                            <p className="text-sm text-muted-foreground">
                              Le metriche lead, deal e revenue vengono calcolate automaticamente dal sistema.
                            </p>
                          </div>
                  </div>
                </TabsContent>

                {/* TAB 7: STATI LEAD */}
                <TabsContent value="lead-statuses" className="space-y-4 mt-4">
                  <div className="rounded-lg border p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <ListTodo className="h-5 w-5 text-windtre-orange mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">Gestione Stati Lead</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode === 'create' 
                            ? 'La gestione stati sarà disponibile dopo aver creato la campagna. Ogni campagna ha stati personalizzabili organizzati in categorie fisse.'
                            : 'Personalizza gli stati del ciclo di vita dei lead per questa campagna. Gli stati sono organizzati in categorie fisse (Nuovo, In Lavorazione, Qualificato, Convertito, Non Qualificato, In Attesa), ma puoi creare stati custom con nomi personalizzati.'}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setStatusDialogOpen(true)}
                      className="w-full"
                      disabled={mode === 'create'}
                      data-testid="button-open-lead-statuses"
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Disponibile dopo creazione campagna' : 'Apri Gestione Stati Lead'}
                    </Button>

                    {mode === 'edit' && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Nota:</strong> Gli stati default (uno per categoria) sono protetti e non possono essere eliminati. Puoi creare stati aggiuntivi custom per ogni categoria e personalizzare colori e nomi visualizzati.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              )}

              {/* Footer buttons - only for advanced mode (wizard has own buttons) */}
              {(mode === 'edit' || creationMode === 'advanced') && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    data-testid="button-cancel"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    data-testid="button-save"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Salvataggio...' : mode === 'create' ? 'Crea Campagna' : 'Salva Modifiche'}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        )}

        {/* Lead Status Settings Dialog */}
        {campaignId && (
          <LeadStatusSettingsDialog 
            open={statusDialogOpen} 
            onClose={() => setStatusDialogOpen(false)} 
            campaignId={campaignId} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
