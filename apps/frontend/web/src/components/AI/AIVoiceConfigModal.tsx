import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, Settings, Clock, UserCheck, Calendar, Plus, Trash2, Save, X, AlertCircle,
  CheckCircle, PhoneOff, PhoneCall, Mic
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface TimeCondition {
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start: string; // HH:MM
  end: string; // HH:MM
}

interface AIVoiceConfig {
  trunkId: string;
  provider: string;
  aiAgentEnabled: boolean;
  aiAgentRef: string | null;
  fallbackExtension: string | null;
  timeConditions: {
    businessHours?: TimeCondition[];
    holidays?: string[]; // YYYY-MM-DD
    timezone?: string;
  } | null;
  sipDomain: string;
  isCurrentlyActive: boolean;
}

interface Extension {
  id: string;
  extNumber: string;
  displayName: string;
  enabled: boolean;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface AIVoiceConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' }
];

const VOICE_AGENTS = [
  { id: 'customer-care-voice', name: 'Customer Care Vocale', description: 'Assistente per supporto clienti telefonico' },
  { id: 'sales-assistant-voice', name: 'Sales Assistant Vocale', description: 'Agente vendita e preventivi via telefono' },
  { id: 'appointment-scheduler-voice', name: 'Prenotazioni Vocali', description: 'Gestisce prenotazioni e appuntamenti telefonici' },
  { id: 'technical-support-voice', name: 'Supporto Tecnico Vocale', description: 'Troubleshooting e assistenza tecnica telefonica' }
];

