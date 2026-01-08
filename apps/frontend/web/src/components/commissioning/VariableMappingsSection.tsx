import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Trash2, ArrowUpDown, AtSign, Database, Calculator } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VariableMapping {
  id: string;
  code: string;
  name: string;
  description: string | null;
  data_type: 'number' | 'currency' | 'percentage' | 'text' | 'boolean' | 'enum';
  source_table: string | null;
  source_column: string | null;
  is_computed: boolean;
  is_placeholder: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Placeholder {
  code: string;
  name: string;
  dataType: string;
  sourceTable: string;
  sourceColumn: string;
  isPlaceholder?: boolean;
  isComputed?: boolean;
}

const dataTypeLabels: Record<string, { label: string; color: string }> = {
  number: { label: 'Numero', color: 'bg-blue-100 text-blue-700' },
  currency: { label: 'Valuta €', color: 'bg-green-100 text-green-700' },
  percentage: { label: 'Percentuale %', color: 'bg-purple-100 text-purple-700' },
  text: { label: 'Testo', color: 'bg-gray-100 text-gray-700' },
  boolean: { label: 'Booleano', color: 'bg-amber-100 text-amber-700' },
  enum: { label: 'Enum', color: 'bg-red-100 text-red-700' },
};

export default function VariableMappingsSection() {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    dataType: 'currency' as string,
    sourceTable: '',
    sourceColumn: '',
    isPlaceholder: false,
    isComputed: false,
  });

  const { data: mappings = [], isLoading } = useQuery<VariableMapping[]>({
    queryKey: ['/api/commissioning/variable-mappings'],
  });

  const { data: placeholders = [] } = useQuery<Placeholder[]>({
    queryKey: ['/api/commissioning/variable-mappings/placeholders'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commissioning/variable-mappings', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/variable-mappings'] });
      setModalOpen(false);
      resetForm();
      toast({ title: 'Variabile creata', description: 'La variabile è stata aggiunta con successo' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile creare la variabile', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/variable-mappings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/variable-mappings'] });
      toast({ title: 'Variabile eliminata' });
    },
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', dataType: 'currency', sourceTable: '', sourceColumn: '', isPlaceholder: false, isComputed: false });
  };

  const handlePlaceholderSelect = (code: string) => {
    const ph = placeholders.find(p => p.code === code);
    if (ph) {
      setFormData({
        code: ph.code,
        name: ph.name,
        description: '',
        dataType: ph.dataType,
        sourceTable: ph.sourceTable || '',
        sourceColumn: ph.sourceColumn || '',
        isPlaceholder: !!ph.isPlaceholder,
        isComputed: !!ph.isComputed,
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast({ title: 'Errore', description: 'Codice e nome sono obbligatori', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const columns = useMemo<ColumnDef<VariableMapping>[]>(() => [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2 -ml-2" data-testid="sort-variable-code">
          Codice <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.code.startsWith('@') ? (
            <AtSign className="h-4 w-4 text-purple-500" />
          ) : (
            <Database className="h-4 w-4 text-blue-500" />
          )}
          <code className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{row.original.code}</code>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.name}</div>
          {row.original.description && <div className="text-xs text-gray-500">{row.original.description}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'data_type',
      header: 'Tipo Dato',
      cell: ({ row }) => {
        const type = dataTypeLabels[row.original.data_type];
        return <Badge className={`${type?.color || 'bg-gray-100'} border-0`}>{type?.label || row.original.data_type}</Badge>;
      },
    },
    {
      accessorKey: 'source_table',
      header: 'Sorgente',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          {row.original.is_computed ? (
            <Badge variant="outline" className="text-amber-600 border-amber-300"><Calculator className="h-3 w-3 mr-1" /> Calcolato</Badge>
          ) : row.original.source_table ? (
            <span className="font-mono text-xs">{row.original.source_table}.{row.original.source_column}</span>
          ) : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => row.original.is_placeholder ? null : (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => deleteMutation.mutate(row.original.id)} data-testid={`delete-var-${row.original.id}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [deleteMutation]);

  const table = useReactTable({
    data: mappings,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Cerca variabili..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" data-testid="input-search-variables" />
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="flex items-center gap-2" style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-nuova-variabile">
          <Plus className="h-4 w-4" /> Nuova Variabile
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : mappings.length === 0 ? (
        <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
          <div className="text-center text-gray-400">
            <AtSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessuna variabile configurata</p>
            <p className="text-sm">Aggiungi @placeholder o colonne DB per le funzioni</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-variable-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Variabile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Seleziona @Placeholder</Label>
              <Select onValueChange={handlePlaceholderSelect}>
                <SelectTrigger data-testid="select-placeholder">
                  <SelectValue placeholder="Scegli un placeholder predefinito..." />
                </SelectTrigger>
                <SelectContent>
                  {placeholders.map((ph) => (
                    <SelectItem key={ph.code} value={ph.code}>
                      <span className="flex items-center gap-2">
                        <code className="font-mono text-xs">{ph.code}</code>
                        <span className="text-gray-500">- {ph.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-3">Oppure configura manualmente:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Codice</Label>
                  <Input value={formData.code} onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))} placeholder="@mia_variabile" data-testid="input-variable-code" />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Nome descrittivo" data-testid="input-variable-name" />
                </div>
              </div>
              <div className="mt-4">
                <Label>Tipo Dato</Label>
                <Select value={formData.dataType} onValueChange={(v) => setFormData(f => ({ ...f, dataType: v }))}>
                  <SelectTrigger data-testid="select-data-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Numero</SelectItem>
                    <SelectItem value="currency">Valuta €</SelectItem>
                    <SelectItem value="percentage">Percentuale %</SelectItem>
                    <SelectItem value="text">Testo</SelectItem>
                    <SelectItem value="boolean">Booleano</SelectItem>
                    <SelectItem value="enum">Enum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4">
                <Label>Descrizione</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} data-testid="input-variable-desc" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-save-variable">
              {createMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
