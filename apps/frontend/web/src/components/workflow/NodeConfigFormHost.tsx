/**
 * 🎛️ NODE CONFIG FORM HOST
 * 
 * Registry-based configuration renderer:
 * - Checks config registry for custom components
 * - Falls back to JSON editor if no custom component registered
 * - Supports drag & drop for all config types
 */

import { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { AlertCircle, Check, Settings, Target, FileCode2, FormInput } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { DraggedFieldData } from './NodeInspector';
import { getNodeConfigComponent } from './config-registry';
import { getNodeConfigSchema, getNodeDefaultConfig } from '@/lib/get-node-definition';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { CUSTOM_COMPONENT_REGISTRY } from './field-components';

interface NodeConfigFormHostProps {
  node: Node;
  allNodes: Node[];
  edges: Edge[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

/**
 * Droppable Textarea - Riceve campi trascinati dall'Input Panel
 */
interface DroppableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function DroppableTextarea({ value, onChange, className, placeholder }: DroppableTextareaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'config-json-editor',
    data: {
      accept: ['input'] // Accetta drop solo dall'Input panel
    }
  });

  return (
    <div className="relative">
      <Textarea 
        ref={setNodeRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          ${className}
          transition-all duration-200
          ${isOver 
            ? 'ring-4 ring-[#c43e00]/40 border-[#c43e00] bg-[#c43e00]/5 scale-[1.02]' 
            : ''
          }
        `}
        placeholder={placeholder}
        data-testid="droppable-config-json"
      />
      {isOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-[#c43e00]/10 rounded-md border-2 border-dashed border-[#c43e00]">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-[#c43e00] animate-pulse" />
            <span className="text-sm font-semibold text-gray-900">
              Rilascia qui per inserire campo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Smart config renderer - uses registry or falls back to JSON editor
 */
export default function NodeConfigFormHost({ 
  node,
  allNodes,
  edges,
  onSave,
  onClose 
}: NodeConfigFormHostProps) {
  // Check for custom config component in registry
  const CustomConfigComponent = getNodeConfigComponent(node.data.id as string);

  // If custom component exists, render it
  if (CustomConfigComponent) {
    return (
      <CustomConfigComponent
        node={node}
        allNodes={allNodes}
        edges={edges}
        onSave={onSave}
        onClose={onClose}
      />
    );
  }

  // Get node config schema for validation
  const configSchema = getNodeConfigSchema(node.data.id as string);
  const defaultConfig = getNodeDefaultConfig(node.data.id as string);
  const hasConfigSchema = !!configSchema;

  // Tab state
  const [activeTab, setActiveTab] = useState<'form' | 'json'>(hasConfigSchema ? 'form' : 'json');
  
  // JSON editor state (fallback)
  const [configJson, setConfigJson] = useState(() => 
    JSON.stringify(node.data.config || defaultConfig || {}, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state with react-hook-form + zodResolver
  const form = useForm({
    resolver: configSchema ? zodResolver(configSchema) : undefined,
    defaultValues: node.data.config || defaultConfig || {},
  });

  // === CRITICAL FIX: Reset form when node changes ===
  useEffect(() => {
    const newConfig = node.data.config || defaultConfig || {};
    form.reset(newConfig);
    setConfigJson(JSON.stringify(newConfig, null, 2));
    setJsonError(null);
  }, [node.id, node.data.config]); // eslint-disable-line react-hooks/exhaustive-deps

  // === BIDIRECTIONAL SYNC: Form ↔ JSON ===
  
  // Watch form changes and sync to JSON
  useEffect(() => {
    const subscription = form.watch((value) => {
      const formJson = JSON.stringify(value, null, 2);
      if (formJson !== configJson) {
        setConfigJson(formJson);
        setJsonError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, configJson]);

  // Parse JSON changes and sync to form
  const handleJsonChange = (value: string) => {
    setConfigJson(value);
    setSaved(false);
    
    // Try to parse and update form
    try {
      const parsedConfig = JSON.parse(value);
      form.reset(parsedConfig); // Update form with parsed JSON
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON non valido');
    }
  };

  // Handle form submit
  const handleFormSubmit = form.handleSubmit((data) => {
    onSave(node.id, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  // Handle JSON save (bypass form validation)
  const handleJsonSave = () => {
    try {
      const parsedConfig = JSON.parse(configJson);
      onSave(node.id, parsedConfig);
      form.reset(parsedConfig); // Sync form with saved JSON
      setSaved(true);
      setJsonError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON non valido');
    }
  };

  return (
    <div className="space-y-4">
      {/* Node Info */}
      <Card className="p-4 bg-gradient-to-br from-windtre-orange/5 to-windtre-purple/5 border-white/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/70 backdrop-blur-sm">
            <Settings className="h-5 w-5 text-windtre-orange" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {String(node.data.name || node.data.title || node.data.id)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 text-gray-600">
                {String(node.data.category || 'node')}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {node.id}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs: Form View | JSON View */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'form' | 'json')}>
        <TabsList className="grid w-full grid-cols-2 bg-white/70 backdrop-blur-sm">
          <TabsTrigger 
            value="form" 
            disabled={!hasConfigSchema}
            data-testid="tab-form-view"
            className="data-[state=active]:bg-windtre-orange data-[state=active]:text-white"
          >
            <FormInput className="h-4 w-4 mr-2" />
            Form View
          </TabsTrigger>
          <TabsTrigger 
            value="json"
            data-testid="tab-json-view"
            className="data-[state=active]:bg-windtre-purple data-[state=active]:text-white"
          >
            <FileCode2 className="h-4 w-4 mr-2" />
            JSON View
          </TabsTrigger>
        </TabsList>

        {/* FORM VIEW */}
        <TabsContent value="form" className="mt-4">
          {hasConfigSchema && configSchema ? (
            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <DynamicFormRenderer
                  configSchema={configSchema}
                  control={form.control}
                  disabled={false}
                  customComponents={CUSTOM_COMPONENT_REGISTRY as any}
                />
              </form>
            </Form>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                ⚠️ Questo nodo non ha uno schema di configurazione definito. 
                Usa la vista JSON per configurarlo manualmente.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* JSON VIEW */}
        <TabsContent value="json" className="mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              📝 Configurazione JSON
              <span className="text-xs text-gray-500 font-normal">(editabile - trascina campi dall'Input Panel)</span>
            </label>
            <DroppableTextarea 
              value={configJson}
              onChange={handleJsonChange}
              className="font-mono text-xs min-h-[300px] bg-white/70 backdrop-blur-sm border-white/30"
              placeholder="{}"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Alert */}
      {jsonError && activeTab === 'json' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Errore JSON: {jsonError}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {saved && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <Check className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ✅ Configurazione salvata con successo
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-testid="button-cancel-config"
        >
          Annulla
        </Button>
        <Button
          onClick={activeTab === 'form' ? handleFormSubmit : handleJsonSave}
          size="default"
          className="bg-[#c43e00] hover:bg-[#a33500] text-white font-semibold shadow-md"
          disabled={activeTab === 'json' && !!jsonError}
          data-testid="button-save-config"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}
