import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from './InfoTooltip';
import { AlertCircle, Sparkles, Globe, Settings, X, RefreshCw } from 'lucide-react';
import { getMCPNodeById } from '@/lib/mcp-node-definitions';
import { z } from 'zod';

interface ConnectedAccount {
  id: string;
  accountName: string;
  instagramAccountId: string | null;
  instagramAccountName: string | null;
}

interface MCPNodeConfigModalProps {
  node: Node;
  onSave: (nodeId: string, config: any) => void;
  onClose: () => void;
}

/**
 * 🔌 MCP Node Configuration Modal
 * 
 * Componente generico che genera dinamicamente form di configurazione
 * per tutti i nodi MCP (OUTBOUND + INBOUND) basandosi su Zod schemas
 */
export default function MCPNodeConfigModal({ node, onSave, onClose }: MCPNodeConfigModalProps) {
  const nodeId = String(node.data.id);
  const mcpDefinition = getMCPNodeById(nodeId);
  
  if (!mcpDefinition) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Nodo MCP non trovato</p>
              <p className="text-xs text-red-700 mt-1">
                ID nodo: {nodeId} - Definizione mancante in mcp-node-definitions.ts
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    );
  }

  const config = (node.data.config || {}) as any;
  const [formData, setFormData] = useState(config.parameters || mcpDefinition.defaultConfig);
  const [error, setError] = useState('');
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const hasJsonErrors = Object.values(jsonErrors).some(err => err !== '');

  const handleSave = useCallback(() => {
    // Blocca save se ci sono errori JSON
    if (hasJsonErrors) {
      setError('Correggi gli errori JSON prima di salvare');
      return;
    }

    try {
      // Validazione con Zod schema
      mcpDefinition.configSchema.parse(formData);
      
      onSave(node.id, {
        ecosystem: mcpDefinition.ecosystem,
        nodeType: nodeId,
        parameters: formData
      });
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      } else {
        setError('Errore di validazione');
      }
    }
  }, [formData, mcpDefinition, node.id, nodeId, onSave, onClose, hasJsonErrors]);

  return (
    <div className="space-y-6">
      {/* Header con Ecosystem Badge */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-xs font-mono px-2 py-1 ${getEcosystemColor(mcpDefinition.ecosystem)}`}>
              {getEcosystemLabel(mcpDefinition.ecosystem)}
            </Badge>
            <Badge variant="outline" className="text-xs bg-gray-100">
              {mcpDefinition.category === 'mcp-outbound' ? 'OUTBOUND Action' : 'INBOUND Trigger'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{mcpDefinition.description}</p>
        </div>
      </div>

      {/* Credentials Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              Credenziali {getEcosystemLabel(mcpDefinition.ecosystem)}
            </p>
            <p className="text-xs text-blue-700">
              {mcpDefinition.category === 'mcp-outbound' 
                ? `Assicurati di aver configurato le credenziali ${getEcosystemLabel(mcpDefinition.ecosystem)} nella tab Impostazioni MCP prima di salvare questo nodo.`
                : `Webhook URL sarà generato automaticamente dopo il salvataggio. Configuralo nel provider ${getEcosystemLabel(mcpDefinition.ecosystem)}.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Form Fields */}
      <DynamicFormFields 
        schema={mcpDefinition.configSchema}
        formData={formData}
        setFormData={setFormData}
        nodeId={nodeId}
        ecosystem={mcpDefinition.ecosystem}
        jsonErrors={jsonErrors}
        setJsonErrors={setJsonErrors}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-mcp-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-mcp-config"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔧 Dynamic Form Fields Generator
 * Genera campi form in base al tipo di schema Zod
 */
interface DynamicFormFieldsProps {
  schema: z.ZodSchema<any>;
  formData: any;
  setFormData: (data: any) => void;
  nodeId: string;
  ecosystem?: string;
  jsonErrors: Record<string, string>;
  setJsonErrors: (errors: Record<string, string>) => void;
}

function DynamicFormFields({ schema, formData, setFormData, nodeId, ecosystem, jsonErrors, setJsonErrors }: DynamicFormFieldsProps) {
  if (!(schema instanceof z.ZodObject)) {
    return null;
  }

  const shape = schema._def.shape();
  const fields = Object.keys(shape);

  const updateField = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map(fieldName => {
        const fieldSchema = shape[fieldName];
        const value = formData[fieldName] ?? '';

        return (
          <div key={fieldName}>
            {renderFieldByType(fieldName, fieldSchema, value, updateField, nodeId, ecosystem, jsonErrors, setJsonErrors)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 📷 Instagram Account Dropdown Component
 * Loads connected Instagram accounts dynamically and shows friendly names
 */
function InstagramAccountDropdown({ 
  value, 
  updateField, 
  isRequired 
}: {
  value: any;
  updateField: (name: string, value: any) => void;
  isRequired: boolean;
}) {
  // Fetch Meta server to get connected accounts
  const { data: servers, isLoading: serversLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/mcp/servers'],
  });
  
  const metaServer = servers?.find(s => s.name === 'meta-instagram');
  
  const { data: accountsData, isLoading: accountsLoading } = useQuery<{ success: boolean; accounts: ConnectedAccount[] }>({
    queryKey: ['/api/mcp/credentials/connected-accounts', metaServer?.id],
    enabled: !!metaServer,
  });

  // ✅ CRITICAL: Filter to only valid Instagram Business accounts (ignore Facebook-only pages)
  const accounts = (accountsData?.accounts || []).filter(acc => acc.instagramAccountId);
  
  const isLoading = serversLoading || accountsLoading;

  // Auto-select if only 1 account available
  React.useEffect(() => {
    if (accounts.length === 1 && !value && accounts[0].instagramAccountId) {
      updateField('instagramAccountId', accounts[0].instagramAccountId);
    }
  }, [accounts, value, updateField]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Caricamento account Instagram...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Nessun account Instagram connesso</p>
            <p className="text-xs text-yellow-700 mt-1">
              Vai nelle Impostazioni MCP → Meta/Instagram e connetti almeno una pagina Facebook con Instagram.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        Account Instagram {isRequired && <span className="text-red-500">*</span>}
      </label>
      <Select 
        value={value || ''} 
        onValueChange={(val) => updateField('instagramAccountId', val)}
      >
        <SelectTrigger data-testid="select-instagram-account">
          <SelectValue placeholder="Seleziona account Instagram..." />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem 
              key={account.id} 
              value={account.instagramAccountId!} // Already filtered for valid instagramAccountId
            >
              <div className="flex items-center gap-2">
                <span>{account.accountName}</span>
                <Badge variant="outline" className="text-xs bg-pink-100 text-pink-800">
                  Instagram
                </Badge>
                {account.instagramAccountName && (
                  <span className="text-xs text-gray-500">(@{account.instagramAccountName})</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">
        {accounts.length === 1 ? '✓ Account selezionato automaticamente' : `${accounts.length} account disponibili`}
      </p>
    </div>
  );
}

/**
 * 🎨 Render field in base al tipo Zod
 */
function renderFieldByType(
  fieldName: string, 
  fieldSchema: z.ZodTypeAny, 
  value: any, 
  updateField: (name: string, value: any) => void,
  nodeId: string,
  ecosystem: string,
  jsonErrors: Record<string, string>,
  setJsonErrors: (errors: Record<string, string>) => void
): React.ReactNode {
  const label = formatFieldLabel(fieldName);
  const isRequired = !fieldSchema.isOptional();

  // 🎯 CUSTOM: Instagram Account Dropdown for Meta nodes
  if (fieldName === 'instagramAccountId' && ecosystem === 'meta') {
    return <InstagramAccountDropdown value={value} updateField={updateField} isRequired={isRequired} />;
  }

  // ZodString
  if (fieldSchema instanceof z.ZodString) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <Input
          value={value}
          onChange={(e) => updateField(fieldName, e.target.value)}
          placeholder={`Inserisci ${label.toLowerCase()}...`}
          data-testid={`input-${fieldName}`}
          className="w-full"
        />
      </div>
    );
  }

  // ZodNumber
  if (fieldSchema instanceof z.ZodNumber) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <Input
          type="number"
          value={value}
          onChange={(e) => updateField(fieldName, Number(e.target.value))}
          placeholder={`Inserisci ${label.toLowerCase()}...`}
          data-testid={`input-${fieldName}`}
          className="w-full"
        />
      </div>
    );
  }

  // ZodBoolean
  if (fieldSchema instanceof z.ZodBoolean) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label className="text-sm font-medium text-gray-900">
          {label}
        </label>
        <Switch
          checked={value}
          onCheckedChange={(checked) => updateField(fieldName, checked)}
          data-testid={`switch-${fieldName}`}
        />
      </div>
    );
  }

  // ZodEnum
  if (fieldSchema instanceof z.ZodEnum) {
    const options = fieldSchema._def.values;
    return (
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <Select value={value} onValueChange={(val) => updateField(fieldName, val)}>
          <SelectTrigger data-testid={`select-${fieldName}`}>
            <SelectValue placeholder={`Seleziona ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: string) => (
              <SelectItem key={option} value={option}>
                {formatEnumValue(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // ZodArray - check for simple vs complex arrays
  if (fieldSchema instanceof z.ZodArray) {
    const arrayValue = Array.isArray(value) ? value : [];
    const elementSchema = fieldSchema._def.type;
    
    // Simple arrays (string/number/boolean) - use simple inputs
    const isSimpleArray = (
      elementSchema instanceof z.ZodString || 
      elementSchema instanceof z.ZodNumber || 
      elementSchema instanceof z.ZodBoolean
    );

    if (isSimpleArray) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            {label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {arrayValue.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newArray = [...arrayValue];
                    newArray[index] = elementSchema instanceof z.ZodNumber ? Number(e.target.value) : e.target.value;
                    updateField(fieldName, newArray);
                  }}
                  type={elementSchema instanceof z.ZodNumber ? 'number' : 'text'}
                  placeholder={`Elemento ${index + 1}...`}
                  data-testid={`input-${fieldName}-${index}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newArray = arrayValue.filter((_, i) => i !== index);
                    updateField(fieldName, newArray);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateField(fieldName, [...arrayValue, elementSchema instanceof z.ZodNumber ? 0 : ''])}
              data-testid={`button-add-${fieldName}`}
            >
              + Aggiungi {label}
            </Button>
          </div>
        </div>
      );
    } else {
      // Complex arrays (objects, nested arrays) - use JSON editor
      return <JSONEditor fieldName={fieldName} label={label} value={value} updateField={updateField} isRequired={isRequired} jsonErrors={jsonErrors} setJsonErrors={setJsonErrors} />;
    }
  }

  // ZodObject - use JSON editor
  if (fieldSchema instanceof z.ZodObject) {
    return <JSONEditor fieldName={fieldName} label={label} value={value} updateField={updateField} isRequired={isRequired} jsonErrors={jsonErrors} setJsonErrors={setJsonErrors} />;
  }

  // ZodRecord - use JSON editor
  if (fieldSchema instanceof z.ZodRecord) {
    return <JSONEditor fieldName={fieldName} label={label} value={value} updateField={updateField} isRequired={isRequired} jsonErrors={jsonErrors} setJsonErrors={setJsonErrors} />;
  }

  // ZodOptional / ZodNullable
  if (fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodNullable) {
    return renderFieldByType(fieldName, fieldSchema.unwrap(), value, updateField, nodeId, ecosystem, jsonErrors, setJsonErrors);
  }

  // Fallback: Text Input
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <Input
        value={value}
        onChange={(e) => updateField(fieldName, e.target.value)}
        placeholder={`Inserisci ${label.toLowerCase()}...`}
        data-testid={`input-${fieldName}`}
      />
    </div>
  );
}