export default function AIVoiceConfigModal({ open, onClose }: AIVoiceConfigModalProps) {
  const { toast } = useToast();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedTrunkId, setSelectedTrunkId] = useState<string>('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [fallbackExtension, setFallbackExtension] = useState<string>('');
  const [businessHours, setBusinessHours] = useState<TimeCondition[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');

  // Fetch stores
  const { data: storesData } = useQuery<{ success: boolean; data: Store[] }>({
    queryKey: ['/api/stores'],
    enabled: open
  });

  // Fetch extensions for fallback selection
  const { data: extensionsData } = useQuery<{ success: boolean; data: Extension[] }>({
    queryKey: ['/api/voip/extensions'],
    enabled: open && !!selectedStoreId
  });

  // Fetch AI voice config for selected store
  const { data: configData, isLoading: configLoading } = useQuery<{ success: boolean; data: { storeId: string; configs: AIVoiceConfig[] } }>({
    queryKey: ['/api/voip/ai-config', selectedStoreId],
    enabled: open && !!selectedStoreId
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: {
      trunkId: string;
      aiAgentEnabled: boolean;
      aiAgentRef: string | null;
      fallbackExtension: string | null;
      timeConditions: any;
    }) => {
      return await apiRequest(`/api/voip/ai-config/${selectedStoreId}`, {
        method: 'POST',
        body: config
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Configurazione Salvata",
        description: "La configurazione AI Voice Agent è stata aggiornata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/ai-config', selectedStoreId] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Errore Salvataggio",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive",
      });
    }
  });

  // Load config when store is selected
  useEffect(() => {
    if (configData?.data?.configs && configData.data.configs.length > 0) {
      const config = configData.data.configs[0]; // Use first trunk
      setSelectedTrunkId(config.trunkId);
      setAiEnabled(config.aiAgentEnabled);
      setSelectedAgent(config.aiAgentRef || '');
      setFallbackExtension(config.fallbackExtension || '');
      setBusinessHours(config.timeConditions?.businessHours || []);
      setHolidays(config.timeConditions?.holidays || []);
    }
  }, [configData]);

  // Add default business hours for weekdays
  const addDefaultBusinessHours = () => {
    const weekdayDefaults: TimeCondition[] = [
      { day: 1, start: '09:00', end: '18:00' }, // Monday
      { day: 2, start: '09:00', end: '18:00' }, // Tuesday
      { day: 3, start: '09:00', end: '18:00' }, // Wednesday
      { day: 4, start: '09:00', end: '18:00' }, // Thursday
      { day: 5, start: '09:00', end: '18:00' }, // Friday
    ];
    setBusinessHours(weekdayDefaults);
  };

  const addBusinessHour = () => {
    setBusinessHours([...businessHours, { day: 1, start: '09:00', end: '18:00' }]);
  };

  const removeBusinessHour = (index: number) => {
    setBusinessHours(businessHours.filter((_, i) => i !== index));
  };

  const updateBusinessHour = (index: number, field: keyof TimeCondition, value: any) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessHours(updated);
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday]);
      setNewHoliday('');
    }
  };

  const removeHoliday = (holiday: string) => {
    setHolidays(holidays.filter(h => h !== holiday));
  };

  const handleSave = () => {
    if (!selectedTrunkId) {
      toast({
        title: "⚠️ Attenzione",
        description: "Seleziona uno store per continuare",
        variant: "destructive",
      });
      return;
    }

    updateConfigMutation.mutate({
      trunkId: selectedTrunkId,
      aiAgentEnabled: aiEnabled,
      aiAgentRef: aiEnabled ? selectedAgent : null,
      fallbackExtension: fallbackExtension || null,
      timeConditions: aiEnabled ? {
        businessHours,
        holidays,
        timezone: 'Europe/Rome'
      } : null
    });
  };

  const stores = storesData?.data || [];
  const extensions = extensionsData?.data || [];
  const currentConfig = configData?.data?.configs?.[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">AI Voice Agent - Configurazione</DialogTitle>
              <DialogDescription>
                Configura l'agente vocale AI per gestire chiamate inbound automaticamente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Store Selection */}
          <div className="space-y-2">
            <Label htmlFor="store-select" className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Seleziona Punto Vendita
            </Label>
            <Select 
              value={selectedStoreId} 
              onValueChange={setSelectedStoreId}
              data-testid="select-store"
            >
              <SelectTrigger id="store-select">
                <SelectValue placeholder="Seleziona uno store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id} data-testid={`store-option-${store.id}`}>
                    {store.name} ({store.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStoreId && (
            <>
              {/* Current Status */}
              {currentConfig && (
                <div className={`p-4 rounded-lg border-2 ${currentConfig.isCurrentlyActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentConfig.isCurrentlyActive ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <PhoneOff className="h-6 w-6 text-gray-500" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {currentConfig.isCurrentlyActive ? '🟢 AI Agent Attivo' : '⚫ AI Agent Non Attivo'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {currentConfig.isCurrentlyActive 
                            ? 'Le chiamate vengono gestite dall\'AI' 
                            : 'AI disabilitato o fuori orario - fallback attivo'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      SIP: {currentConfig.sipDomain}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Agent Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="ai-enabled" className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Abilita AI Voice Agent
                  </Label>
                  <p className="text-sm text-gray-600">
                    Attiva l'agente vocale AI per gestire automaticamente le chiamate in entrata
                  </p>
                </div>
                <Switch 
                  id="ai-enabled"
                  checked={aiEnabled} 
                  onCheckedChange={setAiEnabled}
                  data-testid="switch-ai-enabled"
                />
              </div>

              {aiEnabled && (
                <>
                  {/* AI Agent Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="agent-select" className="text-base font-semibold flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Agente Vocale AI
                    </Label>
                    <Select 
                      value={selectedAgent} 
                      onValueChange={setSelectedAgent}
                      data-testid="select-ai-agent"
                    >
                      <SelectTrigger id="agent-select">
                        <SelectValue placeholder="Seleziona agente AI..." />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_AGENTS.map(agent => (
                          <SelectItem key={agent.id} value={agent.id} data-testid={`agent-option-${agent.id}`}>
                            <div>
                              <div className="font-medium">{agent.name}</div>
                              <div className="text-xs text-gray-500">{agent.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fallback Extension */}
                  <div className="space-y-2">
                    <Label htmlFor="fallback-select" className="text-base font-semibold flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Interno di Fallback
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Interno su cui trasferire la chiamata fuori orario o in caso di errori AI
                    </p>
                    <Select 
                      value={fallbackExtension} 
                      onValueChange={setFallbackExtension}
                      data-testid="select-fallback"
                    >
                      <SelectTrigger id="fallback-select">
                        <SelectValue placeholder="Seleziona interno..." />
                      </SelectTrigger>
                      <SelectContent>
                        {extensions.filter(ext => ext.enabled).map(ext => (
                          <SelectItem key={ext.id} value={ext.extNumber} data-testid={`extension-option-${ext.id}`}>
                            {ext.extNumber} - {ext.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Business Hours */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Orari di Apertura
                      </Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addDefaultBusinessHours}
                          data-testid="button-add-default-hours"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Lun-Ven 9-18
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addBusinessHour}
                          data-testid="button-add-hour"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Aggiungi
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {businessHours.map((hour, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded border" data-testid={`business-hour-${index}`}>
                          <Select 
                            value={hour.day.toString()} 
                            onValueChange={(val) => updateBusinessHour(index, 'day', parseInt(val))}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map(day => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input 
                            type="time" 
                            value={hour.start}
                            onChange={(e) => updateBusinessHour(index, 'start', e.target.value)}
                            className="w-32"
                            data-testid={`input-start-${index}`}
                          />
                          <span className="text-gray-500">-</span>
                          <Input 
                            type="time" 
                            value={hour.end}
                            onChange={(e) => updateBusinessHour(index, 'end', e.target.value)}
                            className="w-32"
                            data-testid={`input-end-${index}`}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeBusinessHour(index)}
                            data-testid={`button-remove-hour-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {businessHours.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nessun orario configurato. L'AI sarà sempre attivo.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Holidays */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Festività (AI Disabilitato)
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        value={newHoliday}
                        onChange={(e) => setNewHoliday(e.target.value)}
                        placeholder="Seleziona data..."
                        data-testid="input-new-holiday"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={addHoliday}
                        disabled={!newHoliday}
                        data-testid="button-add-holiday"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {holidays.map(holiday => (
                        <div 
                          key={holiday} 
                          className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          data-testid={`holiday-${holiday}`}
                        >
                          <span>{new Date(holiday).toLocaleDateString('it-IT')}</span>
                          <button 
                            onClick={() => removeHoliday(holiday)}
                            className="hover:text-red-900"
                            data-testid={`button-remove-holiday-${holiday}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            <span>Le modifiche hanno effetto immediato sulle chiamate in entrata</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!selectedStoreId || updateConfigMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateConfigMutation.isPending ? 'Salvataggio...' : 'Salva Configurazione'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
