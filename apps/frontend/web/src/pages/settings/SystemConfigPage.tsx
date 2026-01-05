import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Package,
  Phone,
  Users,
  Target,
  Bell,
  Save,
  RotateCcw,
  ShoppingCart,
  Workflow,
  Info,
  FileText,
  Hash,
  Calendar,
  RotateCw,
  ClipboardCheck,
  Truck,
  FileCheck,
  HardDrive
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

const STAGING_TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface DocumentNumberingConfigLegacy {
  id?: string;
  tenantId?: string;
  documentType: string;
  template?: string;
  paddingLength?: number;
  resetAnnually?: boolean;
  currentCounter?: number;
  lastResetYear?: number;
}

interface DocumentNumberingConfig {
  id?: string;
  tenantId?: string;
  documentType: string;
  numberingMode: 'numeric' | 'alphanumeric';
  startNumber: number;
  startLetter: string;
  currentNumber: number;
  currentLetter: string;
  paddingLength: number;
  dateFormat: 'none' | 'day' | 'day_month' | 'day_month_year';
  prefix: string;
  separator: string;
  resetAnnually: boolean;
}

function parseLegacyConfig(legacy: DocumentNumberingConfigLegacy, defaultPrefix: string): DocumentNumberingConfig {
  const template = legacy.template || '';
  let prefix = defaultPrefix;
  let dateFormat: DocumentNumberingConfig['dateFormat'] = 'none';
  let separator = '-';
  let numberingMode: 'numeric' | 'alphanumeric' = 'numeric';
  let startLetter = 'A';
  
  const hasDay = template.includes('{DD}');
  const hasMonth = template.includes('{MM}');
  const hasYear = template.includes('{YYYY}') || template.includes('{YY}');
  
  if (hasDay && hasMonth && hasYear) {
    dateFormat = 'day_month_year';
  } else if (hasDay && hasMonth) {
    dateFormat = 'day_month';
  } else if (hasDay) {
    dateFormat = 'day';
  } else if (hasYear) {
    dateFormat = 'day_month_year';
  }
  
  const prefixMatch = template.match(/^([A-Z]+)/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
  }
  
  if (template.includes('/')) separator = '/';
  else if (template.includes('-')) separator = '-';
  else if (template.includes('.')) separator = '.';
  else if (template.includes('_')) separator = '_';
  else separator = 'none';
  
  const letterMatch = template.match(/\{N\}([A-Z])/);
  if (letterMatch) {
    numberingMode = 'alphanumeric';
    startLetter = letterMatch[1];
  }
  
  return {
    id: legacy.id,
    tenantId: legacy.tenantId,
    documentType: legacy.documentType,
    numberingMode,
    startNumber: legacy.currentCounter || 1,
    startLetter,
    currentNumber: legacy.currentCounter || 1,
    currentLetter: startLetter,
    paddingLength: legacy.paddingLength || 4,
    dateFormat,
    prefix,
    separator,
    resetAnnually: legacy.resetAnnually ?? true
  };
}

function configToLegacy(config: DocumentNumberingConfig): DocumentNumberingConfigLegacy {
  const parts: string[] = [];
  
  if (config.prefix) {
    parts.push(config.prefix);
  }
  
  if (config.dateFormat === 'day_month_year') {
    parts.push('{YYYY}');
  }
  
  if (config.numberingMode === 'alphanumeric') {
    parts.push(`{N}${config.startLetter}`);
  } else {
    parts.push('{N}');
  }
  
  const actualSeparator = config.separator === 'none' ? '' : config.separator;
  return {
    id: config.id,
    tenantId: config.tenantId,
    documentType: config.documentType,
    template: parts.join(actualSeparator),
    paddingLength: config.paddingLength,
    resetAnnually: config.resetAnnually,
    currentCounter: config.currentNumber
  };
}