/**
 * 🎨 Helper Functions
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getEcosystemLabel(ecosystem?: string): string {
  const labels: Record<string, string> = {
    google: '[G] Google Workspace',
    aws: '[AWS] Amazon Web Services',
    meta: '[META] Meta/Instagram',
    microsoft: '[MS] Microsoft 365',
    stripe: '[STRIPE] Stripe',
    gtm: '[GTM] Google Analytics'
  };
  return labels[ecosystem || ''] || 'Unknown';
}

function getEcosystemColor(ecosystem?: string): string {
  const colors: Record<string, string> = {
    google: 'bg-green-100 text-green-800 border-green-300',
    aws: 'bg-orange-100 text-orange-800 border-orange-300',
    meta: 'bg-blue-100 text-blue-800 border-blue-300',
    microsoft: 'bg-purple-100 text-purple-800 border-purple-300',
    stripe: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    gtm: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };
  return colors[ecosystem || ''] || 'bg-gray-100 text-gray-800';
}

/**
 * 📝 JSON Editor Component
 * Handles complex types (objects, records, nested arrays) via JSON editing
 */
interface JSONEditorProps {
  fieldName: string;
  label: string;
  value: any;
  updateField: (name: string, value: any) => void;
  isRequired?: boolean;
  jsonErrors: Record<string, string>;
  setJsonErrors: (errors: Record<string, string>) => void;
}

