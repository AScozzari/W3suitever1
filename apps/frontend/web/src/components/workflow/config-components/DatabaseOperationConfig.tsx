/**
 * 🗄️ DATABASE OPERATION CONFIG
 * 
 * User-friendly configuration for w3suite database operations
 * - Table dropdown with metadata from API
 * - Operation-specific dynamic forms
 * - Preview query functionality
 * - RLS enforcement visibility
 */

import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, AlertCircle, Eye, Shield, Plus, Trash2, Check } from 'lucide-react';

interface DatabaseOperationConfigProps {
  node: Node;
  allNodes: Node[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

interface TableMetadata {
  table: string;
  tableType: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    default: string | null;
  }[];
}

interface DatabaseMetadata {
  schema: string;
  tables: TableMetadata[];
}

interface FilterCondition {
  column: string;
  operator: string;
  value: any;
}

const OPERATORS = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (≠)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (≥)' },
  { value: '<=', label: 'Less or Equal (≤)' },
  { value: 'LIKE', label: 'Like (%)' },
  { value: 'IN', label: 'In (...)' },
  { value: 'IS NULL', label: 'Is NULL' },
  { value: 'IS NOT NULL', label: 'Is Not NULL' },
];

export default function DatabaseOperationConfig({ 
  node,
  allNodes,
  onSave,
  onClose 
}: DatabaseOperationConfigProps) {
  const initialConfig = node.data.config || {};
  
  // Clean the initial config to remove invalid values like 'white'
  const cleanedInitialTable = initialConfig.table === 'white' ? '' : (initialConfig.table || '');
  
  const [operation, setOperation] = useState<string>(initialConfig.operation || 'SELECT');
  // Start with cleaned value, never use 'white'
  const [table, setTable] = useState<string>(cleanedInitialTable);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialConfig.columns || []);
  const [filters, setFilters] = useState<FilterCondition[]>(initialConfig.filters || []);
  const [values, setValues] = useState<Record<string, any>>(initialConfig.values || {});
  const [limit, setLimit] = useState<number>(initialConfig.limit || 100);
  const [query, setQuery] = useState<string>(initialConfig.query || '');
  const [params, setParams] = useState<any[]>(initialConfig.params || []);
  const [readOnly, setReadOnly] = useState<boolean>(initialConfig.readOnly || false);
  const [saved, setSaved] = useState(false);
  const [previewResults, setPreviewResults] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch database metadata
  const { data: metadata, isLoading } = useQuery<{ data: DatabaseMetadata }>({
    queryKey: ['/api/workflows/data-sources/metadata'],
    enabled: true,
  });

  const tables = metadata?.data?.tables || [];
  const currentTable = tables.find(t => t.table === table);
  const columns = currentTable?.columns || [];

  // Check if this is a legacy EXECUTE_QUERY config
  const isLegacyConfig = initialConfig.operation === 'EXECUTE_QUERY';

  // Initialize table value only if it's valid when metadata loads
  useEffect(() => {
    if (tables.length > 0 && cleanedInitialTable) {
      // Only set if the cleaned initial table exists in metadata
      if (tables.find(t => t.table === cleanedInitialTable)) {
        setTable(cleanedInitialTable);
      } else {
        // Invalid saved table, clear it
        console.warn(`[DatabaseOperation] Invalid saved table "${cleanedInitialTable}" detected, clearing...`);
        setTable('');
      }
    }
  }, [tables.length]); // Only run when tables load, not on every table change

  // Handle preview
  const handlePreview = async () => {
    if (!table) {
      setPreviewError('Please select a table first');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResults(null);

    try {
      // Clean filters: only include complete filters with column, operator, and value
      const validFilters = filters.filter(f => 
        f.column && 
        f.operator && 
        (f.value !== undefined && f.value !== null && f.value !== '' || f.operator.startsWith('IS'))
      );

      // Build preview config (always SELECT with limit 5 for preview)
      const previewConfig: any = {
        operation: 'SELECT',
        table,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        filters: validFilters.length > 0 ? validFilters : undefined,
        limit: 5, // Preview limited to 5 rows
      };

      const response = await apiRequest('/api/workflows/data-sources/execute-db-operation', {
        method: 'POST',
        data: previewConfig,
      });

      setPreviewResults(response);
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to fetch preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle save
  const handleSave = () => {
    const config: any = {
      operation,
      table,
    };

    if (operation === 'SELECT') {
      config.columns = selectedColumns.length > 0 ? selectedColumns : undefined;
      config.filters = filters.length > 0 ? filters : undefined;
      config.limit = limit;
    } else if (operation === 'INSERT') {
      config.values = values;
      config.returnId = true;
    } else if (operation === 'UPDATE') {
      config.values = values;
      config.filters = filters;
    } else if (operation === 'DELETE') {
      config.filters = filters;
      config.requireConfirmation = true;
    } else if (operation === 'EXECUTE_QUERY') {
      config.query = query;
      config.params = params;
      config.readOnly = readOnly;
    }

    onSave(node.id, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Add filter
  const addFilter = () => {
    setFilters([...filters, { column: '', operator: '=', value: '' }]);
  };

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Update filter
  const updateFilter = (index: number, field: keyof FilterCondition, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  // Toggle column selection
  const toggleColumn = (columnName: string) => {
    if (selectedColumns.includes(columnName)) {
      setSelectedColumns(selectedColumns.filter(c => c !== columnName));
    } else {
      setSelectedColumns([...selectedColumns, columnName]);
    }
  };

  return (
    <div className="space-y-4">
      {/* RLS Security Badge */}
      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-sm text-green-800">
          <strong>RLS Enforcement Active:</strong> All queries are automatically filtered by your tenant context. You can only access your tenant's data.
        </AlertDescription>
      </Alert>

      {/* Legacy EXECUTE_QUERY Warning */}
      {isLegacyConfig && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm text-orange-800">
            <strong>⚠️  Configuration Update Required:</strong> EXECUTE_QUERY operation is no longer supported for security reasons. Please reconfigure this node using one of the 4 structured operations (SELECT, INSERT, UPDATE, DELETE).
          </AlertDescription>
        </Alert>
      )}

      {/* Operation Selector */}
      <div className="space-y-2">
        <Label htmlFor="operation" className="text-sm font-medium">
          Operation *
        </Label>
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger id="operation" data-testid="select-operation">
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SELECT">SELECT (Read Data)</SelectItem>
            <SelectItem value="INSERT">INSERT (Create Records)</SelectItem>
            <SelectItem value="UPDATE">UPDATE (Modify Records)</SelectItem>
            <SelectItem value="DELETE">DELETE (Remove Records)</SelectItem>
            {/* EXECUTE_QUERY disabled for MVP - security review required */}
          </SelectContent>
        </Select>
      </div>

      {/* Table Selector (for all except EXECUTE_QUERY) */}
      {operation !== 'EXECUTE_QUERY' && (
        <div className="space-y-2">
          <Label htmlFor="table" className="text-sm font-medium flex items-center gap-2">
            Table *
            <Badge variant="outline" className="font-mono text-xs">w3suite</Badge>
          </Label>
          <Select 
            value={table} 
            onValueChange={(newValue) => {
              // Only set valid table names
              if (tables.find(t => t.table === newValue)) {
                setTable(newValue);
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger id="table" data-testid="select-table">
              <SelectValue>
                {table && tables.find(t => t.table === table) 
                  ? table 
                  : (isLoading ? "Loading tables..." : "Select table")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[300px]">
                {tables.map((t) => (
                  <SelectItem key={t.table} value={t.table}>
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      <span>{t.table}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{t.tableType}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* SELECT specific UI */}
      {operation === 'SELECT' && table && (
        <>
          {/* Column Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Select Columns <span className="text-xs text-gray-500">(leave empty for *)</span>
            </Label>
            <ScrollArea className="h-[150px] border rounded-md p-3 bg-white/70">
              <div className="space-y-2">
                {columns.map((col) => (
                  <div key={col.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.name}`}
                      checked={selectedColumns.includes(col.name)}
                      onCheckedChange={() => toggleColumn(col.name)}
                    />
                    <Label htmlFor={`col-${col.name}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-mono">{col.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{col.type}</Badge>
                      {!col.nullable && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filters (WHERE)</Label>
              <Button size="sm" variant="outline" onClick={addFilter} data-testid="btn-add-filter">
                <Plus className="h-3 w-3 mr-1" /> Add Filter
              </Button>
            </div>
            {filters.map((filter, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-white/70">
                <Select value={filter.column} onValueChange={(v) => updateFilter(index, 'column', v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!['IS NULL', 'IS NOT NULL'].includes(filter.operator) && (
                  <Input 
                    value={filter.value || ''} 
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Value or {{ $input.field }}"
                    className="flex-1 font-mono text-sm"
                  />
                )}
                <Button size="sm" variant="ghost" onClick={() => removeFilter(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          {/* Limit */}
          <div className="space-y-2">
            <Label htmlFor="limit" className="text-sm font-medium">Limit Records</Label>
            <Input 
              id="limit"
              type="number" 
              value={limit} 
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              min={1}
              max={1000}
            />
          </div>
        </>
      )}

      {/* INSERT/UPDATE specific UI */}
      {(operation === 'INSERT' || operation === 'UPDATE') && table && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {operation === 'INSERT' ? 'Values to Insert' : 'Values to Set'}
          </Label>
          <div className="space-y-2 p-3 border rounded-md bg-white/70">
            {columns.map((col) => (
              <div key={col.name} className="flex items-center gap-2">
                <Label className="w-[150px] text-sm font-mono">{col.name}</Label>
                <Input 
                  value={values[col.name] || ''} 
                  onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
                  placeholder={`{{ $input.${col.name} }}`}
                  className="flex-1 font-mono text-sm"
                />
                {!col.nullable && <span className="text-red-500">*</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPDATE/DELETE WHERE clause */}
      {(operation === 'UPDATE' || operation === 'DELETE') && table && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-red-600">
              ⚠️ WHERE Conditions (Required for safety)
            </Label>
            <Button size="sm" variant="outline" onClick={addFilter}>
              <Plus className="h-3 w-3 mr-1" /> Add Condition
            </Button>
          </div>
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-red-50">
              <Select value={filter.column} onValueChange={(v) => updateFilter(index, 'column', v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.filter(op => !op.value.startsWith('IS')).map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                value={filter.value || ''} 
                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                placeholder="Value or {{ $input.field }}"
                className="flex-1 font-mono text-sm"
              />
              <Button size="sm" variant="ghost" onClick={() => removeFilter(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* EXECUTE_QUERY specific UI */}
      {operation === 'EXECUTE_QUERY' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="query" className="text-sm font-medium">
              SQL Query *
              <Badge variant="outline" className="ml-2">Must reference w3suite schema</Badge>
            </Label>
            <Textarea 
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM w3suite.users WHERE id = $1 LIMIT 10"
              className="font-mono text-sm min-h-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="readonly" checked={readOnly} onCheckedChange={(checked) => setReadOnly(!!checked)} />
            <Label htmlFor="readonly" className="text-sm cursor-pointer">
              Read-only mode (reject INSERT/UPDATE/DELETE)
            </Label>
          </div>
        </>
      )}

      {/* Preview Results Section */}
      {(operation === 'SELECT' && table) && (
        <div className="space-y-2">
          <Button 
            onClick={handlePreview} 
            variant="outline" 
            disabled={previewLoading}
            className="w-full"
            data-testid="btn-preview-query"
          >
            {previewLoading ? (
              <>Loading...</>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" /> Preview (5 rows)
              </>
            )}
          </Button>

          {previewError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">
                {previewError}
              </AlertDescription>
            </Alert>
          )}

          {previewResults && (
            <Card className="p-4 bg-slate-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">Preview Results</div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {previewResults.data?.rowCount || 0} rows
                  </Badge>
                </div>
                
                {/* Tenant ID transparency */}
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded border">
                  <Shield className="h-3 w-3" />
                  <span>Tenant Context: <code className="font-mono bg-slate-100 px-1 rounded">{previewResults.data?.data?.[0]?.tenant_id || 'RLS Active'}</code></span>
                </div>

                {/* Results table */}
                <ScrollArea className="h-[200px] border rounded bg-white">
                  <div className="p-2">
                    {previewResults.data?.data && previewResults.data.data.length > 0 ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(previewResults.data.data, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-sm text-slate-500 text-center py-8">
                        No data found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button onClick={handleSave} className="flex-1" data-testid="btn-save-config">
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" /> Saved!
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" /> Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