interface OrderApprovalConfig {
  id?: string;
  requiresApproval: boolean;
  thresholdAmount: number | null;
  thresholdQuantity: number | null;
  approverRoles: string[];
  notifyOnCreate: boolean;
  notifyOnApproval: boolean;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'order', label: 'Ordine a Fornitore', icon: ClipboardCheck, defaultPrefix: 'ORD' },
  { value: 'ddt', label: 'DDT', icon: Truck, defaultPrefix: 'DDT' },
  { value: 'adjustment_report', label: 'Rapporto Rettifica', icon: FileCheck, defaultPrefix: 'RET' },
  { value: 'invoice', label: 'Fattura', icon: FileText, defaultPrefix: 'FT' },
  { value: 'credit_note', label: 'Nota di Credito', icon: FileText, defaultPrefix: 'NC' },
  { value: 'debit_note', label: 'Nota di Debito', icon: FileText, defaultPrefix: 'ND' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function WMSDocumentNumberingSection() {
  const { toast } = useToast();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [localConfigs, setLocalConfigs] = useState<Record<string, DocumentNumberingConfig>>({});
  const [orderApprovalConfig, setOrderApprovalConfig] = useState<OrderApprovalConfig>({
    requiresApproval: false,
    thresholdAmount: null,
    thresholdQuantity: null,
    approverRoles: [],
    notifyOnCreate: true,
    notifyOnApproval: true
  });

  const { data: numberingConfigsLegacy, isLoading: numberingLoading } = useQuery<DocumentNumberingConfigLegacy[]>({
    queryKey: ['/api/wms/documents/numbering-config'],
  });

  const { data: approvalConfig, isLoading: approvalLoading } = useQuery<OrderApprovalConfig>({
    queryKey: ['/api/wms/documents/order-approval-config'],
  });

  useEffect(() => {
    if (approvalConfig) {
      setOrderApprovalConfig(approvalConfig);
    }
  }, [approvalConfig]);

  useEffect(() => {
    const configMap: Record<string, DocumentNumberingConfig> = {};
    
    if (numberingConfigsLegacy && numberingConfigsLegacy.length > 0) {
      numberingConfigsLegacy.forEach(legacy => {
        const docOpt = DOCUMENT_TYPE_OPTIONS.find(o => o.value === legacy.documentType);
        configMap[legacy.documentType] = parseLegacyConfig(legacy, docOpt?.defaultPrefix || legacy.documentType.toUpperCase());
      });
    }
    
    DOCUMENT_TYPE_OPTIONS.forEach(opt => {
      if (!configMap[opt.value]) {
        configMap[opt.value] = {
          documentType: opt.value,
          numberingMode: 'numeric',
          startNumber: 1,
          startLetter: 'A',
          currentNumber: 1,
          currentLetter: 'A',
          paddingLength: 4,
          dateFormat: 'none',
          prefix: opt.defaultPrefix,
          separator: '-',
          resetAnnually: true
        };
      }
    });
    
    setLocalConfigs(configMap);
  }, [numberingConfigsLegacy]);

  const saveNumberingMutation = useMutation({
    mutationFn: async (config: DocumentNumberingConfig) => {
      const legacyPayload = configToLegacy(config);
      return apiRequest('/api/wms/documents/numbering-config', {
        method: 'POST',
        body: JSON.stringify(legacyPayload),
      });
    },
    onSuccess: () => {
      toast({ title: 'Configurazione salvata', description: 'Numerazione documento aggiornata.' });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/numbering-config'] });
      setEditingType(null);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare la configurazione.', variant: 'destructive' });
    }
  });

  const saveApprovalMutation = useMutation({
    mutationFn: async (config: OrderApprovalConfig) => {
      return apiRequest('/api/wms/documents/order-approval-config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      toast({ title: 'Configurazione salvata', description: 'Approvazione ordini aggiornata.' });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/order-approval-config'] });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare la configurazione.', variant: 'destructive' });
    }
  });

  const handleConfigChange = (docType: string, field: keyof DocumentNumberingConfig, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value
      }
    }));
  };

  const generatePreview = (config: DocumentNumberingConfig) => {
    const now = new Date();
    const parts: string[] = [];
    
    if (config.prefix) {
      parts.push(config.prefix);
    }
    
    if (config.dateFormat !== 'none') {
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      
      if (config.dateFormat === 'day') {
        parts.push(day);
      } else if (config.dateFormat === 'day_month') {
        parts.push(`${day}/${month}`);
      } else if (config.dateFormat === 'day_month_year') {
        parts.push(`${day}/${month}/${year}`);
      }
    }
    
    const num = String(config.startNumber).padStart(config.paddingLength, '0');
    if (config.numberingMode === 'alphanumeric') {
      parts.push(`${num}${config.startLetter}`);
    } else {
      parts.push(num);
    }
    
    const actualSeparator = config.separator === 'none' ? '' : config.separator;
    return parts.join(actualSeparator);
  };

  if (numberingLoading || approvalLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600" />
            Numerazione Documenti
          </CardTitle>
          <CardDescription>
            Configura il formato di numerazione per ogni tipo di documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {DOCUMENT_TYPE_OPTIONS.map((docType) => {
              const config = localConfigs[docType.value];
              if (!config) return null;
              const isEditing = editingType === docType.value;
              const Icon = docType.icon;

              return (
                <div 
                  key={docType.value}
                  className={`p-4 rounded-lg border transition-all ${isEditing ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{docType.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-gray-800">
                            {generatePreview(config)}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {config.numberingMode === 'alphanumeric' ? 'Alfanumerico' : 'Numerico'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={isEditing ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditingType(isEditing ? null : docType.value)}
                      data-testid={`btn-edit-numbering-${docType.value}`}
                    >
                      {isEditing ? 'Chiudi' : 'Modifica'}
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 space-y-5">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anteprima</p>
                        <p className="text-xl font-mono font-bold text-blue-700 dark:text-blue-300">
                          {generatePreview(config)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</div>
                            <Label className="text-xs font-semibold">Tipo Numerazione</Label>
                          </div>
                          <div className="space-y-2">
                            <div 
                              className={`p-2 rounded border cursor-pointer transition-all ${config.numberingMode === 'numeric' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                              onClick={() => handleConfigChange(docType.value, 'numberingMode', 'numeric')}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 ${config.numberingMode === 'numeric' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                <span className="text-xs font-medium">Solo numeri</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-5">Es: 001, 002, 003...</p>
                            </div>
                            <div 
                              className={`p-2 rounded border cursor-pointer transition-all ${config.numberingMode === 'alphanumeric' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                              onClick={() => handleConfigChange(docType.value, 'numberingMode', 'alphanumeric')}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 ${config.numberingMode === 'alphanumeric' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                <span className="text-xs font-medium">Numeri + Lettere</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-5">Es: 001A, 001B... 002A</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                            <Label className="text-xs font-semibold">Valori Iniziali</Label>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-[10px] text-gray-500">Inizia dal numero</Label>
                              <Input
                                type="number"
                                min={1}
                                value={config.startNumber}
                                onChange={(e) => handleConfigChange(docType.value, 'startNumber', parseInt(e.target.value) || 1)}
                                className="h-8 text-sm mt-1"
                                data-testid={`input-start-number-${docType.value}`}
                              />
                            </div>
                            {config.numberingMode === 'alphanumeric' && (
                              <div>
                                <Label className="text-[10px] text-gray-500">Inizia dalla lettera</Label>
                                <Select
                                  value={config.startLetter}
                                  onValueChange={(val) => handleConfigChange(docType.value, 'startLetter', val)}
                                >
                                  <SelectTrigger className="h-8 text-sm mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LETTERS.map(letter => (
                                      <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label className="text-[10px] text-gray-500">Cifre (padding)</Label>
                              <Select
                                value={String(config.paddingLength)}
                                onValueChange={(val) => handleConfigChange(docType.value, 'paddingLength', parseInt(val))}
                              >
                                <SelectTrigger className="h-8 text-sm mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2">2 cifre (01)</SelectItem>
                                  <SelectItem value="3">3 cifre (001)</SelectItem>
                                  <SelectItem value="4">4 cifre (0001)</SelectItem>
                                  <SelectItem value="5">5 cifre (00001)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</div>
                            <Label className="text-xs font-semibold">Data Automatica</Label>
                          </div>
                          <div className="space-y-2">
                            {[
                              { value: 'none', label: 'Nessuna data', example: '' },
                              { value: 'day', label: 'Solo giorno', example: '28' },
                              { value: 'day_month', label: 'Giorno/Mese', example: '28/12' },
                              { value: 'day_month_year', label: 'Giorno/Mese/Anno', example: '28/12/2025' },
                            ].map(opt => (
                              <div 
                                key={opt.value}
                                className={`p-2 rounded border cursor-pointer transition-all ${config.dateFormat === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                onClick={() => handleConfigChange(docType.value, 'dateFormat', opt.value)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full border-2 ${config.dateFormat === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                    <span className="text-xs">{opt.label}</span>
                                  </div>
                                  {opt.example && <span className="text-[10px] text-gray-400 font-mono">{opt.example}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[10px] text-gray-500">Prefisso</Label>
                          <Input
                            value={config.prefix}
                            onChange={(e) => handleConfigChange(docType.value, 'prefix', e.target.value.toUpperCase())}
                            placeholder="DDT"
                            className="h-8 text-sm mt-1 font-mono"
                            maxLength={10}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500">Separatore</Label>
                          <Select
                            value={config.separator}
                            onValueChange={(val) => handleConfigChange(docType.value, 'separator', val)}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">Trattino (-)</SelectItem>
                              <SelectItem value="/">Barra (/)</SelectItem>
                              <SelectItem value=".">Punto (.)</SelectItem>
                              <SelectItem value="_">Underscore (_)</SelectItem>
                              <SelectItem value="none">Nessuno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2 h-8">
                            <Switch
                              checked={config.resetAnnually}
                              onCheckedChange={(checked) => handleConfigChange(docType.value, 'resetAnnually', checked)}
                            />
                            <Label className="text-xs">Reset annuale</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingType(null)}>
                          Annulla
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => saveNumberingMutation.mutate(config)}
                          disabled={saveNumberingMutation.isPending}
                          data-testid={`btn-save-numbering-${docType.value}`}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salva
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            Approvazione Ordini a Fornitore
          </CardTitle>
          <CardDescription>
            Configura regole di approvazione per gli ordini di acquisto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
              <p className="font-medium">Richiedi Approvazione</p>
              <p className="text-sm text-gray-500">Abilita il workflow di approvazione per gli ordini</p>
            </div>
            <Switch
              checked={orderApprovalConfig.requiresApproval}
              onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, requiresApproval: checked }))}
              data-testid="switch-order-approval"
            />
          </div>

          {orderApprovalConfig.requiresApproval && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Soglia Importo (€)</Label>
                <Input
                  type="number"
                  value={orderApprovalConfig.thresholdAmount || ''}
                  onChange={(e) => setOrderApprovalConfig(prev => ({ 
                    ...prev, 
                    thresholdAmount: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="Nessun limite"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Approvazione solo sopra questa soglia</p>
              </div>
              <div>
                <Label className="text-xs">Soglia Quantità</Label>
                <Input
                  type="number"
                  value={orderApprovalConfig.thresholdQuantity || ''}
                  onChange={(e) => setOrderApprovalConfig(prev => ({ 
                    ...prev, 
                    thresholdQuantity: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="Nessun limite"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Approvazione sopra N pezzi totali</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={orderApprovalConfig.notifyOnCreate}
                onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, notifyOnCreate: checked }))}
              />
              <Label className="text-sm">Notifica alla creazione</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={orderApprovalConfig.notifyOnApproval}
                onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, notifyOnApproval: checked }))}
              />
              <Label className="text-sm">Notifica all'approvazione</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => saveApprovalMutation.mutate(orderApprovalConfig)}
              disabled={saveApprovalMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Salva Configurazione
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface QuotaEntity {
  type: 'user' | 'team';
  id: string;
  name: string;
  email?: string;
  isActive: boolean;
  quotaBytes: number;
  usedBytes: number;
  hasCustomQuota: boolean;
  suspended: boolean;
}

interface QuotaSummary {
  users: QuotaEntity[];
  teams: QuotaEntity[];
  defaults: {
    userQuotaBytes: number;
    teamQuotaBytes: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function bytesToGB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100;
}

function gbToBytes(gb: number): number {
  return Math.round(gb * 1024 * 1024 * 1024);
}

interface TenantStorageAllocation {
  id: string;
  tenantId: string;
  quotaBytes: number;
  usedBytes: number;
  objectCount: number;
  alertThresholdPercent: number;
  suspended: boolean;
  suspendReason: string | null;
}

interface StorageFile {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  versions?: number;
}

interface BrandAsset {
  id: string;
  name: string;
  description: string | null;
  category: string;
  s3Key: string;
  fileType: string;
  sizeBytes: number;
  pushToAllTenants: boolean;
  createdAt: string;
}

function StorageQuotaManager({ tenantSlug }: { tenantSlug: string }) {
  const { toast } = useToast();
  const [activeStorageTab, setActiveStorageTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<QuotaEntity | null>(null);
  const [editQuotaGB, setEditQuotaGB] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'team'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: quotaSummary, isLoading, refetch } = useQuery<QuotaSummary>({
    queryKey: ['/api/storage/quotas/summary'],
  });

  const { data: tenantAllocation, isLoading: isLoadingAllocation } = useQuery<TenantStorageAllocation>({
    queryKey: ['/api/storage/tenant-allocation'],
  });

  const { data: recentFiles, isLoading: isLoadingFiles } = useQuery<StorageFile[]>({
    queryKey: ['/api/storage/files/recent'],
  });

  const { data: brandAssets, isLoading: isLoadingAssets } = useQuery<BrandAsset[]>({
    queryKey: ['/api/storage/brand-assets'],
  });

  const updateUserQuotaMutation = useMutation({
    mutationFn: async ({ userId, quotaBytes, suspended }: { userId: string; quotaBytes?: number; suspended?: boolean }) => {
      return apiRequest('PATCH', `/api/storage/quotas/user/${userId}`, { quotaBytes, suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/quotas/summary'] });
      toast({ title: 'Quota aggiornata', description: 'La quota utente è stata modificata con successo.' });
      setEditModalOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    }
  });

  const updateTeamQuotaMutation = useMutation({
    mutationFn: async ({ teamId, quotaBytes, suspended }: { teamId: string; quotaBytes?: number; suspended?: boolean }) => {
      return apiRequest('PATCH', `/api/storage/quotas/team/${teamId}`, { quotaBytes, suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/quotas/summary'] });
      toast({ title: 'Quota aggiornata', description: 'La quota team è stata modificata con successo.' });
      setEditModalOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    }
  });

  const handleEditQuota = (entity: QuotaEntity) => {
    setSelectedEntity(entity);
    setEditQuotaGB(bytesToGB(entity.quotaBytes).toString());
    setEditModalOpen(true);
  };

  const handleSaveQuota = () => {
    if (!selectedEntity) return;
    const parsedValue = parseFloat(editQuotaGB);
    if (isNaN(parsedValue) || parsedValue < 0) {
      toast({ title: 'Errore', description: 'Inserisci un valore valido per la quota', variant: 'destructive' });
      return;
    }
    const quotaBytes = gbToBytes(parsedValue);
    
    if (selectedEntity.type === 'user') {
      updateUserQuotaMutation.mutate({ userId: selectedEntity.id, quotaBytes });
    } else {
      updateTeamQuotaMutation.mutate({ teamId: selectedEntity.id, quotaBytes });
    }
  };

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      return apiRequest('PATCH', `/api/storage/quotas/user/${userId}`, { suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/quotas/summary'] });
      toast({ title: 'Stato aggiornato', description: 'Lo stato dell\'accesso è stato modificato.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    }
  });

  const suspendTeamMutation = useMutation({
    mutationFn: async ({ teamId, suspended }: { teamId: string; suspended: boolean }) => {
      return apiRequest('PATCH', `/api/storage/quotas/team/${teamId}`, { suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/quotas/summary'] });
      toast({ title: 'Stato aggiornato', description: 'Lo stato dell\'accesso è stato modificato.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    }
  });

  const handleToggleSuspend = (entity: QuotaEntity) => {
    if (entity.type === 'user') {
      suspendUserMutation.mutate({ userId: entity.id, suspended: !entity.suspended });
    } else {
      suspendTeamMutation.mutate({ teamId: entity.id, suspended: !entity.suspended });
    }
  };

  const allEntities = [
    ...(quotaSummary?.users || []),
    ...(quotaSummary?.teams || [])
  ].filter(entity => {
    if (filterType !== 'all' && entity.type !== filterType) return false;
    if (searchTerm) {
      return entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (entity.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tenantUsagePercent = tenantAllocation && tenantAllocation.quotaBytes > 0 
    ? Math.round((tenantAllocation.usedBytes / tenantAllocation.quotaBytes) * 100) 
    : 0;
  const isNearLimit = tenantUsagePercent >= (tenantAllocation?.alertThresholdPercent || 80);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-teal-600" />
            Gestione Storage
          </CardTitle>
          <CardDescription>Quota tenant, gestione utenti/team, file e asset condivisi</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeStorageTab} onValueChange={setActiveStorageTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="storage-tab-overview">
                <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="quotas" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="storage-tab-quotas">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Quote</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="storage-tab-files">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">File</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="storage-tab-assets">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Brand Assets</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {isLoadingAllocation ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-4 w-32 mt-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-blue-500" />
                      Quota Tenant
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatBytes(tenantAllocation?.quotaBytes || 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Assegnato dal Brand</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-green-500" />
                      Spazio Utilizzato
                    </h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatBytes(tenantAllocation?.usedBytes || 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{tenantAllocation?.objectCount || 0} file totali</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <HardDrive className={`w-4 h-4 ${isNearLimit ? 'text-amber-500' : 'text-teal-500'}`} />
                      Utilizzo %
                    </h4>
                    <p className={`text-2xl font-bold ${isNearLimit ? 'text-amber-600' : 'text-teal-600'}`}>
                      {tenantUsagePercent}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Alert a {tenantAllocation?.alertThresholdPercent || 80}%</p>
                  </div>
                </div>
              )}

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Utilizzo Storage Tenant</h4>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-teal-500'}`}
                    style={{ width: `${Math.min(tenantUsagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>{formatBytes(tenantAllocation?.usedBytes || 0)} usato</span>
                  <span>{formatBytes((tenantAllocation?.quotaBytes || 0) - (tenantAllocation?.usedBytes || 0))} disponibile</span>
                </div>
              </div>

              {tenantAllocation?.suspended && (
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900 dark:text-red-100">Storage Sospeso</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        L'accesso allo storage è stato sospeso. {tenantAllocation.suspendReason || 'Contatta l\'amministratore.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isNearLimit && !tenantAllocation?.suspended && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 dark:text-amber-100">Quota Quasi Esaurita</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Hai utilizzato il {tenantUsagePercent}% della quota disponibile. Considera di liberare spazio o richiedere un aumento della quota.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Quota Utente Default
                  </h4>
                  <p className="text-2xl font-bold text-teal-600">
                    {formatBytes(quotaSummary?.defaults.userQuotaBytes || 1073741824)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Spazio assegnato a ogni nuovo utente</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Quota Team Default
                  </h4>
                  <p className="text-2xl font-bold text-teal-600">
                    {formatBytes(quotaSummary?.defaults.teamQuotaBytes || 10737418240)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Spazio condiviso per ogni team</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quotas" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Gestione Quote Personalizzate</h4>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Cerca utente o team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search-quota"
                  />
                  <Select value={filterType} onValueChange={(v: 'all' | 'user' | 'team') => setFilterType(v)}>
                    <SelectTrigger className="w-32" data-testid="select-filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="user">Utenti</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quota</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizzo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {allEntities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {searchTerm ? 'Nessun risultato trovato' : 'Nessun utente o team presente'}
                        </td>
                      </tr>
                    ) : (
                      allEntities.map((entity) => {
                        const usagePercent = entity.quotaBytes > 0 ? Math.min((entity.usedBytes / entity.quotaBytes) * 100, 100) : 0;
                        return (
                          <tr key={`${entity.type}-${entity.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-quota-${entity.type}-${entity.id}`}>
                            <td className="px-4 py-3">
                              <Badge variant={entity.type === 'user' ? 'default' : 'secondary'}>
                                {entity.type === 'user' ? 'Utente' : 'Team'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{entity.name}</p>
                                {entity.email && <p className="text-sm text-gray-500">{entity.email}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={entity.hasCustomQuota ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                                {formatBytes(entity.quotaBytes)}
                                {entity.hasCustomQuota && <span className="ml-1 text-xs">(custom)</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-teal-500'}`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {formatBytes(entity.usedBytes)} ({usagePercent.toFixed(0)}%)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {entity.suspended ? (
                              <Badge variant="destructive">Sospeso</Badge>
                            ) : entity.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">Attivo</Badge>
                            ) : (
                              <Badge variant="secondary">Inattivo</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEditQuota(entity)}
                                      data-testid={`btn-edit-quota-${entity.type}-${entity.id}`}
                                    >
                                      <Settings className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Modifica quota</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleToggleSuspend(entity)}
                                      data-testid={`btn-suspend-${entity.type}-${entity.id}`}
                                    >
                                      {entity.suspended ? (
                                        <RotateCcw className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <RotateCw className="w-4 h-4 text-red-600" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{entity.suspended ? 'Riattiva accesso' : 'Sospendi accesso'}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">File Recenti</h4>
                <Badge variant="secondary">{recentFiles?.length || 0} file</Badge>
              </div>

              {isLoadingFiles ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg flex items-center gap-4">
                      <Skeleton className="w-8 h-8 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (!recentFiles || recentFiles.length === 0) ? (
                <div className="text-center py-12 border rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Nessun file caricato</p>
                  <p className="text-sm text-gray-400">I file caricati appariranno qui</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensione</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caricato da</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {recentFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`file-row-${file.id}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                              {file.versions && file.versions > 1 && (
                                <Badge variant="outline" className="text-xs">v{file.versions}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{file.mimeType}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatBytes(file.sizeBytes)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{file.uploadedBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(file.createdAt).toLocaleDateString('it-IT')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Gestione File</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      I file sono archiviati su AWS S3 con versioning abilitato. Per gestire i file, usa la sezione My Drive nelle rispettive applicazioni.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assets" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Asset dal Brand</h4>
                <Badge variant="secondary">{brandAssets?.length || 0} asset</Badge>
              </div>

              {isLoadingAssets ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16 mt-3" />
                    </div>
                  ))}
                </div>
              ) : (!brandAssets || brandAssets.length === 0) ? (
                <div className="text-center py-12 border rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Nessun asset condiviso</p>
                  <p className="text-sm text-gray-400">Gli asset pushati dal Brand appariranno qui</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {brandAssets.map((asset) => (
                    <div key={asset.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow" data-testid={`asset-card-${asset.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 dark:text-white truncate">{asset.name}</h5>
                          <p className="text-sm text-gray-500 truncate">{asset.description || 'Nessuna descrizione'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <Badge variant="outline">{asset.category}</Badge>
                        <span>{formatBytes(asset.sizeBytes)}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Aggiunto il {new Date(asset.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Asset Brand (Solo Lettura)</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      Questi asset sono gestiti centralmente dal Brand e condivisi con tutti i tenant. Non possono essere modificati o eliminati.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editModalOpen && selectedEntity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Modifica Quota Storage</h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedEntity.type === 'user' ? 'default' : 'secondary'}>
                    {selectedEntity.type === 'user' ? 'Utente' : 'Team'}
                  </Badge>
                  <span className="font-medium">{selectedEntity.name}</span>
                </div>
                {selectedEntity.email && <p className="text-sm text-gray-500 mt-1">{selectedEntity.email}</p>}
              </div>
              
              <div>
                <Label className="text-sm font-medium">Quota (GB)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editQuotaGB}
                    onChange={(e) => setEditQuotaGB(e.target.value)}
                    className="flex-1"
                    data-testid="input-edit-quota-gb"
                  />
                  <span className="text-sm text-gray-500">GB</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Attuale: {formatBytes(selectedEntity.quotaBytes)} | Usato: {formatBytes(selectedEntity.usedBytes)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditModalOpen(false)} data-testid="btn-cancel-quota">
                  Annulla
                </Button>
                <Button 
                  onClick={handleSaveQuota} 
                  disabled={updateUserQuotaMutation.isPending || updateTeamQuotaMutation.isPending}
                  data-testid="btn-save-quota"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SystemConfigPage() {
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const [activeTab, setActiveTab] = useState('wms');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurazione Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Impostazioni avanzate per moduli e integrazioni</p>
      </div>
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="wms" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-wms"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">WMS</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-sales"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
            <TabsTrigger 
              value="voip" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-voip"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">VoIP</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hr" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-hr"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">HR</span>
            </TabsTrigger>
            <TabsTrigger 
              value="crm" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-crm"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">CRM</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
            <TabsTrigger 
              value="storage" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-storage"
            >
              <HardDrive className="w-4 h-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  Configurazione WMS
                </CardTitle>
                <CardDescription>Gestione movimenti, azioni e approvazioni magazzino</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Workflow className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Action Management Centralizzato</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Le azioni WMS (movimenti, approvazioni, workflow) sono ora gestite centralmente nella sezione Action Management insieme a tutte le altre azioni del sistema.
                      </p>
                      <a 
                        href={`/${tenantSlug}/settings/actions`}
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                        data-testid="link-action-management-wms"
                      >
                        <Workflow className="w-4 h-4" />
                        Vai ad Action Management
                      </a>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <WMSDocumentNumberingSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  Configurazione Sales
                </CardTitle>
                <CardDescription>Impostazioni POS, scontrini, pagamenti e promozioni</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione Sales in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voip" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-600" />
                  Configurazione VoIP
                </CardTitle>
                <CardDescription>Impostazioni telefonia WebRTC e SIP</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione VoIP disponibile nella sezione Canali delle Impostazioni.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hr" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Configurazione HR
                </CardTitle>
                <CardDescription>Impostazioni risorse umane e gestione personale</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione HR in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crm" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Configurazione CRM
                </CardTitle>
                <CardDescription>Impostazioni pipeline, lead e campagne</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione CRM in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  Configurazione Notifiche
                </CardTitle>
                <CardDescription>Canali, preferenze e regole di notifica</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione notifiche in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage" className="mt-6">
            <StorageQuotaManager tenantSlug={tenantSlug} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
