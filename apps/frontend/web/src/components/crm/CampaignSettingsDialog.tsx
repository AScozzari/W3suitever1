import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings2, 
  Target, 
  Route,
  Workflow, 
  BarChart3, 
  ShieldCheck,
  Save,
  X
} from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';

interface CampaignSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId?: string; // undefined = create mode
  storeId?: string; // Required for create mode
}

type CampaignType = 'inbound_media' | 'outbound_crm' | 'retention';
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
type RoutingMode = 'automatic' | 'manual' | 'hybrid';
type SourceChannel = 'phone' | 'whatsapp' | 'form' | 'social' | 'email' | 'qr';

const channelOptions: { value: SourceChannel; label: string }[] = [
  { value: 'phone', label: '📞 Telefono' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'form', label: '📝 Form Web' },
  { value: 'social', label: '📱 Social Media' },
  { value: 'email', label: '📧 Email' },
  { value: 'qr', label: '🔲 QR Code' }
];

export function CampaignSettingsDialog({ open, onClose, campaignId, storeId }: CampaignSettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const isEditMode = !!campaignId;

  // Fetch campaign details (edit mode only)
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: [`/api/crm/campaigns/${campaignId}`],
    enabled: open && isEditMode,
  });

  // Fetch stores for dropdown
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  // Fetch drivers for dropdown
  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  // Fetch pipelines for dropdown
  const { data: pipelines = [] } = useQuery({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  // Fetch workflows for dropdown
  const { data: workflows = [] } = useQuery({
    queryKey: ['/api/workflows', { status: 'published' }],
    enabled: open,
  });

  // Fetch users for auto-assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Fetch teams for auto-assignment dropdown
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  // Form state - General tab
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CampaignType>('inbound_media');
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [targetDriverId, setTargetDriverId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state - Targeting tab
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || '');
  const [budget, setBudget] = useState('');
  const [objective, setObjective] = useState(''); // Target numero lead

  // Form state - Routing tab
  const [routingMode, setRoutingMode] = useState<RoutingMode>('manual');
  const [manualReviewTimeoutHours, setManualReviewTimeoutHours] = useState('24');
  const [autoAssignmentUserId, setAutoAssignmentUserId] = useState<string>('');
  const [autoAssignmentTeamId, setAutoAssignmentTeamId] = useState<string>('');

  // Form state - Workflow tab
  const [workflowId, setWorkflowId] = useState<string>('');
  const [primaryPipelineId, setPrimaryPipelineId] = useState<string>('');

  // Form state - Tracking tab
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<SourceChannel[]>([]);

  // Form state - Advanced tab
  const [isBrandTemplate, setIsBrandTemplate] = useState(false);
  const [brandCampaignId, setBrandCampaignId] = useState<string>('');

  // Populate form when campaign data loads (edit mode)
  useEffect(() => {
    if (campaign && isEditMode) {
      setName(campaign.name || '');
      setDescription(campaign.description || '');
      setType(campaign.type || 'inbound_media');
      setStatus(campaign.status || 'draft');
      setTargetDriverId(campaign.targetDriverId || '');
      setStartDate(campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '');
      setEndDate(campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '');
      
      setSelectedStoreId(campaign.storeId || '');
      setBudget(campaign.budget?.toString() || '');
      setObjective(campaign.objective?.toString() || '');
      
      setRoutingMode(campaign.routingMode || 'manual');
      setManualReviewTimeoutHours(campaign.manualReviewTimeoutHours?.toString() || '24');
      setAutoAssignmentUserId(campaign.autoAssignmentUserId || '');
      setAutoAssignmentTeamId(campaign.autoAssignmentTeamId || '');
      
      setWorkflowId(campaign.workflowId || '');
      setPrimaryPipelineId(campaign.primaryPipelineId || '');
      
      setUtmSource(campaign.utmSource || '');
      setUtmMedium(campaign.utmMedium || '');
      setUtmCampaign(campaign.utmCampaign || '');
      setLandingPageUrl(campaign.landingPageUrl || '');
      setSelectedChannels(campaign.channels || []);
      
      setIsBrandTemplate(campaign.isBrandTemplate || false);
      setBrandCampaignId(campaign.brandCampaignId || '');
    }
  }, [campaign, isEditMode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/crm/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      toast({
        title: 'Campagna creata',
        description: 'La campagna è stata creata con successo',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la campagna',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/crm/campaigns/${campaignId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/campaigns/${campaignId}`] });
      toast({
        title: 'Campagna aggiornata',
        description: 'Le modifiche sono state salvate con successo',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare la campagna',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    const campaignData = {
      name,
      description: description || null,
      type,
      status,
      storeId: selectedStoreId,
      targetDriverId: targetDriverId || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      budget: budget ? parseFloat(budget) : null,
      objective: objective ? parseInt(objective) : null,
      routingMode,
      manualReviewTimeoutHours: parseInt(manualReviewTimeoutHours),
      autoAssignmentUserId: autoAssignmentUserId || null,
      autoAssignmentTeamId: autoAssignmentTeamId || null,
      workflowId: workflowId || null,
      primaryPipelineId: primaryPipelineId || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      landingPageUrl: landingPageUrl || null,
      channels: selectedChannels.length > 0 ? selectedChannels : null,
      isBrandTemplate,
      brandCampaignId: brandCampaignId || null,
    };

    if (isEditMode) {
      updateMutation.mutate(campaignData);
    } else {
      createMutation.mutate(campaignData);
    }
  };

  const toggleChannel = (channel: SourceChannel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  if (campaignLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LoadingState />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {isEditMode ? 'Modifica Campagna' : 'Nuova Campagna'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Generale</span>
            </TabsTrigger>
            <TabsTrigger value="targeting" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Targeting</span>
            </TabsTrigger>
            <TabsTrigger value="routing" className="flex items-center gap-1">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Routing</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-1">
              <Workflow className="h-4 w-4" />
              <span className="hidden sm:inline">Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Avanzate</span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="name">Nome Campagna *</Label>
                <Input
                  id="name"
                  data-testid="input-campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es: Promo Black Friday 2024"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  data-testid="textarea-campaign-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione della campagna..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo Campagna *</Label>
                  <Select value={type} onValueChange={(val) => setType(val as CampaignType)}>
                    <SelectTrigger id="type" data-testid="select-campaign-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound_media">Inbound Media</SelectItem>
                      <SelectItem value="outbound_crm">Outbound CRM</SelectItem>
                      <SelectItem value="retention">Retention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Stato</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as CampaignStatus)}>
                    <SelectTrigger id="status" data-testid="select-campaign-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="scheduled">Programmata</SelectItem>
                      <SelectItem value="active">Attiva</SelectItem>
                      <SelectItem value="paused">In Pausa</SelectItem>
                      <SelectItem value="completed">Completata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="driver">Driver Target</Label>
                <Select value={targetDriverId} onValueChange={setTargetDriverId}>
                  <SelectTrigger id="driver" data-testid="select-target-driver">
                    <SelectValue placeholder="Seleziona driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nessuno</SelectItem>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data Inizio</Label>
                  <Input
                    id="startDate"
                    data-testid="input-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Data Fine</Label>
                  <Input
                    id="endDate"
                    data-testid="input-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Targeting Tab */}
          <TabsContent value="targeting" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="store">Punto Vendita *</Label>
                <Select 
                  value={selectedStoreId} 
                  onValueChange={setSelectedStoreId}
                  disabled={isEditMode} // Cannot change store in edit mode
                >
                  <SelectTrigger id="store" data-testid="select-store">
                    <SelectValue placeholder="Seleziona punto vendita..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEditMode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Il punto vendita non può essere modificato dopo la creazione
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget (€)</Label>
                  <Input
                    id="budget"
                    data-testid="input-budget"
                    type="number"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="objective">Obiettivo Lead (#)</Label>
                  <Input
                    id="objective"
                    data-testid="input-objective"
                    type="number"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Target numero lead..."
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="routingMode">Modalità Routing *</Label>
                <Select value={routingMode} onValueChange={(val) => setRoutingMode(val as RoutingMode)}>
                  <SelectTrigger id="routingMode" data-testid="select-routing-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">🤖 Automatico - Assegnazione immediata</SelectItem>
                    <SelectItem value="manual">👤 Manuale - Review obbligatoria</SelectItem>
                    <SelectItem value="hybrid">⚡ Hybrid - Auto se qualificato, altrimenti review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(routingMode === 'manual' || routingMode === 'hybrid') && (
                <div>
                  <Label htmlFor="timeout">Timeout Review Manuale (ore)</Label>
                  <Input
                    id="timeout"
                    data-testid="input-timeout"
                    type="number"
                    value={manualReviewTimeoutHours}
                    onChange={(e) => setManualReviewTimeoutHours(e.target.value)}
                    placeholder="24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Dopo questo periodo senza review, il lead viene assegnato automaticamente
                  </p>
                </div>
              )}

              {(routingMode === 'automatic' || routingMode === 'hybrid') && (
                <>
                  <div>
                    <Label htmlFor="autoUser">Auto-Assegnazione Utente</Label>
                    <Select value={autoAssignmentUserId} onValueChange={setAutoAssignmentUserId}>
                      <SelectTrigger id="autoUser" data-testid="select-auto-user">
                        <SelectValue placeholder="Seleziona utente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nessuno</SelectItem>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="autoTeam">Auto-Assegnazione Team</Label>
                    <Select value={autoAssignmentTeamId} onValueChange={setAutoAssignmentTeamId}>
                      <SelectTrigger id="autoTeam" data-testid="select-auto-team">
                        <SelectValue placeholder="Seleziona team..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nessuno</SelectItem>
                        {teams.map((team: any) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="workflow">Workflow Intake</Label>
                <Select value={workflowId} onValueChange={setWorkflowId}>
                  <SelectTrigger id="workflow" data-testid="select-workflow">
                    <SelectValue placeholder="Seleziona workflow..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nessuno</SelectItem>
                    {workflows.map((workflow: any) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Workflow eseguito quando un nuovo lead entra nella campagna
                </p>
              </div>

              <div>
                <Label htmlFor="pipeline">Pipeline Principale</Label>
                <Select value={primaryPipelineId} onValueChange={setPrimaryPipelineId}>
                  <SelectTrigger id="pipeline" data-testid="select-pipeline">
                    <SelectValue placeholder="Seleziona pipeline..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nessuna</SelectItem>
                    {pipelines.map((pipeline: any) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Pipeline di default per i lead qualificati
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label>Canali Sorgente</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {channelOptions.map((channel) => (
                    <div key={channel.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`channel-${channel.value}`}
                        data-testid={`checkbox-channel-${channel.value}`}
                        checked={selectedChannels.includes(channel.value)}
                        onCheckedChange={() => toggleChannel(channel.value)}
                      />
                      <Label htmlFor={`channel-${channel.value}`} className="cursor-pointer">
                        {channel.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="landingPage">Landing Page URL</Label>
                <Input
                  id="landingPage"
                  data-testid="input-landing-page"
                  type="url"
                  value={landingPageUrl}
                  onChange={(e) => setLandingPageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Parametri UTM</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Input
                      data-testid="input-utm-source"
                      placeholder="utm_source"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      data-testid="input-utm-medium"
                      placeholder="utm_medium"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      data-testid="input-utm-campaign"
                      placeholder="utm_campaign"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="brandTemplate">Template Brand HQ</Label>
                  <p className="text-xs text-muted-foreground">
                    Campagna gestita dal Brand Interface HQ
                  </p>
                </div>
                <Checkbox
                  id="brandTemplate"
                  data-testid="checkbox-brand-template"
                  checked={isBrandTemplate}
                  onCheckedChange={(checked) => setIsBrandTemplate(checked as boolean)}
                />
              </div>

              {isBrandTemplate && (
                <div>
                  <Label htmlFor="brandCampaign">ID Campagna Brand</Label>
                  <Input
                    id="brandCampaign"
                    data-testid="input-brand-campaign-id"
                    value={brandCampaignId}
                    onChange={(e) => setBrandCampaignId(e.target.value)}
                    placeholder="UUID campagna Brand HQ..."
                  />
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
          >
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || !selectedStoreId || createMutation.isPending || updateMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