function JSONEditor({ fieldName, label, value, updateField, isRequired, jsonErrors, setJsonErrors }: JSONEditorProps) {
  const [jsonText, setJsonText] = useState(() => {
    try {
      return JSON.stringify(value || {}, null, 2);
    } catch {
      return '{}';
    }
  });

  const jsonError = jsonErrors[fieldName] || '';

  const handleJSONChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      // Clear error for this field
      setJsonErrors({ ...jsonErrors, [fieldName]: '' });
      updateField(fieldName, parsed);
    } catch (err) {
      // Set error for this field
      setJsonErrors({ ...jsonErrors, [fieldName]: (err as Error).message });
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}
        <span className="ml-2 text-xs text-gray-500 font-normal">(JSON)</span>
      </label>
      <textarea
        value={jsonText}
        onChange={(e) => handleJSONChange(e.target.value)}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none font-mono text-sm ${
          jsonError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-windtre-orange bg-white'
        }`}
        rows={8}
        placeholder='{"key": "value"}'
        data-testid={`json-editor-${fieldName}`}
      />
      {jsonError && (
        <p className="text-xs text-red-600 mt-1">❌ JSON non valido: {jsonError}</p>
      )}
      {!jsonError && (
        <p className="text-xs text-green-600 mt-1">✓ JSON valido</p>
      )}
    </div>
  );
}
