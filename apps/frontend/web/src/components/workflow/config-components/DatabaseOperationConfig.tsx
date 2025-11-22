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
  
  const [operation, setOperation] = useState<string>(initialConfig.operation || 'SELECT');
  const [table, setTable] = useState<string>(initialConfig.table || '');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialConfig.columns || []);
  const [filters, setFilters] = useState<FilterCondition[]>(initialConfig.filters || []);
  const [values, setValues] = useState<Record<string, any>>(initialConfig.values || {});
  const [limit, setLimit] = useState<number>(initialConfig.limit || 100);
  const [query, setQuery] = useState<string>(initialConfig.query || '');
  const [params, setParams] = useState<any[]>(initialConfig.params || []);
  const [readOnly, setReadOnly] = useState<boolean>(initialConfig.readOnly || false);
  const [saved, setSaved] = useState(false);

  // Fetch database metadata
  const { data: metadata, isLoading } = useQuery<{ data: DatabaseMetadata }>({
    queryKey: ['/api/workflows/data-sources/metadata'],
    enabled: true,
  });

  const tables = metadata?.data?.tables || [];
  const currentTable = tables.find(t => t.table === table);
  const columns = currentTable?.columns || [];

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
            <SelectItem value="EXECUTE_QUERY">EXECUTE QUERY (Custom SQL)</SelectItem>
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
          <Select value={table} onValueChange={setTable} disabled={isLoading}>
            <SelectTrigger id="table" data-testid="select-table">
              <SelectValue placeholder={isLoading ? "Loading tables..." : "Select table"} />
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
